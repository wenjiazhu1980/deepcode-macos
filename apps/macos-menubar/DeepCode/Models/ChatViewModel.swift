import Foundation
import SwiftUI
import AppKit

struct DisplayMessage: Identifiable, Equatable {
    let id: String
    let role: String
    let content: String
    let isThinking: Bool
    let isTool: Bool
    let toolName: String?
    let toolParams: String?
    let toolResult: String?
}

struct AttachedImage: Identifiable, Equatable {
    let id: String
    let dataUrl: String
    let thumbnail: NSImage?
}

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [DisplayMessage] = []
    @Published var isStreaming: Bool = false
    @Published var streamProgress: String = ""
    @Published var statusText: String = "starting…"
    @Published var inputText: String = ""
    @Published var startupError: String?
    @Published var settingsHint: String?
    @Published var modelLabel: String = ""
    @Published var projectRoot: String = ""
    @Published var showCommandPanel: Bool = false
    @Published var slashCommands: [SlashCommandItem] = []
    @Published var attachedImages: [AttachedImage] = []
    @Published var sessionList: [ServerSessionEntry] = []
    @Published var showSessionList: Bool = false

    private let sidecar = SidecarProcess()
    private var pendingSubmitId: String?
    private var pumpTask: Task<Void, Never>?
    private var didStart = false
    private var isUserTerminated = false
    private var savedVersion: String = ""

    // MARK: - Lifecycle

    func start() async {
        guard !didStart else { return }
        didStart = true

        let settings = SettingsLoader.load()
        modelLabel = settings.model
        if !settings.hasApiKey {
            settingsHint = "请先编辑 ~/.deepcode/settings.json 配置 env.API_KEY"
        }

        let root = SettingsLoader.defaultProjectRoot()
        projectRoot = root

        do {
            try sidecar.launch(projectRoot: root)
            statusText = "ready"
        } catch {
            startupError = error.localizedDescription
            statusText = "sidecar failed"
            return
        }

        sidecar.onStderrLine = { [weak self] line in
            Task { @MainActor in
                self?.appendSystem("stderr: \(line)")
            }
        }

        sidecar.onProcessTerminated = { [weak self] status in
            Task { @MainActor in
                guard let self = self else { return }
                if !self.isUserTerminated {
                    self.startupError = "Sidecar 进程异常退出 (status: \(status))"
                }
                self.statusText = "terminated"
                self.isStreaming = false
            }
        }

        pumpTask = Task { [weak self] in
            guard let self = self else { return }
            for await event in self.sidecar.bridge.events {
                await self.handle(event)
            }
            // Stream finished (sidecar closed stdout or terminated)
            await MainActor.run {
                if self.isStreaming {
                    self.isStreaming = false
                    self.statusText = "sidecar disconnected"
                }
            }
        }
    }

    // MARK: - User actions

    func dismissError() {
        startupError = nil
    }

    func dismissSettingsHint() {
        settingsHint = nil
    }

    func retryStart() async {
        startupError = nil
        didStart = false
        await start()
    }

    func submit() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (!text.isEmpty || !attachedImages.isEmpty), settingsHint == nil, sidecar.isRunning else { return }
        let id = UUID().uuidString
        pendingSubmitId = id

        var displayContent = text
        if !attachedImages.isEmpty {
            let imageNote = attachedImages.count == 1 ? "📎 1 image" : "📎 \(attachedImages.count) images"
            displayContent = text.isEmpty ? imageNote : "\(text)\n\(imageNote)"
        }
        appendUser(displayContent)

        let imageUrls = attachedImages.isEmpty ? nil : attachedImages.map { $0.dataUrl }
        inputText = ""
        attachedImages = []
        showCommandPanel = false
        isStreaming = true
        statusText = "processing"
        sidecar.send(.submit(id: id, text: text, imageUrls: imageUrls))
    }

    func interrupt() {
        guard sidecar.isRunning else { return }
        sidecar.send(.interrupt(id: UUID().uuidString))
    }

    // MARK: - PWD management

    func selectProjectRoot() {
        guard sidecar.isRunning else {
            appendSystem("Sidecar 进程未运行，无法切换项目")
            return
        }

        // For MenuBarExtra apps, we need to activate the app and use async panel
        NSApp.activate(ignoringOtherApps: true)

        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.prompt = "选择项目目录"
        panel.message = "选择要切换的项目根目录"

        // Use begin with completion handler for MenuBarExtra compatibility
        panel.begin { [weak self] response in
            guard let self = self, response == .OK, let url = panel.url else { return }
            let path = url.path
            Task { @MainActor in
                let id = UUID().uuidString
                self.sidecar.send(.changeProjectRoot(id: id, path: path))
            }
        }
    }

    // MARK: - Slash commands

    func refreshSlashCommands() {
        let id = UUID().uuidString
        sidecar.send(.listSlashCommands(id: id))
    }

    func executeSlashCommand(_ command: SlashCommandItem) {
        showCommandPanel = false
        switch command.kind {
        case "new":
            guard sidecar.isRunning else {
                appendSystem("Sidecar 进程未运行，无法创建新会话")
                return
            }
            let id = UUID().uuidString
            sidecar.send(.newSession(id: id))
            messages = []
            appendSystem("开始新会话")
        case "skills":
            refreshSlashCommands()
        case "skill":
            // Insert skill name into input for submission
            inputText = "/\(command.name) "
        default:
            break
        }
    }

    var filteredSlashCommands: [SlashCommandItem] {
        guard inputText.hasPrefix("/") else { return [] }
        let query = String(inputText.dropFirst()).lowercased()
        if query.isEmpty { return slashCommands }
        return slashCommands.filter { $0.name.lowercased().contains(query) }
    }

    // MARK: - Session management

    func refreshSessions() {
        let id = UUID().uuidString
        sidecar.send(.listSessions(id: id))
    }

    func loadSession(_ sessionId: String) {
        guard sidecar.isRunning else {
            appendSystem("Sidecar 进程未运行，无法加载会话")
            return
        }
        let id = UUID().uuidString
        sidecar.send(.loadSession(id: id, sessionId: sessionId))
    }

    func createNewSession() {
        let id = UUID().uuidString
        sidecar.send(.newSession(id: id))
        messages = []
        attachedImages = []
        appendSystem("开始新会话")
    }

    // MARK: - Image attachment

    func pasteImage() {
        let pasteboard = NSPasteboard.general
        guard let image = pasteboard.readObjects(forClasses: [NSImage.self], options: nil)?.first as? NSImage else {
            return
        }
        addImageAttachment(image)
    }

    func readImageFile() {
        guard sidecar.isRunning else {
            appendSystem("Sidecar 进程未运行，无法读取图片")
            return
        }

        // For MenuBarExtra apps, we need to activate the app and use async panel
        NSApp.activate(ignoringOtherApps: true)

        let panel = NSOpenPanel()
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowsMultipleSelection = false
        panel.prompt = "选择图片"
        panel.message = "选择要附加的图片文件"
        panel.allowedContentTypes = [.image]

        // Use begin with completion handler for MenuBarExtra compatibility
        panel.begin { [weak self] response in
            guard let self = self, response == .OK, let url = panel.url else { return }
            let path = url.path
            Task { @MainActor in
                let id = UUID().uuidString
                self.sidecar.send(.readImageFile(id: id, path: path))
            }
        }
    }

    func addImageAttachment(_ image: NSImage) {
        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let pngData = bitmap.representation(using: .png, properties: [:]) else {
            return
        }
        let base64 = pngData.base64EncodedString()
        let dataUrl = "data:image/png;base64,\(base64)"

        // Create thumbnail
        let thumbnail = resizeImage(image, maxSize: 80)

        let attached = AttachedImage(id: UUID().uuidString, dataUrl: dataUrl, thumbnail: thumbnail)
        attachedImages.append(attached)
    }

    func removeAttachedImage(_ id: String) {
        attachedImages.removeAll { $0.id == id }
    }

    func clearAttachedImages() {
        attachedImages.removeAll()
    }

    private func resizeImage(_ image: NSImage, maxSize: CGFloat) -> NSImage {
        let aspect = image.size.width / image.size.height
        let size: NSSize = aspect > 1
            ? NSSize(width: maxSize, height: maxSize / aspect)
            : NSSize(width: maxSize * aspect, height: maxSize)
        let resized = NSImage(size: size)
        resized.lockFocus()
        image.draw(in: NSRect(origin: .zero, size: size), from: .zero, operation: .copy, fraction: 1.0)
        resized.unlockFocus()
        return resized
    }

    // MARK: - Server event handling

    private func handle(_ event: ServerEvent) async {
        switch event {
        case let .ready(version, _, projectRoot):
            self.projectRoot = projectRoot
            savedVersion = version
            statusText = "ready · v\(version)"
            refreshSlashCommands()
            refreshSessions()
        case .session:
            break
        case let .stream(phase, _, formatted, _):
            switch phase {
            case "start":
                streamProgress = "0"
            case "update":
                streamProgress = formatted
            case "end":
                streamProgress = ""
            default:
                break
            }
        case let .message(message):
            apply(message: message)
        case let .sessionsList(_, sessions):
            sessionList = sessions
        case let .sessionLoaded(_, _, messages):
            // Restore message history - clear first to avoid UI glitches during rapid switching
            self.messages = []
            isStreaming = false
            let loadedMessages = messages.compactMap { serverMsg -> DisplayMessage? in
                guard serverMsg.visible ?? true else { return nil }
                let rawContent = serverMsg.content ?? ""
                let reasoning = serverMsg.messageParams?.reasoningContent ?? ""
                let content = rawContent.isEmpty ? reasoning : rawContent
                if content.isEmpty { return nil }
                if serverMsg.role == "tool" {
                    return DisplayMessage(
                        id: serverMsg.id, role: "tool", content: "",
                        isThinking: false, isTool: true,
                        toolName: serverMsg.meta?.function?.name ?? "tool",
                        toolParams: serverMsg.meta?.paramsMd ?? "",
                        toolResult: serverMsg.meta?.resultMd ?? content
                    )
                }
                return DisplayMessage(
                    id: serverMsg.id, role: serverMsg.role, content: content,
                    isThinking: serverMsg.meta?.asThinking ?? false,
                    isTool: false, toolName: nil, toolParams: nil, toolResult: nil
                )
            }
            self.messages = loadedMessages
        case let .error(_, message):
            appendSystem("Error: \(message)")
        case let .done(_, status):
            isStreaming = false
            statusText = "ready · v\(savedVersion)"
            pendingSubmitId = nil
        case .ack:
            break
        case let .projectRootChanged(_, path, skills):
            projectRoot = path
            SettingsLoader.saveLastProjectRoot(path)
            // Rebuild slash commands from the new project's skills
            self.slashCommands = skills.map { skill in
                SlashCommandItem(kind: "skill", name: skill.name, label: "/\(skill.name)", description: skill.description, skill: skill)
            }
            refreshSlashCommands() // also get built-in commands
        case let .slashCommands(_, commands):
            slashCommands = commands
        case let .clipboardImage(_, dataUrl, error):
            if let error = error {
                appendSystem("剪贴板图片: \(error)")
            } else if let dataUrl = dataUrl {
                // Convert dataUrl back to NSImage
                if let base64Range = dataUrl.range(of: ";base64,") {
                    let base64 = String(dataUrl[base64Range.upperBound...])
                    if let data = Data(base64Encoded: base64),
                       let image = NSImage(data: data) {
                        addImageAttachment(image)
                    }
                }
            }
        case let .imageFile(_, dataUrl, _, _, _, error):
            if let error = error {
                appendSystem("读取图片文件: \(error)")
            } else if let dataUrl = dataUrl {
                // Convert dataUrl back to NSImage
                if let base64Range = dataUrl.range(of: ";base64,") {
                    let base64 = String(dataUrl[base64Range.upperBound...])
                    if let data = Data(base64Encoded: base64),
                       let image = NSImage(data: data) {
                        addImageAttachment(image)
                    }
                }
            }
        case let .unknown(rawType):
            appendSystem("Unknown event: \(rawType)")
        }
    }

    // MARK: - Message display

    private func apply(message: ServerMessage) {
        guard message.visible ?? true else { return }
        let role = message.role
        let rawContent = message.content ?? ""
        let reasoning = message.messageParams?.reasoningContent ?? ""
        let content = rawContent.isEmpty ? reasoning : rawContent
        if role == "user" {
            if messages.last?.role == "user", messages.last?.content == content { return }
            messages.append(.init(id: message.id, role: "user", content: content, isThinking: false, isTool: false, toolName: nil, toolParams: nil, toolResult: nil))
        } else if role == "assistant" {
            if content.isEmpty { return }
            let isThinking = message.meta?.asThinking ?? false
            messages.append(.init(id: message.id, role: "assistant", content: content, isThinking: isThinking, isTool: false, toolName: nil, toolParams: nil, toolResult: nil))
        } else if role == "tool" {
            let name = message.meta?.function?.name ?? "tool"
            let params = message.meta?.paramsMd ?? ""
            let result = message.meta?.resultMd ?? content
            messages.append(.init(id: message.id, role: "tool", content: "", isThinking: false, isTool: true, toolName: name, toolParams: params, toolResult: result))
        } else if role == "system" {
            if (message.visible ?? false), !content.isEmpty {
                messages.append(.init(id: message.id, role: "system", content: content, isThinking: false, isTool: false, toolName: nil, toolParams: nil, toolResult: nil))
            }
        }
    }

    private func appendUser(_ text: String) {
        messages.append(.init(id: UUID().uuidString, role: "user", content: text, isThinking: false, isTool: false, toolName: nil, toolParams: nil, toolResult: nil))
    }

    private func appendSystem(_ text: String) {
        messages.append(.init(id: UUID().uuidString, role: "system", content: text, isThinking: false, isTool: false, toolName: nil, toolParams: nil, toolResult: nil))
    }

    deinit {
        isUserTerminated = true
        pumpTask?.cancel()
        sidecar.terminate()
    }
}
