import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var viewModel: SettingsViewModel
    @State private var showDeleteConfirmation = false

    var body: some View {
        Form {
            Section("API-Schlüssel") {
                SecureField("Gemini API-Schlüssel", text: $viewModel.apiKey)
                    .textContentType(.password)
                    .autocorrectionDisabled()

                if let error = viewModel.saveError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                Button("Speichern") {
                    viewModel.saveKey()
                }

                if viewModel.isKeySaved {
                    Button("Schlüssel löschen", role: .destructive) {
                        showDeleteConfirmation = true
                    }
                }
            }

            Section("So erhältst du deinen API-Schlüssel") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("1. Öffne Google AI Studio")
                    Text("2. Melde dich mit deinem Google-Konto an")
                    Text("3. Klicke auf \"Get API key\" → \"Create API key\"")
                    Text("4. Kopiere den Schlüssel und füge ihn oben ein")
                }
                .font(.callout)

                Link("Google AI Studio öffnen", destination: URL(string: "https://aistudio.google.com")!)

                Text("Gemini 1.5 Flash ist im kostenlosen Kontingent nutzbar — keine Kreditkarte nötig.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Info") {
                LabeledContent("Modell", value: "gemini-1.5-flash")
            }
        }
        .navigationTitle("Einstellungen")
        .alert("Schlüssel löschen?", isPresented: $showDeleteConfirmation) {
            Button("Abbrechen", role: .cancel) {}
            Button("Löschen", role: .destructive) {
                viewModel.deleteKey()
            }
        } message: {
            Text("Der gespeicherte API-Schlüssel wird entfernt.")
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environmentObject(SettingsViewModel())
    }
}
