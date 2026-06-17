import SwiftUI

@main
struct GTCoachApp: App {
    @StateObject private var settingsViewModel = SettingsViewModel()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(settingsViewModel)
        }
    }
}
