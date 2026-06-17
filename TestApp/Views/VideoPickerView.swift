import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import UIKit

struct VideoPickerView: View {
    let config: SessionConfig
    @Binding var path: NavigationPath

    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedVideoURL: URL?
    @State private var isLoadingVideo = false
    @State private var errorMessage: String?
    @State private var showDocumentPicker = false

    private let maxFileSize: Int64 = 2 * 1024 * 1024 * 1024 // 2 GB Gemini Files API limit

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "film.fill")
                .font(.system(size: 56))
                .foregroundStyle(.orange)
                .padding(.top, 40)

            Text("Replay-Video auswählen")
                .font(.title2.bold())

            Text("Wähle die Aufnahme deiner Rundenfahrt aus der Fotomediathek oder aus Dateien.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if let url = selectedVideoURL {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .font(.title)
                    Text(url.lastPathComponent)
                        .font(.callout)
                        .lineLimit(1)
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .padding(.horizontal)
            }

            VStack(spacing: 12) {
                PhotosPicker(selection: $selectedItem, matching: .videos, photoLibrary: .shared()) {
                    Label("Aus Fotos-App wählen", systemImage: "photo.on.rectangle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button {
                    showDocumentPicker = true
                } label: {
                    Label("Aus Dateien wählen", systemImage: "folder")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal)

            if isLoadingVideo {
                ProgressView("Video wird geladen...")
            }

            Spacer()

            Button("Analyse starten") {
                if let url = selectedVideoURL {
                    path.append(Route.analysisProgress(config, url))
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(selectedVideoURL == nil)
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
        .navigationTitle("Video auswählen")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: selectedItem) { _, newItem in
            guard let newItem else { return }
            isLoadingVideo = true
            errorMessage = nil
            Task {
                defer { isLoadingVideo = false }
                do {
                    guard let data = try await newItem.loadTransferable(type: Data.self) else {
                        errorMessage = "Video konnte nicht geladen werden."
                        return
                    }
                    handleLoadedVideoData(data)
                } catch {
                    errorMessage = "Video konnte nicht gelesen werden."
                }
            }
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPicker { url in
                handlePickedFileURL(url)
            }
        }
    }

    private func handleLoadedVideoData(_ data: Data) {
        guard Int64(data.count) <= maxFileSize else {
            errorMessage = "Video zu groß. Bitte kürze es auf unter 2 GB."
            return
        }
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mov")
        do {
            try data.write(to: tempURL)
            selectedVideoURL = tempURL
            errorMessage = nil
        } catch {
            errorMessage = "Video konnte nicht gespeichert werden."
        }
    }

    private func handlePickedFileURL(_ url: URL) {
        do {
            let resources = try url.resourceValues(forKeys: [.fileSizeKey])
            if let size = resources.fileSize, Int64(size) > maxFileSize {
                errorMessage = "Video zu groß. Bitte kürze es auf unter 2 GB."
                try? FileManager.default.removeItem(at: url)
                return
            }
            selectedVideoURL = url
            errorMessage = nil
        } catch {
            errorMessage = "Video konnte nicht gelesen werden."
        }
    }
}

private struct DocumentPicker: UIViewControllerRepresentable {
    let onPick: (URL) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.movie])
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onPick: onPick)
    }

    final class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onPick: (URL) -> Void
        init(onPick: @escaping (URL) -> Void) { self.onPick = onPick }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let sourceURL = urls.first else { return }
            let accessing = sourceURL.startAccessingSecurityScopedResource()
            defer { if accessing { sourceURL.stopAccessingSecurityScopedResource() } }

            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(sourceURL.pathExtension.isEmpty ? "mp4" : sourceURL.pathExtension)
            do {
                try FileManager.default.copyItem(at: sourceURL, to: tempURL)
                onPick(tempURL)
            } catch {
                // Copy failed; selection simply stays empty and user can retry.
            }
        }
    }
}
