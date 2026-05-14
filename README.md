# DeepCode CLI - AI Coding Assistant for Terminal

> **DeepSeek API 没有联网功能？复制粘贴烦死了？**
> DeepCode CLI 让 DeepSeek 在终端里联网搜索、自动修 Bug、自定义脚本省 Token。
> 开源免费，Claude Code 十分之一的价格。Vibe coding 神器，程序员必备 AI 工具。

**English**: [README English](./README_en.md)

[![Demo Video](https://img.shields.io/badge/▶️-Demo-FF6B6B?style=for-the-badge)](https://www.bilibili.com/video/BV11ARqB7Eco)
[![npm version](https://img.shields.io/npm/v/@vegamo/deepcode-cli.svg)](https://www.npmjs.com/package/@vegamo/deepcode-cli)
[![npm downloads](https://img.shields.io/npm/dm/@vegamo/deepcode-cli.svg)](https://www.npmjs.com/package/@vegamo/deepcode-cli)
[![GitHub stars](https://img.shields.io/github/stars/lessweb/deepcode-cli)](https://github.com/lessweb/deepcode-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DeepSeek V4](https://img.shields.io/badge/DeepSeek-V4-orange)](https://www.deepseek.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 为什么需要 DeepCode CLI？

DeepSeek V4 很强，但用它编程让人抓狂：

- ❌ **API 本身不联网**，每次查资料都要手动复制粘贴
- ❌ **Bug 定位靠人肉**，看日志、搜解决方案，重复劳动
- ❌ **Token 烧得心疼**，多轮对话没有缓存，上下文重复计费
- ❌ **Claude Code 太贵**，$20~$200/月，且不开源

DeepCode CLI 是专为 DeepSeek V4 深度优化的**开源终端 AI 编程助手（Terminal AI Coding Assistant）**，一行命令装好，终端里直接用。支持联网搜索、自动 Bug 修复、Agent Skills 扩展，是 Claude Code 的最佳开源替代方案。

---

## ✨ 核心特性 | Features

> 🚀 **AI Terminal Coding Assistant** with web search, bug fixing, and extensible agent skills. Perfect for vibe coding with DeepSeek.

### 🌐 1. 联网搜索 — 补齐 DeepSeek 的最大短板

DeepSeek API 没有联网能力。DeepCode CLI 内置**免费 Web Search 工具**，AI 在终端里直接搜索最新资料，无需复制粘贴。支持自定义搜索脚本，满足个性化需求。

> 用 `deepcode` 问"最新的 React 19 有哪些特性"，AI 直接联网查，返回答案。

**关键词**: web search, ai search, internet search, real-time information

---

### 🐛 2. 自动修 Bug — 终端里的 AI 修理工

粘贴错误日志，AI 自动分析 → 定位根因 → 生成修复代码，你只需要确认执行。支持多种编程语言和框架的智能诊断。

**关键词**: bug fix, error handling, code debugging, automated repair

```bash
# 终端里直接丢给它错误信息
deepcode

> paste your error log here...
> 分析中...
> 发现问题：N+1 查询导致数据库连接池耗尽
> 正在生成修复方案...
```

---

### 💰 3. 自定义脚本省 Token — Agent Skills 系统

编写自定义脚本（`~/.agents/skills/`），让 AI 按预设流程执行，**避免重复消耗 Token**。用户级 + 项目级双级 Skills 系统，灵活扩展。

配合 KV Cache 上下文缓存，多轮对话中缓存命中时 Token 成本降低 **80%+**。

> 比 Claude Code ($200/月) 便宜 90%+，只需 API 成本。支持 DeepSeek、火山方舟、Ollama 等多种模型。

**关键词**: agent skills, custom scripts, token optimization, kv cache, cost saving

---

### 🔓 4. 开源免费 — 看得见、审得了、部署得起

- ✅ **MIT 开源协议**，代码完全透明可审计
- ✅ 无锁定，自部署到私有服务器
- ✅ 用户级 + 项目级双级 Skills 系统

> 你的代码，永远是你的代码。

---

### ⌨️ 5. 终端原生 — 不用离开命令行

```bash
npm install -g @vegamo/deepcode-cli
cd your-project/
deepcode
```

无需切换窗口，VSCode 写代码，终端里和 AI 对话。

![intro2](resources/intro2.png)

## 🖥️ DeepCode 原生 Mac App — 菜单栏里的 AI 编程助手

除了终端和 VSCode，DeepCode 还提供了**原生 macOS 菜单栏应用**，点击菜单栏 ✨ 图标即可唤起 AI 对话窗口，无需打开终端。

```
[ 菜单栏 ✨ 图标 ]  ←点击→  [ ChatPopover 窗口 ]  ←pipe→  [ deepcode CLI (sidecar) ]
                                                              │
                                                              ↓
                                                     [ SessionManager / AI 引擎 ]
```

### 🎯 为什么用 Mac App？

| 场景 | 终端 `deepcode` | Mac App |
|------|:---:|:---:|
| 重度 CLI 用户 | ✅ 最佳 | — |
| VSCode 里写代码 | ✅ 扩展 | — |
| **随手唤出 AI 问问题** | 需要切终端 | ✅ **一键呼出** |
| **不熟悉命令行的用户** | 门槛高 | ✅ **零门槛** |
| **想随时查看历史会话** | `/resume` | ✅ **图形化会话列表** |
| **多项目快速切换** | `cd` 切换目录 | ✅ **菜单一键切换** |

### ✨ Mac App 主要能力

#### 💬 AI 对话

- 与 DeepSeek 模型实时对话，支持流式输出和 Token 计数显示
- 展示 AI 的 **Thinking 过程**（思维链推理），让你看到 AI 如何思考
- 工具调用过程可视化 — 展示 AI 正在执行的工具名称、参数和结果
- 支持中断正在生成的回复（点击停止按钮）

#### 🖼️ 图片理解

- `⌘V` 粘贴剪贴板图片，支持 PNG / JPEG / GIF / WebP 格式
- 粘贴后显示缩略图预览，可逐张移除或全部清除
- 图片以 base64 编码发送给 AI，推荐使用火山方舟 `Doubao-Seed-2.0-pro` 模型

#### 📂 项目目录切换

- 通过文件夹选择器（NSOpenPanel）切换项目根目录
- 切换后 AI 自动感知新项目的上下文和 Skills
- 自动记忆上次使用的项目目录，下次启动直接恢复

#### 📋 会话管理

- 图形化会话列表，显示会话摘要、状态和更新时间
- 支持新建、切换、恢复多个对话会话
- 会话与 CLI / VSCode **三端互通** — Mac App 创建的会话，终端 `/resume` 也能看到

#### ⌨️ 斜杠命令面板

- 输入 `/` 触发命令面板，显示所有可用命令和已加载的 Skills
- 实时过滤匹配，支持键盘选择和点击执行
- 内置命令：`/new`（新会话）、`/resume`（恢复会话）、`/skills`（列出 Skills）

#### 🧠 完整 AI 工具链

Mac App 通过 headless 协议对接 CLI 引擎，拥有与终端相同的完整能力：

| 工具 | 能力 |
|------|------|
| `bash` | 在项目目录中执行任意 Shell 命令 |
| `read` | 读取文件、图片、PDF、Jupyter Notebook |
| `write` / `edit` | 创建或精确编辑项目文件 |
| `WebSearch` | 联网搜索最新资料，补齐 DeepSeek 的联网短板 |
| `AskUserQuestion` | AI 遇到歧义时主动向你提问确认 |

#### 🔗 三端共享

- 配置文件 `~/.deepcode/settings.json` 与 CLI、VSCode 扩展**同一份**
- Agent Skills（`~/.agents/skills/`）自动加载，用户级 + 项目级双级支持
- 会话数据三端互通，无缝切换工作环境

#### 📦 零依赖打包

- App 内置 Node.js 运行时 + deepcode CLI，用户**无需安装 Node.js**
- 原生 SwiftUI 构建，轻量流畅，macOS 13+ 原生体验
- 菜单栏常驻，点击 sparkles 图标即可唤起 480×640 弹出式聊天窗口

### 📥 下载安装

从 [GitHub Releases](https://github.com/lessweb/deepcode-cli/releases) 下载最新 DMG：

```bash
# 1. 下载 DeepCode-vX.X.X.dmg
# 2. 双击挂载，拖入 Applications 文件夹
# 3. 首次打开时右键 → "打开"（未公证版本）
```

> 💡 Mac App 首次启动会自动检测 `~/.deepcode/settings.json`，如果尚未配置，会提示先运行 `deepcode --setup`。

### 🛠️ 本地构建

```bash
brew install xcodegen          # 安装 XcodeGen
cd apps/macos-menubar
bash scripts/stage-sidecar.sh  # 构建 CLI + 复制到 sidecar
xcodegen generate              # 生成 Xcode 工程
open DeepCode.xcodeproj        # Cmd+R 运行
```

> 源码位于 `apps/macos-menubar/`，MIT 开源，欢迎贡献。

---

## 🚀 快速开始 | Quick Start

### 安装 Install

```bash
# 全局安装（需要 Node.js 18+）
npm install -g @vegamo/deepcode-cli

# 或使用 npx（无需安装）
npx @vegamo/deepcode-cli
```

### 配置 Setup

```bash
# 创建配置文件 ~/.deepcode/settings.json
deepcode --setup
```

### 启动 Use

```bash
# 在项目目录里直接启动
cd your-project/
deepcode
```

> 💡 配置文件与 VSCode 扩展 [DeepCode VSCode](https://marketplace.visualstudio.com/items?itemName=vegamo.deepcode-vscode) **共享**，终端和编辑器二选一，或同时用。

---

## 🔧 配置示例

```json
{
  "env": {
    "MODEL": "deepseek-v4-pro",
    "BASE_URL": "https://api.deepseek.com",
    "API_KEY": "sk-..."
  },
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
```

**reasoningEffort** — 控制 AI "思考深度"：简单任务设 `low`，复杂任务设 `max`，不浪费 Token。

完整配置说明（多层级优先级、环境变量等）请参阅 [docs/configuration.md](docs/configuration.md)。

---

## 🛠️ 完整功能列表

| 功能 | 说明 |
|------|------|
| 🌐 **联网搜索** | 内置免费 Web Search 工具，支持自定义脚本 |
| 🐛 **Bug 自动修复** | 粘贴错误日志，AI 自动定位 + 生成修复 |
| 💰 **KV Cache** | 上下文缓存，多轮对话 Token 成本降低 80%+ |
| 🧠 **Thinking Mode** | 可配置推理深度（`reasoningEffort`） |
| 📜 **Agent Skills** | 用户级（`~/.agents/skills/`）+ 项目级（`./.deepcode/skills/`）|
| 🖼️ **图片理解** | `Ctrl+V` 直接粘贴剪贴板图片（推荐 Volcano Ark `Doubao-Seed-2.0-pro`）|
| 🔔 **任务通知** | 支持 Slack/钉钉 Webhook 脚本，任务完成后自动推送 |
| 🖥️ **原生 Mac App** | macOS 菜单栏应用，点击即聊，与 CLI/VSCode 共享配置和会话 |
| 🤖 **OpenAI 兼容** | 同时支持火山方舟 Coding Plan、Ollama、自托管模型 |

---

## 斜杠命令与按键功能

| 斜杠命令         | 操作                                        |
|-----------------|---------------------------------------------|
| `/`             | 打开 skills / 命令菜单                      |
| `/new`          | 开始新对话                                  |
| `/resume`       | 选择历史对话继续                            |
| `/model`        | 切换模型、思考模式和推理强度                |
| `/init`         | 初始化 AGENTS.md 文件                      |
| `/skills`       | 列出可用 skills                             |
| `/mcp`          | 查看 MCP 服务器状态和可用工具               |
| `/exit`         | 退出（也可用连续 `Ctrl+D`）                 |

| 按键             | 操作                                        |
|-----------------|---------------------------------------------|
| `Enter`         | 发送消息                                    |
| `Shift+Enter`   | 插入换行（也可用 `Ctrl+J`）                 |
| `Ctrl+V`        | 从剪贴板粘贴图片                            |
| `Esc`           | 中断当前模型回复                            |
| 连续 `Ctrl+D`    | 退出                                        |

---

## 🤖 支持的模型

| 模型 | 推荐场景 |
|------|---------|
| `deepseek-v4-pro` | ✅ **推荐** — 能力与成本最佳平衡 |
| `deepseek-v4-flash` | 简单任务，速度快，成本低 |
| 火山方舟 `ark-code-latest` | 需要图片理解时推荐 |
| 任意 OpenAI 兼容模型 | Claude、GPT、Ollama 本地模型 |

---

## 🆚 竞品对比 | Comparison

DeepCode CLI vs Claude Code vs Aider vs Cursor - 开源 AI 编程助手对比：

| 维度 | DeepCode CLI | Claude Code | Aider | Cursor |
|------|:-----------:|:-----------:|:-----:|:------:|
| 开源协议 | ✅ MIT | ❌ 闭源 | ✅ Apache-2.0 | ❌ 闭源 |
| 价格 | **免费**（仅 API 成本）| $20~$200/月 | 免费 | $20/月起 |
| DeepSeek V4 优化 | ✅ 原生 | ❌ | ⚠️ 通用 | ❌ |
| KV Cache 成本优化 | ✅ 最高 90% 节省 | ❌ | ⚠️ 部分 | ❌ |
| 推理深度控制 | ✅ `reasoningEffort` | N/A | N/A | ⚠️ 有限 |
| Agent Skills | ✅ 双级支持 | ⚠️ 有限 | ❌ | ⚠️ 有限 |
| 联网搜索内置 | ✅ 免费 | ❌ | ⚠️ 需配置 | ✅ 付费 |
| VSCode 扩展 | ✅ | ✅ | ❌ | N/A |
| 原生 Mac App | ✅ | ❌ | ❌ | ❌ |
| 终端原生 | ✅ | ✅ | ✅ | ❌ |
| 自托管支持 | ✅ | ❌ | ✅ | ❌ |

---

## 📖 常见问题

**Q: DeepCode 有 VSCode 扩展吗？**
A: 有！在 [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=vegamo.deepcode-vscode) 搜索 `DeepCode`。配置文件 `~/.deepcode/settings.json` **两边共用**，终端和编辑器无缝切换。

**Q: DeepCode 有 Mac 桌面 App 吗？**
A: 有！原生 macOS 菜单栏应用，点击 ✨ 图标即可使用。从 [GitHub Releases](https://github.com/lessweb/deepcode-cli/releases) 下载 DMG 安装。配置和会话与 CLI / VSCode 三端共享。

**Q: 如何开启联网搜索？**
A: DeepCode 内置免费 Web Search 工具，开箱即用。如需自定义，配置 `webSearchTool` 指向你的脚本路径。
→ [自定义搜索配置指南](https://github.com/qorzj/web_search_cli)

**Q: 支持图片理解吗？**
A: 支持 `Ctrl+V` 粘贴剪贴板图片。目前 `deepseek-v4` 不支持多模态输入，推荐使用火山方舟 `Doubao-Seed-2.0-pro` 模型。

**Q: 如何配置 MCP？**
A: Deep Code 支持 MCP（Model Context Protocol），可以连接 GitHub、浏览器、数据库等外部服务。在 `settings.json` 中配置 `mcpServers` 字段即可启用，启动后使用 `/mcp` 命令查看已配置的 MCP 服务器状态和可用工具。详细配置指南：[docs/mcp.md](docs/mcp.md)

**Q: 是否支持 Coding Plan？**

**Q: 如何在任务完成后收到通知？**
A: 写一个调用 Webhook 的 Shell 脚本，配置 `notify` 字段指向脚本路径即可。
→ [通知配置指南](https://binfer.net/share/jby5xnc-so6g)

---

## 🛠️ 开发与贡献

```bash
git clone https://github.com/lessweb/deepcode-cli.git
cd deepcode-cli
npm install
npm run build
npm link   # 本地测试
```
## 贡献

欢迎贡献代码！以下是参与方式：

```bash
# 克隆仓库
git clone https://github.com/lessweb/deepcode-cli.git
cd deepcode-cli

# 安装依赖
npm install

# 本地开发（类型检查 + lint + 格式检查 + 构建）
npm run build

# 运行测试
npm test

# 链接到全局（即本地全局安装）
npm link
```

- 提交 PR 前请确保 `npm run check` 通过（类型检查 + lint + 格式检查）
- 建议在执行构建前，先执行 `npm run format` 自动格式化代码，避免构建报错

## 🔗 相关链接

- 🌐 GitHub: [github.com/lessweb/deepcode-cli](https://github.com/lessweb/deepcode-cli)
- 🖥️ Mac App 下载: [GitHub Releases](https://github.com/lessweb/deepcode-cli/releases)
- 💾 VSCode 扩展: [DeepCode on Marketplace](https://marketplace.visualstudio.com/items?itemName=vegamo.deepcode-vscode)
- 🐛 问题反馈: [GitHub Issues](https://github.com/lessweb/deepcode-cli/issues)
- 💬 讨论区: [GitHub Discussions](https://github.com/lessweb/deepcode-cli/discussions)
- 📚 DeepSeek API 文档: [api-docs.deepseek.com](https://api-docs.deepseek.com/)
- 🌟 官网: [vegamo.cn/deepcode](https://deepcode.vegamo.cn)

---

## ⭐ 支持我们 | Support

如果 DeepCode CLI 帮你省了时间、省了钱，请：

- ⭐ **Star** → [github.com/lessweb/deepcode-cli](https://github.com/lessweb/deepcode-cli)
- 🐛 提 [Issues](https://github.com/lessweb/deepcode-cli/issues)
- 💬 加入 [Discussions](https://github.com/lessweb/deepcode-cli/discussions) 讨论
- 📣 分享给同事和朋友！
- 🐦 关注开发者：[Twitter/X](https://twitter.com/wenjiazhu)

---

## 🔌 MCP 支持

DeepCode CLI 支持 MCP（Model Context Protocol），可连接 GitHub、浏览器、文件系统等外部服务扩展 AI 能力。配置方法请查看：[docs/mcp.md](docs/mcp.md)

---

## 🏷️ 相关标签 | Related Topics

`ai` `cli` `coding-assistant` `deepseek` `terminal` `developer-tools` `code-generation` `vibe-coding` `openai-compatible` `agent-skills` `typescript` `nodejs` `bug-fixing` `web-search` `macos-app`

---

*DeepCode CLI 是 [lessweb](https://github.com/lessweb) 的开源项目，与 DeepSeek 无官方关联。*
