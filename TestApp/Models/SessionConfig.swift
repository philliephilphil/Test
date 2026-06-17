import Foundation

enum TransmissionType: String, CaseIterable, Identifiable, Hashable {
    case manual = "Manuell"
    case automatic = "Automatik"

    var id: String { rawValue }
}

struct SessionConfig: Hashable {
    var trackName: String = ""
    var carMake: String = ""
    var carModel: String = ""
    var tcsLevel: Int = 0
    var absEnabled: Bool = true
    var stabilityEnabled: Bool = false
    var transmission: TransmissionType = .manual
    var bestLapTime: String = ""
    var problemAreas: String = ""

    var isValid: Bool {
        !trackName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !carMake.trimmingCharacters(in: .whitespaces).isEmpty &&
        !carModel.trimmingCharacters(in: .whitespaces).isEmpty
    }
}
