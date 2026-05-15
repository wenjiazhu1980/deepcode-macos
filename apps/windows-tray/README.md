# DeepCode Windows Tray App

WPF (.NET 8) tray companion to `@vegamo/deepcode-cli`. Mirrors the macOS menu bar app:
spawns the CLI as a Node sidecar and talks NDJSON over stdio.

## Architecture

```
[ NotifyIcon (system tray) ]  ←→  [ ChatViewModel ]  ←→  [ JsonRpcBridge ]  ←pipe→  [ deepcode headless ]
                                                                                             |
                                                                                             ↓
                                                                                      [ SessionManager (JS) ]
```

Identical wire protocol to macOS — see `apps/macos-menubar/DeepCode/Sidecar/ProtocolTypes.swift`
for the source of truth (C# port lives under `DeepCode/Sidecar/ProtocolTypes.cs`).

## Build locally

You need:
- Visual Studio 2022 (17.8+) or `dotnet` 8 SDK on the PATH
- Node 18.17+
- Git for Windows (the CLI's bash tool delegates to Git Bash via `findGitBashPath`)
- PowerShell 7+ (`pwsh`) — comes pre-installed on Windows 11

```pwsh
# from the repo root
npm ci
pwsh apps/windows-tray/scripts/stage-sidecar.ps1   # builds dist/cli.mjs and stages sidecar/
dotnet build apps/windows-tray/DeepCode.sln
dotnet run --project apps/windows-tray/DeepCode/DeepCode.csproj
```

A DeepCode icon appears in the system tray. Click it to toggle the chat popup.

## Release

Push a `windows-v*` tag (e.g. `windows-v0.1.0`) to trigger `.github/workflows/release-windows.yml`. CI:

1. builds `dist/cli.mjs` (Node 18.20.4) and runs tests
2. stages prod-only `node_modules`, `docs/tools/`, downloads the official `node-v18.20.4-win-x64.zip`
3. `dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true`
4. assembles `DeepCode-windows-vX.Y.Z-win-x64.zip` (~100 MB; .NET runtime + sidecar bundled)
5. uploads to a GitHub Release named after the tag

The first release is **unsigned**: SmartScreen will warn the user; they have to click
"More info → Run anyway". Code signing (EV/OV cert) is on the roadmap.

## Files

- `DeepCode.sln` / `DeepCode/DeepCode.csproj` — VS solution + project
- `DeepCode/App.xaml(.cs)` — `Application` entry, owns `ChatViewModel` lifetime
- `DeepCode/TrayHost.cs` + `PopupWindow.xaml(.cs)` — `H.NotifyIcon.Wpf` tray + popup window
- `DeepCode/Sidecar/` — Process + NDJSON bridge to `node.exe cli.mjs headless`
- `DeepCode/Models/ChatViewModel.cs` — `ObservableObject` state for the popup
- `DeepCode/Views/` — WPF UserControls (ChatPopover, HeaderBar, MessageList, InputBar, SessionListView)
- `DeepCode/Services/SettingsLoader.cs` — read/write `%USERPROFILE%\.deepcode\settings.json`
- `DeepCode/Resources/sidecar/` — staged at build time; `.gitkeep` is the only checked-in file
- `scripts/stage-sidecar.ps1` — local-dev sidecar staging (mirrors `apps/macos-menubar/scripts/stage-sidecar.sh`)

## Settings & sessions

This MVP shares state with the CLI, the macOS app, and the VSCode extension:

- Settings: `%USERPROFILE%\.deepcode\settings.json` (read-only from the app, except for `lastProjectRoot`)
- Sessions: `%USERPROFILE%\.deepcode\projects\{projectCode}\sessions-index.json` and `*.jsonl`
- Skills: `%USERPROFILE%\.agents\skills\` and `.\.deepcode\skills\`

`projectCode` is derived as `projectRoot.replace(/[\\/]/g, "-").replace(/:/g, "")`,
so `C:\dev\foo` → `C-dev-foo`. A session created in the Windows app shows up in `deepcode /resume`
and vice versa.

## Known limitations

- **SmartScreen warning** — first run requires "More info → Run anyway" (unsigned binary)
- **Bash tool depends on Git for Windows** — the CLI's `findGitBashPath` looks in
  `C:\Program Files\Git\bin\bash.exe` and on `PATH`. Without it, the `bash` tool will fail
  loudly at first invocation.
- **No PTY** — headless mode does not require a TTY, so we use plain pipes. Interactive `read`
  prompts in the bash tool are not yet supported (CLI-side limitation, not specific to this app).
- **x64 only** — ARM64 build target is on the roadmap.
