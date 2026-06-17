import Foundation

enum GeminiAPIError: LocalizedError {
    case uploadFailed(String)
    case invalidResponse
    case processingTimeout
    case httpError(Int, String)

    var errorDescription: String? {
        switch self {
        case .uploadFailed(let message):
            return "Upload fehlgeschlagen: \(message)"
        case .invalidResponse:
            return "Ungültige Antwort vom Server."
        case .processingTimeout:
            return "Verarbeitung dauert zu lang. Bitte erneut versuchen."
        case .httpError(let code, let message):
            switch code {
            case 400: return "Ungültige Anfrage — Videodatei prüfen."
            case 403: return "Ungültiger API-Schlüssel."
            case 429: return "Rate Limit erreicht. Kurz warten."
            default: return "Serverfehler (\(code)): \(message)"
            }
        }
    }
}

/// Uploads a video to Gemini's Files API and runs coaching analysis on it.
/// Gemini analyzes the full video natively rather than sampled frames.
actor GeminiAPIService {
    private let baseURL = "https://generativelanguage.googleapis.com"
    private let model = "gemini-1.5-flash"

    func uploadVideo(fileURL: URL, mimeType: String, apiKey: String) async throws -> String {
        let fileSize = (try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0

        var startRequest = URLRequest(url: URL(string: "\(baseURL)/upload/v1beta/files?key=\(apiKey)")!)
        startRequest.httpMethod = "POST"
        startRequest.setValue("resumable", forHTTPHeaderField: "X-Goog-Upload-Protocol")
        startRequest.setValue("start", forHTTPHeaderField: "X-Goog-Upload-Command")
        startRequest.setValue("\(fileSize)", forHTTPHeaderField: "X-Goog-Upload-Header-Content-Length")
        startRequest.setValue(mimeType, forHTTPHeaderField: "X-Goog-Upload-Header-Content-Type")
        startRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        startRequest.httpBody = try JSONSerialization.data(withJSONObject: [
            "file": ["display_name": fileURL.lastPathComponent]
        ])

        let (_, startResponse) = try await URLSession.shared.data(for: startRequest)
        guard let httpStart = startResponse as? HTTPURLResponse,
              let uploadURLString = httpStart.value(forHTTPHeaderField: "X-Goog-Upload-URL"),
              let uploadURL = URL(string: uploadURLString) else {
            throw GeminiAPIError.uploadFailed("Keine Upload-URL erhalten.")
        }

        var uploadRequest = URLRequest(url: uploadURL)
        uploadRequest.httpMethod = "PUT"
        uploadRequest.setValue("0", forHTTPHeaderField: "X-Goog-Upload-Offset")
        uploadRequest.setValue("upload, finalize", forHTTPHeaderField: "X-Goog-Upload-Command")

        let (data, uploadResponse) = try await URLSession.shared.upload(for: uploadRequest, fromFile: fileURL)
        guard let httpUpload = uploadResponse as? HTTPURLResponse, httpUpload.statusCode == 200 else {
            throw GeminiAPIError.uploadFailed("Upload-Antwort ungültig.")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let file = json["file"] as? [String: Any],
              let uri = file["uri"] as? String else {
            throw GeminiAPIError.invalidResponse
        }
        return uri
    }

    func waitForFileActive(fileURI: String, apiKey: String) async throws {
        guard let statusURL = URL(string: "\(fileURI)?key=\(apiKey)") else {
            throw GeminiAPIError.invalidResponse
        }

        let deadline = Date().addingTimeInterval(300)
        while Date() < deadline {
            try Task.checkCancellation()
            let (data, response) = try await URLSession.shared.data(from: statusURL)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw GeminiAPIError.invalidResponse
            }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            switch json?["state"] as? String {
            case "ACTIVE":
                return
            case "FAILED":
                throw GeminiAPIError.uploadFailed("Gemini konnte die Datei nicht verarbeiten.")
            default:
                try await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
        throw GeminiAPIError.processingTimeout
    }

    func generateCoaching(fileURI: String, mimeType: String, config: SessionConfig, apiKey: String) async throws -> String {
        let url = URL(string: "\(baseURL)/v1beta/models/\(model):generateContent?key=\(apiKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 180

        let body: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["file_data": ["mime_type": mimeType, "file_uri": fileURI]],
                        ["text": Self.buildPrompt(config: config)]
                    ]
                ]
            ],
            "generationConfig": ["maxOutputTokens": 4096]
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GeminiAPIError.invalidResponse
        }
        guard httpResponse.statusCode == 200 else {
            throw GeminiAPIError.httpError(httpResponse.statusCode, String(data: data, encoding: .utf8) ?? "")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = json["candidates"] as? [[String: Any]],
              let content = candidates.first?["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let text = parts.first?["text"] as? String else {
            throw GeminiAPIError.invalidResponse
        }
        return text
    }

    private static func buildPrompt(config: SessionConfig) -> String {
        var lines = [
            "Du bist ein professioneller Gran Turismo Renningenieur und Fahrercoach.",
            "",
            "Fahrzeug: \(config.carMake) \(config.carModel)",
            "Strecke: \(config.trackName)",
            "Fahrhilfen: TCS \(config.tcsLevel == 0 ? "Aus" : "Stufe \(config.tcsLevel)"), " +
            "ABS \(config.absEnabled ? "An" : "Aus"), " +
            "Stabilitätskontrolle \(config.stabilityEnabled ? "An" : "Aus")",
            "Getriebe: \(config.transmission.rawValue)"
        ]
        if !config.bestLapTime.trimmingCharacters(in: .whitespaces).isEmpty {
            lines.append("Bisherige Bestzeit: \(config.bestLapTime)")
        }
        if !config.problemAreas.trimmingCharacters(in: .whitespaces).isEmpty {
            lines.append("Bekannte Problembereiche laut Fahrer: \(config.problemAreas)")
        }
        lines.append("""

            Analysiere dieses Gran Turismo Replay-Video vollständig und gib detailliertes Coaching-Feedback auf Deutsch.
            Referenziere konkrete Zeitstempel im Video (z.B. "bei 0:47...").
            Strukturiere deine Antwort exakt mit diesen Überschriften (in Großbuchstaben, jede auf eigener Zeile):

            IDEALLINIE
            BREMSPUNKTE
            GASANNAHME
            FAHRZEUGPOSITIONIERUNG
            GESAMTBEWERTUNG
            """)
        return lines.joined(separator: "\n")
    }
}
