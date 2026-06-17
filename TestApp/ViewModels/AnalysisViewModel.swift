import Foundation
import Combine

@MainActor
final class AnalysisViewModel: ObservableObject {
    enum Phase: Equatable {
        case idle
        case uploadingVideo
        case waitingForProcessing
        case analyzing
        case done(AnalysisResult)
        case failed(String)
    }

    @Published var phase: Phase = .idle

    private let service = GeminiAPIService()
    private var currentTask: Task<Void, Never>?

    func startAnalysis(videoURL: URL, config: SessionConfig, apiKey: String) {
        currentTask?.cancel()
        phase = .uploadingVideo
        currentTask = Task {
            await runAnalysis(videoURL: videoURL, config: config, apiKey: apiKey)
        }
    }

    func cancel() {
        currentTask?.cancel()
        phase = .idle
    }

    private func runAnalysis(videoURL: URL, config: SessionConfig, apiKey: String) async {
        do {
            let mimeType = mimeType(for: videoURL)
            let fileURI = try await service.uploadVideo(fileURL: videoURL, mimeType: mimeType, apiKey: apiKey)

            try Task.checkCancellation()
            phase = .waitingForProcessing
            try await service.waitForFileActive(fileURI: fileURI, apiKey: apiKey)

            try Task.checkCancellation()
            phase = .analyzing
            let rawText = try await service.generateCoaching(
                fileURI: fileURI,
                mimeType: mimeType,
                config: config,
                apiKey: apiKey
            )

            phase = .done(Self.parse(rawText: rawText, config: config))
        } catch is CancellationError {
            phase = .idle
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "mov": return "video/quicktime"
        case "m4v": return "video/x-m4v"
        default: return "video/mp4"
        }
    }

    private static func parse(rawText: String, config: SessionConfig) -> AnalysisResult {
        let headers = CoachingCategory.allCases.map(\.parseHeader)
        var feedback: [CoachingCategory: String] = [:]
        for category in CoachingCategory.allCases {
            feedback[category] = extractSection(from: rawText, header: category.parseHeader, allHeaders: headers)
        }
        return AnalysisResult(
            sessionConfig: config,
            createdAt: Date(),
            feedbackByCategory: feedback,
            rawResponse: rawText
        )
    }

    private static func extractSection(from text: String, header: String, allHeaders: [String]) -> String {
        guard let headerRange = text.range(of: header) else { return "" }
        var sectionEnd = text.endIndex
        for other in allHeaders where other != header {
            if let otherRange = text.range(of: other, range: headerRange.upperBound..<text.endIndex),
               otherRange.lowerBound < sectionEnd {
                sectionEnd = otherRange.lowerBound
            }
        }
        return String(text[headerRange.upperBound..<sectionEnd])
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
