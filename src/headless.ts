/**
 * Headless mode for the Deep Code CLI.
 *
 * Provides a programmatic NDJSON (newline-delimited JSON) bridge over stdio
 * so native frontends (macOS, Windows apps) can drive the CLI engine
 * without a terminal.
 *
 * Protocol (matches macOS app's ServerEvent / ClientCommand):
 *   stdin  ←  JSON lines with "type" field (ClientCommand)
 *   stdout →  JSON lines with "type" field (ServerEvent)
 *
 * Inbound types (App → CLI):
 *   submit              – Send a user prompt
 *   interrupt           – Abort the active model turn
 *   list_sessions       – Return all session entries
 *   load_session        – Load a specific session
 *   new_session         – Start a fresh session
 *   change_project_root – Change the project root directory
 *   list_slash_commands – List available slash commands
 *   read_clipboard_image – Read image from clipboard
 *
 * Outbound types (CLI → App):
 *   ready               – Initialization complete
 *   session             – Session entry update
 *   stream              – LLM streaming progress
 *   message             – Assistant or system message
 *   sessions_list       – List of sessions
 *   session_loaded      – Messages for a loaded session
 *   error               – Error response
 *   done                – Command completed
 *   ack                 – Acknowledgement
 */

import * as readline from "readline";
import { SessionManager, type SessionEntry, type SessionMessage, type UserPromptContent } from "./session";
import { resolveCurrentSettings, createOpenAIClient } from "./ui/App";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value) obj[k] = v;
    return obj;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Headless entry point
// ---------------------------------------------------------------------------

export type HeadlessOptions = {
  projectRoot?: string;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
  createOpenAIClient?: typeof createOpenAIClient;
  exitOnClose?: boolean;
};

export async function runHeadlessWithOptions(options: HeadlessOptions, packageVersion: string): Promise<void> {
  const projectRoot =
    options.projectRoot && options.projectRoot.trim().length > 0 ? options.projectRoot : process.cwd();

  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const createClient = options.createOpenAIClient ?? createOpenAIClient;
  const exitOnClose = options.exitOnClose ?? true;

  function emit(event: Record<string, unknown>): void {
    output.write(`${JSON.stringify(event, jsonReplacer)}\n`);
  }

  // ---- settings -----------------------------------------------------------

  function getResolvedSettings() {
    return resolveCurrentSettings(projectRoot);
  }

  // ---- session manager ----------------------------------------------------

  let sessionId: string | null = null;

  const sessionManager = new SessionManager({
    projectRoot,
    createOpenAIClient: () => createClient(projectRoot),
    getResolvedSettings,
    renderMarkdown: (text: string) => text,
    onAssistantMessage: (message: SessionMessage, _shouldConnect: boolean) => {
      emit({
        type: "message",
        id: message.id,
        message: {
          id: message.id,
          sessionId: message.sessionId,
          role: message.role,
          content: message.content,
          visible: message.visible,
          createTime: message.createTime,
          meta: message.meta,
          messageParams: message.messageParams,
        },
      });
    },
    onSessionEntryUpdated: (entry: SessionEntry) => {
      emit({
        type: "session",
        entry: {
          id: entry.id,
          summary: entry.summary,
          assistantReply: entry.assistantReply,
          assistantThinking: entry.assistantThinking,
          assistantRefusal: entry.assistantRefusal,
          status: entry.status,
          failReason: entry.failReason,
          activeTokens: entry.activeTokens,
          createTime: entry.createTime,
          updateTime: entry.updateTime,
        },
      });
    },
    onMcpStatusChanged: () => {
      // Silently ignore – the app does not handle this event type
    },
    onProcessStdout: (_pid: number, _chunk: string) => {
      // Process stdout is not exposed via the protocol
    },
  });

  await sessionManager.initMcpServers(getResolvedSettings().mcpServers);

  // ---- ready announcement -------------------------------------------------

  emit({
    type: "ready",
    version: packageVersion,
    machineId: null,
    projectRoot,
  });

  // ---- read inbound JSON lines --------------------------------------------

  const rl = readline.createInterface({ input, terminal: false });

  let closing = false;

  function handleClose(): void {
    if (closing) return;
    closing = true;
    sessionManager.dispose();
    if (exitOnClose) {
      process.exit(0);
    }
  }

  rl.on("close", handleClose);

  rl.on("line", (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let message: Record<string, unknown>;
    try {
      message = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      emit({ type: "error", error: "Invalid JSON" });
      return;
    }

    const type = typeof message.type === "string" ? message.type : "";
    const id = typeof message.id === "string" ? message.id : "";

    void handleCommand(type, id, message).catch((error) => {
      const errMessage = error instanceof Error ? error.message : String(error);
      emit({ type: "error", id, message: errMessage });
    });
  });

  // ---- command dispatch ---------------------------------------------------

  async function handleCommand(type: string, id: string, raw: Record<string, unknown>): Promise<void> {
    switch (type) {
      case "submit": {
        const text = typeof raw.text === "string" ? raw.text : "";
        const imageUrls = Array.isArray(raw.imageUrls) ? (raw.imageUrls as string[]) : undefined;
        const skills = Array.isArray(raw.skills)
          ? (raw.skills as Array<{ name: string; path: string; description: string }>)
          : undefined;

        const userPrompt: UserPromptContent = { text };
        if (imageUrls && imageUrls.length > 0) {
          userPrompt.imageUrls = imageUrls;
        }
        if (skills && skills.length > 0) {
          userPrompt.skills = skills.map((s) => ({
            name: s.name,
            path: s.path,
            description: s.description,
          }));
        }

        await sessionManager.handleUserPrompt(userPrompt);

        // If this was the first prompt, the session manager creates a session
        const activeId = sessionManager.getActiveSessionId();
        if (activeId && activeId !== sessionId) {
          sessionId = activeId;
        }

        emit({ type: "done", id, status: "completed" });
        break;
      }

      case "interrupt": {
        sessionManager.interruptActiveSession();
        emit({ type: "ack", id });
        break;
      }

      case "list_sessions": {
        const sessions = sessionManager.listSessions();
        emit({
          type: "sessions_list",
          id,
          sessions: sessions.map((e) => ({
            id: e.id,
            summary: e.summary,
            assistantReply: e.assistantReply,
            assistantThinking: e.assistantThinking,
            assistantRefusal: e.assistantRefusal,
            status: e.status,
            failReason: e.failReason,
            activeTokens: e.activeTokens,
            createTime: e.createTime,
            updateTime: e.updateTime,
          })),
        });
        break;
      }

      case "load_session": {
        const sid = typeof raw.sessionId === "string" ? raw.sessionId : "";
        sessionManager.setActiveSessionId(sid);
        sessionId = sid;
        const messages = sessionManager.listSessionMessages(sid);
        emit({
          type: "session_loaded",
          id,
          sessionId: sid,
          messages: messages.map((m) => ({
            id: m.id,
            sessionId: m.sessionId,
            role: m.role,
            content: m.content,
            visible: m.visible,
            createTime: m.createTime,
            meta: m.meta,
            messageParams: m.messageParams,
          })),
        });
        break;
      }

      case "new_session": {
        sessionManager.setActiveSessionId(null);
        sessionId = null;
        emit({ type: "ack", id });
        break;
      }

      case "change_project_root": {
        // Not dynamically changeable – just acknowledge
        emit({ type: "ack", id });
        break;
      }

      case "list_slash_commands": {
        // Return a minimal set of slash commands
        emit({
          type: "slash_commands",
          id,
          commands: [
            { kind: "new", name: "/new", label: "New Session", description: "Start a fresh conversation" },
            { kind: "exit", name: "/exit", label: "Exit", description: "Quit the application" },
          ],
        });
        break;
      }

      case "read_clipboard_image": {
        emit({
          type: "clipboard_image",
          id,
          dataUrl: null,
          error: "Clipboard image reading not supported in headless mode",
        });
        break;
      }

      default:
        emit({ type: "error", id, message: `Unknown command type: ${type}` });
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper used by cli.tsx
// ---------------------------------------------------------------------------

function parseHeadlessArgs(args: string[]): { projectRoot?: string } {
  const opts: { projectRoot?: string } = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--project-root" && i + 1 < args.length) {
      opts.projectRoot = args[i + 1];
      i += 1;
    }
  }
  return opts;
}

export async function runHeadless(
  args: string[],
  packageVersion: string,
  overrides: HeadlessOptions = {}
): Promise<void> {
  const opts = parseHeadlessArgs(args);
  return runHeadlessWithOptions(
    {
      ...overrides,
      projectRoot: opts.projectRoot,
    },
    packageVersion
  );
}
