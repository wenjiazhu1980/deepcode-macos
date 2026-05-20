/**
 * Headless mode for the Deep Code CLI.
 *
 * Provides a programmatic NDJSON (newline-delimited JSON) bridge over stdio
 * so native frontends (macOS, Windows apps) can drive the CLI engine
 * without a terminal.
 *
 * Protocol:
 *   stdin  ←  JSON lines (one JSON object per line)
 *   stdout →  JSON lines (one JSON object per line)
 *
 * Inbound methods:
 *   initialize        – Set up the session (project root, model, etc.)
 *   chat              – Send a user prompt
 *   interrupt         – Abort the active model turn
 *   list_sessions     – Return all session entries
 *   list_messages     – Return messages for a given session
 *   set_session       – Switch the active session
 *   new_session       – Start a fresh session
 *   delete_session    – Remove a session
 *   load_skill        – Load a skill into the current session
 *   list_skills       – List available skills
 *   adjust_bash_timeout – Adjust the timeout for a running bash process
 */

import * as readline from "readline";
import {
  SessionManager,
  type SessionEntry,
  type SessionMessage,
  type UserPromptContent,
  type SkillInfo,
} from "./session";
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
    renderMarkdown: (text: string) => text, // headless mode does not render markdown
    onAssistantMessage: (message: SessionMessage, shouldConnect: boolean) => {
      emit({
        event: "assistant_message",
        sessionId: message.sessionId,
        messageId: message.id,
        role: message.role,
        content: message.content,
        contentParams: message.contentParams,
        meta: message.meta,
        shouldConnect,
      });
    },
    onSessionEntryUpdated: (entry: SessionEntry) => {
      emit({
        event: "session_updated",
        session: entry,
      });
    },
    onMcpStatusChanged: () => {
      emit({ event: "mcp_status_changed" });
    },
    onProcessStdout: (pid: number, chunk: string) => {
      emit({
        event: "process_stdout",
        sessionId,
        pid,
        chunk,
      });
    },
  });

  await sessionManager.initMcpServers(getResolvedSettings().mcpServers);

  // ---- version announcement -----------------------------------------------

  emit({
    event: "initialized",
    version: packageVersion,
    projectRoot,
    model: getResolvedSettings().model,
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
      emit({ event: "error", error: "Invalid JSON" });
      return;
    }

    const method = typeof message.method === "string" ? message.method : "";
    const id = message.id;
    const params = (message.params ?? {}) as Record<string, unknown>;

    void handleMethod(method, id, params).catch((error) => {
      const errMessage = error instanceof Error ? error.message : String(error);
      emit({ event: "error", id, error: errMessage });
    });
  });

  // ---- method dispatch ----------------------------------------------------

  async function handleMethod(method: string, id: unknown, params: Record<string, unknown>): Promise<void> {
    switch (method) {
      case "initialize": {
        // Re-initialize with potentially new project root
        break;
      }

      case "chat": {
        const text = typeof params.text === "string" ? params.text : "";
        const imageUrls = Array.isArray(params.imageUrls) ? (params.imageUrls as string[]) : undefined;

        const userPrompt: UserPromptContent = { text };
        if (imageUrls && imageUrls.length > 0) {
          userPrompt.imageUrls = imageUrls;
        }

        await sessionManager.handleUserPrompt(userPrompt);

        // If this was the first prompt, the session manager creates a session
        const activeId = sessionManager.getActiveSessionId();
        if (activeId && activeId !== sessionId) {
          sessionId = activeId;
          emit({ event: "session_created", sessionId });
        }

        emit({ event: "chat_done", id });
        break;
      }

      case "interrupt": {
        sessionManager.interruptActiveSession();
        emit({ event: "interrupted", id });
        break;
      }

      case "list_sessions": {
        const sessions = sessionManager.listSessions();
        emit({ event: "sessions", id, sessions });
        break;
      }

      case "list_messages": {
        const sid = typeof params.sessionId === "string" ? params.sessionId : (sessionId ?? "");
        const messages = sessionManager.listSessionMessages(sid);
        emit({ event: "messages", id, sessionId: sid, messages });
        break;
      }

      case "set_session": {
        const sid = typeof params.sessionId === "string" ? params.sessionId : null;
        sessionManager.setActiveSessionId(sid);
        sessionId = sid;
        emit({ event: "session_set", id, sessionId: sid });
        break;
      }

      case "new_session": {
        sessionManager.setActiveSessionId(null);
        sessionId = null;
        emit({ event: "session_cleared", id });
        break;
      }

      case "delete_session": {
        // Not yet implemented at session manager level – just acknowledge
        emit({ event: "ack", id });
        break;
      }

      case "list_skills": {
        const skills = await sessionManager.listSkills(sessionId ?? undefined);
        emit({ event: "skills", id, skills });
        break;
      }

      case "load_skill": {
        const skillPath = typeof params.path === "string" ? params.path : "";
        const skills: SkillInfo[] = [
          {
            name: typeof params.name === "string" ? params.name : "unknown",
            path: skillPath,
            description: typeof params.description === "string" ? params.description : "",
          },
        ];
        const userPrompt: UserPromptContent = { text: "/continue", skills };
        await sessionManager.handleUserPrompt(userPrompt);
        emit({ event: "skill_loaded", id });
        break;
      }

      case "adjust_bash_timeout": {
        const deltaMs = typeof params.deltaMs === "number" ? params.deltaMs : 0;
        const result = sessionManager.adjustActiveBashTimeout(deltaMs);
        emit({ event: "bash_timeout_adjusted", id, result });
        break;
      }

      default:
        emit({ event: "error", id, error: `Unknown method: ${method}` });
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
