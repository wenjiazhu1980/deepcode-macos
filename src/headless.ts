import * as readline from "readline";
import * as fs from "fs";
import {
  SessionManager,
  type LlmStreamProgress,
  type SessionEntry,
  type SessionMessage,
  type SkillInfo,
  type UserPromptContent
} from "./session";
import {
  createOpenAIClient as defaultCreateOpenAIClient,
  getMachineId,
  resolveCurrentSettings,
  writeLastProjectRoot
} from "./clientFactory";
import type { CreateOpenAIClient } from "./tools/executor";
import { buildSlashCommands, type SlashCommandItem } from "./ui/slashCommands";
import { readClipboardImage } from "./ui/clipboard";

type SubmitMsg = {
  type: "submit";
  id: string;
  text: string;
  imageUrls?: string[];
  skills?: SkillInfo[];
};
type InterruptMsg = { type: "interrupt"; id?: string };
type ListSessionsMsg = { type: "list_sessions"; id: string };
type LoadSessionMsg = { type: "load_session"; id: string; sessionId: string };
type NewSessionMsg = { type: "new_session"; id: string };
type ChangeProjectRootMsg = { type: "change_project_root"; id: string; path: string };
type ListSlashCommandsMsg = { type: "list_slash_commands"; id: string };
type ReadClipboardImageMsg = { type: "read_clipboard_image"; id: string };

type Inbound =
  | SubmitMsg
  | InterruptMsg
  | ListSessionsMsg
  | LoadSessionMsg
  | NewSessionMsg
  | ChangeProjectRootMsg
  | ListSlashCommandsMsg
  | ReadClipboardImageMsg;

type Outbound =
  | { type: "ready"; version: string; machineId?: string; projectRoot: string }
  | { type: "session"; entry: SerializableSessionEntry }
  | {
      type: "stream";
      sessionId?: string;
      phase: "start" | "update" | "end";
      estimatedTokens: number;
      formattedTokens: string;
    }
  | { type: "message"; message: SessionMessage }
  | { type: "sessions_list"; id: string; sessions: SerializableSessionEntry[] }
  | {
      type: "session_loaded";
      id: string;
      sessionId: string;
      messages: SessionMessage[];
    }
  | { type: "error"; id?: string; error: string }
  | { type: "done"; id: string; status: string }
  | { type: "ack"; id: string }
  | { type: "project_root_changed"; id: string; path: string; skills: SkillInfo[] }
  | { type: "slash_commands"; id: string; commands: SlashCommandItem[] }
  | { type: "clipboard_image"; id: string; dataUrl?: string; error?: string };

type SerializableSessionEntry = Omit<SessionEntry, "processes"> & {
  processes: Record<string, { startTime: string; command: string }> | null;
};

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
}

function serializeEntry(entry: SessionEntry): SerializableSessionEntry {
  const processes = entry.processes
    ? Object.fromEntries(entry.processes)
    : null;
  return { ...entry, processes };
}

export type RunHeadlessOptions = {
  projectRoot?: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  createOpenAIClient?: CreateOpenAIClient;
  exitOnClose?: boolean;
};

export function parseHeadlessArgs(args: string[]): { projectRoot?: string } {
  const options: { projectRoot?: string } = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--project-root" && i + 1 < args.length) {
      options.projectRoot = args[i + 1];
      i += 1;
    }
  }
  return options;
}

export async function runHeadless(
  args: string[],
  packageVersion: string,
  overrides: Omit<RunHeadlessOptions, "projectRoot"> = {}
): Promise<void> {
  const opts = parseHeadlessArgs(args);
  return runHeadlessWithOptions({
    ...overrides,
    projectRoot: opts.projectRoot
  }, packageVersion);
}

export async function runHeadlessWithOptions(
  options: RunHeadlessOptions,
  packageVersion: string
): Promise<void> {
  const projectRoot = options.projectRoot && options.projectRoot.trim().length > 0
    ? options.projectRoot
    : process.cwd();
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const createOpenAIClient = options.createOpenAIClient ?? defaultCreateOpenAIClient;
  const exitOnClose = options.exitOnClose ?? true;

  function emit(event: Outbound): void {
    output.write(`${JSON.stringify(event, jsonReplacer)}\n`);
  }

  const manager = new SessionManager({
    projectRoot,
    createOpenAIClient,
    getResolvedSettings: () => resolveCurrentSettings(),
    renderMarkdown: (text: string) => text,
    onAssistantMessage: (message: SessionMessage) => {
      emit({ type: "message", message });
    },
    onSessionEntryUpdated: (entry: SessionEntry) => {
      emit({ type: "session", entry: serializeEntry(entry) });
    },
    onLlmStreamProgress: (progress: LlmStreamProgress) => {
      emit({
        type: "stream",
        sessionId: progress.sessionId,
        phase: progress.phase,
        estimatedTokens: progress.estimatedTokens,
        formattedTokens: progress.formattedTokens
      });
    }
  });

  emit({
    type: "ready",
    version: packageVersion,
    machineId: getMachineId(),
    projectRoot
  });

  const rl = readline.createInterface({ input, terminal: false });
  let chain: Promise<void> = Promise.resolve();

  rl.on("line", (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    let inbound: Inbound;
    try {
      inbound = JSON.parse(trimmed) as Inbound;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emit({ type: "error", error: `Invalid JSON: ${message}` });
      return;
    }
    chain = chain
      .then(() => handleInbound(inbound))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        emit({ type: "error", error: `Internal error: ${message}` });
      });
  });

  return new Promise<void>((resolve) => {
    rl.on("close", () => {
      chain.finally(() => {
        if (exitOnClose) {
          process.exit(0);
        }
        resolve();
      });
    });
  });

  async function handleInbound(inbound: Inbound): Promise<void> {
    switch (inbound.type) {
      case "interrupt": {
        manager.interruptActiveSession();
        if (inbound.id) {
          emit({ type: "ack", id: inbound.id });
        }
        return;
      }
      case "list_sessions": {
        const sessions = manager.listSessions().map(serializeEntry);
        emit({ type: "sessions_list", id: inbound.id, sessions });
        return;
      }
      case "new_session": {
        manager.setActiveSessionId(null);
        emit({ type: "ack", id: inbound.id });
        return;
      }
      case "load_session": {
        manager.setActiveSessionId(inbound.sessionId);
        const messages = manager
          .listSessionMessages(inbound.sessionId)
          .filter((m) => m.visible);
        emit({
          type: "session_loaded",
          id: inbound.id,
          sessionId: inbound.sessionId,
          messages
        });
        return;
      }
      case "submit": {
        try {
          const prompt: UserPromptContent = {
            text: inbound.text,
            imageUrls: inbound.imageUrls,
            skills: inbound.skills
          };
          await manager.handleUserPrompt(prompt);
          const sessionId = manager.getActiveSessionId();
          const session = sessionId ? manager.getSession(sessionId) : null;
          emit({
            type: "done",
            id: inbound.id,
            status: session?.status ?? "completed"
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emit({ type: "error", id: inbound.id, error: message });
          emit({ type: "done", id: inbound.id, status: "failed" });
        }
        return;
      }
      case "change_project_root": {
        const newPath = inbound.path.trim();
        if (!newPath) {
          emit({ type: "error", id: inbound.id, error: "path must be a non-empty string" });
          return;
        }
        try {
          const stat = fs.statSync(newPath);
          if (!stat.isDirectory()) {
            emit({ type: "error", id: inbound.id, error: `path is not a directory: ${newPath}` });
            return;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          emit({ type: "error", id: inbound.id, error: `cannot access directory: ${message}` });
          return;
        }
        try {
          manager.interruptActiveSession();
          manager.changeProjectRoot(newPath);
          writeLastProjectRoot(newPath);
          const skills = await manager.listSkills();
          emit({ type: "project_root_changed", id: inbound.id, path: newPath, skills });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emit({ type: "error", id: inbound.id, error: `Failed to change project root: ${message}` });
        }
        return;
      }
      case "list_slash_commands": {
        try {
          const sessionId = manager.getActiveSessionId() ?? undefined;
          const skills = await manager.listSkills(sessionId);
          const commands = buildSlashCommands(skills);
          emit({ type: "slash_commands", id: inbound.id, commands });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emit({ type: "error", id: inbound.id, error: `Failed to list slash commands: ${message}` });
        }
        return;
      }
      case "read_clipboard_image": {
        try {
          const image = readClipboardImage();
          if (image) {
            emit({ type: "clipboard_image", id: inbound.id, dataUrl: image.dataUrl });
          } else {
            emit({ type: "clipboard_image", id: inbound.id, error: "No image in clipboard" });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          emit({ type: "clipboard_image", id: inbound.id, error: message });
        }
        return;
      }
      default: {
        const value = inbound as { type?: string };
        emit({
          type: "error",
          error: `Unknown inbound type: ${String(value.type)}`
        });
      }
    }
  }
}
