import Foundation

// MARK: - Shared types

struct SkillInfo: Codable {
    let name: String
    let path: String
    let description: String
    let isLoaded: Bool?
}

struct SlashCommandItem: Decodable {
    let kind: String          // "skill" | "skills" | "new" | "resume" | "exit"
    let name: String
    let label: String
    let description: String
    let skill: SkillInfo?
}

// MARK: - Inbound (App → CLI)

enum ClientCommand: Encodable {
    case submit(id: String, text: String, imageUrls: [String]? = nil, skills: [SkillInfo]? = nil)
    case interrupt(id: String?)
    case listSessions(id: String)
    case loadSession(id: String, sessionId: String)
    case newSession(id: String)
    case changeProjectRoot(id: String, path: String)
    case listSlashCommands(id: String)
    case readClipboardImage(id: String)

    private enum CodingKeys: String, CodingKey {
        case type, id, text, sessionId, path
        case imageUrls, skills
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .submit(id, text, imageUrls, skills):
            try container.encode("submit", forKey: .type)
            try container.encode(id, forKey: .id)
            try container.encode(text, forKey: .text)
            if let imageUrls = imageUrls, !imageUrls.isEmpty {
                try container.encode(imageUrls, forKey: .imageUrls)
            }
            if let skills = skills, !skills.isEmpty {
                try container.encode(skills, forKey: .skills)
            }
        case let .interrupt(id):
            try container.encode("interrupt", forKey: .type)
            if let id = id { try container.encode(id, forKey: .id) }
        case let .listSessions(id):
            try container.encode("list_sessions", forKey: .type)
            try container.encode(id, forKey: .id)
        case let .loadSession(id, sessionId):
            try container.encode("load_session", forKey: .type)
            try container.encode(id, forKey: .id)
            try container.encode(sessionId, forKey: .sessionId)
        case let .newSession(id):
            try container.encode("new_session", forKey: .type)
            try container.encode(id, forKey: .id)
        case let .changeProjectRoot(id, path):
            try container.encode("change_project_root", forKey: .type)
            try container.encode(id, forKey: .id)
            try container.encode(path, forKey: .path)
        case let .listSlashCommands(id):
            try container.encode("list_slash_commands", forKey: .type)
            try container.encode(id, forKey: .id)
        case let .readClipboardImage(id):
            try container.encode("read_clipboard_image", forKey: .type)
            try container.encode(id, forKey: .id)
        }
    }
}

// MARK: - Outbound (CLI → App)

struct ServerSessionEntry: Decodable {
    let id: String
    let summary: String?
    let assistantReply: String?
    let assistantThinking: String?
    let assistantRefusal: String?
    let status: String
    let failReason: String?
    let activeTokens: Int?
    let createTime: String
    let updateTime: String
}

struct ServerMessage: Decodable {
    let id: String
    let sessionId: String
    let role: String
    let content: String?
    let visible: Bool?
    let createTime: String?
    let meta: ServerMessageMeta?
    let messageParams: ServerMessageParams?
}

struct ServerMessageMeta: Decodable {
    let asThinking: Bool?
    let isSummary: Bool?
    let paramsMd: String?
    let resultMd: String?
    let function: ServerFunctionRef?
}

/// CLI sometimes returns the assistant reply only inside `messageParams.reasoning_content`
/// (thinking-only models like deepseek-v3.2 on Volcano Ark). UI must fall back to it
/// when `content` is empty.
struct ServerMessageParams: Decodable {
    let reasoningContent: String?

    private enum CodingKeys: String, CodingKey {
        case reasoningContent = "reasoning_content"
    }
}

struct ServerFunctionRef: Decodable {
    let name: String?
    let arguments: String?
}

enum ServerEvent: Decodable {
    case ready(version: String, machineId: String?, projectRoot: String)
    case session(entry: ServerSessionEntry)
    case stream(phase: String, estimatedTokens: Int, formattedTokens: String, sessionId: String?)
    case message(ServerMessage)
    case sessionsList(id: String, sessions: [ServerSessionEntry])
    case sessionLoaded(id: String, sessionId: String, messages: [ServerMessage])
    case error(id: String?, message: String)
    case done(id: String, status: String)
    case ack(id: String)
    case projectRootChanged(id: String, path: String, skills: [SkillInfo])
    case slashCommands(id: String, commands: [SlashCommandItem])
    case clipboardImage(id: String, dataUrl: String?, error: String?)
    case unknown(rawType: String)

    private enum CodingKeys: String, CodingKey {
        case type
        case version, machineId, projectRoot
        case entry
        case phase, estimatedTokens, formattedTokens, sessionId
        case message
        case id, sessions, messages
        case error
        case status
        case path, skills
        case commands
        case dataUrl
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "ready":
            let version = try container.decode(String.self, forKey: .version)
            let machineId = try container.decodeIfPresent(String.self, forKey: .machineId)
            let projectRoot = try container.decode(String.self, forKey: .projectRoot)
            self = .ready(version: version, machineId: machineId, projectRoot: projectRoot)
        case "session":
            let entry = try container.decode(ServerSessionEntry.self, forKey: .entry)
            self = .session(entry: entry)
        case "stream":
            let phase = try container.decode(String.self, forKey: .phase)
            let est = (try? container.decode(Int.self, forKey: .estimatedTokens)) ?? 0
            let formatted = (try? container.decode(String.self, forKey: .formattedTokens)) ?? "0"
            let sid = try container.decodeIfPresent(String.self, forKey: .sessionId)
            self = .stream(phase: phase, estimatedTokens: est, formattedTokens: formatted, sessionId: sid)
        case "message":
            let msg = try container.decode(ServerMessage.self, forKey: .message)
            self = .message(msg)
        case "sessions_list":
            let id = try container.decode(String.self, forKey: .id)
            let sessions = try container.decode([ServerSessionEntry].self, forKey: .sessions)
            self = .sessionsList(id: id, sessions: sessions)
        case "session_loaded":
            let id = try container.decode(String.self, forKey: .id)
            let sid = try container.decode(String.self, forKey: .sessionId)
            let messages = try container.decode([ServerMessage].self, forKey: .messages)
            self = .sessionLoaded(id: id, sessionId: sid, messages: messages)
        case "error":
            let id = try container.decodeIfPresent(String.self, forKey: .id)
            let message = try container.decode(String.self, forKey: .error)
            self = .error(id: id, message: message)
        case "done":
            let id = try container.decode(String.self, forKey: .id)
            let status = try container.decode(String.self, forKey: .status)
            self = .done(id: id, status: status)
        case "ack":
            let id = try container.decode(String.self, forKey: .id)
            self = .ack(id: id)
        case "project_root_changed":
            let id = try container.decode(String.self, forKey: .id)
            let path = try container.decode(String.self, forKey: .path)
            let skills = (try? container.decode([SkillInfo].self, forKey: .skills)) ?? []
            self = .projectRootChanged(id: id, path: path, skills: skills)
        case "slash_commands":
            let id = try container.decode(String.self, forKey: .id)
            let commands = (try? container.decode([SlashCommandItem].self, forKey: .commands)) ?? []
            self = .slashCommands(id: id, commands: commands)
        case "clipboard_image":
            let id = try container.decode(String.self, forKey: .id)
            let dataUrl = try container.decodeIfPresent(String.self, forKey: .dataUrl)
            let error = try container.decodeIfPresent(String.self, forKey: .error)
            self = .clipboardImage(id: id, dataUrl: dataUrl, error: error)
        default:
            self = .unknown(rawType: type)
        }
    }
}
