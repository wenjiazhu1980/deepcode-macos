import SwiftUI

struct ChatPopover: View {
    @ObservedObject var viewModel: ChatViewModel

    var body: some View {
        VStack(spacing: 0) {
            HeaderBar(viewModel: viewModel)
            Divider()
            if let error = viewModel.startupError {
                ErrorBanner(message: error)
            } else if let hint = viewModel.settingsHint {
                ErrorBanner(message: hint)
            } else {
                MessageList(messages: viewModel.messages)
            }
            Divider()
            InputBar(viewModel: viewModel)
        }
    }
}

private struct HeaderBar: View {
    @ObservedObject var viewModel: ChatViewModel

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "sparkles")
                Text("DeepCode")
                    .font(.headline)
                Spacer()
                if !viewModel.modelLabel.isEmpty {
                    Text(viewModel.modelLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text("·")
                    .foregroundStyle(.secondary)
                Text(viewModel.statusText)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                if viewModel.isStreaming, !viewModel.streamProgress.isEmpty {
                    Text("\(viewModel.streamProgress) tok")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Menu {
                    Button("切换项目目录…") {
                        viewModel.selectProjectRoot()
                    }
                    Divider()
                    Button("退出 DeepCode") {
                        NSApp.terminate(nil)
                    }
                    .keyboardShortcut("q", modifiers: .command)
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .imageScale(.medium)
                }
                .menuStyle(.borderlessButton)
                .menuIndicator(.hidden)
                .fixedSize()
                .help("更多")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)

            // PWD indicator
            if !viewModel.projectRoot.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "folder")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    Text(collapsedPath(viewModel.projectRoot))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 4)
            }
        }
        .background(.ultraThinMaterial)
    }

    private func collapsedPath(_ path: String) -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        if path.hasPrefix(home) {
            return "~" + path.dropFirst(home.count)
        }
        return path
    }
}

private struct ErrorBanner: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(message)
                .font(.callout)
                .foregroundStyle(.orange)
                .padding()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
