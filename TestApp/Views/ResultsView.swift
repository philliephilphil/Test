import SwiftUI

struct ResultsView: View {
    let result: AnalysisResult
    @Binding var path: NavigationPath

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(result.sessionConfig.trackName)
                        .font(.title2.bold())
                    Text("\(result.sessionConfig.carMake) \(result.sessionConfig.carModel)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(result.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal)

                LazyVStack(spacing: 12) {
                    ForEach(CoachingCategory.allCases) { category in
                        let text = result.feedbackByCategory[category] ?? ""
                        if !text.isEmpty {
                            CoachingCard(category: category, text: text)
                        }
                    }
                }
                .padding(.horizontal)

                DisclosureGroup("Rohantwort anzeigen") {
                    Text(result.rawResponse)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                }
                .padding(.horizontal)

                Button("Neue Analyse") {
                    path.removeLast(path.count)
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .padding(.vertical)
        }
        .navigationTitle("Coaching-Ergebnis")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                ShareLink(item: result.rawResponse)
            }
        }
    }
}

private struct CoachingCard: View {
    let category: CoachingCategory
    let text: String

    var body: some View {
        DisclosureGroup {
            Text(text)
                .font(.callout)
                .padding(.top, 8)
        } label: {
            HStack {
                Image(systemName: category.icon)
                    .foregroundStyle(.orange)
                    .frame(width: 28)
                Text(category.rawValue)
                    .font(.headline)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        ResultsView(
            result: AnalysisResult(
                sessionConfig: SessionConfig(trackName: "Nürburgring GP", carMake: "Porsche", carModel: "911 GT3"),
                createdAt: Date(),
                feedbackByCategory: [.racingLine: "Beispieltext"],
                rawResponse: "Beispiel Rohantwort"
            ),
            path: .constant(NavigationPath())
        )
    }
}
