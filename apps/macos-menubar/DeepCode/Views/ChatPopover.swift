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
            } else if viewModel.showSessionList {
                SessionListView(viewModel: viewModel)
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
                    Button("会话列表") {
                        viewModel.showSessionList.toggle()
                        if viewModel.showSessionList {
                            viewModel.refreshSessions()
                        }
                    }
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

private struct SessionListView: View {
    @ObservedObject var viewModel: ChatViewModel

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("会话历史")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                Button("新建") {
                    viewModel.createNewSession()
                    viewModel.showSessionList = false
                }
                .buttonStyle(.borderless)
                .font(.caption)
                Button("关闭") {
                    viewModel.showSessionList = false
                }
                .buttonStyle(.borderless)
                .font(.caption)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            if viewModel.sessionList.isEmpty {
                Spacer()
                Text("暂无历史会话")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            } else {
                List(viewModel.sessionList.sorted { a, b in
                    (a.updateTime) > (b.updateTime)
                }, id: \.id) { session in
                    Button {
                        viewModel.loadSession(session.id)
                        viewModel.showSessionList = false
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(session.summary ?? "空会话")
                                .font(.caption)
                                .lineLimit(2)
                                .foregroundStyle(.primary)
                            HStack {
                                statusBadge(session.status)
                                Text(formatTime(session.updateTime))
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
        }
    }

    private func statusBadge(_ status: String) -> some View {
        let (label, color): (String, Color) = {
            switch status {
            case "completed": return ("✓", .green)
            case "failed": return ("✗", .red)
            case "processing": return ("●", .blue)
            case "waiting_for_user": return ("?", .orange)
            case "interrupted": return ("⊘", .secondary)
            default: return (status, .secondary)
            }
        }()
        return Text(label)
            .font(.caption2)
            .foregroundStyle(color)
    }

    private func formatTime(_ iso: String) -> String {
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = fmt.date(from: iso) ?? ISO8601DateFormatter().date(from: iso) else {
            return iso.prefix(10).description
        }
        let now = Date()
        let diff = now.timeIntervalSince(date)
        if diff < 60 { return "刚刚" }
        if diff < 3600 { return "\(Int(diff / 60))分钟前" }
        if diff < 86400 { return "\(Int(diff / 3600))小时前" }
        let df = DateFormatter()
        df.dateFormat = "MM-dd HH:mm"
        return df.string(from: date)
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
