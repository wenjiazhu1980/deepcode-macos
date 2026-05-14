# Repository Guidelines

## 语言规则

**始终使用简体中文回复**，包括代码注释和 commit 信息。技术术语可保留英文原文（如 API 名称、命令、类型名）。

## Project Structure

```
src/
├── cli.tsx              # Entry point — parses args, renders Ink App
├── session.ts           # SessionManager — LLM loop, compaction, tool orchestration
├── settings.ts          # Settings from ~/.deepcode/settings.json
├── prompt.ts            # System prompt builder, tool definitions
├── model-capabilities.ts
├── ui/                  # Ink components (App, PromptInput, MessageView, SessionList, …)
├── mcp/                 # MCP client (JSON-RPC) and manager (lifecycle, tool registration)
├── common/              # Shared utilities (file, shell, state, runtime)
├── tools/               # ToolExecutor + handlers (bash, read, write, edit, web-search, ask-user-question)
└── tests/               # One *.test.ts per module
docs/                    # Tool descriptions (docs/tools/) and EJS prompt templates (docs/prompts/)
apps/macos-menubar/      # Native macOS menu-bar companion app
dist/                    # Bundled output (gitignored)
```

## Build, Test & Dev Commands

| Command | Purpose |
|---|---|
| `npm run check` | typecheck + lint + format:check — run before every push |
| `npm run build` | `check` + esbuild bundle → `dist/cli.js` (ESM, Node 18) |
| `npm test` | All tests (`tsx --test src/tests/*.test.ts`) |
| `npm run test:single -- <file>` | Single test file |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier on `src/**/*.{ts,tsx}` |

Manual testing: `node dist/cli.js` after `npm run bundle`.

## Coding Style

2-space indent, double quotes, semicolons, trailing `es5`, 120-char lines, LF endings. Strict TypeScript — use `import type` for type-only imports. Files: `kebab-case.ts` / `kebab-case.tsx`; tests: `*.test.ts`. Husky + lint-staged auto-format on commit.

## Testing

Node.js native test runner (`node:test`) + `tsx` + `node:assert/strict`. Tests live in `src/tests/` mirroring the source module name. Use descriptive `describe`/`test` names. Lint is relaxed in tests. Run `npm test` before submitting a PR.

## Commits & Pull Requests

Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`. PRs need a clear description, linked issues when applicable, terminal screenshots for UI changes, and all checks passing (`npm run check && npm test`). Do not include unintended `dist/` or `package-lock.json` changes.

## Architecture

Ink (React for terminals) renders the UI. `SessionManager` drives the LLM loop — system prompts, streaming responses, tool dispatch via `ToolExecutor`, and context compaction at token thresholds. Six tools: `bash`, `read`, `write`, `edit`, `AskUserQuestion`, `WebSearch`.

## Agent-Specific Instructions

- **AGENTS.md loading**: `./AGENTS.md` → `./.deepcode/AGENTS.md` → `~/.deepcode/AGENTS.md` (first match wins).
- **Skills**: Place `SKILL.md` files in `~/.agents/skills/<name>/` (user) or `./.agents/skills/<name>/` (project). Legacy `./.deepcode/skills/` is also supported. YAML frontmatter with `name` + `description`.
- The built-in `agent-drift-guard` skill is always injected.
