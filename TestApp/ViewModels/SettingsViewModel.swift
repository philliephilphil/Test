import Foundation
import Combine

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var apiKey: String = ""
    @Published var isKeySaved: Bool = false
    @Published var saveError: String?

    init() {
        if let key = KeychainService.retrieve(), !key.isEmpty {
            apiKey = key
            isKeySaved = true
        }
    }

    var hasValidKey: Bool {
        !apiKey.trimmingCharacters(in: .whitespaces).isEmpty
    }

    func saveKey() {
        let trimmed = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            saveError = "Bitte gib einen API-Schlüssel ein."
            return
        }
        do {
            try KeychainService.save(apiKey: trimmed)
            apiKey = trimmed
            isKeySaved = true
            saveError = nil
        } catch {
            saveError = "Fehler beim Speichern: \(error.localizedDescription)"
        }
    }

    func deleteKey() {
        try? KeychainService.delete()
        apiKey = ""
        isKeySaved = false
    }
}
