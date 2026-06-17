import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var settingsViewModel: SettingsViewModel
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 8) {
                        Image(systemName: "flag.checkered")
                            .font(.system(size: 56))
                            .foregroundStyle(.orange)
                        Text("GT Performance Coach")
                            .font(.largeTitle.bold())
                        Text("KI-Coaching für deine Gran Turismo Runden")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 32)

                    if !settingsViewModel.hasValidKey {
                        Label("Kein API-Schlüssel konfiguriert. Bitte in den Einstellungen hinzufügen.", systemImage: "exclamationmark.triangle.fill")
                            .font(.callout)
                            .foregroundStyle(.yellow)
                            .padding()
                            .background(.yellow.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
                            .padding(.horizontal)
                    }

                    VStack(spacing: 16) {
                        Button {
                            path.append(Route.sessionSetup)
                        } label: {
                            HomeActionCard(
                                icon: "play.circle.fill",
                                title: "Neue Runde analysieren",
                                subtitle: "Replay-Video hochladen und Coaching erhalten"
                            )
                        }
                        .disabled(!settingsViewModel.hasValidKey)

                        Button {
                            path.append(Route.settings)
                        } label: {
                            HomeActionCard(
                                icon: "gearshape.fill",
                                title: "Einstellungen",
                                subtitle: "API-Schlüssel verwalten"
                            )
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 32)
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .settings:
                    SettingsView()
                case .sessionSetup:
                    SessionSetupView(path: $path)
                case .videoPicker(let config):
                    VideoPickerView(config: config, path: $path)
                case .analysisProgress(let config, let url):
                    AnalysisProgressView(config: config, videoURL: url, path: $path)
                case .results(let result):
                    ResultsView(result: result, path: $path)
                }
            }
        }
    }
}

private struct HomeActionCard: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title)
                .frame(width: 44)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
        .foregroundStyle(.primary)
    }
}

#Preview {
    HomeView()
        .environmentObject(SettingsViewModel())
}
