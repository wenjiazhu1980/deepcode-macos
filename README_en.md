# DeepCode CLI - AI Coding Assistant for Terminal

> English | [中文](./README.md)

[DeepCode CLI](https://github.com/lessweb/deepcode-cli) is an **open-source terminal AI coding assistant** optimized for the `deepseek-v4` model, with support for web search, automated bug fixing, agent skills, and reasoning effort control. The best open-source alternative to Claude Code.

[![Demo Video](https://img.shields.io/badge/▶️-Demo-FF6B6B?style=for-the-badge)](https://www.bilibili.com/video/BV11ARqB7Eco)
[![npm version](https://img.shields.io/npm/v/@vegamo/deepcode-cli.svg)](https://www.npmjs.com/package/@vegamo/deepcode-cli)
[![npm downloads](https://img.shields.io/npm/dm/@vegamo/deepcode-cli.svg)](https://www.npmjs.com/package/@vegamo/deepcode-cli)
[![GitHub stars](https://img.shields.io/github/stars/lessweb/deepcode-cli)](https://github.com/lessweb/deepcode-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DeepSeek V4](https://img.shields.io/badge/DeepSeek-V4-orange)](https://www.deepseek.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 Why DeepCode CLI?

DeepSeek V4 is powerful, but using it for programming can be frustrating:

- ❌ **No internet access** in the API — manual copy-paste for every search
- ❌ **Bug hunting is manual** — reading logs, searching solutions, repetitive work
- ❌ **Token costs add up** — no caching, context re-billed every round
- ❌ **Claude Code is expensive** — $20~$200/month, closed source

**DeepCode CLI** solves all of these. One command to install, use directly in your terminal.

---

## ✨ Key Features

### 🌐 1. Web Search — Fix DeepSeek's Biggest Gap

DeepSeek API has no internet access. DeepCode CLI includes a **built-in free Web Search tool** — AI searches directly in the terminal, no copy-paste needed.

> Ask "What are the latest React 19 features?" — AI searches and returns the answer.

### 🐛 2. Auto Bug Fix — AI Repairman in Your Terminal

Paste error logs, AI automatically analyzes → locates root cause → generates fix code. Just confirm and execute.

```bash
# Drop error info directly in terminal
deepcode

> paste your error log here...
> Analyzing...
> Found: N+1 query causing connection pool exhaustion
> Generating fix...
```

### 💰 3. Custom Scripts Save Tokens — Agent Skills System

Write custom scripts (`~/.agents/skills/`) to let AI follow preset workflows, **avoiding repeated token consumption**.

With KV Cache context caching, token costs drop by **80%+** on cache hits.

> 90%+ cheaper than Claude Code ($200/month), just pay for API usage.

### 🔓 4. Open Source — Transparent, Auditable, Deployable

- ✅ **MIT License** — fully transparent code
- ✅ No lock-in, self-host on private servers
- ✅ User-level + Project-level dual Skills system

> Your code stays your code.

### ⌨️ 5. Terminal Native — Never Leave the Command Line

```bash
npm install -g @vegamo/deepcode-cli
cd your-project/
deepcode
```

No window switching — code in VSCode, chat with AI in terminal.

![intro2](resources/intro2.png)

## 🖥️ Native Mac App — AI Assistant in Your Menu Bar

Beyond terminal and VSCode, DeepCode offers a **native macOS menu bar app**. Click the ✨ icon to summon the AI chat window — no terminal needed.

```
[ Menu Bar ✨ icon ]  ←click→  [ ChatPopover window ]  ←pipe→  [ deepcode CLI (sidecar) ]
                                                              │
                                                              ↓
                                                     [ SessionManager / AI engine ]
```

### ✨ Mac App Capabilities

#### 💬 AI Chat

- Real-time conversation with DeepSeek models, with streaming output and token count display
- Displays AI's **Thinking process** (chain-of-thought reasoning) — see how the AI thinks
- Tool call visualization — shows which tool the AI is executing, its parameters and results
- Interrupt a response in progress (click the stop button)

#### 🖼️ Image Understanding

- `⌘V` to paste clipboard images, supports PNG / JPEG / GIF / WebP formats
- Thumbnail preview after pasting, remove individually or clear all
- Images sent as base64 to AI — Volcano Ark `Doubao-Seed-2.0-pro` recommended for best results

#### 📂 Project Directory Switching

- Switch project root via folder picker (NSOpenPanel)
- AI automatically adapts to the new project's context and Skills after switching
- Auto-remembers the last used project directory on next launch

#### 📋 Session Management

- Graphical session list showing summary, status, and update time
- Create, switch, and resume multiple conversations
- Sessions shared across Mac App / CLI / VSCode — a session created in the Mac App is visible via terminal `/resume`, and vice versa

#### ⌨️ Slash Command Panel

- Type `/` to open the command panel showing all available commands and loaded Skills
- Real-time filtering, keyboard selection, and click-to-execute
- Built-in commands: `/new` (new session), `/resume` (resume session), `/skills` (list Skills)

#### 🧠 Full AI Toolchain

The Mac App connects to the CLI engine via headless protocol, with the same capabilities as the terminal:

| Tool | Capability |
|------|-----------|
| `bash` | Execute any shell command in the project directory |
| `read` | Read files, images, PDFs, Jupyter Notebooks |
| `write` / `edit` | Create or precisely edit project files |
| `WebSearch` | Search the web for up-to-date information, filling DeepSeek's internet gap |
| `AskUserQuestion` | AI pauses to ask for clarification when facing ambiguity |

#### 🔗 Three-way Shared

- Config file `~/.deepcode/settings.json` shared with CLI and VSCode extension
- Agent Skills (`~/.agents/skills/`) auto-loaded, user-level + project-level dual system
- Session data shared across all three platforms for seamless environment switching

#### 📦 Zero-dependency Package

- Built-in Node.js runtime + deepcode CLI — **no need to install Node.js**
- Native SwiftUI build, lightweight and fluid, macOS 13+ native experience
- Menu bar resident — click the sparkles icon to summon a 480×640 popover chat window

### Download

Get the latest DMG from [GitHub Releases](https://github.com/lessweb/deepcode-cli/releases):

```bash
# 1. Download DeepCode-vX.X.X.dmg
# 2. Double-click to mount, drag to Applications
# 3. First launch: Right-click → "Open" (unsigned version)
```

> 💡 On first launch, the Mac App automatically detects `~/.deepcode/settings.json`. If not yet configured, it will prompt you to run `deepcode --setup` first.

---

## 🚀 Quick Start

### Install

```bash
# Global install (requires Node.js 18+)
npm install -g @vegamo/deepcode-cli

# Or use npx (no install needed)
npx @vegamo/deepcode-cli
```

### Setup

```bash
# Create config file ~/.deepcode/settings.json
deepcode --setup
```

### Use

```bash
# Start in your project directory
cd your-project/
deepcode
```

> 💡 Config file is **shared** with [DeepCode VSCode Extension](https://marketplace.visualstudio.com/items?itemName=vegamo.deepcode-vscode) — use in terminal or editor, or both.

---

## 🔧 Configuration Example

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

**reasoningEffort** — control AI "thinking depth": set `low` for simple tasks, `max` for complex ones. Don't waste tokens.

For complete configuration details (multi-level priority, environment variables, etc.), see [docs/configuration.md](docs/configuration.md).

---

## 🛠️ Full Feature List

| Feature | Description |
|---------|-------------|
| 🌐 **Web Search** | Built-in free web search, custom script support |
| 🐛 **Auto Bug Fix** | Paste error logs, AI auto-locates + generates fix |
| 💰 **KV Cache** | Context caching, 80%+ token cost reduction |
| 🧠 **Thinking Mode** | Configurable reasoning depth (`reasoningEffort`) |
| 📜 **Agent Skills** | User-level (`~/.agents/skills/`) + Project-level (`./.deepcode/skills/`) |
| 🖼️ **Image Understanding** | `Ctrl+V` paste clipboard images (recommend Volcano Ark `Doubao-Seed-2.0-pro`) |
| 🔔 **Task Notifications** | Slack/DingTalk webhook scripts, auto-push on completion |
| 🖥️ **Native Mac App** | macOS menu bar app, click to chat, shares config/sessions with CLI/VSCode |
| 🤖 **OpenAI Compatible** | Also supports Volcano Ark Coding Plan, Ollama, self-hosted models |

### **Optimized for DeepSeek**
- Specifically tuned for DeepSeek model performance.
- Reduce costs by using [Context Caching](https://api-docs.deepseek.com/guides/kv_cache).
- Natively supports [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) and Effort Control.

---

## Slash Commands & Keyboard Shortcuts

| Slash Command    | Action                                                   |
|------------------|----------------------------------------------------------|
| `/`              | Open the skills / commands menu                          |
| `/new`           | Start a fresh conversation                               |
| `/resume`        | Choose a previous conversation to continue               |
| `/model`         | Switch model, thinking mode, and reasoning effort        |
| `/init`          | Initialize an AGENTS.md file (LLM project instructions)  |
| `/skills`        | List available skills                                    |
| `/mcp`           | View MCP server status and available tools               |
| `/exit`          | Quit (also `Ctrl+D` twice)                               |

| Key              | Action                                                   |
|------------------|----------------------------------------------------------|
| `Enter`          | Send the prompt                                          |
| `Shift+Enter`    | Insert a newline (also `Ctrl+J`)                         |
| `Ctrl+V`         | Paste an image from the clipboard                        |
| `Esc`            | Interrupt the current model turn                         |
| `Ctrl+D` twice   | Quit Deep Code                                           |

---

## 🤖 Supported Models

| Model | Recommended Use |
|-------|-----------------|
| `deepseek-v4-pro` | ✅ **Recommended** — best balance of capability and cost |
| `deepseek-v4-flash` | Simple tasks, fast, low cost |
| Volcano Ark `ark-code-latest` | When image understanding is needed |
| Any OpenAI-compatible | Claude, GPT, Ollama local models |

---

## 🆚 Comparison

| Dimension | DeepCode CLI | Claude Code | Aider | Cursor |
|-----------|:-----------:|:-----------:|:-----:|:------:|
| License | ✅ MIT | ❌ Closed | ✅ Apache-2.0 | ❌ Closed |
| Price | **Free** (API only) | $20~$200/mo | Free | $20+/mo |
| DeepSeek V4 Optimized | ✅ Native | ❌ | ⚠️ Generic | ❌ |
| KV Cache Cost Saving | ✅ Up to 90% | ❌ | ⚠️ Partial | ❌ |
| Reasoning Control | ✅ `reasoningEffort` | N/A | N/A | ⚠️ Limited |
| Agent Skills | ✅ Dual-level | ⚠️ Limited | ❌ | ⚠️ Limited |
| Built-in Web Search | ✅ Free | ❌ | ⚠️ Config needed | ✅ Paid |
| VSCode Extension | ✅ | ✅ | ❌ | N/A |
| Native Mac App | ✅ | ❌ | ❌ | ❌ |
| Terminal Native | ✅ | ✅ | ✅ | ❌ |
| Self-hosted | ✅ | ❌ | ✅ | ❌ |

---

## 📖 FAQ

**Q: Does DeepCode have a VSCode extension?**
A: Yes! Search `DeepCode` on [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=vegamo.deepcode-vscode). The config file `~/.deepcode/settings.json` is **shared** — seamless switch between terminal and editor.

**Q: Does DeepCode have a Mac desktop app?**
A: Yes! Native macOS menu bar app, click the ✨ icon to use. Download DMG from [GitHub Releases](https://github.com/lessweb/deepcode-cli/releases). Config and sessions are shared with CLI/VSCode.

**Q: How to enable web search?**
A: DeepCode has built-in free web search, works out of the box. For custom search, configure `webSearchTool` to your script path.

**Q: Does it support image understanding?**
A: Supports `Ctrl+V` to paste clipboard images. Currently `deepseek-v4` doesn't support multimodal input. We recommend Volcano Ark `Doubao-Seed-2.0-pro` for multimodal.

**Q: How to get notifications when tasks complete?**
A: Write a shell script that calls a webhook, set `notify` field to the script path.

---

## 🛠️ Development & Contributing

```bash
git clone https://github.com/lessweb/deepcode-cli.git
cd deepcode-cli
npm install
npm run build
npm link   # Local testing
```

### How do I configure MCP?

Deep Code supports MCP (Model Context Protocol) to connect external services such as GitHub, browsers, databases, and more. Configure the `mcpServers` field in `settings.json` to enable it, then use the `/mcp` command to view MCP server status and available tools.

For detailed setup instructions, see: [docs/mcp.md](docs/mcp.md)

## Contributing

Contributions are welcome! Here's how to get started:

```bash
# Clone the repository
git clone https://github.com/lessweb/deepcode-cli.git
cd deepcode-cli

# Install dependencies
npm install

# Local development (typecheck + lint + format check + bundle)
npm run build

# Run tests
npm test

# Link globally (local global install)
npm link
```

- Make sure `npm run check` passes before submitting a PR (typecheck + lint + format check)
- We recommend running `npm run format` before building to avoid errors

---

## 🔗 Links

- 🌐 GitHub: [github.com/lessweb/deepcode-cli](https://github.com/lessweb/deepcode-cli)
- 🖥️ Mac App Download: [GitHub Releases](https://github.com/lessweb/deepcode-cli/releases)
- 💾 VSCode Extension: [DeepCode on Marketplace](https://marketplace.visualstudio.com/items?itemName=vegamo.deepcode-vscode)
- 🐛 Issues: [GitHub Issues](https://github.com/lessweb/deepcode-cli/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/lessweb/deepcode-cli/discussions)
- 📚 DeepSeek API Docs: [api-docs.deepseek.com](https://api-docs.deepseek.com/)
- 🌟 Website: [deepcode.vegamo.cn](https://deepcode.vegamo.cn)

---

## ⭐ Support Us

If DeepCode CLI saves you time and money:

- ⭐ **Star** → [github.com/lessweb/deepcode-cli](https://github.com/lessweb/deepcode-cli)
- 🐛 Submit [Issues](https://github.com/lessweb/deepcode-cli/issues)
- 📣 Share with colleagues and friends!

---

## 🏷️ Related Topics

`ai` `cli` `coding-assistant` `deepseek` `terminal` `developer-tools` `code-generation` `vibe-coding` `openai-compatible` `agent-skills` `typescript` `nodejs` `bug-fixing` `web-search` `macos-app`

---

*DeepCode CLI is an open-source project by [lessweb](https://github.com/lessweb), not officially affiliated with DeepSeek.*
