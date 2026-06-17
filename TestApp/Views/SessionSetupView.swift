import SwiftUI

struct SessionSetupView: View {
    @Binding var path: NavigationPath
    @State private var config = SessionConfig()

    private let commonTracks = [
        "Nürburgring GP", "Suzuka Circuit", "Spa-Francorchamps",
        "Autodromo Nazionale Monza", "Mount Panorama (Bathurst)",
        "Daytona International Speedway", "Brands Hatch", "Tokyo Expressway"
    ]

    var body: some View {
        Form {
            Section("Strecke") {
                TextField("Streckenname", text: $config.trackName)
                let suggestions = commonTracks.filter {
                    !config.trackName.isEmpty &&
                    $0.localizedCaseInsensitiveContains(config.trackName) &&
                    $0 != config.trackName
                }
                ForEach(suggestions.prefix(3), id: \.self) { suggestion in
                    Button(suggestion) {
                        config.trackName = suggestion
                    }
                    .font(.callout)
                }
            }

            Section("Fahrzeug") {
                TextField("Hersteller (z.B. Porsche)", text: $config.carMake)
                TextField("Modell (z.B. 911 GT3)", text: $config.carModel)
            }

            Section("Fahrhilfen") {
                Stepper("TCS: \(config.tcsLevel == 0 ? "Aus" : "Stufe \(config.tcsLevel)")",
                        value: $config.tcsLevel, in: 0...5)
                Toggle("ABS", isOn: $config.absEnabled)
                Toggle("Fahrstabilitätskontrolle", isOn: $config.stabilityEnabled)
                Picker("Getriebe", selection: $config.transmission) {
                    ForEach(TransmissionType.allCases) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Zusatzinfos (optional)") {
                TextField("Bisherige Bestzeit (z.B. 1:42.350)", text: $config.bestLapTime)
                TextField("Bekannte Problembereiche (z.B. \"Kurve 5 bremse ich zu früh\")", text: $config.problemAreas, axis: .vertical)
                    .lineLimit(2...4)
            }
        }
        .navigationTitle("Session einrichten")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Weiter") {
                    path.append(Route.videoPicker(config))
                }
                .disabled(!config.isValid)
            }
        }
    }
}

#Preview {
    NavigationStack {
        SessionSetupView(path: .constant(NavigationPath()))
    }
}
