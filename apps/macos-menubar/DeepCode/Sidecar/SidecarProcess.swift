import Foundation

enum SidecarError: Error, LocalizedError {
    case missingNodeBinary
    case missingCliBundle

    var errorDescription: String? {
        switch self {
        case .missingNodeBinary: return "Bundled Node binary not found in app Resources/sidecar/."
        case .missingCliBundle: return "Bundled cli.mjs not found in app Resources/sidecar/."
        }
    }
}

final class SidecarProcess {
    private(set) var process: Process?
    let bridge: JSONRPCBridge
    private let inputPipe = Pipe()
    private let outputPipe = Pipe()
    private let errorPipe = Pipe()
    private var stderrBuffer: String = ""

    var onStderrLine: ((String) -> Void)?
    var onProcessTerminated: ((Int32) -> Void)?

    init() {
        self.bridge = JSONRPCBridge(inputPipe: inputPipe, outputPipe: outputPipe)
    }

    /// Launch the bundled Node sidecar.
    /// Throws if the bundled `node` or `cli.mjs` is missing.
    func launch(projectRoot: String? = nil) throws {
        guard let bundleResources = Bundle.main.resourceURL else {
            throw SidecarError.missingCliBundle
        }
        let sidecarDir = bundleResources.appendingPathComponent("sidecar", isDirectory: true)
        let nodeURL = sidecarDir.appendingPathComponent("node")
        let cliURL = sidecarDir.appendingPathComponent("cli.mjs")

        guard FileManager.default.isExecutableFile(atPath: nodeURL.path) else {
            throw SidecarError.missingNodeBinary
        }
        guard FileManager.default.fileExists(atPath: cliURL.path) else {
            throw SidecarError.missingCliBundle
        }

        let process = Process()
        process.executableURL = nodeURL
        var args = [cliURL.path, "headless"]
        let resolvedRoot = projectRoot ?? FileManager.default.homeDirectoryForCurrentUser.path
        args.append(contentsOf: ["--project-root", resolvedRoot])
        process.arguments = args
        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe
        process.currentDirectoryURL = sidecarDir

        // Pass through HOME so settings under ~/.deepcode/ resolve correctly.
        var env = ProcessInfo.processInfo.environment
        env["NODE_ENV"] = "production"
        process.environment = env

        errorPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let self = self else { return }
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            self.stderrBuffer.append(text)
            while let newline = self.stderrBuffer.firstIndex(of: "\n") {
                let line = String(self.stderrBuffer[..<newline])
                self.stderrBuffer.removeSubrange(...newline)
                self.onStderrLine?(line)
            }
        }

        process.terminationHandler = { [weak self] process in
            let status = process.terminationStatus
            DispatchQueue.main.async {
                self?.onProcessTerminated?(status)
            }
        }
        try process.run()
        self.process = process
    }

    func send(_ command: ClientCommand) {
        bridge.send(command)
    }

    var isRunning: Bool {
        process?.isRunning ?? false
    }

    deinit {
        errorPipe.fileHandleForReading.readabilityHandler = nil
    }

    func terminate() {
        bridge.close()
        process?.terminate()
    }
}
