import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";
import { resolveSettings, type DeepcodingSettings } from "./settings";

export const DEFAULT_MODEL = "deepseek-v4-pro";
export const DEFAULT_BASE_URL = "https://api.deepseek.com";

export function readSettings(): DeepcodingSettings | null {
  try {
    const settingsPath = path.join(os.homedir(), ".deepcode", "settings.json");
    if (!fs.existsSync(settingsPath)) {
      return null;
    }
    const raw = fs.readFileSync(settingsPath, "utf8");
    return JSON.parse(raw) as DeepcodingSettings;
  } catch {
    return null;
  }
}

export function resolveCurrentSettings(): ReturnType<typeof resolveSettings> {
  return resolveSettings(readSettings(), {
    model: DEFAULT_MODEL,
    baseURL: DEFAULT_BASE_URL
  });
}

export function readLastProjectRoot(): string | undefined {
  const settings = readSettings();
  if (!settings || typeof settings.lastProjectRoot !== "string") {
    return undefined;
  }
  const trimmed = settings.lastProjectRoot.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function writeLastProjectRoot(projectRoot: string): void {
  const settingsPath = path.join(os.homedir(), ".deepcode", "settings.json");

  let settings: DeepcodingSettings = {};
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, "utf8");
      settings = JSON.parse(raw) as DeepcodingSettings;
    }
  } catch {
    // use defaults
  }

  settings.lastProjectRoot = projectRoot;

  const dir = path.dirname(settingsPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

export type ResolvedClient = {
  client: OpenAI | null;
  model: string;
  baseURL: string;
  thinkingEnabled: boolean;
  reasoningEffort: "high" | "max";
  notify?: string;
  webSearchTool?: string;
  machineId?: string;
};

export function createOpenAIClient(): ResolvedClient {
  const settings = resolveCurrentSettings();
  if (!settings.apiKey) {
    return {
      client: null,
      model: settings.model,
      baseURL: settings.baseURL,
      thinkingEnabled: settings.thinkingEnabled,
      reasoningEffort: settings.reasoningEffort,
      notify: settings.notify,
      webSearchTool: settings.webSearchTool,
      machineId: getMachineId()
    };
  }

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL || undefined
  });
  return {
    client,
    model: settings.model,
    baseURL: settings.baseURL,
    thinkingEnabled: settings.thinkingEnabled,
    reasoningEffort: settings.reasoningEffort,
    notify: settings.notify,
    webSearchTool: settings.webSearchTool,
    machineId: getMachineId()
  };
}

export function getMachineId(): string | undefined {
  try {
    const idPath = path.join(os.homedir(), ".deepcode", "machine-id");
    if (fs.existsSync(idPath)) {
      const raw = fs.readFileSync(idPath, "utf8").trim();
      if (raw) {
        return raw;
      }
    }
    const generated = `${os.hostname()}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    fs.mkdirSync(path.dirname(idPath), { recursive: true });
    fs.writeFileSync(idPath, generated, "utf8");
    return generated;
  } catch {
    return undefined;
  }
}
