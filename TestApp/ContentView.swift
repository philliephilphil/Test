import SwiftUI

struct ContentView: View {
    @State private var items: [TodoItem] = [
        TodoItem(title: "SwiftUI lernen", isCompleted: true),
        TodoItem(title: "iOS App bauen", isCompleted: false),
        TodoItem(title: "App testen", isCompleted: false)
    ]
    @State private var newItemTitle = ""
    @State private var showingAddSheet = false

    var body: some View {
        NavigationStack {
            List {
                ForEach($items) { $item in
                    HStack {
                        Button {
                            item.isCompleted.toggle()
                        } label: {
                            Image(systemName: item.isCompleted ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(item.isCompleted ? .green : .gray)
                                .font(.title2)
                        }
                        .buttonStyle(.plain)

                        Text(item.title)
                            .strikethrough(item.isCompleted)
                            .foregroundStyle(item.isCompleted ? .secondary : .primary)
                    }
                    .padding(.vertical, 4)
                }
                .onDelete(perform: deleteItems)
            }
            .navigationTitle("Meine Aufgaben")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    EditButton()
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddItemView(items: $items)
            }
            .overlay {
                if items.isEmpty {
                    ContentUnavailableView(
                        "Keine Aufgaben",
                        systemImage: "checklist",
                        description: Text("Tippe auf + um eine neue Aufgabe hinzuzufuegen.")
                    )
                }
            }
        }
    }

    private func deleteItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }
}

struct AddItemView: View {
    @Binding var items: [TodoItem]
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        NavigationStack {
            Form {
                TextField("Aufgabe eingeben", text: $title)
                    .focused($isFocused)
            }
            .navigationTitle("Neue Aufgabe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Hinzufuegen") {
                        let newItem = TodoItem(title: title)
                        items.append(newItem)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                isFocused = true
            }
        }
    }
}

struct TodoItem: Identifiable {
    let id = UUID()
    var title: String
    var isCompleted: Bool = false
}

#Preview {
    ContentView()
}
