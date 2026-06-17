import Foundation

enum CoachingCategory: String, CaseIterable, Identifiable, Hashable {
    case racingLine = "Ideallinie"
    case brakingPoints = "Bremspunkte"
    case throttleApplication = "Gasannahme"
    case carPositioning = "Fahrzeugpositionierung"
    case overallAssessment = "Gesamtbewertung"

    var id: String { rawValue }

    /// Header keyword Gemini is instructed to use, for parsing the raw response into sections.
    var parseHeader: String { rawValue.uppercased() }

    var icon: String {
        switch self {
        case .racingLine: return "road.lanes"
        case .brakingPoints: return "hand.raised.fill"
        case .throttleApplication: return "speedometer"
        case .carPositioning: return "car.fill"
        case .overallAssessment: return "checkmark.seal.fill"
        }
    }
}
