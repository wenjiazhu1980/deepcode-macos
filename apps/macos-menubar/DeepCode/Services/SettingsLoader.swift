import Foundation

struct DeepcodeSettings {
    let model: String
    let baseURL: String
    let hasApiKey: Bool
    let lastProjectRoot: String?
}

enum SettingsLoader {
    static func load() -> DeepcodeSettings {
        let url = settingsURL()
        guard let data = try? Data(contentsOf: url),
              let raw = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return DeepcodeSettings(model: "deepseek-v4-pro", baseURL: "https://api.deepseek.com", hasApiKey: false, lastProjectRoot: nil)
        }
        let env = raw["env"] as? [String: Any] ?? [:]
        let model = (env["MODEL"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "deepseek-v4-pro"
        let baseURL = (env["BASE_URL"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "https://api.deepseek.com"
        let apiKey = env["API_KEY"] as? String ?? ""
        let lastProjectRoot = (raw["lastProjectRoot"] as? String).flatMap { $0.isEmpty ? nil : $0 }
        return DeepcodeSettings(model: model, baseURL: baseURL, hasApiKey: !apiKey.isEmpty, lastProjectRoot: lastProjectRoot)
    }

    static func settingsURL() -> URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".deepcode/settings.json")
    }

    static func defaultProjectRoot() -> String {
        // Restore last project root from settings, fallback to home directory.
        if let lastRoot = load().lastProjectRoot {
            var isDir: ObjCBool = false
            if FileManager.default.fileExists(atPath: lastRoot, isDirectory: &isDir), isDir.boolValue {
                return lastRoot
            }
        }
        return FileManager.default.homeDirectoryForCurrentUser.path
    }

    static func saveLastProjectRoot(_ path: String) {
        let url = settingsURL()
        var raw: [String: Any] = [:]
        if let data = try? Data(contentsOf: url),
           let existing = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            raw = existing
        }
        raw["lastProjectRoot"] = path

        let dir = url.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if let data = try? JSONSerialization.data(withJSONObject: raw, options: .prettyPrinted) {
            try? data.write(to: url, options: .atomic)
        }
    }
}
