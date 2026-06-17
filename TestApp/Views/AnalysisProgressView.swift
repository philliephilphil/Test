import SwiftUI

struct AnalysisProgressView: View {
    let config: SessionConfig
    let videoURL: URL
    @Binding var path: NavigationPath

    @EnvironmentObject private var settingsViewModel: SettingsViewModel
    @StateObject private var viewModel = AnalysisViewModel()

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            switch viewModel.phase {
            case .idle, .uploadingVideo, .waitingForProcessing, .analyzing:
                ProgressView()
                    .scaleEffect(1.5)
                Text(statusText)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                Text("Das kann je nach Videolänge einige Minuten dauern.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            case .failed(let message):
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.red)
                Text(message)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                Button("Erneut versuchen") {
                    startAnalysis()
                }
                .buttonStyle(.borderedProminent)
            case .done:
                EmptyView()
            }

            Spacer()

            if isInProgress {
                Button("Abbrechen", role: .destructive) {
                    viewModel.cancel()
                    path.removeLast(path.count)
                }
                .padding(.bottom, 24)
            }
        }
        .padding()
        .navigationTitle("Analyse")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .onAppear {
            startAnalysis()
        }
        .onChange(of: viewModel.phase) { _, newPhase in
            if case .done(let result) = newPhase {
                path.append(Route.results(result))
            }
        }
    }

    private var isInProgress: Bool {
        switch viewModel.phase {
        case .idle, .uploadingVideo, .waitingForProcessing, .analyzing: return true
        default: return false
        }
    }

    private var statusText: String {
        switch viewModel.phase {
        case .idle, .uploadingVideo:
            return "Video wird hochgeladen..."
        case .waitingForProcessing:
            return "Gemini verarbeitet das Video..."
        case .analyzing:
            return "Analyse läuft..."
        default:
            return ""
        }
    }

    private func startAnalysis() {
        guard settingsViewModel.hasValidKey else {
            viewModel.phase = .failed("Kein API-Schlüssel. Einstellungen öffnen.")
            return
        }
        viewModel.startAnalysis(videoURL: videoURL, config: config, apiKey: settingsViewModel.apiKey)
    }
}
