import Foundation

struct AnalysisResult: Identifiable, Hashable {
    let id: UUID
    let sessionConfig: SessionConfig
    let createdAt: Date
    var feedbackByCategory: [CoachingCategory: String]
    var rawResponse: String

    init(
        id: UUID = UUID(),
        sessionConfig: SessionConfig,
        createdAt: Date,
        feedbackByCategory: [CoachingCategory: String],
        rawResponse: String
    ) {
        self.id = id
        self.sessionConfig = sessionConfig
        self.createdAt = createdAt
        self.feedbackByCategory = feedbackByCategory
        self.rawResponse = rawResponse
    }
}
