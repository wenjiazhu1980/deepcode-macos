import SwiftUI
import AppKit

struct InputBar: View {
    @ObservedObject var viewModel: ChatViewModel
    @FocusState private var focused: Bool

    private var isSidecarReady: Bool {
        viewModel.statusText.hasPrefix("ready")
    }

    var body: some View {
        VStack(spacing: 0) {
            // Attached images preview
            if !viewModel.attachedImages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(viewModel.attachedImages) { image in
                            ZStack(alignment: .topTrailing) {
                                if let thumb = image.thumbnail {
                                    Image(nsImage: thumb)
                                        .resizable()
                                        .frame(width: 48, height: 48)
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                } else {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(.secondary.opacity(0.2))
                                        .frame(width: 48, height: 48)
                                        .overlay(Image(systemName: "photo"))
                                }
                                Button {
                                    viewModel.removeAttachedImage(image.id)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                                .offset(x: 6, y: -6)
                            }
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 4)
                }
                .frame(height: 56)
            }

            // Slash command panel
            if viewModel.showCommandPanel || viewModel.inputText.hasPrefix("/") {
                let commands = viewModel.filteredSlashCommands
                if !commands.isEmpty {
                    VStack(spacing: 0) {
                        Divider()
                        ScrollView {
                            VStack(spacing: 0) {
                                ForEach(commands, id: \.name) { command in
                                    Button {
                                        viewModel.executeSlashCommand(command)
                                    } label: {
                                        HStack {
                                            Text(command.label)
                                                .font(.body.monospaced())
                                                .foregroundStyle(command.kind == "skill" ? .blue : .primary)
                                            if let skill = command.skill, skill.isLoaded == true {
                                                Text("✓")
                                                    .font(.caption)
                                                    .foregroundStyle(.green)
                                            }
                                            Spacer()
                                            Text(command.description)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .frame(maxHeight: 160)
                        Divider()
                    }
                }
            }

            // Error banner with dismiss/retry
            if let error = viewModel.startupError {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.yellow)
                    Text(error)
                        .font(.caption)
                        .lineLimit(2)
                    Spacer()
                    Button("重试") {
                        Task { await viewModel.retryStart() }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    Button {
                        viewModel.dismissError()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.red.opacity(0.1))
            }

            if let hint = viewModel.settingsHint {
                HStack {
                    Image(systemName: "gear")
                        .foregroundStyle(.blue)
                    Text(hint)
                        .font(.caption)
                        .lineLimit(2)
                    Spacer()
                    Button {
                        viewModel.dismissSettingsHint()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.blue.opacity(0.1))
            }

            // Input row
            HStack(alignment: .bottom, spacing: 8) {
                // Paste image button
                Button {
                    viewModel.pasteImage()
                } label: {
                    Image(systemName: "paperclip")
                        .imageScale(.medium)
                }
                .buttonStyle(.borderless)
                .help("粘贴图片 (⌘V)")

                TextField("发送消息给 DeepSeek…", text: $viewModel.inputText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...6)
                    .focused($focused)
                    .onSubmit { viewModel.submit() }
                    .disabled(!isSidecarReady)
                    .onChange(of: viewModel.inputText) { newValue in
                        if newValue.hasPrefix("/") {
                            if viewModel.slashCommands.isEmpty {
                                viewModel.refreshSlashCommands()
                            }
                        }
                        viewModel.showCommandPanel = newValue.hasPrefix("/")
                    }
                if viewModel.isStreaming {
                    Button(action: { viewModel.interrupt() }) {
                        Image(systemName: "stop.circle.fill")
                            .imageScale(.large)
                    }
                    .buttonStyle(.borderless)
                    .help("中断当前回复")
                } else {
                    Button(action: { viewModel.submit() }) {
                        Image(systemName: "paperplane.fill")
                            .imageScale(.large)
                    }
                    .buttonStyle(.borderless)
                    .keyboardShortcut(.return, modifiers: .command)
                    .disabled(viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && viewModel.attachedImages.isEmpty || !isSidecarReady)
                }
            }
            .padding(8)
        }
        .onAppear { focused = true }
    }
}
