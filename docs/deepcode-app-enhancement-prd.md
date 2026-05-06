# Product Requirements Document: DeepCode macOS App 功能增强

**Version**: 1.0  
**Date**: 2026-05-06  
**Author**: Sarah (Product Owner)  
**Quality Score**: 78/100 (revised after code review)  
**GitHub**: https://github.com/lessweb/deepcode-cli

---

## Executive Summary

DeepCode 是一个 AI 编码助手，由 **TypeScript CLI 引擎** (`@vegamo/deepcode-cli`) 和 **macOS 原生 App** (`com.vegamo.deepcode.menubar`) 两部分组成。CLI 引擎通过两种模式运行：**TUI 终端模式**（Ink/React）和 **Headless 模式**（NDJSON over stdio，供 macOS App 使用）。

当前 macOS App 作为 headless 前端，仅使用了 CLI 引擎的部分能力。TUI 模式中已有的 **图片粘贴**、**`/` 斜杠命令菜单**、**Skills 技能系统**等功能在 macOS App 中未完全暴露。本方案旨在将 CLI 的全部能力对接到 macOS App，并增加 **项目目录记忆与切换** 等新功能。

架构关系：

```
┌────────────────────────────────────┐
│  DeepCode.app (macOS Swift 原生)    │  ← 改造目标：GUI 前端
│  - Menu Bar 入口                    │
│  - 聊天窗口                         │
│  - PWD 选择器                       │
│  - 命令面板                         │
│  - 图片预览                         │
├────────────────────────────────────┤
│  NSPipes (stdin/stdout NDJSON)      │  ← 通信层：扩展协议
├────────────────────────────────────┤
│  sidecar/cli.cjs (Node.js)          │  ← 改造目标：CLI 引擎
│  - Headless 模式 (NDJSON server)    │
│  - Session 管理                     │
│  - Tool 执行                        │
│  - Skills 系统                      │
└────────────────────────────────────┘
```

---

## Problem Statement

**Current Situation**: DeepCode macOS App 在当前版本 (`0.1.0` build 5) 中功能比较基础，许多 CLI TUI 模式中已实现的能力没有在原生 App 中体现：

1. **无 PWD 切换**：`--project-root` 在 App 启动时固定，无法在工作过程中切换到其他项目目录
2. **无 `/` 命令菜单**：TUI 中按 `/` 会弹出命令/skill 菜单，App 中无等效功能
3. **无图片粘贴**：TUI 中 `ctrl+v` 可从剪贴板粘贴图片作为 prompt 附件，App 不支持
4. **Headless 协议不完整**：`submit` 命令在协议层仅透传 `text` 字段，但 `SessionManager.handleUserPrompt()` 内部 API 已支持 `imageUrls` 和 `skills`（`UserPromptContent` 类型已定义），只需扩展协议桥接即可；此外缺少 `list_slash_commands`、`change_project_root`、`read_clipboard_image` 等命令

**Proposed Solution**:  
- **CLI 端**（开源 TypeScript）：扩展 headless NDJSON 协议，增加 5 个新消息类型/字段
- **macOS App 端**（Swift 原生）：对接新协议，增加 PWD 选择器、命令面板、图片粘贴 UI

**Business Impact**: 让 macOS 原生 App 功能与 CLI TUI 持平甚至超越，提升用户在日常开发中的使用体验，减少对终端的依赖。

---

## Success Metrics

**Primary KPIs:**
- **功能覆盖率**：macOS App 与 CLI TUI 核心功能对齐度达到 95%
- **PWD 切换效率**：用户可在 3 分钟内切换项目目录并继续对话
- **图片粘贴可用性**：macOS 剪贴板图片粘贴成功率 > 99%
- **命令菜单响应**：输入 `/` 后命令列表 < 200ms 弹出

**Validation**: 功能发布后 2 周内收集用户反馈，对比使用频率。

---

## User Personas

### Primary: 日常开发者
- **Role**: 使用 DeepCode 进行日常 AI 辅助编程的 macOS 开发者
- **Goals**: 
  - 在不同项目间快速切换，让 AI 理解当前项目上下文
  - 用截图/设计稿作为 prompt 输入，让 AI 参考视觉内容
  - 快速触发 skills（如 product-requirements、agent-drift-guard）
- **Pain Points**: 切换项目需要重启 App；无法粘贴图片；不知道有哪些可用命令
- **Technical Level**: 中级

### Secondary: DeepCode CLI 老用户
- **Role**: 已有 CLI 使用习惯，期望 macOS App 提供更好体验
- **Goals**: macOS App 提供 CLI 的全部功能，同时享受原生 GUI 的便利
- **Pain Points**: CLI 快捷键在 App 中无效；App 功能比 CLI 少
- **Technical Level**: 高级

---

## User Stories & Acceptance Criteria

### Story 1: 项目目录记忆与切换

**As a** 开发者  
**I want to** 在工作流程中记忆并切换项目根目录  
**So that** AI 在不同项目间切换时能正确理解项目上下文

**Acceptance Criteria:**
- [ ] App 启动时自动恢复上次使用的项目目录
- [ ] 提供目录选择 UI（文件浏览器或路径输入框）
- [ ] 切换目录后，当前会话上下文自动更新（AI 知道切换到了新项目）
- [ ] 目录历史记录（最近 5 个）可快速选择
- [ ] 目录信息始终在 App 窗口可见（如标题栏/状态栏）

### Story 2: `/` 命令面板

**As a** 开发者  
**I want to** 输入 `/` 后看到所有可用命令和 skills  
**So that** 我能快速发现并使用 DeepCode 的功能

**Acceptance Criteria:**
- [ ] 输入 `/` 后弹出命令列表浮窗
- [ ] 列表包含：已加载/未加载的 skills、已加载标记 ✓
- [ ] 列表包含内置命令：`/new`（新会话）、`/resume`（恢复会话）、`/skills`（列出 skills）
- [ ] 继续输入字符时实时过滤匹配
- [ ] 选择命令后自动填入/执行

### Story 3: 图片与附件粘贴

**As a** 开发者  
**I want to** 将截图/设计稿粘贴到对话中  
**So that** AI 能参考视觉内容给我回复

**Acceptance Criteria:**
- [ ] 支持 `Cmd+V` 或右键粘贴近剪贴板图片
- [ ] 支持拖拽图片文件到输入区
- [ ] 粘贴后显示图片缩略图预览
- [ ] 可清除已附加的图片（单张或全部）
- [ ] 发送时图片以 `imageUrls` 格式传递给 CLI
- [ ] 支持 PNG、JPEG、GIF、WebP 格式

### Story 4: 会话管理增强

**As a** 开发者  
**I want to** 在 App 中管理多个 AI 对话会话  
**So that** 我能在不同任务间自由切换

**Acceptance Criteria:**
- [ ] 显示最近会话列表（标题/摘要/时间）
- [ ] 支持新建、切换、删除会话
- [ ] 切换会话时恢复完整对话历史
- [ ] 会话与会话间 AI 上下文独立

---

## Functional Requirements

### Core Features

#### Feature 1: PWD 目录管理

| 项目 | 说明 |
|------|------|
| **CLI 协议新增** | `{ type: "change_project_root", path: "/Users/xxx/project" }` |
| **CLI 响应** | `{ type: "project_root_changed", id, path, skills: [...] }` |
| **macOS App UI** | 目录选择器（NSOpenPanel）、路径输入框、最近目录菜单 |
| **持久化** | 写入 `~/.deepcode/settings.json` 的 `lastProjectRoot` 字段 |
| **启动恢复** | App 启动时读取 `lastProjectRoot`，若不存在则弹出目录选择 |
| **Edge Cases** | 目录不存在时提示并回退；权限不足时给出说明 |

#### Feature 2: `/` 命令面板

| 项目 | 说明 |
|------|------|
| **CLI 协议新增** | `{ type: "list_slash_commands" }` |
| **CLI 响应** | `{ type: "slash_commands", id, commands: [...] }` — 包含 skills + 内置命令 |
| **macOS App UI** | 在 input 框中输入 `/` 触发 popover/floating menu |
| **过滤逻辑** | 实时过滤，支持拼音/英文模糊匹配 |
| **内置命令** | `/new` `/resume` `/exit` `/skills` + 所有已安装 skills |
| **Edge Cases** | 输入中文时不影响；未安装 skill 时不显示 |

#### Feature 3: 图片粘贴与发送

| 项目 | 说明 |
|------|------|
| **CLI 协议扩展** | `submit` 消息增加 `imageUrls: string[]` 字段 |
| **CLI 新增命令** | `{ type: "read_clipboard_image" }` → `{ type: "clipboard_image", id, dataUrl }` |
| **macOS App UI** | `Cmd+V` 触发 `NSPasteboard` 读取；拖拽区域接收 `NSDraggingDestination` |
| **图片处理** | 转为 base64 dataURL 后传给 CLI（复刻 `clipboard.ts` 逻辑） |
| **Edge Cases** | 剪贴板无图片时提示；超大图片压缩；非图片文件拒绝 |

#### Feature 4: 会话管理

| 项目 | 说明 |
|------|------|
| **已支持协议** | `list_sessions` / `new_session` / `load_session` — 协议已存在 |
| **macOS App UI 新增** | 侧边栏或下拉菜单显示会话列表 |
| **摘要展示** | 显示首条 prompt 的前 100 字符作为标题 |
| **状态标识** | 显示会话状态：完成/中断/进行中 |
| **Edge Cases** | 空列表提示"新建对话开始"；最多保留 50 条 |

### Out of Scope
- **Settings 编辑界面**：当前 settings 通过编辑 JSON 文件配置，暂不纳入
- **VSCode 插件同步**：暂不涉及 VSCode extension
- **Windows/Linux 原生 App**：本方案仅针对 macOS
- **模型参数热切换**：thinking/reasoning effort 的热切换暂不纳入
- **多窗口支持**：暂保持单窗口 + Menu Bar 模式

---

## Technical Constraints

### Performance
- 命令面板弹出 < 200ms
- 图片粘贴处理（转 base64）< 500ms
- 会话列表加载 < 300ms
- Headless 协议消息往返 < 50ms（本地管道通信）

### Security
- API Key 仍在 `~/.deepcode/settings.json` 中，由用户自行管理权限
- 图片数据仅在本地进程间传递，不上传第三方
- 目录浏览限制在用户 home 目录范围内（可通过配置解除）

### Integration
- **NSPipes (stdin/stdout)**：macOS App ↔ CLI 的唯一通信通道
- **~/.deepcode/settings.json**：配置共享，需保持向后兼容
- **~/.agents/skills/**：skills 目录，CLI 已有完整支持
- **剪切板系统**：`NSPasteboard` / `osascript` / `pngpaste`（macOS 多套方案）

### Technology Stack
- **CLI 端**：TypeScript, Node.js, 打包为 `cli.cjs`
- **macOS App 端**：Swift (推测, 基于符号分析 `NSPipe`, `NSProcessInfo` 等)
- **通信协议**：NDJSON (Newline-Delimited JSON)
- **项目地址**：`https://github.com/lessweb/deepcode-cli`

---

## Headless 协议完整参考

### 现有协议（从 macOS App → CLI）

| 类型 | 字段 | 用途 | 状态 |
|------|------|------|------|
| `submit` | `{ text: string }` | 提交 prompt | ✅ 已实现 |
| `interrupt` | `{}` | 中断当前回复 | ✅ 已实现 |
| `list_sessions` | `{}` | 列出会话 | ✅ 已实现 |
| `new_session` | `{}` | 新建空会话 | ✅ 已实现 |
| `load_session` | `{ sessionId }` | 加载特定会话 | ✅ 已实现 |

### 现有协议（从 CLI → macOS App）

| 类型 | 字段 | 用途 | 状态 |
|------|------|------|------|
| `ready` | `{ version, machineId, projectRoot }` | 启动就绪 | ✅ 已实现 |
| `message` | `{ message }` | AI 回复消息 | ✅ 已实现 |
| `stream` | `{ sessionId, phase, estimatedTokens }` | 流式进度 | ✅ 已实现 |
| `session` | `{ entry }` | 会话更新 | ✅ 已实现 |
| `done` | `{ id, status }` | 处理完成 | ✅ 已实现 |
| `error` | `{ error }` | 错误 | ✅ 已实现 |
| `ack` | `{ id }` | 确认 | ✅ 已实现 |
| `sessions_list` | `{ id, sessions }` | 会话列表 | ✅ 已实现 |
| `session_loaded` | `{ id, sessionId, messages }` | 会话加载完成 | ✅ 已实现 |

### 新增协议（本次方案）

| 方向 | 类型 | 字段 | 用途 |
|------|------|------|------|
| App → CLI | `change_project_root` | `{ path: string }` | 切换项目根目录 |
| CLI → App | `project_root_changed` | `{ id, path, skills[] }` | 目录切换完成，返回该目录的 skills |
| App → CLI | `list_slash_commands` | `{}` | 请求命令列表 |
| CLI → App | `slash_commands` | `{ id, commands: SlashCommandItem[] }` | 返回命令列表 |
| App → CLI | `read_clipboard_image` | `{}` | 请求读取剪贴板图片 |
| CLI → App | `clipboard_image` | `{ id, dataUrl?, error? }` | 返回图片 dataURL |
| App → CLI | `submit` (扩展) | `+ imageUrls?: string[]` | submit 增加图片字段 |
| App → CLI | `submit` (扩展) | `+ skills?: SkillInfo[]` | submit 增加 skills 字段 |

---

## MVP Scope & Phasing

### Phase 1: CLI 协议层改造（1-2 天）

> 开源 TypeScript 代码，位于 `src/headless.ts` 中 `handleInbound()` 函数（注意：不是 `src/cli.tsx`，后者只是入口路由）

- [ ] 扩展 `handleInbound` — 增加 `change_project_root` case
- [ ] 扩展 `handleInbound` — 增加 `list_slash_commands` case
- [ ] 扩展 `handleInbound` — 增加 `read_clipboard_image` case  
- [ ] 扩展 `submit` case — 支持 `imageUrls` 字段和 `skills` 字段（内部 `SessionManager.handleUserPrompt()` 已支持）
- [ ] 增加 `SessionManager.changeProjectRoot()` 方法（需同步更新 `ToolExecutor.projectRoot`）
- [ ] 单元测试：新增协议消息的收发验证
- [ ] 重新构建 `cli.cjs`：`npm run build`

**MVP 定义**：CLI 端协议扩展完成，可通过 `echo '{"type":"change_project_root",...}' | ...` 验证。

### Phase 2: macOS App 对接（3-5 天）

> Swift 原生代码重构/增强

- [ ] **PWD 选择器 UI**
  - NSOpenPanel 目录选择
  - 路径文本输入框
  - 最近目录下拉菜单（存储在 UserDefaults）
  - 窗口标题栏显示当前项目路径
  
- [ ] **命令面板 UI**
  - 输入 `/` 触发 NSPopover / 自定义浮层
  - 显示 skills 列表（含 loaded 标记）
  - 显示内置命令（new/resume/exit/skills）
  - 实时过滤 + 键盘选择 + 点击执行

- [ ] **图片粘贴 UI**
  - `Cmd+V` handler 调用 NSPasteboard 读取图片
  - 拖拽区域（NSView with NSDraggingDestination）
  - 图片缩略图预览（已附加的图片列表）
  - 发送时拼接 `imageUrls`

- [ ] **会话管理 UI**
  - 侧边栏/底部列表显示最近会话
  - 新建/切换/删除会话按钮
  - 会话加载 loading 状态

- [ ] **启动恢复**
  - 读取 `~/.deepcode/settings.json` 中 `lastProjectRoot`
  - 若不存在或无权限，弹出目录选择器
  - `launchd` / Dock 重新打开时恢复会话

### Phase 3: 打磨与测试（1-2 天）

- [ ] 图片粘贴兼容性测试（截图/Mockup/各种格式）
- [ ] 目录切换边界测试（不存在的目录、无权限目录、符号链接）
- [ ] 命令面板性能测试（大量 skills 时响应速度）
- [ ] 深色模式适配
- [ ] 中文/英文 UI 一致性

### Future Considerations
- **模型热切换**：在 App 中切换 deepseek-v4-pro / flash 等模型
- **Thinking 开关**：在 App 中切换 thinking mode
- **Token 用量统计**：在 App 中展示本次会话 token 消耗
- **Settings GUI**：替代手动编辑 JSON 的 settings 面板
- **Stream 进度条**：利用现有的 `LlmStreamProgress` 协议，展示 token 生成进度

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| macOS App 源码不可获取 | High | High | 基于逆向工程（已确认 NSPipes 通信）或重写 Swift 前端 |
| CLI 协议变更破坏向后兼容 | Low | Medium | 新增字段用 optional；旧 App 忽略未知字段 |
| 图片 base64 过大导致管道阻塞 | Medium | Medium | 设置 10MB 上限；超限前压缩或拒绝 |
| PWD 切换导致 skills 缓存不一致 | Low | Low | 切换目录后重新扫描 skills |
| macOS 沙盒限制读取任意目录 | Low | Low | App 已脱离沙盒（Menu Bar 模式），不受限 |

---

## Dependencies & Blockers

**Dependencies:**
- **GitHub repo `lessweb/deepcode-cli`**：CLI 的 TypeScript 源代码，需要 fork 并提交 PR
- **Xcode / Swift 工具链**：macOS App 的构建环境
- **`cli.cjs` 构建流程**：需确认 `package.json` 中的 build script

**Known Blockers:**
- ~~**macOS App 源文件未在公开仓库中**~~ **已确认：** macOS App 源码位于 `apps/macos-menubar/DeepCode/`，包含完整的 Swift/SwiftUI 源码（`SidecarProcess.swift`、`ChatViewModel.swift`、`ProtocolTypes.swift`、`InputBar.swift`、`ChatPopover.swift`、`SettingsLoader.swift` 等），可直接基于现有代码改造。

- 替代方案（如源码不可获取时）：
  1. 使用 `Frida` / `class-dump` 逆向现有 App 并注入功能
  2. 从头构建一个更完整的 Swift/SwiftUI macOS App，重用以 headless 模式运行的 `cli.cjs`

---

## 关键源码文件参考

### CLI 端（TypeScript，`github.com/lessweb/deepcode-cli`）

| 文件 | 用途 | 改造点 |
|------|------|--------|
| `src/headless.ts` | headless 协议处理（入口路由在 `src/cli.tsx`） | `handleInbound()` 增加新 case；扩展 Inbound/Outbound 类型 |
| `src/session.ts` | SessionManager 核心逻辑 | 增加 `changeProjectRoot()` 方法 |
| `src/tools/executor.ts` | ToolExecutor | 支持运行时更新 `projectRoot`（当前为 `private readonly`） |
| `src/ui/clipboard.ts` | 剪贴板图片读取 | 已有完整实现，通过 `read_clipboard_image` 协议暴露 |
| `src/ui/slashCommands.ts` | 斜杠命令定义和过滤 | 已有完整实现，通过 `list_slash_commands` 协议暴露 |
| `src/settings.ts` | 配置文件类型定义 | 增加 `lastProjectRoot` 字段到 `DeepcodingSettings` |

### macOS App 端（Swift，`apps/macos-menubar/DeepCode/`）

| 文件 | 用途 | 改造点 |
|------|------|--------|
| `SidecarProcess.swift` | NSPipe 通信 + Node.js sidecar 启动 | 无需改动（协议层扩展后自动兼容） |
| `ProtocolTypes.swift` | `ClientCommand` / `ServerEvent` 协议定义 | 增加新 command/event case |
| `ChatViewModel.swift` | 核心业务逻辑 | 增加 PWD 切换、命令面板、图片粘贴处理 |
| `InputBar.swift` | 输入栏 UI | 增加 `/` 命令面板触发、`Cmd+V` 图片粘贴 |
| `ChatPopover.swift` | 主窗口 UI（含 HeaderBar） | 增加 PWD 显示、会话列表入口 |
| `SettingsLoader.swift` | 配置读取 + `defaultProjectRoot()` | 增加 `lastProjectRoot` 读写 |

---

## Appendix

### Glossary
- **CLI**：Command Line Interface，指 `cli.cjs` Node.js 程序
- **Headless mode**：CLI 的无头模式，通过 stdin/stdout NDJSON 协议与前端通信
- **NDJSON**：Newline-Delimited JSON，每行一条完整的 JSON 消息
- **TUI**：Terminal User Interface，CLI 的终端交互模式（基于 Ink/React）
- **PWD**：Project Working Directory，项目根目录，传给 `--project-root`
- **Skills**：DeepCode 的扩展机制，位于 `~/.agents/skills/*/SKILL.md`
- **Sidecar**：随主 App 启动的后台进程，这里指以 headless 模式运行的 CLI

### References
- CLI 源码: https://github.com/lessweb/deepcode-cli
- VSCode 扩展: https://github.com/lessweb/deepcode
- 已安装配置: `~/.deepcode/settings.json`
- 已安装 Skills: `~/.agents/skills/*/SKILL.md`

---

*本 PRD 基于对 DeepCode v0.1.10 CLI 和 v0.1.0 macOS App 的逆向分析，通过结构化需求梳理生成。*
