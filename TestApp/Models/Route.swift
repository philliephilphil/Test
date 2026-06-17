import Foundation

enum Route: Hashable {
    case settings
    case sessionSetup
    case videoPicker(SessionConfig)
    case analysisProgress(SessionConfig, URL)
    case results(AnalysisResult)
}
