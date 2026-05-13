#!/usr/bin/env node

// src/cli.tsx
import { readFileSync as readFileSync10 } from "node:fs";
import { dirname as dirname9, resolve as resolve5 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { render as render2 } from "ink";

// src/ui/App.tsx
import { useCallback as useCallback2, useEffect as useEffect6, useMemo as useMemo4, useRef as useRef3, useState as useState7 } from "react";
import { Box as Box7, Static, Text as Text8, useApp as useApp2, useStdout as useStdout3 } from "ink";
import chalk4 from "chalk";
import * as fs12 from "fs";
import * as os9 from "os";
import * as path12 from "path";
import OpenAI2 from "openai";

// src/session.ts
import * as fs9 from "fs";
import * as path8 from "path";
import * as os5 from "os";
import * as crypto from "crypto";
import { fileURLToPath as fileURLToPath2 } from "url";
import matter from "gray-matter";
import ejs from "ejs";

// src/notify.ts
import { spawn } from "child_process";
function formatDurationSeconds(durationMs) {
  const safeMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return String(Math.floor(safeMs / 1e3));
}
function buildNotifyEnv(durationMs, baseEnv = process.env) {
  return {
    ...baseEnv,
    DURATION: formatDurationSeconds(durationMs)
  };
}
function launchNotifyScript(notifyPath, durationMs, workingDirectory, spawnProcess = spawn) {
  const commandPath = notifyPath?.trim();
  if (!commandPath) {
    return;
  }
  const options = {
    cwd: workingDirectory,
    detached: process.platform !== "win32",
    env: buildNotifyEnv(durationMs),
    stdio: "ignore"
  };
  try {
    const child = spawnProcess(commandPath, [], options);
    child.once("error", (error) => {
      if (process.platform === "win32") {
        return;
      }
      if (error.code !== "EACCES" && error.code !== "ENOEXEC") {
        return;
      }
      try {
        const fallbackChild = spawnProcess("/bin/sh", [commandPath], options);
        fallbackChild.once("error", () => void 0);
        fallbackChild.unref();
      } catch {
      }
    });
    child.unref();
  } catch {
  }
}

// src/openai-thinking.ts
function buildThinkingRequestOptions(thinkingEnabled, reasoningEffort = "max") {
  const thinking = { type: thinkingEnabled ? "enabled" : "disabled" };
  return {
    thinking,
    ...thinkingEnabled ? { extra_body: { reasoning_effort: reasoningEffort } } : {}
  };
}

// src/model-capabilities.ts
var DEEPSEEK_V4_MODELS = /* @__PURE__ */ new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
function defaultsToThinkingMode(model) {
  return DEEPSEEK_V4_MODELS.has(model);
}

// src/prompt.ts
import { execFileSync as execFileSync2, execSync } from "child_process";
import * as fs2 from "fs";
import * as os2 from "os";
import * as path2 from "path";
import { fileURLToPath } from "url";

// src/tools/shell-utils.ts
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as pathWin32 from "path/win32";
var WINDOWS_GIT_LOCATIONS = ["C:\\Program Files\\Git\\cmd\\git.exe", "C:\\Program Files (x86)\\Git\\cmd\\git.exe"];
var NUL_REDIRECT_REGEX = /(\d?&?>+\s*)[Nn][Uu][Ll](?=\s|$|[|&;)\n])/g;
var cachedGitBashPath = null;
function setShellIfWindows() {
  if (process.platform !== "win32") {
    return;
  }
  process.env.SHELL = findGitBashPath();
}
function findGitBashPath() {
  if (cachedGitBashPath) {
    return cachedGitBashPath;
  }
  for (const gitPath of findAllWindowsExecutableCandidates("git")) {
    const bashPath = pathWin32.join(gitPath, "..", "..", "bin", "bash.exe");
    if (fs.existsSync(bashPath)) {
      cachedGitBashPath = bashPath;
      return bashPath;
    }
  }
  throw new Error(
    "Deep Code on Windows requires Git Bash. Install Git Bash for Windows and ensure bash.exe is available in PATH."
  );
}
function resolveShellPath() {
  if (process.platform === "win32") {
    return findGitBashPath();
  }
  const envShell = process.env.SHELL;
  if (envShell && getShellKind(envShell) !== "unknown") {
    return envShell;
  }
  return "/bin/bash";
}
function getShellKind(shellPath) {
  const executable = shellPath.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
  if (executable === "bash" || executable === "bash.exe") {
    return "bash";
  }
  if (executable === "zsh" || executable === "zsh.exe") {
    return "zsh";
  }
  return "unknown";
}
function buildShellInitCommand(shellPath) {
  switch (getShellKind(shellPath)) {
    case "zsh":
      return ['ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"', 'if [ -f "$ZSHRC" ]; then . "$ZSHRC"; fi'].join("; ");
    case "bash":
      return ['BASHRC="${BASH_ENV:-$HOME/.bashrc}"', 'if [ -f "$BASHRC" ]; then . "$BASHRC"; fi'].join("; ");
    default:
      return null;
  }
}
function buildDisableExtglobCommand(shellPath) {
  switch (getShellKind(shellPath)) {
    case "bash":
      return "shopt -u extglob 2>/dev/null || true";
    case "zsh":
      return "setopt NO_EXTENDED_GLOB 2>/dev/null || true";
    default:
      return null;
  }
}
function rewriteWindowsNullRedirect(command) {
  return command.replace(NUL_REDIRECT_REGEX, "$1/dev/null");
}
function windowsPathToPosixPath(windowsPath) {
  if (windowsPath.startsWith("\\\\")) {
    return windowsPath.replace(/\\/g, "/");
  }
  const driveMatch = windowsPath.match(/^([A-Za-z]):[/\\]/);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase();
    return `/${driveLetter}${windowsPath.slice(2).replace(/\\/g, "/")}`;
  }
  return windowsPath.replace(/\\/g, "/");
}
function posixPathToWindowsPath(posixPath) {
  if (posixPath.startsWith("//")) {
    return posixPath.replace(/\//g, "\\");
  }
  const cygdriveMatch = posixPath.match(/^\/cygdrive\/([A-Za-z])(\/|$)/);
  if (cygdriveMatch) {
    const driveLetter = cygdriveMatch[1].toUpperCase();
    const rest = posixPath.slice(`/cygdrive/${cygdriveMatch[1]}`.length);
    return `${driveLetter}:${(rest || "\\").replace(/\//g, "\\")}`;
  }
  const driveMatch = posixPath.match(/^\/([A-Za-z])(\/|$)/);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toUpperCase();
    const rest = posixPath.slice(2);
    return `${driveLetter}:${(rest || "\\").replace(/\//g, "\\")}`;
  }
  return posixPath.replace(/\//g, "\\");
}
function toNativeCwd(shellCwd) {
  if (process.platform !== "win32") {
    return shellCwd;
  }
  return posixPathToWindowsPath(shellCwd);
}
function buildShellEnv(shellPath) {
  const env = {
    ...process.env,
    SHELL: shellPath,
    GIT_EDITOR: "true"
  };
  if (process.platform === "win32") {
    const tmpdir3 = windowsPathToPosixPath(os.tmpdir());
    env.TMPDIR = tmpdir3;
    env.TMPPREFIX = path.posix.join(tmpdir3, "zsh");
  }
  return env;
}
function findAllWindowsExecutableCandidates(executable) {
  const extraCandidates = executable === "git" ? WINDOWS_GIT_LOCATIONS : [];
  try {
    const output = execFileSync("where.exe", [executable], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true
    });
    return filterWindowsExecutableCandidates([
      ...output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      ...extraCandidates
    ]);
  } catch {
    return filterWindowsExecutableCandidates(extraCandidates);
  }
}
function filterWindowsExecutableCandidates(candidates) {
  const cwd = process.cwd().toLowerCase();
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const candidate of candidates) {
    const normalized = path.resolve(candidate).toLowerCase();
    const candidateDir = path.dirname(normalized).toLowerCase();
    if (candidateDir === cwd || normalized.startsWith(`${cwd}${path.sep}`)) {
      continue;
    }
    if (!seen.has(normalized) && fs.existsSync(candidate)) {
      seen.add(normalized);
      results.push(candidate);
    }
  }
  return results;
}

// src/prompt.ts
var AGENT_DRIFT_GUARD_SKILL = `
---
name: agent-drift-guard
description: Detect and correct execution drift while working on user requests. Use when you are actively implementing, debugging, reviewing, or investigating and there is a risk of wandering beyond the user's goal, adding unrequested work, touching live systems, over-exploring, or ignoring repeated user boundary corrections. Especially useful during multi-step coding tasks, production-adjacent requests, ambiguous scopes, and anytime you should self-check whether it is still solving the requested problem.
---

# Agent Drift Guard

Keep execution tightly aligned with the user's actual request.

## Quick Start

Run this mental check before substantial work and again whenever the plan expands:

1. State the user's requested outcome in one sentence.
2. List explicit non-goals or boundaries the user has set.
3. Ask whether the next action directly advances the requested outcome.
4. If not, either cut it or pause to confirm.

## Drift Signals

Treat these as warning signs that execution may be drifting:

- Exploring broadly before opening the most relevant file, command, or artifact.
- Solving adjacent operational issues when the user asked only for code changes.
- Adding extra safeguards, scripts, docs, refactors, or cleanup that the user did not ask for.
- Reframing the task around what seems "better" instead of what was requested.
- Continuing with a broader plan after the user narrows the scope.
- Repeating searches or tool calls without increasing certainty.
- Mixing diagnosis, remediation, and feature work when the user asked for only one of them.
- Touching production-like state, external systems, or live data without explicit permission.

## Severity Levels

### Level 1: Mild Drift

Examples:
- One or two extra exploratory commands.
- Considering a broader solution but not acting on it yet.
- Briefly over-explaining instead of moving the task forward.

Response:
- Auto-correct silently.
- Narrow to the smallest next action.
- Do not interrupt the user.

### Level 2: Material Drift

Examples:
- Planning additional deliverables not requested.
- Writing helper scripts, migrations, docs, or tests outside the asked scope.
- Expanding from code changes into operational fixes.
- Continuing after the user has already corrected the scope once.

Response:
- Stop and realign internally first.
- If the broader action is avoidable, drop it and continue on scope.
- If the broader action has non-obvious tradeoffs, ask a brief confirmation question.

### Level 3: Boundary or Risk Violation

Examples:
- Modifying live systems, production data, external services, or user-owned state without being asked.
- Taking destructive or hard-to-reverse actions outside the requested scope.
- Ignoring repeated user instructions about what not to do.

Response:
- Pause before acting.
- Surface the exact boundary and ask for confirmation.
- Offer the smallest on-scope option first.

## Self-Check Loop

Use this loop during execution:

### Before the first meaningful action

Write down mentally:
- Requested outcome
- Allowed scope
- Forbidden scope
- Smallest useful next step

### After each non-trivial step

Ask:
- Did this step directly help deliver the requested outcome?
- Did I learn something that changes scope, or only implementation?
- Am I about to do more than the user asked?

### After a user correction

Treat the correction as a hard boundary update.

Then:
- Remove the old broader plan.
- Do not defend the discarded work.
- Continue from the narrowed scope.
- If needed, acknowledge briefly and move on.

## Decision Rules

Use these rules in order:

1. Prefer the most direct artifact first.
   - Open the relevant file before scanning the whole repo.
   - Inspect the specific failing path before designing a general framework.

2. Prefer the smallest complete fix.
   - Solve the asked problem before improving related systems.
   - Avoid bonus work unless it is required for correctness.

3. Prefer internal correction over user interruption.
   - If you can shrink back to scope confidently, do it.
   - Ask only when the next step changes deliverables, risk, or ownership.

4. Treat repeated user constraints as priority signals.
   - A repeated instruction means your execution style is currently misaligned.
   - Tighten scope immediately.

5. Separate categories of work.
   - Code change, investigation, production remediation, cleanup, and documentation are distinct tasks unless the user explicitly combines them.

## Good Intervention Style

When you must pause, keep it short and specific:

- State the potential drift in one sentence.
- Name the tradeoff or boundary.
- Offer the smallest on-scope option first.

Example:

"Quick alignment check: I can keep this to the code fix only, or also add an ops cleanup step. I'll stick to the code fix unless you want both."

## Anti-Patterns

Do not:

- Create cleanup scripts, docs, or side tools just because they seem useful.
- Broaden the task after discovering a neighboring problem.
- Continue with a plan the user has already rejected.
- Justify drift with "best practice" when the user asked for a narrower deliverable.
- Hide extra work inside a larger patch.

## Final Check Before Responding

Before sending the final answer, verify:

- The delivered work matches the requested outcome.
- No extra deliverables were added without confirmation.
- Any assumptions are stated briefly.
- Suggested next steps are optional, not bundled into the completed work.
`;
var COMPACT_PROMPT_BASE = `Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts and ensure you've covered all necessary points. In your analysis process:

1. Chronologically analyze each message and section of the conversation. For each section thoroughly identify:
   - The user's explicit requests and intents
   - Your approach to addressing the user's requests
   - Key decisions, technical concepts and code patterns
   - Specific details like:
     - file names
     - full code snippets
     - function signatures
     - file edits
  - Errors that you ran into and how you fixed them
  - Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
2. Double-check for technical accuracy and completeness, addressing each required element thoroughly.

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.
4. Errors and fixes: List all errors that you ran into, and how you fixed them. Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.
6. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
7. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
8. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's most recent explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests or really old requests that were already completed without confirming with the user first.
                       If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Here's an example of how your output should be structured:

<example>
<analysis>
[Your thought process, ensuring all points are covered thoroughly and accurately]
</analysis>

<summary>
1. Primary Request and Intent:
   [Detailed description]

2. Key Technical Concepts:
   - [Concept 1]
   - [Concept 2]
   - [...]

3. Files and Code Sections:
   - [File Name 1]
      - [Summary of why this file is important]
      - [Summary of the changes made to this file, if any]
      - [Important Code Snippet]
   - [File Name 2]
      - [Important Code Snippet]
   - [...]

4. Errors and fixes:
    - [Detailed description of error 1]:
      - [How you fixed the error]
      - [User feedback on the error if any]
    - [...]

5. Problem Solving:
   [Description of solved problems and ongoing troubleshooting]

6. All user messages: 
    - [Detailed non tool use user message]
    - [...]

7. Pending Tasks:
   - [Task 1]
   - [Task 2]
   - [...]

8. Current Work:
   [Precise description of current work]

9. Optional Next Step:
   [Optional Next step to take]

</summary>`;
var SYSTEM_PROMPT_BASE = `You are an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.`;
function readToolDocs(extensionRoot, _options = {}) {
  const toolsDir = path2.join(extensionRoot, "docs", "tools");
  if (!fs2.existsSync(toolsDir)) {
    return "";
  }
  const entries = fs2.readdirSync(toolsDir);
  const docs = entries.filter((entry) => entry.endsWith(".md")).sort().map((entry) => {
    const fullPath = path2.join(toolsDir, entry);
    try {
      return fs2.readFileSync(fullPath, "utf8").trim();
    } catch {
      return "";
    }
  }).filter((content) => content.length > 0);
  return docs.join("\n\n");
}
function getSystemPrompt(projectRoot, options = {}) {
  const toolDocs = readToolDocs(getExtensionRoot(), options);
  const basePrompt = toolDocs ? `${SYSTEM_PROMPT_BASE}

# Available Tools

${toolDocs}` : SYSTEM_PROMPT_BASE;
  return `${basePrompt}

${getRuntimeContext(projectRoot)}`;
}
function getCompactPrompt(sessionMessages) {
  const jsonl = sessionMessages.map(
    (message) => JSON.stringify({
      id: message.id,
      role: message.role,
      content: message.content,
      contentParams: message.contentParams,
      messageParams: message.messageParams,
      createTime: message.createTime
    })
  ).join("\n");
  return `${COMPACT_PROMPT_BASE}

conversation below:

\`\`\`jsonl
${jsonl}
\`\`\``;
}
function getRuntimeContext(projectRoot) {
  const uname = getUnameInfo();
  const shellPath = getShellPathInfo();
  const shellModeOpts = process.platform === "win32" ? { "shell mode": "git-bash" } : {};
  const runtimeVersions = getRuntimeVersionInfo();
  const env = {
    "root path": projectRoot,
    pwd: projectRoot,
    homedir: os2.homedir(),
    "system info": uname,
    "shell path": shellPath,
    ...shellModeOpts,
    ...runtimeVersions,
    "command installed": {
      "ast-grep": checkToolInstalled("ast-grep"),
      ripgrep: checkToolInstalled("rg"),
      jq: checkToolInstalled("jq")
    }
  };
  return `# Local Workspace Environment

\`\`\`json
${JSON.stringify(env, null, 2)}
\`\`\``;
}
function checkToolInstalled(tool) {
  try {
    if (process.platform === "win32") {
      const bashPath = findGitBashPath();
      execFileSync2(bashPath, ["-lc", `command -v ${shellSingleQuote(tool)}`], {
        encoding: "utf8",
        stdio: "ignore",
        windowsHide: true
      });
      return true;
    }
    execSync(`command -v ${tool}`, { encoding: "utf8", stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function getShellPathInfo() {
  try {
    return resolveShellPath();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
function shellSingleQuote(value) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
function getRuntimeVersionInfo() {
  const versions = {};
  const pythonVersion = getCommandVersion("python3", ["--version"]);
  const nodeVersion = getCommandVersion("node", ["--version"]);
  if (pythonVersion) {
    versions["python3 version"] = pythonVersion.replace(/^Python\s+/i, "");
  }
  if (nodeVersion) {
    versions["node version"] = nodeVersion;
  }
  return versions;
}
function getCommandVersion(command, args2) {
  try {
    const commandText = [command, ...args2].map(shellSingleQuote).join(" ");
    if (process.platform === "win32") {
      return execFileSync2(findGitBashPath(), ["-lc", `${commandText} 2>&1`], {
        encoding: "utf8",
        windowsHide: true
      }).trim();
    }
    return execSync(`${commandText} 2>&1`, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
function getUnameInfo() {
  try {
    if (process.platform === "win32") {
      return execFileSync2(findGitBashPath(), ["-lc", "uname -a"], {
        encoding: "utf8",
        windowsHide: true
      }).trim();
    }
    return execSync("uname -a", { encoding: "utf8" }).trim();
  } catch {
    return `${os2.type()} ${os2.release()} ${os2.arch()}`;
  }
}
function getExtensionRoot() {
  const candidates = [];
  if (typeof __dirname !== "undefined") {
    candidates.push(path2.resolve(__dirname, ".."), __dirname);
  }
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path2.dirname(currentFilePath);
  candidates.push(path2.resolve(currentDir, ".."), currentDir);
  for (const candidate of candidates) {
    if (fs2.existsSync(path2.join(candidate, "docs", "tools"))) {
      return candidate;
    }
  }
  return candidates[0] ?? process.cwd();
}
function getTools(_options = {}) {
  const tools = [
    {
      type: "function",
      function: {
        name: "bash",
        description: "Execute shell commands in a persistent bash session.",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute"
            },
            description: {
              type: "string",
              description: 'Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description - just describe what it does.'
            }
          },
          required: ["command"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "AskUserQuestion",
        description: "When the task has ambiguities or multiple implementation approaches, use this tool to pause execution and ask the user a question to get clarification or make a decision.",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              description: "Questions to present to the user. Usually only one question is needed at a time.",
              items: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The question to ask the user."
                  },
                  multiSelect: {
                    type: "boolean",
                    description: "Whether the user may choose multiple options."
                  },
                  options: {
                    type: "array",
                    description: "A list of predefined options for the user to choose from.",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: "string",
                          description: "The display text for the option."
                        },
                        description: {
                          type: "string",
                          description: "A detailed explanation or hint about this option to help the user understand what happens if they choose it."
                        }
                      },
                      required: ["label"]
                    }
                  }
                },
                required: ["question", "options"]
              }
            }
          },
          required: ["questions"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "read",
        description: "Read files from the filesystem (text, images, PDFs, notebooks).",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "UNIX-style path to file"
            },
            offset: {
              type: "number",
              description: "Line number to start reading from"
            },
            limit: {
              type: "number",
              description: "Number of lines to read"
            },
            pages: {
              type: "string",
              description: 'Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files.'
            }
          },
          required: ["file_path"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "write",
        description: "Create files or overwrite them with a complete string payload. Prefer edit for existing files.",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Absolute path to file"
            },
            content: {
              type: "string",
              description: "Complete file content as a single string. Serialize JSON documents before writing."
            }
          },
          required: ["file_path", "content"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "edit",
        description: "Perform scoped string replacements in files.",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Absolute path to file. Optional when snippet_id is provided."
            },
            snippet_id: {
              type: "string",
              description: "Snippet id returned by the Read or Edit tool to scope the search range after a partial read."
            },
            old_string: {
              type: "string",
              description: "Exact text to replace inside the file or snippet scope"
            },
            new_string: {
              type: "string",
              description: "Replacement text (must differ from old_string)"
            },
            replace_all: {
              type: "boolean",
              description: "Replace all occurences of old_string (default false)",
              default: false
            },
            expected_occurrences: {
              type: "number",
              description: "Expected number of matches, especially useful as a safety check with replace_all"
            }
          },
          required: ["old_string", "new_string"],
          additionalProperties: false
        }
      }
    }
  ];
  tools.push({
    type: "function",
    function: {
      name: "WebSearch",
      description: "Perform web searching using a natural language query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "A search query phrased as a clear, specific natural language question or statement that includes key context."
          }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  });
  return tools;
}

// src/tools/ask-user-question-handler.ts
async function handleAskUserQuestionTool(args2, _context) {
  const questions = parseQuestions(args2.questions);
  if (!questions.ok) {
    return {
      ok: false,
      name: "AskUserQuestion",
      error: questions.error
    };
  }
  const metadata = {
    kind: "ask_user_question",
    questions: questions.value
  };
  return {
    ok: true,
    name: "AskUserQuestion",
    output: buildQuestionSummary(questions.value),
    metadata,
    awaitUserResponse: true
  };
}
function parseQuestions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      error: '"questions" must be a non-empty array.'
    };
  }
  const questions = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        ok: false,
        error: `Question at index ${index} must be an object.`
      };
    }
    const question = typeof item.question === "string" ? item.question.trim() : "";
    if (!question) {
      return {
        ok: false,
        error: `Question at index ${index} is missing a non-empty "question" string.`
      };
    }
    const rawOptions = item.options;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
      return {
        ok: false,
        error: `Question at index ${index} must include a non-empty "options" array.`
      };
    }
    const options = [];
    for (let optionIndex = 0; optionIndex < rawOptions.length; optionIndex += 1) {
      const option = rawOptions[optionIndex];
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return {
          ok: false,
          error: `Option ${optionIndex} for question ${index} must be an object.`
        };
      }
      const label = typeof option.label === "string" ? option.label.trim() : "";
      if (!label) {
        return {
          ok: false,
          error: `Option ${optionIndex} for question ${index} is missing a non-empty "label" string.`
        };
      }
      const description = typeof option.description === "string" ? option.description.trim() : void 0;
      options.push({
        label,
        description: description || void 0
      });
    }
    const multiSelect = typeof item.multiSelect === "boolean" ? item.multiSelect : void 0;
    questions.push({
      question,
      multiSelect,
      options
    });
  }
  return {
    ok: true,
    value: questions
  };
}
function buildQuestionSummary(questions) {
  const lines = ["Waiting for user input."];
  questions.forEach((item, index) => {
    lines.push("");
    lines.push(`${index + 1}. ${item.question}`);
    lines.push(`   Mode: ${item.multiSelect ? "multi-select" : "single-select"}`);
    item.options.forEach((option) => {
      lines.push(`   - ${option.label}`);
      if (option.description) {
        lines.push(`     ${option.description}`);
      }
    });
    lines.push("   - Other");
  });
  return lines.join("\n");
}

// src/tools/bash-handler.ts
import { spawn as spawn2 } from "child_process";
var MAX_OUTPUT_CHARS = 3e4;
var MAX_CAPTURE_CHARS = 10 * 1024 * 1024;
var sessionWorkingDirs = /* @__PURE__ */ new Map();
async function handleBashTool(args2, context) {
  const command = typeof args2.command === "string" ? args2.command : "";
  if (!command.trim()) {
    return {
      ok: false,
      name: "bash",
      error: 'Missing required "command" string.'
    };
  }
  const startCwd = getSessionCwd(context.sessionId, context.projectRoot);
  const { shellPath, shellArgs, marker } = buildShellCommand(command);
  const execution = await executeShellCommand(shellPath, shellArgs, startCwd, command, context);
  const result = buildToolCommandResult(
    execution.stdout,
    execution.stderr,
    marker,
    execution.exitCode,
    execution.signal,
    shellPath,
    startCwd
  );
  updateSessionCwd(context.sessionId, startCwd, result.cwd);
  if (execution.error || result.exitCode !== 0 || result.signal !== null) {
    const errorMessage = buildErrorMessage(result.exitCode, result.signal, execution.error);
    return formatResult({ ...result, ok: false }, "bash", errorMessage);
  }
  return formatResult(result, "bash");
}
function getSessionCwd(sessionId, fallback) {
  return sessionWorkingDirs.get(sessionId) ?? fallback;
}
function updateSessionCwd(sessionId, fallback, cwd) {
  const nextCwd = cwd ?? fallback;
  sessionWorkingDirs.set(sessionId, nextCwd);
}
function buildShellCommand(command) {
  const shellPath = resolveShellPath();
  const marker = buildMarker();
  const initCommand = buildShellInitCommand(shellPath);
  const disableExtglobCommand = buildDisableExtglobCommand(shellPath);
  const normalizedCommand = rewriteWindowsNullRedirect(command);
  const wrappedParts = [];
  if (initCommand) {
    wrappedParts.push(initCommand);
  }
  if (disableExtglobCommand) {
    wrappedParts.push(disableExtglobCommand);
  }
  wrappedParts.push(
    normalizedCommand,
    "__DEEPCODE_STATUS__=$?",
    `printf '%s%s\\n' "${marker}" "$PWD"`,
    "exit $__DEEPCODE_STATUS__"
  );
  const wrappedCommand = `{ ${wrappedParts.join("; ")}; } < /dev/null`;
  return { shellPath, shellArgs: ["-c", wrappedCommand], marker };
}
async function executeShellCommand(shellPath, shellArgs, cwd, command, context) {
  return new Promise((resolve6) => {
    const detached = process.platform !== "win32";
    const child = spawn2(shellPath, shellArgs, {
      cwd,
      env: buildShellEnv(shellPath),
      detached,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const pid = child.pid;
    if (typeof pid === "number") {
      context.onProcessStart?.(pid, command);
    }
    let stdout = "";
    let stderr = "";
    let error;
    child.stdout?.on("data", (chunk) => {
      stdout = appendChunk(stdout, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendChunk(stderr, chunk);
    });
    child.on("error", (spawnError) => {
      error = spawnError.message;
    });
    child.on("close", (code, signal) => {
      if (typeof pid === "number") {
        context.onProcessExit?.(pid);
      }
      resolve6({
        stdout,
        stderr,
        exitCode: typeof code === "number" ? code : null,
        signal: signal ?? null,
        error
      });
    });
  });
}
function appendChunk(existing, chunk) {
  if (existing.length >= MAX_CAPTURE_CHARS) {
    return existing;
  }
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
  const remaining = MAX_CAPTURE_CHARS - existing.length;
  return `${existing}${text.slice(0, remaining)}`;
}
function buildMarker() {
  const token = Math.random().toString(36).slice(2);
  return `__DEEPCODE_PWD__${token}__`;
}
function buildToolCommandResult(stdout, stderr, marker, exitCode, signal, shellPath, startCwd) {
  const { output: cleanedStdout, cwd } = stripMarker(stdout, marker);
  const combined = joinOutput(cleanedStdout, stderr);
  const { text, truncated } = truncateOutput(combined);
  return {
    ok: exitCode === 0 && signal === null,
    output: text,
    cwd,
    exitCode,
    signal,
    truncated,
    shellPath,
    startCwd
  };
}
function stripMarker(stdout, marker) {
  if (!stdout) {
    return { output: "", cwd: null };
  }
  const lines = stdout.split(/\r?\n/);
  let markerIndex = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].startsWith(marker)) {
      markerIndex = i;
      break;
    }
  }
  if (markerIndex === -1) {
    return { output: stdout, cwd: null };
  }
  const markerLine = lines[markerIndex];
  const shellCwd = markerLine.slice(marker.length).trim();
  const cwd = shellCwd ? toNativeCwd(shellCwd) : null;
  lines.splice(markerIndex, 1);
  return { output: lines.join("\n"), cwd };
}
function joinOutput(stdout, stderr) {
  const trimmedStdout = stdout ?? "";
  const trimmedStderr = stderr ?? "";
  if (trimmedStdout && trimmedStderr) {
    return `${trimmedStdout}
${trimmedStderr}`;
  }
  return trimmedStdout || trimmedStderr;
}
function truncateOutput(output) {
  if (output.length <= MAX_OUTPUT_CHARS) {
    return { text: output, truncated: false };
  }
  return { text: output.slice(0, MAX_OUTPUT_CHARS), truncated: true };
}
function buildErrorMessage(exitCode, signal, error) {
  if (error) {
    return error;
  }
  if (signal) {
    return `Command terminated by signal ${signal}.`;
  }
  if (exitCode !== null) {
    return `Command failed with exit code ${exitCode}.`;
  }
  return "Command failed.";
}
function formatResult(result, name, errorMessage) {
  const metadata = {
    exitCode: result.exitCode,
    signal: result.signal,
    cwd: result.cwd,
    truncated: result.truncated,
    shellPath: result.shellPath,
    startCwd: result.startCwd
  };
  const outputValue = result.output ? result.output : void 0;
  return {
    ok: result.ok,
    name,
    output: outputValue,
    error: errorMessage,
    metadata
  };
}

// src/tools/edit-handler.ts
import * as fs4 from "fs";
import { z as z2 } from "zod";

// src/tools/file-utils.ts
import * as fs3 from "fs";
import * as path3 from "path";
function normalizeContent(value) {
  return value.replace(/\r\n/g, "\n");
}
function detectLineEndings(value) {
  return value.includes("\r\n") ? "CRLF" : "LF";
}
function detectEncoding(buffer) {
  if (buffer.length >= 2 && buffer[0] === 255 && buffer[1] === 254) {
    return "utf16le";
  }
  return "utf8";
}
function readTextFileWithMetadata(filePath) {
  const buffer = fs3.readFileSync(filePath);
  const stat = fs3.statSync(filePath);
  const encoding = detectEncoding(buffer);
  const raw = buffer.toString(encoding);
  return {
    content: normalizeContent(raw),
    encoding,
    lineEndings: detectLineEndings(raw),
    timestamp: Math.floor(stat.mtimeMs)
  };
}
function writeTextFile(filePath, content, encoding, lineEndings) {
  const normalized = normalizeContent(content);
  const toWrite = lineEndings === "CRLF" ? normalized.replace(/\n/g, "\r\n") : normalized;
  fs3.writeFileSync(filePath, toWrite, { encoding });
  return Buffer.byteLength(toWrite, encoding === "utf16le" ? "utf16le" : "utf8");
}
function ensureParentDirectory(filePath) {
  fs3.mkdirSync(path3.dirname(filePath), { recursive: true });
}
function hasFileChangedSinceState(filePath, state) {
  const current = readTextFileWithMetadata(filePath);
  if (current.timestamp <= state.timestamp) {
    return false;
  }
  const isFullRead = !state.isPartialView && typeof state.offset === "undefined" && typeof state.limit === "undefined";
  return !(isFullRead && current.content === state.content);
}
function buildDiffPreview(filePath, originalContent, updatedContent, maxLines = 40) {
  const original = originalContent === null ? null : normalizeContent(originalContent);
  const updated = normalizeContent(updatedContent);
  if (original !== null && original === updated) {
    return null;
  }
  const oldLines = toDiffLines(original);
  const newLines = toDiffLines(updated);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (suffix < oldLines.length - prefix && suffix < newLines.length - prefix && oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]) {
    suffix += 1;
  }
  const oldChanged = oldLines.slice(prefix, oldLines.length - suffix);
  const newChanged = newLines.slice(prefix, newLines.length - suffix);
  const oldStart = original === null ? 0 : prefix + 1;
  const newStart = prefix + 1;
  const previewLines = [
    `--- ${original === null ? "/dev/null" : `a/${filePath}`}`,
    `+++ b/${filePath}`,
    `@@ -${oldStart},${oldChanged.length} +${newStart},${newChanged.length} @@`
  ];
  if (prefix > 0) {
    previewLines.push(` ${oldLines[prefix - 1]}`);
  }
  for (const line of oldChanged) {
    previewLines.push(`-${line}`);
  }
  for (const line of newChanged) {
    previewLines.push(`+${line}`);
  }
  if (suffix > 0) {
    previewLines.push(` ${oldLines[oldLines.length - suffix]}`);
  }
  if (previewLines.length > maxLines) {
    return `${previewLines.slice(0, maxLines).join("\n")}
...`;
  }
  return previewLines.join("\n");
}
function toDiffLines(content) {
  if (!content) {
    return [];
  }
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

// src/tools/runtime.ts
import { z } from "zod";
function semanticBoolean(defaultValue = false) {
  return z.preprocess((value) => {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return value;
  }, z.boolean().default(defaultValue));
}
async function executeValidatedTool(name, schema, rawArgs, context, handler, options = {}) {
  const preprocessed = options.preprocess ? options.preprocess(rawArgs) : { ok: true, input: rawArgs };
  if (!preprocessed.ok) {
    return {
      ok: false,
      name,
      error: `InputValidationError: ${preprocessed.error}`
    };
  }
  const parsed = schema.safeParse(preprocessed.input);
  if (!parsed.success) {
    return {
      ok: false,
      name,
      error: `InputValidationError: ${formatZodError(parsed.error)}`
    };
  }
  return handler(parsed.data, context);
}
function formatZodError(error) {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid tool input.";
  }
  const path14 = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path14}${issue.message}`;
}

// src/tools/state.ts
import * as path4 from "path";
var fileStatesBySession = /* @__PURE__ */ new Map();
var snippetsBySession = /* @__PURE__ */ new Map();
var snippetCountersBySession = /* @__PURE__ */ new Map();
function normalizeFilePath(filePath, platform = process.platform) {
  const nativePath = normalizeNativeFilePath(filePath, platform);
  return platform === "win32" ? path4.win32.normalize(nativePath) : path4.normalize(nativePath);
}
function normalizeNativeFilePath(filePath, platform = process.platform) {
  if (platform !== "win32") {
    return filePath;
  }
  if (isGitBashAbsolutePath(filePath)) {
    return posixPathToWindowsPath(filePath);
  }
  return filePath;
}
function isAbsoluteFilePath(filePath, platform = process.platform) {
  const nativePath = normalizeNativeFilePath(filePath, platform);
  if (platform !== "win32") {
    return path4.isAbsolute(nativePath);
  }
  const normalized = path4.win32.normalize(nativePath);
  return path4.win32.isAbsolute(normalized) && (/^[A-Za-z]:[\\/]/.test(normalized) || /^\\\\/.test(normalized));
}
function isGitBashAbsolutePath(filePath) {
  return /^\/[A-Za-z](?:\/|$)/.test(filePath) || /^\/cygdrive\/[A-Za-z](?:\/|$)/.test(filePath);
}
function recordFileState(sessionId, state) {
  if (!sessionId || !state.filePath) {
    return;
  }
  let sessionState = fileStatesBySession.get(sessionId);
  if (!sessionState) {
    sessionState = /* @__PURE__ */ new Map();
    fileStatesBySession.set(sessionId, sessionState);
  }
  const normalizedPath = normalizeFilePath(state.filePath);
  sessionState.set(normalizedPath, {
    ...state,
    filePath: normalizedPath
  });
}
function markFileRead(sessionId, filePath, state = null) {
  if (!sessionId || !filePath) {
    return;
  }
  recordFileState(sessionId, {
    filePath,
    content: state?.content ?? "",
    timestamp: state?.timestamp ?? 0,
    offset: state?.offset,
    limit: state?.limit,
    isPartialView: state?.isPartialView,
    encoding: state?.encoding,
    lineEndings: state?.lineEndings
  });
}
function getFileState(sessionId, filePath) {
  if (!sessionId || !filePath) {
    return null;
  }
  return fileStatesBySession.get(sessionId)?.get(normalizeFilePath(filePath)) ?? null;
}
function isFullFileView(state) {
  return Boolean(
    state && !state.isPartialView && typeof state.offset === "undefined" && typeof state.limit === "undefined"
  );
}
function createSnippet(sessionId, filePath, startLine, endLine, preview) {
  if (!sessionId || !filePath || startLine < 1 || endLine < startLine) {
    return null;
  }
  const nextCounter = (snippetCountersBySession.get(sessionId) ?? 0) + 1;
  snippetCountersBySession.set(sessionId, nextCounter);
  const snippet = {
    id: `snippet_${nextCounter}`,
    filePath: normalizeFilePath(filePath),
    startLine,
    endLine,
    preview
  };
  let snippets = snippetsBySession.get(sessionId);
  if (!snippets) {
    snippets = /* @__PURE__ */ new Map();
    snippetsBySession.set(sessionId, snippets);
  }
  snippets.set(snippet.id, snippet);
  return snippet;
}
function getSnippet(sessionId, snippetId) {
  if (!sessionId || !snippetId) {
    return null;
  }
  return snippetsBySession.get(sessionId)?.get(snippetId) ?? null;
}

// src/tools/edit-handler.ts
var MAX_CANDIDATE_COUNT = 5;
var REPLACE_ALL_MATCH_THRESHOLD = 5;
var SHORT_REPLACE_ALL_LENGTH = 40;
var MIN_FUZZY_SCORE = 0.45;
var editSchema = z2.strictObject({
  file_path: z2.string().optional(),
  snippet_id: z2.string().optional(),
  old_string: z2.string(),
  new_string: z2.string(),
  replace_all: semanticBoolean(false).optional(),
  expected_occurrences: z2.preprocess((value) => {
    if (value === void 0 || value === null || value === "") {
      return void 0;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }, z2.number().int().min(1, "expected_occurrences must be >= 1.").optional())
});
async function handleEditTool(args2, context) {
  return executeValidatedTool(
    "edit",
    editSchema,
    args2,
    context,
    async (input) => {
      const snippetId = input.snippet_id?.trim() ?? "";
      const snippet = snippetId ? getSnippet(context.sessionId, snippetId) : null;
      let filePath = input.file_path?.trim() ?? "";
      if (!filePath && !snippet) {
        return {
          ok: false,
          name: "edit",
          error: 'Missing required "file_path" string or "snippet_id" string.'
        };
      }
      if (!filePath && snippet) {
        filePath = snippet.filePath;
      }
      filePath = normalizeFilePath(filePath);
      if (!isAbsoluteFilePath(filePath)) {
        return {
          ok: false,
          name: "edit",
          error: "file_path must be an absolute path."
        };
      }
      if (snippetId && !snippet) {
        return {
          ok: false,
          name: "edit",
          error: `Unknown snippet_id: ${snippetId}`
        };
      }
      if (snippet && snippet.filePath !== filePath) {
        return {
          ok: false,
          name: "edit",
          error: "snippet_id does not belong to the provided file_path."
        };
      }
      if (input.old_string === "") {
        return {
          ok: false,
          name: "edit",
          error: "old_string must not be empty."
        };
      }
      if (input.old_string === input.new_string) {
        return {
          ok: false,
          name: "edit",
          error: "new_string must differ from old_string."
        };
      }
      if (!fs4.existsSync(filePath)) {
        return {
          ok: false,
          name: "edit",
          error: `File not found: ${filePath}`
        };
      }
      let stat;
      try {
        stat = fs4.statSync(filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "edit",
          error: `Failed to stat file: ${message}`
        };
      }
      if (stat.isDirectory()) {
        return {
          ok: false,
          name: "edit",
          error: "file_path points to a directory."
        };
      }
      const fileState = getFileState(context.sessionId, filePath);
      if (!fileState) {
        return {
          ok: false,
          name: "edit",
          error: "Must read file before editing."
        };
      }
      if (!snippet && !isFullFileView(fileState)) {
        return {
          ok: false,
          name: "edit",
          error: "File was only partially read. Use snippet_id or read the full file before editing."
        };
      }
      if (hasFileChangedSinceState(filePath, fileState)) {
        return {
          ok: false,
          name: "edit",
          error: "File has been modified since read. Read it again before editing."
        };
      }
      try {
        const metadata = readTextFileWithMetadata(filePath);
        const raw = metadata.content;
        const oldString = input.old_string;
        const newString = input.new_string;
        const replaceAll = input.replace_all ?? false;
        const lineIndex = buildLineIndex(raw);
        const scope = buildSearchScope(filePath, raw, lineIndex, snippet ?? null);
        let matches = findOccurrences(raw, oldString, scope);
        let matchedVia = "exact";
        let replacementOldString = oldString;
        let replacementNewString = newString;
        if (matches.length === 0) {
          const looseEscapeMatches = findLooseEscapeMatches(raw, oldString, scope);
          if (looseEscapeMatches.length === 1 && looseEscapeMatches[0]?.score === 1) {
            const correctedStrings = await correctEscapedStringsWithLLM(
              raw.slice(scope.startOffset, scope.endOffset),
              oldString,
              newString,
              looseEscapeMatches[0].text,
              context
            );
            if (correctedStrings) {
              const correctedMatches = findOccurrences(raw, correctedStrings.oldString, scope);
              if (correctedMatches.length > 0) {
                matches = correctedMatches;
                matchedVia = "llm_escape_correction";
                replacementOldString = correctedStrings.oldString;
                replacementNewString = correctedStrings.newString;
              }
            }
            if (matches.length === 0) {
              matches = [looseEscapeMatches[0]];
              matchedVia = "loose_escape";
            }
          }
        }
        if (matches.length === 0) {
          const closestMatch = findClosestMatch(raw, oldString, scope, lineIndex);
          return {
            ok: false,
            name: "edit",
            error: "old_string not found in file.",
            metadata: closestMatch ? {
              scope: formatScopeMetadata(scope),
              closest_match: buildClosestMatchMetadata(context.sessionId, filePath, closestMatch)
            } : {
              scope: formatScopeMetadata(scope)
            }
          };
        }
        if (!replaceAll && matches.length > 1) {
          return {
            ok: false,
            name: "edit",
            error: "old_string is not unique; use snippet_id, replace_all, or provide more context.",
            metadata: {
              match_count: matches.length,
              scope: formatScopeMetadata(scope),
              candidates: buildCandidateMetadata(context.sessionId, filePath, raw, matches)
            }
          };
        }
        const expectedOccurrences = input.expected_occurrences ?? null;
        const replaceAllGuardError = validateReplaceAllGuard({
          replaceAll,
          matchCount: matches.length,
          oldString: replacementOldString,
          expectedOccurrences
        });
        if (replaceAllGuardError) {
          return {
            ok: false,
            name: "edit",
            error: replaceAllGuardError,
            metadata: {
              match_count: matches.length,
              scope: formatScopeMetadata(scope),
              candidates: buildCandidateMetadata(context.sessionId, filePath, raw, matches)
            }
          };
        }
        const updated = applyReplacement(raw, replacementOldString, replacementNewString, matches, replaceAll);
        const diffPreview = buildDiffPreview(filePath, raw, updated);
        writeTextFile(filePath, updated, metadata.encoding, metadata.lineEndings);
        const freshMetadata = readTextFileWithMetadata(filePath);
        recordFileState(context.sessionId, {
          filePath,
          content: freshMetadata.content,
          timestamp: freshMetadata.timestamp,
          encoding: freshMetadata.encoding,
          lineEndings: freshMetadata.lineEndings
        });
        const replacedCount = replaceAll ? matches.length : 1;
        return {
          ok: true,
          name: "edit",
          output: `Replaced ${replacedCount} occurrence(s) in ${filePath}.`,
          metadata: {
            file_path: filePath,
            replaced_count: replacedCount,
            matched_via: matchedVia,
            cache_refreshed: true,
            read_scope_type: snippet ? "snippet" : "full",
            encoding: freshMetadata.encoding,
            line_endings: freshMetadata.lineEndings,
            diff_preview: diffPreview,
            scope: formatScopeMetadata(scope)
          }
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "edit",
          error: message
        };
      }
    },
    {
      preprocess: (rawInput) => {
        const nextInput = { ...rawInput };
        if (typeof nextInput.file_path === "string") {
          nextInput.file_path = normalizeFilePath(nextInput.file_path);
        }
        if (typeof nextInput.snippet_id === "string") {
          nextInput.snippet_id = nextInput.snippet_id.trim();
        }
        return { ok: true, input: nextInput };
      }
    }
  );
}
function buildLineIndex(raw) {
  const lines = raw.split(/\r?\n/);
  const lineStarts = new Array(lines.length + 2).fill(raw.length);
  let cursor = 0;
  for (let index = 0; index < lines.length; index += 1) {
    lineStarts[index + 1] = cursor;
    cursor += lines[index].length;
    if (index < lines.length - 1) {
      if (raw.slice(cursor, cursor + 2) === "\r\n") {
        cursor += 2;
      } else if (raw[cursor] === "\n") {
        cursor += 1;
      }
    }
  }
  lineStarts[lines.length + 1] = raw.length;
  return { lines, lineStarts };
}
function buildSearchScope(filePath, raw, lineIndex, snippet) {
  if (!snippet) {
    return {
      filePath,
      startOffset: 0,
      endOffset: raw.length,
      startLine: 1,
      endLine: lineIndex.lines.length,
      snippetId: null
    };
  }
  const safeStartLine = clamp(snippet.startLine, 1, lineIndex.lines.length);
  const safeEndLine = clamp(snippet.endLine, safeStartLine, lineIndex.lines.length);
  return {
    filePath,
    startOffset: lineIndex.lineStarts[safeStartLine],
    endOffset: lineIndex.lineStarts[safeEndLine + 1],
    startLine: safeStartLine,
    endLine: safeEndLine,
    snippetId: snippet.id
  };
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function findOccurrences(raw, needle, scope) {
  if (!raw || !needle) {
    return [];
  }
  const scopeText = raw.slice(scope.startOffset, scope.endOffset);
  const matches = [];
  let searchIndex = 0;
  while (true) {
    const found = scopeText.indexOf(needle, searchIndex);
    if (found === -1) {
      break;
    }
    const startOffset = scope.startOffset + found;
    const endOffset = startOffset + needle.length;
    matches.push({
      startOffset,
      endOffset,
      startLine: offsetToLine(raw, startOffset),
      endLine: offsetToLine(raw, Math.max(startOffset, endOffset - 1))
    });
    searchIndex = found + needle.length;
  }
  return matches;
}
function findLooseEscapeMatches(raw, needle, scope) {
  if (!raw || !needle) {
    return [];
  }
  const scopeText = raw.slice(scope.startOffset, scope.endOffset);
  const looseEscapeRegex = buildLooseEscapeRegex(needle);
  if (!looseEscapeRegex) {
    return [];
  }
  const normalizedNeedle = normalizeLooseText(needle);
  const matches = [];
  for (const match of scopeText.matchAll(looseEscapeRegex)) {
    if (typeof match.index !== "number") {
      continue;
    }
    const text = match[0];
    const startOffset = scope.startOffset + match.index;
    const endOffset = startOffset + text.length;
    matches.push({
      text,
      score: similarityScore(normalizedNeedle, normalizeLooseText(text)),
      startOffset,
      endOffset,
      startLine: offsetToLine(raw, startOffset),
      endLine: offsetToLine(raw, Math.max(startOffset, endOffset - 1))
    });
  }
  return matches;
}
function offsetToLine(raw, offset) {
  if (offset <= 0) {
    return 1;
  }
  let line = 1;
  for (let index = 0; index < raw.length && index < offset; index += 1) {
    if (raw[index] === "\n") {
      line += 1;
    }
  }
  return line;
}
function validateReplaceAllGuard(input) {
  if (!input.replaceAll) {
    if (input.expectedOccurrences !== null && input.expectedOccurrences !== 1) {
      return "expected_occurrences can only be greater than 1 when replace_all is true.";
    }
    return null;
  }
  if (input.expectedOccurrences !== null && input.expectedOccurrences !== input.matchCount) {
    return `replace_all expected ${input.expectedOccurrences} occurrence(s), but found ${input.matchCount}.`;
  }
  const isShortFragment = input.oldString.trim().length < SHORT_REPLACE_ALL_LENGTH;
  const needsExplicitCount = input.expectedOccurrences === null && (input.matchCount > REPLACE_ALL_MATCH_THRESHOLD || isShortFragment && input.matchCount > 1);
  if (needsExplicitCount) {
    return `replace_all would affect ${input.matchCount} occurrence(s); provide expected_occurrences to confirm this broader replacement.`;
  }
  return null;
}
function applyReplacement(raw, oldString, newString, matches, replaceAll) {
  if (!replaceAll) {
    return raw.slice(0, matches[0].startOffset) + newString + raw.slice(matches[0].endOffset);
  }
  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += raw.slice(cursor, match.startOffset);
    result += newString;
    cursor = match.endOffset;
  }
  result += raw.slice(cursor);
  return result;
}
function buildCandidateMetadata(sessionId, filePath, raw, matches) {
  return matches.slice(0, MAX_CANDIDATE_COUNT).map((match) => {
    const preview = buildPreview(raw, match.startLine, match.endLine);
    const snippet = createSnippet(sessionId, filePath, match.startLine, match.endLine, preview);
    return {
      snippet_id: snippet?.id ?? null,
      start_line: match.startLine,
      end_line: match.endLine,
      preview
    };
  });
}
function buildClosestMatchMetadata(sessionId, filePath, closestMatch) {
  const preview = formatWithLineNumbers(closestMatch.text.split(/\r?\n/), closestMatch.startLine);
  const snippet = createSnippet(sessionId, filePath, closestMatch.startLine, closestMatch.endLine, preview);
  return {
    snippet_id: snippet?.id ?? null,
    start_line: closestMatch.startLine,
    end_line: closestMatch.endLine,
    similarity: Number(closestMatch.score.toFixed(3)),
    strategy: closestMatch.strategy,
    preview
  };
}
function formatScopeMetadata(scope) {
  return {
    file_path: scope.filePath,
    start_line: scope.startLine,
    end_line: scope.endLine,
    snippet_id: scope.snippetId
  };
}
function buildPreview(raw, startLine, endLine) {
  const lines = raw.split(/\r?\n/);
  const selected = lines.slice(startLine - 1, endLine);
  return formatWithLineNumbers(selected, startLine);
}
function formatWithLineNumbers(lines, startLine) {
  return lines.map((line, index) => `${String(startLine + index).padStart(6, " ")}	${line}`).join("\n");
}
function findClosestMatch(raw, oldString, scope, lineIndex) {
  const looseEscapeMatches = findLooseEscapeMatches(raw, oldString, scope);
  if (looseEscapeMatches.length > 0) {
    let bestLooseMatch = null;
    for (const match of looseEscapeMatches) {
      const candidate = {
        text: match.text,
        startLine: match.startLine,
        endLine: match.endLine,
        score: match.score,
        strategy: "loose_escape"
      };
      if (!bestLooseMatch || candidate.score > bestLooseMatch.score) {
        bestLooseMatch = candidate;
      }
    }
    if (bestLooseMatch) {
      return bestLooseMatch;
    }
  }
  const targetLineCount = Math.max(1, oldString.split(/\r?\n/).length);
  const windowSizes = Array.from(/* @__PURE__ */ new Set([Math.max(1, targetLineCount - 1), targetLineCount, targetLineCount + 1]));
  const normalizedTarget = normalizeLooseText(oldString);
  let bestMatch = null;
  for (let startLine = scope.startLine; startLine <= scope.endLine; startLine += 1) {
    for (const windowSize of windowSizes) {
      const endLine = startLine + windowSize - 1;
      if (endLine > scope.endLine) {
        continue;
      }
      const candidateText = sliceLines(raw, lineIndex, startLine, endLine);
      const score = similarityScore(normalizedTarget, normalizeLooseText(candidateText));
      if (score < MIN_FUZZY_SCORE) {
        continue;
      }
      const candidate = {
        text: candidateText,
        startLine,
        endLine,
        score,
        strategy: "fuzzy_window"
      };
      if (!bestMatch || candidate.score > bestMatch.score) {
        bestMatch = candidate;
      }
    }
  }
  return bestMatch;
}
function buildLooseEscapeRegex(source) {
  if (!source) {
    return null;
  }
  let pattern = "";
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\\") {
      let slashEnd = index;
      while (slashEnd < source.length && source[slashEnd] === "\\") {
        slashEnd += 1;
      }
      if (slashEnd < source.length && isEscapeSensitiveChar(source[slashEnd])) {
        pattern += "\\\\*";
        pattern += escapeRegExp(source[slashEnd]);
        index = slashEnd;
        continue;
      }
      pattern += escapeRegExp(source.slice(index, slashEnd));
      index = slashEnd - 1;
      continue;
    }
    pattern += escapeRegExp(source[index]);
  }
  return new RegExp(pattern, "g");
}
async function correctEscapedStringsWithLLM(snippetText, oldString, newString, matchedText, context) {
  const clientFactory = context.createOpenAIClient;
  if (!clientFactory) {
    return null;
  }
  const { client, model, baseURL, thinkingEnabled, reasoningEffort } = clientFactory();
  if (!client) {
    return null;
  }
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You correct file-edit strings when the only problem is escaping. Return XML only using <response><corrected_old_string>...</corrected_old_string><corrected_new_string>...</corrected_new_string></response>. Do not change semantics; only fix quoting or escaping so corrected_old_string matches the snippet exactly."
        },
        {
          role: "user",
          content: `<request>
  <snippet_text><![CDATA[${snippetText}]]></snippet_text>
  <old_string><![CDATA[${oldString}]]></old_string>
  <new_string><![CDATA[${newString}]]></new_string>
  <matched_text><![CDATA[${matchedText}]]></matched_text>
</request>
<output_format>
  <response>
    <corrected_old_string><![CDATA[...]]></corrected_old_string>
    <corrected_new_string><![CDATA[...]]></corrected_new_string>
  </response>
</output_format>`
        }
      ],
      ...buildThinkingRequestOptions(thinkingEnabled, reasoningEffort)
    });
    const content = response.choices?.[0]?.message?.content ?? "";
    const parsed = parseCorrectedEditStrings(content);
    if (!parsed) {
      return null;
    }
    const normalizedOld = normalizeLooseText(oldString);
    const normalizedNew = normalizeLooseText(newString);
    if (normalizeLooseText(parsed.oldString) !== normalizedOld) {
      return null;
    }
    if (normalizeLooseText(parsed.newString) !== normalizedNew) {
      return null;
    }
    if (parsed.oldString === parsed.newString) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function parseCorrectedEditStrings(content) {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/```(?:xml)?\s*([\s\S]*?)```/i, "$1").trim();
  const oldMatch = normalized.match(
    /<corrected_old_string>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/corrected_old_string>/i
  );
  const newMatch = normalized.match(
    /<corrected_new_string>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/corrected_new_string>/i
  );
  const correctedOldString = oldMatch?.[1] ?? oldMatch?.[2];
  const correctedNewString = newMatch?.[1] ?? newMatch?.[2];
  if (typeof correctedOldString === "string" && typeof correctedNewString === "string") {
    return {
      oldString: correctedOldString,
      newString: correctedNewString
    };
  }
  return null;
}
function isEscapeSensitiveChar(value) {
  return value === '"' || value === "'" || value === "`" || value === "\\";
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeLooseText(value) {
  return value.replace(/\r\n?/g, "\n").replace(/\\+(?=["'`\\])/g, "").replace(/[ \t]+/g, " ").trim();
}
function similarityScore(left, right) {
  if (left === right) {
    return 1;
  }
  if (!left || !right) {
    return 0;
  }
  const leftBigrams = toBigrams(left);
  const rightBigrams = toBigrams(right);
  if (leftBigrams.length === 0 || rightBigrams.length === 0) {
    return left === right ? 1 : 0;
  }
  const rightCounts = /* @__PURE__ */ new Map();
  for (const bigram of rightBigrams) {
    rightCounts.set(bigram, (rightCounts.get(bigram) ?? 0) + 1);
  }
  let overlap = 0;
  for (const bigram of leftBigrams) {
    const count = rightCounts.get(bigram) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(bigram, count - 1);
    }
  }
  return 2 * overlap / (leftBigrams.length + rightBigrams.length);
}
function toBigrams(value) {
  if (value.length < 2) {
    return [value];
  }
  const result = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    result.push(value.slice(index, index + 2));
  }
  return result;
}
function sliceLines(raw, lineIndex, startLine, endLine) {
  const startOffset = lineIndex.lineStarts[startLine];
  const endOffset = lineIndex.lineStarts[endLine + 1];
  return raw.slice(startOffset, endOffset);
}

// src/tools/read-handler.ts
import * as fs5 from "fs";
import * as path5 from "path";
import ignore from "ignore";
var DEFAULT_LINE_LIMIT = 2e3;
var MAX_LINE_LENGTH = 2e3;
var PDF_LARGE_PAGE_THRESHOLD = 10;
var PDF_MAX_PAGE_RANGE = 20;
var LINE_NUMBER_WIDTH = 6;
var DEFAULT_GITIGNORE = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  "out/",
  ".next/",
  ".nuxt/",
  ".venv/",
  "venv/",
  "__pycache__/",
  "*.pyc",
  "*.pyo",
  ".pytest_cache/",
  ".mypy_cache/",
  ".ruff_cache/",
  ".gradle/",
  ".idea/",
  ".vscode/",
  "*.class",
  "*.jar",
  "*.war",
  "target/"
];
async function handleReadTool(args2, context) {
  let filePath = typeof args2.file_path === "string" ? normalizeFilePath(args2.file_path) : "";
  if (!filePath.trim()) {
    return {
      ok: false,
      name: "read",
      error: 'Missing required "file_path" string.'
    };
  }
  if (!isAbsoluteFilePath(filePath)) {
    if (filePath.startsWith("../") || filePath.startsWith("..\\")) {
      return {
        ok: false,
        name: "read",
        error: "file_path must be an absolute path."
      };
    }
    const normalizedSuffix = normalizeRelativeSuffix(filePath);
    const isIgnored = loadGitignoreMatcher(context.projectRoot);
    const matches = normalizedSuffix ? findSuffixMatches(context.projectRoot, normalizedSuffix, isIgnored) : [];
    if (matches.length > 1) {
      return {
        ok: false,
        name: "read",
        error: `file_path must be an absolute path. The file_path is ambiguous and may refer to multiple files:
${matches.slice(0, 3).join("\n")}` + (matches.length > 3 ? `
...and ${matches.length - 3} more.` : "")
      };
    }
    const resolvedPath = path5.resolve(context.projectRoot, filePath);
    if (!fs5.existsSync(resolvedPath)) {
      if (matches.length > 0) {
        return {
          ok: false,
          name: "read",
          error: `file_path must be an absolute path. The file_path "${filePath}" is ambiguous.`
        };
      } else {
        return {
          ok: false,
          name: "read",
          error: `File not found: ${filePath}`
        };
      }
    }
    filePath = resolvedPath;
  }
  if (!fs5.existsSync(filePath)) {
    return {
      ok: false,
      name: "read",
      error: `File not found: ${filePath}`
    };
  }
  let stat;
  try {
    stat = fs5.statSync(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      name: "read",
      error: `Failed to stat file: ${message}`
    };
  }
  if (stat.isDirectory()) {
    return {
      ok: false,
      name: "read",
      error: "file_path points to a directory. Use bash ls for directories."
    };
  }
  const ext = path5.extname(filePath).toLowerCase();
  try {
    if (ext === ".ipynb") {
      const output = readNotebook(filePath);
      markFileRead(context.sessionId, filePath, {
        content: "",
        timestamp: Math.floor(stat.mtimeMs),
        isPartialView: true
      });
      return {
        ok: true,
        name: "read",
        output
      };
    }
    if (ext === ".pdf") {
      const pagesParam = typeof args2.pages === "string" ? args2.pages.trim() : "";
      const buffer = fs5.readFileSync(filePath);
      const pageCount = countPdfPages(buffer);
      const pageRange = pagesParam ? parsePageRange(pagesParam) : null;
      if (!pageRange && pageCount !== null && pageCount > PDF_LARGE_PAGE_THRESHOLD) {
        return {
          ok: false,
          name: "read",
          error: `PDF has ${pageCount} pages; provide "pages" to read a range.`
        };
      }
      if (pageRange && pageRange.count > PDF_MAX_PAGE_RANGE) {
        return {
          ok: false,
          name: "read",
          error: `PDF page range exceeds ${PDF_MAX_PAGE_RANGE} pages.`
        };
      }
      if (pageRange && pageCount !== null && pageRange.end > pageCount) {
        return {
          ok: false,
          name: "read",
          error: `PDF page range exceeds total page count (${pageCount}).`
        };
      }
      const base64 = buffer.toString("base64");
      markFileRead(context.sessionId, filePath, {
        content: "",
        timestamp: Math.floor(stat.mtimeMs),
        isPartialView: true
      });
      return {
        ok: true,
        name: "read",
        output: `data:application/pdf;base64,${base64}`,
        metadata: {
          mime: "application/pdf",
          encoding: "base64",
          bytes: buffer.length,
          pageCount,
          pages: pageRange ? `${pageRange.start}-${pageRange.end}` : null
        }
      };
    }
    if (isImageExtension(ext)) {
      const buffer = fs5.readFileSync(filePath);
      const mime = getImageMimeType(ext);
      markFileRead(context.sessionId, filePath, {
        content: "",
        timestamp: Math.floor(stat.mtimeMs),
        isPartialView: true
      });
      return {
        ok: true,
        name: "read",
        output: "File loaded.",
        metadata: {
          mime,
          bytes: buffer.length
        },
        followUpMessages: [buildImageFollowUpMessage(filePath, mime, buffer)]
      };
    }
    const offset = parseLineNumber(args2.offset, "offset");
    const limit = parseLineLimit(args2.limit);
    if (!offset.ok) {
      return {
        ok: false,
        name: "read",
        error: offset.error
      };
    }
    if (!limit.ok) {
      return {
        ok: false,
        name: "read",
        error: limit.error
      };
    }
    const textResult = readTextFile(filePath, offset.value, limit.value);
    markFileRead(context.sessionId, filePath, {
      content: textResult.content,
      timestamp: textResult.timestamp,
      offset: textResult.isPartialView ? textResult.startLine : void 0,
      limit: textResult.isPartialView ? Math.max(1, textResult.endLine - textResult.startLine + 1) : void 0,
      isPartialView: textResult.isPartialView,
      encoding: textResult.encoding,
      lineEndings: textResult.lineEndings
    });
    const snippet = createSnippet(
      context.sessionId,
      filePath,
      textResult.startLine,
      textResult.endLine,
      textResult.output
    );
    return {
      ok: true,
      name: "read",
      output: textResult.output,
      metadata: snippet ? {
        snippet: {
          id: snippet.id,
          filePath: snippet.filePath,
          startLine: snippet.startLine,
          endLine: snippet.endLine
        }
      } : void 0
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      name: "read",
      error: message
    };
  }
}
function normalizeRelativeSuffix(relativePath) {
  const normalized = path5.normalize(relativePath).replace(/^(\.\/|\\)+/, "");
  return normalized.trim() ? path5.sep + normalized : null;
}
function findSuffixMatches(root, suffix, isIgnored) {
  const matches = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    let entries;
    try {
      entries = fs5.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path5.join(current, entry.name);
      const relPath = path5.relative(root, fullPath).replace(/\\/g, "/");
      if (isIgnored && isIgnored(relPath, entry.isDirectory())) {
        continue;
      }
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile() && fullPath.endsWith(suffix)) {
        matches.push(fullPath);
      }
    }
  }
  return matches;
}
function loadGitignoreMatcher(projectRoot) {
  const gitignorePath = path5.join(projectRoot, ".gitignore");
  if (!fs5.existsSync(gitignorePath)) {
    const ig2 = ignore();
    ig2.add(DEFAULT_GITIGNORE);
    return (relPath, isDir) => {
      if (!relPath) {
        return false;
      }
      const candidate = isDir ? `${relPath}/` : relPath;
      return ig2.ignores(candidate);
    };
  }
  let content = "";
  try {
    content = fs5.readFileSync(gitignorePath, "utf8");
  } catch {
    const ig2 = ignore();
    ig2.add(DEFAULT_GITIGNORE);
    return (relPath, isDir) => {
      if (!relPath) {
        return false;
      }
      const candidate = isDir ? `${relPath}/` : relPath;
      return ig2.ignores(candidate);
    };
  }
  const ig = ignore();
  ig.add(DEFAULT_GITIGNORE);
  ig.add(content);
  return (relPath, isDir) => {
    if (!relPath) {
      return false;
    }
    const candidate = isDir ? `${relPath}/` : relPath;
    return ig.ignores(candidate);
  };
}
function parseLineNumber(value, label) {
  if (value === void 0 || value === null) {
    return { ok: true, value: null };
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: `${label} must be a number.` };
  }
  const integer = Math.trunc(numeric);
  if (integer < 1) {
    return { ok: false, error: `${label} must be >= 1.` };
  }
  return { ok: true, value: integer };
}
function parseLineLimit(value) {
  if (value === void 0 || value === null) {
    return { ok: true, value: DEFAULT_LINE_LIMIT };
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: "limit must be a number." };
  }
  const integer = Math.trunc(numeric);
  if (integer <= 0) {
    return { ok: false, error: "limit must be > 0." };
  }
  return { ok: true, value: integer };
}
function readTextFile(filePath, offset, limit) {
  const metadata = readTextFileWithMetadata(filePath);
  const raw = metadata.content;
  if (!raw) {
    return {
      content: "",
      output: "WARNING: File is empty.",
      startLine: offset ?? 1,
      endLine: offset ?? 1,
      totalLines: 0,
      isPartialView: false,
      encoding: metadata.encoding,
      lineEndings: metadata.lineEndings,
      timestamp: metadata.timestamp
    };
  }
  const lines = raw.split("\n");
  if (lines.length === 1 && lines[0] === "") {
    return {
      content: "",
      output: "WARNING: File is empty.",
      startLine: offset ?? 1,
      endLine: offset ?? 1,
      totalLines: 0,
      isPartialView: false,
      encoding: metadata.encoding,
      lineEndings: metadata.lineEndings,
      timestamp: metadata.timestamp
    };
  }
  const startIndex = offset ? offset - 1 : 0;
  const endIndex = startIndex + limit;
  const selected = lines.slice(startIndex, endIndex);
  const startLine = startIndex + 1;
  const endLine = selected.length > 0 ? startIndex + selected.length : startLine;
  const isPartialView = startLine !== 1 || endLine < lines.length;
  return {
    content: selected.join("\n"),
    output: formatWithLineNumbers2(selected, startLine),
    startLine,
    endLine,
    totalLines: lines.length,
    isPartialView,
    encoding: metadata.encoding,
    lineEndings: metadata.lineEndings,
    timestamp: metadata.timestamp
  };
}
function formatWithLineNumbers2(lines, startLineNumber) {
  return lines.map((line, index) => {
    const lineNumber = startLineNumber + index;
    const trimmedLine = line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) : line;
    return `${String(lineNumber).padStart(LINE_NUMBER_WIDTH, " ")}	${trimmedLine}`;
  }).join("\n");
}
function isImageExtension(ext) {
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".svg", ".ico", ".avif"].includes(ext);
}
function getImageMimeType(ext) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".avif":
      return "image/avif";
    case ".png":
    default:
      return "image/png";
  }
}
function buildImageFollowUpMessage(filePath, mime, buffer) {
  const fileName = path5.basename(filePath);
  return {
    role: "system",
    content: `The read tool has loaded \`${fileName}\`. Use the attached image content to answer the original request.`,
    contentParams: [
      {
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${buffer.toString("base64")}`
        }
      }
    ]
  };
}
function countPdfPages(buffer) {
  try {
    const content = buffer.toString("latin1");
    const matches = content.match(/\/Type\s*\/Page\b(?!s)/g);
    return matches ? matches.length : 0;
  } catch {
    return null;
  }
}
function parsePageRange(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("pages must be a non-empty string.");
  }
  if (trimmed.includes(",")) {
    throw new Error('pages must be a single range like "1-5" or "3".');
  }
  const parts = trimmed.split("-").map((part) => part.trim());
  if (parts.length === 1) {
    const value = parsePositiveInt(parts[0], "pages");
    return { start: value, end: value, count: 1 };
  }
  if (parts.length === 2) {
    const start = parsePositiveInt(parts[0], "pages");
    const end = parsePositiveInt(parts[1], "pages");
    if (end < start) {
      throw new Error("pages range end must be >= start.");
    }
    return { start, end, count: end - start + 1 };
  }
  throw new Error('pages must be a single range like "1-5" or "3".');
}
function parsePositiveInt(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} must be a number.`);
  }
  const integer = Math.trunc(numeric);
  if (integer < 1) {
    throw new Error(`${label} must be >= 1.`);
  }
  return integer;
}
function readNotebook(filePath) {
  const raw = fs5.readFileSync(filePath, "utf8");
  if (!raw) {
    return "WARNING: File is empty.";
  }
  const parsed = JSON.parse(raw);
  const lines = [];
  const cells = Array.isArray(parsed.cells) ? parsed.cells : [];
  cells.forEach((cell, index) => {
    const cellType = cell.cell_type ?? "unknown";
    lines.push(`# Cell ${index + 1} (${cellType})`);
    const source = normalizeNotebookField(cell.source);
    if (source.length > 0) {
      lines.push(...source);
    }
    const outputs = Array.isArray(cell.outputs) ? cell.outputs : [];
    outputs.forEach((output, outputIndex) => {
      const outputType = typeof output.output_type === "string" ? output.output_type : "output";
      lines.push(`# Output ${outputIndex + 1} (${outputType})`);
      lines.push(...formatNotebookOutput(output));
    });
  });
  if (lines.length === 0) {
    return "WARNING: Notebook has no cells.";
  }
  return formatWithLineNumbers2(lines, 1);
}
function normalizeNotebookField(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).replace(/\r?\n$/, ""));
  }
  if (typeof value === "string") {
    return value.split(/\r?\n/);
  }
  return [];
}
function formatNotebookOutput(output) {
  const lines = [];
  const text = output.text;
  if (Array.isArray(text)) {
    lines.push(...text.map((item) => String(item).replace(/\r?\n$/, "")));
  } else if (typeof text === "string") {
    lines.push(...text.split(/\r?\n/));
  }
  const data = output.data;
  if (data && typeof data === "object") {
    const record = data;
    const textPlain = record["text/plain"];
    if (Array.isArray(textPlain)) {
      lines.push(...textPlain.map((item) => String(item).replace(/\r?\n$/, "")));
    } else if (typeof textPlain === "string") {
      lines.push(...textPlain.split(/\r?\n/));
    }
    const imagePng = record["image/png"];
    if (typeof imagePng === "string") {
      lines.push(`[image/png ${imagePng.length} chars]`);
    }
    const imageJpeg = record["image/jpeg"];
    if (typeof imageJpeg === "string") {
      lines.push(`[image/jpeg ${imageJpeg.length} chars]`);
    }
  }
  const trace = output.traceback;
  if (Array.isArray(trace)) {
    lines.push(...trace.map((item) => String(item).replace(/\r?\n$/, "")));
  }
  if (lines.length === 0) {
    lines.push("[output omitted]");
  }
  return lines;
}

// src/tools/web-search-handler.ts
import { randomUUID } from "crypto";
import { spawn as spawn3 } from "child_process";
var MAX_OUTPUT_CHARS2 = 3e4;
var MAX_CAPTURE_CHARS2 = 10 * 1024 * 1024;
var WEB_SEARCH_TOOL_ACTIVITY_PREFIX = "WebSearch:";
var DEFAULT_WEB_SEARCH_API_URL = "https://deepcode.vegamo.cn/api/plugin/web-search";
async function handleWebSearchTool(args2, context) {
  const query = typeof args2.query === "string" ? args2.query : "";
  if (!query.trim()) {
    return {
      ok: false,
      name: "WebSearch",
      error: 'Missing required "query" string.'
    };
  }
  const llmContext = context.createOpenAIClient?.();
  const scriptPath = llmContext?.webSearchTool?.trim();
  if (scriptPath) {
    return executeConfiguredWebSearch(query, scriptPath, context);
  }
  if (!hasUsableClient(llmContext)) {
    return {
      ok: false,
      name: "WebSearch",
      error: "WebSearch default mode requires a valid LLM configuration in ~/.deepcode/settings.json."
    };
  }
  return executeDefaultWebSearch(query, llmContext, context);
}
function hasUsableClient(value) {
  return Boolean(value?.client);
}
async function executeConfiguredWebSearch(query, scriptPath, context) {
  const execution = await runWebSearchScript(scriptPath, query, context);
  const output = execution.stdout.slice(0, MAX_OUTPUT_CHARS2);
  const truncated = execution.stdout.length > MAX_OUTPUT_CHARS2;
  if (execution.error) {
    return {
      ok: false,
      name: "WebSearch",
      error: execution.error,
      output: output || void 0,
      metadata: {
        exitCode: execution.exitCode,
        signal: execution.signal,
        stderr: execution.stderr || void 0,
        truncated
      }
    };
  }
  if (execution.exitCode !== 0 || execution.signal !== null) {
    return {
      ok: false,
      name: "WebSearch",
      error: buildCommandError(execution.exitCode, execution.signal),
      output: output || void 0,
      metadata: {
        exitCode: execution.exitCode,
        signal: execution.signal,
        stderr: execution.stderr || void 0,
        truncated
      }
    };
  }
  return {
    ok: true,
    name: "WebSearch",
    output: output || void 0,
    metadata: {
      exitCode: execution.exitCode,
      signal: execution.signal,
      truncated,
      stderr: execution.stderr || void 0
    }
  };
}
async function executeDefaultWebSearch(query, llmContext, context) {
  try {
    const prepared = await prepareSearchQuery(query, llmContext);
    const output = await runDefaultWebSearchRequest(prepared.resolvedQuery, llmContext.machineId, context);
    return {
      ok: true,
      name: "WebSearch",
      output,
      metadata: {
        originalQuery: query,
        resolvedQuery: prepared.resolvedQuery,
        translated: prepared.translated,
        dominantLanguage: prepared.decision.dominantLanguage,
        languageReason: prepared.decision.reason
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      name: "WebSearch",
      error: `WebSearch default mode failed: ${message}`
    };
  }
}
async function runWebSearchScript(scriptPath, query, context) {
  return new Promise((resolve6) => {
    const child = spawn3(scriptPath, [query], {
      cwd: context.projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const pid = child.pid;
    if (typeof pid === "number") {
      context.onProcessStart?.(pid, formatWebSearchActivityLabel(query));
    }
    let stdout = "";
    let stderr = "";
    let error;
    child.stdout?.on("data", (chunk) => {
      stdout = appendChunk2(stdout, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendChunk2(stderr, chunk);
    });
    child.on("error", (spawnError) => {
      error = spawnError.message;
    });
    child.on("close", (code, signal) => {
      if (typeof pid === "number") {
        context.onProcessExit?.(pid);
      }
      resolve6({
        stdout,
        stderr,
        exitCode: typeof code === "number" ? code : null,
        signal: signal ?? null,
        error
      });
    });
  });
}
async function prepareSearchQuery(query, llmContext) {
  const decision = await decideSearchLanguage(query, llmContext);
  const containsChinese = containsChineseChar(query);
  if (decision.dominantLanguage === "en" && containsChinese) {
    const translatedQuery = await translateQuery(query, "English", llmContext);
    if (translatedQuery) {
      return {
        resolvedQuery: translatedQuery,
        decision,
        translated: true
      };
    }
  }
  if (decision.dominantLanguage === "zh" && !containsChinese) {
    const translatedQuery = await translateQuery(query, "Chinese", llmContext);
    if (translatedQuery) {
      return {
        resolvedQuery: translatedQuery,
        decision,
        translated: true
      };
    }
  }
  return {
    resolvedQuery: query,
    decision,
    translated: false
  };
}
function containsChineseChar(text) {
  return /[\u4e00-\u9fff]/.test(text);
}
async function decideSearchLanguage(query, llmContext) {
  const prompt = `Decide whether the topic below has more useful online material in English or Chinese.

Topic:
\`\`\`text
${query}
\`\`\`

Return strict JSON:
{"dominant_language":"en"|"zh","reason":"one short sentence"}
Do not include markdown or any extra text.`;
  const result = parseJsonResponse(await chat(llmContext, prompt));
  const dominantLanguage = result.dominant_language;
  if (dominantLanguage !== "en" && dominantLanguage !== "zh") {
    throw new Error(`Unexpected dominant language: ${String(dominantLanguage)}`);
  }
  return {
    dominantLanguage,
    reason: typeof result.reason === "string" ? result.reason : ""
  };
}
async function translateQuery(query, targetLanguage, llmContext) {
  const prompt = `Translate the query text below into ${targetLanguage}.

Requirements:
- Preserve product names, library names, API names, versions, and abbreviations when appropriate.
- Return only the translated query, without quotes or explanation.

Query:
\`\`\`text
${query}
\`\`\``;
  return stripCodeFence(await chat(llmContext, prompt)).trim().replace(/^['"]|['"]$/g, "");
}
async function chat(llmContext, prompt) {
  const response = await llmContext.client.chat.completions.create({
    model: llmContext.model,
    messages: [{ role: "user", content: prompt }]
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((part) => typeof part.text === "string" ? part.text : "").join("\n").trim();
  }
  return "";
}
function parseJsonResponse(text) {
  const cleaned = stripCodeFence(text).trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error(`Failed to parse JSON response: ${cleaned || "<empty>"}`);
  }
}
function stripCodeFence(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:[\w-]+)?\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
async function runDefaultWebSearchRequest(query, machineId, context) {
  if (!machineId) {
    throw new Error("Missing vscode.env.machineId for the default WebSearch request.");
  }
  const activityId = `web-search-${randomUUID()}`;
  context.onProcessStart?.(activityId, formatWebSearchActivityLabel(query));
  try {
    const response = await fetch(DEFAULT_WEB_SEARCH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: machineId
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`WebSearch API request failed with status ${response.status}${body ? `: ${body}` : ""}`);
    }
    const payload = await response.json();
    if (typeof payload.result === "string" && payload.result.trim()) {
      return payload.result.trim();
    }
  } finally {
    context.onProcessExit?.(activityId);
  }
  throw new Error("The web search response was empty.");
}
function appendChunk2(existing, chunk) {
  if (existing.length >= MAX_CAPTURE_CHARS2) {
    return existing;
  }
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
  const remaining = MAX_CAPTURE_CHARS2 - existing.length;
  return `${existing}${text.slice(0, remaining)}`;
}
function formatWebSearchActivityLabel(query) {
  const normalizedQuery = query.replace(/\s+/g, " ").trim();
  const maxQueryLength = 180;
  const clippedQuery = normalizedQuery.length > maxQueryLength ? `${normalizedQuery.slice(0, maxQueryLength - 3)}...` : normalizedQuery;
  return `${WEB_SEARCH_TOOL_ACTIVITY_PREFIX} ${clippedQuery}`;
}
function buildCommandError(exitCode, signal) {
  if (signal) {
    return `WebSearch command terminated by signal ${signal}.`;
  }
  if (exitCode !== null) {
    return `WebSearch command failed with exit code ${exitCode}.`;
  }
  return "WebSearch command failed.";
}

// src/tools/write-handler.ts
import * as fs6 from "fs";
import { z as z3 } from "zod";
var writeSchema = z3.strictObject({
  file_path: z3.string().min(1, "file_path is required."),
  content: z3.string({
    error: "content must be a string. If you are writing JSON, serialize the full document to text before calling write."
  })
});
async function handleWriteTool(args2, context) {
  let repairMetadata = null;
  return executeValidatedTool(
    "write",
    writeSchema,
    args2,
    context,
    async (input) => {
      const filePath = normalizeFilePath(input.file_path);
      if (!isAbsoluteFilePath(filePath)) {
        return {
          ok: false,
          name: "write",
          error: "file_path must be an absolute path."
        };
      }
      const existingFile = fs6.existsSync(filePath);
      if (existingFile) {
        let stat;
        try {
          stat = fs6.statSync(filePath);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            ok: false,
            name: "write",
            error: `Failed to stat file: ${message}`
          };
        }
        if (stat.isDirectory()) {
          return {
            ok: false,
            name: "write",
            error: "file_path points to a directory."
          };
        }
        if (stat.size > 0) {
          const fileState = getFileState(context.sessionId, filePath);
          if (!fileState || !isFullFileView(fileState)) {
            return {
              ok: false,
              name: "write",
              error: "Must read the full existing file before writing."
            };
          }
          if (hasFileChangedSinceState(filePath, fileState)) {
            return {
              ok: false,
              name: "write",
              error: "File has been modified since read. Read it again before writing."
            };
          }
        }
      }
      const normalizedContent = normalizeContent(input.content);
      try {
        ensureParentDirectory(filePath);
        const existingMetadata = existingFile ? readTextFileWithMetadata(filePath) : null;
        const encoding = existingMetadata?.encoding ?? "utf8";
        const lineEndings = existingMetadata?.lineEndings ?? (input.content.includes("\r\n") ? "CRLF" : "LF");
        const diffPreview = buildDiffPreview(filePath, existingMetadata?.content ?? null, normalizedContent);
        const bytes = writeTextFile(filePath, normalizedContent, encoding, lineEndings);
        const freshMetadata = readTextFileWithMetadata(filePath);
        recordFileState(context.sessionId, {
          filePath,
          content: freshMetadata.content,
          timestamp: freshMetadata.timestamp,
          encoding: freshMetadata.encoding,
          lineEndings: freshMetadata.lineEndings
        });
        return {
          ok: true,
          name: "write",
          output: existingMetadata ? "Updated file." : "Created file.",
          metadata: {
            type: existingMetadata ? "update" : "create",
            file_path: filePath,
            bytes,
            encoding: freshMetadata.encoding,
            line_endings: freshMetadata.lineEndings,
            cache_refreshed: true,
            diff_preview: diffPreview,
            ...repairMetadata
          }
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "write",
          error: message
        };
      }
    },
    {
      preprocess: (rawInput) => {
        const filePath = typeof rawInput.file_path === "string" ? normalizeFilePath(rawInput.file_path) : "";
        const content = rawInput.content;
        if (filePath.toLowerCase().endsWith(".json") && content !== null && typeof content === "object" && !Buffer.isBuffer(content)) {
          repairMetadata = {
            input_repaired: true,
            repair_kind: "json-stringify-content"
          };
          return {
            ok: true,
            input: {
              ...rawInput,
              file_path: filePath,
              content: JSON.stringify(content, null, 2)
            }
          };
        }
        repairMetadata = null;
        return {
          ok: true,
          input: typeof rawInput.file_path === "string" ? { ...rawInput, file_path: filePath } : rawInput
        };
      }
    }
  );
}

// src/tools/executor.ts
var ToolExecutor = class {
  projectRoot;
  createOpenAIClient;
  toolHandlers = /* @__PURE__ */ new Map();
  constructor(projectRoot, createOpenAIClient3) {
    this.projectRoot = projectRoot;
    this.createOpenAIClient = createOpenAIClient3;
    this.registerToolHandlers();
  }
  setProjectRoot(projectRoot) {
    this.projectRoot = projectRoot;
  }
  async executeToolCalls(sessionId, toolCalls, hooks) {
    const parsedCalls = toolCalls.map((toolCall) => this.parseToolCall(toolCall)).filter((toolCall) => Boolean(toolCall));
    const executions = [];
    for (const toolCall of parsedCalls) {
      if (hooks?.shouldStop?.()) {
        break;
      }
      const result = await this.executeToolCall(sessionId, toolCall, hooks);
      executions.push({
        toolCallId: toolCall.id,
        content: this.formatToolResult(result),
        result
      });
      if (hooks?.shouldStop?.()) {
        break;
      }
    }
    return executions;
  }
  registerToolHandlers() {
    this.toolHandlers.set("bash", handleBashTool);
    this.toolHandlers.set("read", handleReadTool);
    this.toolHandlers.set("write", handleWriteTool);
    this.toolHandlers.set("edit", handleEditTool);
    this.toolHandlers.set("AskUserQuestion", handleAskUserQuestionTool);
    this.toolHandlers.set("WebSearch", handleWebSearchTool);
  }
  parseToolCall(toolCall) {
    if (!toolCall || typeof toolCall !== "object") {
      return null;
    }
    const record = toolCall;
    if (typeof record.id !== "string") {
      return null;
    }
    const functionRecord = record.function;
    if (!functionRecord || typeof functionRecord !== "object") {
      return null;
    }
    if (typeof functionRecord.name !== "string") {
      return null;
    }
    const rawArguments = typeof functionRecord.arguments === "string" ? functionRecord.arguments : "";
    return {
      id: record.id,
      type: "function",
      function: {
        name: functionRecord.name,
        arguments: rawArguments
      }
    };
  }
  async executeToolCall(sessionId, toolCall, hooks) {
    const toolName = toolCall.function.name;
    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      return {
        ok: false,
        name: toolName,
        error: `Unknown tool: ${toolName}`
      };
    }
    const parsedArgs = this.parseToolArguments(toolCall.function.arguments);
    if (!parsedArgs.ok) {
      return {
        ok: false,
        name: toolName,
        error: parsedArgs.error
      };
    }
    try {
      return await handler(parsedArgs.args, {
        sessionId,
        projectRoot: this.projectRoot,
        toolCall,
        createOpenAIClient: this.createOpenAIClient,
        onProcessStart: hooks?.onProcessStart,
        onProcessExit: hooks?.onProcessExit
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        name: toolName,
        error: message
      };
    }
  }
  parseToolArguments(rawArguments) {
    if (!rawArguments) {
      return { ok: true, args: {} };
    }
    try {
      const parsed = JSON.parse(rawArguments);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "InputParseError: Tool arguments must be a JSON object." };
      }
      return { ok: true, args: parsed };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `InputParseError: Failed to parse tool arguments: ${message}. Ensure the tool call arguments are valid JSON. Prefer Edit over Write for large existing-file changes.`
      };
    }
  }
  formatToolResult(result) {
    const payload = {
      ok: result.ok,
      name: result.name
    };
    if (typeof result.output !== "undefined") {
      payload.output = result.output;
    }
    if (result.error) {
      payload.error = result.error;
    }
    if (result.metadata && Object.keys(result.metadata).length > 0) {
      payload.metadata = result.metadata;
    }
    if (result.awaitUserResponse === true) {
      payload.awaitUserResponse = true;
    }
    return JSON.stringify(payload, null, 2);
  }
};

// src/error-logger.ts
import * as fs7 from "fs";
import * as path6 from "path";
import * as os3 from "os";
var LOG_DIR = path6.join(os3.homedir(), ".deepcode", "logs");
var ERROR_LOG_PATH = path6.join(LOG_DIR, "error.log");
function ensureLogDir() {
  if (!fs7.existsSync(LOG_DIR)) {
    fs7.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function maskSensitive(text) {
  return text.replace(/(Authorization:\s*Bearer\s+)[^\s\r\n]+/gi, "$1***MASKED***").replace(/((?:api[Kk]ey|api_key|secret)\s*[:=]\s*"?)[^",}\s]+/gi, "$1***MASKED***");
}
var CONTENT_TRUNCATE_PREVIEW = 100;
function truncateContent(value) {
  if (value.length <= CONTENT_TRUNCATE_PREVIEW) {
    return value;
  }
  return `${value.slice(0, CONTENT_TRUNCATE_PREVIEW)}...(total ${value.length} chars)`;
}
function sanitizeRequestPayload(request) {
  function walk(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    const record = value;
    const result = {};
    for (const [key, val] of Object.entries(record)) {
      if (key === "content" && typeof val === "string") {
        result[key] = truncateContent(val);
      } else {
        result[key] = walk(val);
      }
    }
    return result;
  }
  return walk(request);
}
function logApiError(entry) {
  try {
    ensureLogDir();
    const logLine = {
      timestamp: entry.timestamp,
      location: entry.location,
      requestId: entry.requestId,
      sessionId: entry.sessionId,
      model: entry.model,
      baseURL: entry.baseURL,
      error: {
        name: entry.error.name,
        message: maskSensitive(entry.error.message),
        stack: entry.error.stack ? maskSensitive(entry.error.stack) : void 0
      },
      request: sanitizeRequestPayload(entry.request)
    };
    if (entry.response !== void 0) {
      logLine.response = typeof entry.response === "string" ? maskSensitive(entry.response) : entry.response;
    }
    const newLine = JSON.stringify(logLine) + "\n";
    fs7.appendFileSync(ERROR_LOG_PATH, newLine, "utf8");
    const MAX_ENTRIES = 20;
    const raw = fs7.readFileSync(ERROR_LOG_PATH, "utf8");
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length > MAX_ENTRIES) {
      fs7.writeFileSync(ERROR_LOG_PATH, lines.slice(-MAX_ENTRIES).join("\n") + "\n", "utf8");
    }
  } catch {
  }
}

// src/debug-logger.ts
import * as fs8 from "fs";
import * as os4 from "os";
import * as path7 from "path";
var DEBUG_LOG_FILE = "debug.log";
var MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024;
function logOpenAIChatCompletionDebug(entry) {
  try {
    const logPath = getDebugLogPath();
    fs8.mkdirSync(path7.dirname(logPath), { recursive: true });
    rotateIfNeeded(logPath);
    fs8.appendFileSync(logPath, `${JSON.stringify(toSerializable(entry))}
`, "utf8");
  } catch {
  }
}
function rotateIfNeeded(logPath) {
  try {
    const stat = fs8.statSync(logPath);
    if (stat.size >= MAX_LOG_SIZE_BYTES) {
      const rotatedPath = `${logPath}.1`;
      fs8.renameSync(logPath, rotatedPath);
    }
  } catch {
  }
}
function getDebugLogPath() {
  return path7.join(os4.homedir(), ".deepcode", "logs", DEBUG_LOG_FILE);
}
function normalizeDebugError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return {
    name: "UnknownError",
    message: String(error)
  };
}
function toSerializable(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  function walk(current) {
    if (typeof current === "bigint") {
      return current.toString();
    }
    if (current instanceof Error) {
      return normalizeDebugError(current);
    }
    if (!current || typeof current !== "object") {
      return current;
    }
    if (seen.has(current)) {
      return "[Circular]";
    }
    seen.add(current);
    if (Array.isArray(current)) {
      return current.map(walk);
    }
    const result = {};
    for (const [key, val] of Object.entries(current)) {
      result[key] = walk(val);
    }
    return result;
  }
  return walk(value);
}

// src/session.ts
var MAX_SESSION_ENTRIES = 50;
var DEFAULT_NEW_PROMPT_API_URL = "https://deepcode.vegamo.cn/api/plugin/new";
var DEFAULT_COMPACT_PROMPT_TOKEN_THRESHOLD = 128 * 1024;
var DEEPSEEK_V4_COMPACT_PROMPT_TOKEN_THRESHOLD = 512 * 1024;
function getCompactPromptTokenThreshold(model) {
  return DEEPSEEK_V4_MODELS.has(model) ? DEEPSEEK_V4_COMPACT_PROMPT_TOKEN_THRESHOLD : DEFAULT_COMPACT_PROMPT_TOKEN_THRESHOLD;
}
function isUsageRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function summarizeCompletionOptions(options) {
  if (!options) {
    return void 0;
  }
  return {
    ...options,
    signal: options.signal instanceof AbortSignal ? { aborted: options.signal.aborted } : options.signal
  };
}
function addUsageValue(current, next) {
  if (typeof next === "number") {
    return (typeof current === "number" ? current : 0) + next;
  }
  if (isUsageRecord(next)) {
    const currentRecord = isUsageRecord(current) ? current : {};
    const result = { ...currentRecord };
    for (const [key, value] of Object.entries(next)) {
      result[key] = addUsageValue(currentRecord[key], value);
    }
    return result;
  }
  return next;
}
function accumulateUsage(current, next) {
  if (next == null) {
    return current ?? null;
  }
  return addUsageValue(current, next);
}
function getExtensionRoot2() {
  if (typeof __dirname !== "undefined") {
    return path8.resolve(__dirname, "..");
  }
  const currentFilePath = fileURLToPath2(import.meta.url);
  return path8.resolve(path8.dirname(currentFilePath), "..");
}
function getTotalTokens(usage) {
  if (!isUsageRecord(usage)) {
    return 0;
  }
  const totalTokens = usage.total_tokens;
  return typeof totalTokens === "number" ? totalTokens : 0;
}
var SessionManager = class {
  projectRoot;
  createOpenAIClient;
  getResolvedSettings;
  onAssistantMessage;
  onSessionEntryUpdated;
  onLlmStreamProgress;
  activeSessionId = null;
  activePromptController = null;
  sessionControllers = /* @__PURE__ */ new Map();
  toolExecutor;
  constructor(options) {
    this.projectRoot = options.projectRoot;
    this.createOpenAIClient = options.createOpenAIClient;
    this.getResolvedSettings = options.getResolvedSettings;
    this.onAssistantMessage = options.onAssistantMessage;
    this.onSessionEntryUpdated = options.onSessionEntryUpdated;
    this.onLlmStreamProgress = options.onLlmStreamProgress;
    this.toolExecutor = new ToolExecutor(this.projectRoot, this.createOpenAIClient);
  }
  changeProjectRoot(newRoot) {
    this.projectRoot = newRoot;
    this.toolExecutor.setProjectRoot(newRoot);
  }
  estimateStreamTokens(text) {
    let tokens = 0;
    for (const char of text) {
      tokens += /[\u3400-\u9fff\uf900-\ufaff]/u.test(char) ? 0.6 : 0.3;
    }
    return tokens;
  }
  formatEstimatedTokens(tokens) {
    if (tokens <= 0) {
      return "0";
    }
    const roundedTokens = Math.round(tokens);
    if (roundedTokens <= 0) {
      return "0";
    }
    if (roundedTokens < 100) {
      return String(roundedTokens);
    }
    if (roundedTokens < 1e4) {
      return `${Number((roundedTokens / 1e3).toFixed(1))}k`;
    }
    return `${Math.round(roundedTokens / 1e3)}k`;
  }
  emitLlmStreamProgress(requestId, startedAt, estimatedTokens, phase, sessionId) {
    this.onLlmStreamProgress?.({
      requestId,
      sessionId,
      startedAt,
      estimatedTokens: Math.round(estimatedTokens),
      formattedTokens: this.formatEstimatedTokens(estimatedTokens),
      phase
    });
  }
  isAbortLikeError(error) {
    if (!(error instanceof Error)) {
      return false;
    }
    return error.name === "AbortError" || error.constructor.name === "APIUserAbortError";
  }
  throwIfAborted(signal) {
    if (!signal?.aborted) {
      return;
    }
    const error = new Error("Request was aborted.");
    error.name = "AbortError";
    throw error;
  }
  async createChatCompletionStream(client, request, options, sessionId, debug) {
    const requestId = crypto.randomUUID();
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    const startedAtMs = Date.now();
    let estimatedTokens = 0;
    this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "start", sessionId);
    const streamRequest = {
      ...request,
      stream: true,
      stream_options: {
        ...isUsageRecord(request.stream_options) ? request.stream_options : {},
        include_usage: true
      }
    };
    let response;
    try {
      response = await client.chat.completions.create(streamRequest, options);
    } catch (error) {
      this.logChatCompletionDebug(debug, {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        location: debug?.location ?? "SessionManager.createChatCompletionStream:create",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        baseURL: debug?.baseURL,
        durationMs: Date.now() - startedAtMs,
        params: { ...debug?.params, options: summarizeCompletionOptions(options) },
        request: streamRequest,
        error: normalizeDebugError(error)
      });
      logApiError({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        location: "SessionManager.createChatCompletionStream:create",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : void 0
        },
        request: streamRequest
      });
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "end", sessionId);
      throw error;
    }
    if (!response || typeof response[Symbol.asyncIterator] !== "function") {
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "end", sessionId);
      this.logChatCompletionDebug(debug, {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        location: debug?.location ?? "SessionManager.createChatCompletionStream",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        baseURL: debug?.baseURL,
        durationMs: Date.now() - startedAtMs,
        params: { ...debug?.params, options: summarizeCompletionOptions(options) },
        request: streamRequest,
        response
      });
      return response;
    }
    let content = "";
    let reasoningContent = "";
    let refusal = null;
    let usage = null;
    const responseChunks = [];
    const toolCallsByIndex = /* @__PURE__ */ new Map();
    const signal = options?.signal instanceof AbortSignal ? options.signal : null;
    const trackText = (value) => {
      if (typeof value !== "string" || value.length === 0) {
        return;
      }
      estimatedTokens += this.estimateStreamTokens(value);
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "update", sessionId);
    };
    try {
      for await (const chunk of response) {
        if (signal?.aborted) {
          const abortError = new Error("Request was aborted.");
          abortError.name = "AbortError";
          throw abortError;
        }
        if (debug?.enabled) {
          responseChunks.push(chunk);
        }
        if ("usage" in chunk && chunk.usage != null) {
          usage = chunk.usage;
        }
        const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
        for (const choice of choices) {
          const delta = isUsageRecord(choice) && isUsageRecord(choice.delta) ? choice.delta : null;
          if (!delta) {
            continue;
          }
          const contentDelta = delta.content;
          if (typeof contentDelta === "string") {
            content += contentDelta;
            trackText(contentDelta);
          }
          const reasoningDelta = delta.reasoning_content ?? delta.reasoning;
          if (typeof reasoningDelta === "string") {
            reasoningContent += reasoningDelta;
            trackText(reasoningDelta);
          }
          if (typeof delta.refusal === "string") {
            refusal = `${refusal ?? ""}${delta.refusal}`;
            trackText(delta.refusal);
          }
          const rawToolCalls = delta.tool_calls;
          if (Array.isArray(rawToolCalls)) {
            for (const rawToolCall of rawToolCalls) {
              if (!isUsageRecord(rawToolCall)) {
                continue;
              }
              const index = typeof rawToolCall.index === "number" ? rawToolCall.index : toolCallsByIndex.size;
              const current = toolCallsByIndex.get(index) ?? {};
              if (typeof rawToolCall.id === "string") {
                current.id = rawToolCall.id;
              }
              if (typeof rawToolCall.type === "string") {
                current.type = rawToolCall.type;
              }
              const rawFunction = isUsageRecord(rawToolCall.function) ? rawToolCall.function : null;
              if (rawFunction) {
                current.function = current.function ?? {};
                if (typeof rawFunction.name === "string") {
                  current.function.name = `${current.function.name ?? ""}${rawFunction.name}`;
                  trackText(rawFunction.name);
                }
                if (typeof rawFunction.arguments === "string") {
                  current.function.arguments = `${current.function.arguments ?? ""}${rawFunction.arguments}`;
                  trackText(rawFunction.arguments);
                }
              }
              toolCallsByIndex.set(index, current);
            }
          }
        }
      }
    } catch (error) {
      this.logChatCompletionDebug(debug, {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        location: debug?.location ?? "SessionManager.createChatCompletionStream:stream",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        baseURL: debug?.baseURL,
        durationMs: Date.now() - startedAtMs,
        params: { ...debug?.params, options: summarizeCompletionOptions(options) },
        request: streamRequest,
        responseChunks,
        error: normalizeDebugError(error)
      });
      logApiError({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        location: "SessionManager.createChatCompletionStream:stream",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : void 0
        },
        request: streamRequest
      });
      throw error;
    } finally {
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "end", sessionId);
    }
    const toolCalls = Array.from(toolCallsByIndex.entries()).sort(([left], [right]) => left - right).map(([, toolCall]) => toolCall);
    const message = { content };
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }
    if (reasoningContent.length > 0) {
      message.reasoning_content = reasoningContent;
    }
    if (refusal != null) {
      message.refusal = refusal;
    }
    const finalResponse = {
      choices: [{ message }],
      usage
    };
    this.logChatCompletionDebug(debug, {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      location: debug?.location ?? "SessionManager.createChatCompletionStream",
      requestId,
      sessionId,
      model: typeof request.model === "string" ? request.model : void 0,
      baseURL: debug?.baseURL,
      durationMs: Date.now() - startedAtMs,
      params: { ...debug?.params, options: summarizeCompletionOptions(options) },
      request: streamRequest,
      responseChunks,
      response: finalResponse
    });
    return finalResponse;
  }
  logChatCompletionDebug(debug, entry) {
    if (!debug?.enabled) {
      return;
    }
    logOpenAIChatCompletionDebug(entry);
  }
  async identifyMatchingSkillNames(skills, userPrompt, options) {
    this.throwIfAborted(options?.signal);
    let systemPrompt = `When users ask you to perform tasks, check if any of the available skills match. Skills provide specialized capabilities and domain knowledge.

Response in JSON format:
\`\`\`
{
  "skillNames": ["", ...]
}
\`\`\`

If none of the available skills match, respond with an empty array, i.e. \`{"skillNames": []}\`.

The candidate skills are as follows:

`;
    const simpleSkills = skills.filter((x) => !x.isLoaded).map((x) => {
      return { name: x.name, description: x.description };
    });
    if (simpleSkills.length === 0) {
      return [];
    }
    systemPrompt += "```\n" + JSON.stringify(simpleSkills, null, 2) + "\n```";
    const { client, model, baseURL, debugLogEnabled } = this.createOpenAIClient();
    if (!client) {
      return [];
    }
    try {
      const response = await this.createChatCompletionStream(
        client,
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        },
        options?.signal ? { signal: options.signal } : void 0,
        options?.sessionId,
        {
          enabled: debugLogEnabled,
          location: "SessionManager.identifyMatchingSkillNames",
          baseURL,
          params: { purpose: "skill-matching" }
        }
      );
      this.throwIfAborted(options?.signal);
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "";
      if (!content) {
        return [];
      }
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.skillNames)) {
        return parsed.skillNames;
      }
      return [];
    } catch (error) {
      if (this.isAbortLikeError(error) || options?.signal?.aborted) {
        throw error;
      }
      return [];
    }
  }
  async listSkills(sessionId) {
    const homeDir = os5.homedir();
    const agentsRoot = path8.join(homeDir, ".agents", "skills");
    const legacyProjectSkillsRoot = path8.join(this.projectRoot, ".deepcode", "skills");
    const projectAgentsSkillsRoot = path8.join(this.projectRoot, ".agents", "skills");
    const skillsByName = /* @__PURE__ */ new Map();
    const collectSkills = (root, displayRoot) => {
      if (!fs9.existsSync(root)) {
        return [];
      }
      let entries = [];
      try {
        entries = fs9.readdirSync(root, { withFileTypes: true });
      } catch {
        return [];
      }
      const results = [];
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) {
          continue;
        }
        const skillName = entry.name;
        const skillPath = path8.join(root, skillName, "SKILL.md");
        try {
          if (!fs9.existsSync(skillPath)) {
            continue;
          }
          const stat = fs9.statSync(skillPath);
          if (!stat.isFile()) {
            continue;
          }
        } catch {
          continue;
        }
        results.push(this.readSkillInfo(skillPath, `${displayRoot}/${skillName}/SKILL.md`, skillName));
      }
      return results;
    };
    for (const skill of collectSkills(agentsRoot, "~/.agents/skills")) {
      skillsByName.set(skill.name, skill);
    }
    for (const skill of collectSkills(legacyProjectSkillsRoot, "./.deepcode/skills")) {
      skillsByName.set(skill.name, skill);
    }
    for (const skill of collectSkills(projectAgentsSkillsRoot, "./.agents/skills")) {
      skillsByName.set(skill.name, skill);
    }
    if (sessionId) {
      const loadedSkillKeys = this.getLoadedSkillKeys(sessionId);
      for (const skill of skillsByName.values()) {
        if (loadedSkillKeys.has(this.getSkillKey(skill)) || loadedSkillKeys.has(this.getSkillKeyByName(skill.name))) {
          skill.isLoaded = true;
        }
      }
    }
    return Array.from(skillsByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  resolveSkillPath(skillPath) {
    if (skillPath.startsWith("~/")) {
      return path8.join(os5.homedir(), skillPath.slice(2));
    }
    if (skillPath.startsWith("~\\")) {
      return path8.join(os5.homedir(), skillPath.slice(2));
    }
    if (skillPath.startsWith("./")) {
      return path8.join(this.projectRoot, skillPath.slice(2));
    }
    if (skillPath.startsWith(".\\")) {
      return path8.join(this.projectRoot, skillPath.slice(2));
    }
    if (path8.isAbsolute(skillPath)) {
      return skillPath;
    }
    return path8.join(os5.homedir(), skillPath);
  }
  readSkillInfo(skillPath, displayPath, fallbackName) {
    const fallbackSkill = {
      name: fallbackName.replace(/_/g, "-"),
      path: displayPath,
      description: ""
    };
    try {
      const skillMd = fs9.readFileSync(skillPath, "utf8");
      const parsed = matter(skillMd);
      return {
        name: typeof parsed.data.name === "string" && parsed.data.name.trim() ? parsed.data.name.trim() : fallbackSkill.name,
        path: displayPath,
        description: typeof parsed.data.description === "string" ? parsed.data.description.trim() : ""
      };
    } catch {
      return fallbackSkill;
    }
  }
  getSkillKey(skill) {
    return `path:${skill.path}`;
  }
  getSkillKeyByName(name) {
    return `name:${name}`;
  }
  getLoadedSkillKeys(sessionId) {
    const loadedSkillKeys = /* @__PURE__ */ new Set();
    for (const message of this.listSessionMessages(sessionId)) {
      if (message.role !== "system" || !message.meta?.skill) {
        continue;
      }
      loadedSkillKeys.add(this.getSkillKey(message.meta.skill));
      loadedSkillKeys.add(this.getSkillKeyByName(message.meta.skill.name));
    }
    return loadedSkillKeys;
  }
  dedupeSkills(skills) {
    if (!skills || skills.length === 0) {
      return void 0;
    }
    const dedupedSkills = /* @__PURE__ */ new Map();
    for (const skill of skills) {
      if (!skill?.name || !skill?.path) {
        continue;
      }
      const key = this.getSkillKey(skill);
      const existingSkill = dedupedSkills.get(key);
      dedupedSkills.set(key, {
        ...existingSkill,
        ...skill,
        description: skill.description ?? existingSkill?.description ?? "",
        isLoaded: Boolean(existingSkill?.isLoaded || skill.isLoaded)
      });
    }
    return Array.from(dedupedSkills.values());
  }
  async normalizeSkills(skills, sessionId) {
    const dedupedSkills = this.dedupeSkills(skills);
    if (!dedupedSkills || dedupedSkills.length === 0) {
      return void 0;
    }
    const availableSkills = await this.listSkills(sessionId);
    const availableSkillsByKey = /* @__PURE__ */ new Map();
    for (const skill of availableSkills) {
      availableSkillsByKey.set(this.getSkillKey(skill), skill);
      availableSkillsByKey.set(this.getSkillKeyByName(skill.name), skill);
    }
    return dedupedSkills.map((skill) => {
      const matchedSkill = availableSkillsByKey.get(this.getSkillKey(skill)) ?? availableSkillsByKey.get(this.getSkillKeyByName(skill.name));
      if (!matchedSkill) {
        return skill;
      }
      return {
        ...matchedSkill,
        ...skill,
        description: matchedSkill.description || skill.description,
        isLoaded: Boolean(matchedSkill.isLoaded || skill.isLoaded)
      };
    });
  }
  getActiveSessionId() {
    return this.activeSessionId;
  }
  setActiveSessionId(sessionId) {
    this.activeSessionId = sessionId;
  }
  async handleUserPrompt(userPrompt) {
    const controller = new AbortController();
    this.activePromptController = controller;
    try {
      if (!this.activeSessionId || !this.getSession(this.activeSessionId)) {
        await this.createSession(userPrompt, controller);
      } else {
        await this.replySession(this.activeSessionId, userPrompt, controller);
      }
    } catch (error) {
      if (!this.isAbortLikeError(error) && !controller.signal.aborted) {
        throw error;
      }
    } finally {
      if (this.activePromptController === controller) {
        this.activePromptController = null;
      }
    }
  }
  async createSession(userPrompt, controller) {
    this.reportNewPrompt();
    const signal = controller?.signal;
    this.throwIfAborted(signal);
    this.applyInitCommandPrompt(userPrompt);
    if (userPrompt.text) {
      const skills = await this.listSkills();
      const skillNames = await this.identifyMatchingSkillNames(skills, userPrompt.text, { signal });
      this.throwIfAborted(signal);
      const skillSet = new Set(skillNames);
      const matchedSkill = skills.filter((skill) => skillSet.has(skill.name));
      if (Array.isArray(userPrompt.skills)) {
        userPrompt.skills.push(...matchedSkill);
      } else if (matchedSkill.length > 0) {
        userPrompt.skills = matchedSkill;
      }
    }
    userPrompt.skills = await this.normalizeSkills(userPrompt.skills);
    this.throwIfAborted(signal);
    const sessionId = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const index = this.loadSessionsIndex();
    const entry = {
      id: sessionId,
      summary: userPrompt.text ? userPrompt.text.slice(0, 100) : "\u{1F5BC} Image Prompt",
      assistantReply: null,
      assistantThinking: null,
      assistantRefusal: null,
      toolCalls: null,
      status: "pending",
      failReason: null,
      usage: null,
      activeTokens: 0,
      createTime: now,
      updateTime: now,
      processes: null
    };
    index.entries.push(entry);
    const sortedEntries = index.entries.slice().sort((a, b) => {
      const aTime = Date.parse(a.updateTime);
      const bTime = Date.parse(b.updateTime);
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return b.updateTime.localeCompare(a.updateTime);
      }
      return bTime - aTime;
    });
    const keptEntries = sortedEntries.slice(0, MAX_SESSION_ENTRIES);
    const keptIds = new Set(keptEntries.map((item) => item.id));
    const droppedEntries = sortedEntries.filter((item) => !keptIds.has(item.id));
    index.entries = keptEntries;
    this.saveSessionsIndex(index);
    this.removeSessionMessages(droppedEntries.map((item) => item.id));
    const systemPrompt = getSystemPrompt(this.projectRoot, this.getPromptToolOptions());
    const systemMessage = this.buildSystemMessage(sessionId, systemPrompt);
    this.appendSessionMessage(sessionId, systemMessage);
    const agentInstructions = this.loadAgentInstructions();
    if (agentInstructions) {
      const instructionsMessage = this.buildSystemMessage(sessionId, agentInstructions);
      this.appendSessionMessage(sessionId, instructionsMessage);
    }
    const defaultSkillPrompt = `Use the skill document below to assist the user:
<agent-drift-guard-skill>${AGENT_DRIFT_GUARD_SKILL}</agent-drift-guard-skill>`;
    const defaultSkillMessage = this.buildSystemMessage(sessionId, defaultSkillPrompt);
    this.appendSessionMessage(sessionId, defaultSkillMessage);
    const userMessage = this.buildUserMessage(sessionId, userPrompt);
    this.appendSessionMessage(sessionId, userMessage);
    if (userPrompt.skills && userPrompt.skills.length > 0) {
      for (const skill of userPrompt.skills) {
        if (skill.isLoaded) {
          continue;
        }
        const skillMd = fs9.readFileSync(this.resolveSkillPath(skill.path), "utf8");
        const skillPrompt = `Use the skill document below to assist the user:

<${skill.name}-skill path="${this.resolveSkillPath(skill.path)}">
${skillMd}
</${skill.name}-skill>`;
        const skillMessage = this.buildSkillMessage(sessionId, skillPrompt, skill);
        this.appendSessionMessage(sessionId, skillMessage);
        this.onAssistantMessage(skillMessage, true);
      }
    }
    this.activeSessionId = sessionId;
    await this.activateSession(sessionId, controller);
    return sessionId;
  }
  async replySession(sessionId, userPrompt, controller) {
    const signal = controller?.signal;
    this.throwIfAborted(signal);
    this.applyInitCommandPrompt(userPrompt);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      status: "pending",
      failReason: null,
      updateTime: now
    }));
    if (!updated) {
      await this.createSession(userPrompt, controller);
      return;
    }
    this.reportNewPrompt();
    if (userPrompt.text) {
      const skills = await this.listSkills(sessionId);
      const skillNames = await this.identifyMatchingSkillNames(skills, userPrompt.text, { signal, sessionId });
      this.throwIfAborted(signal);
      const skillSet = new Set(skillNames);
      const matchedSkill = skills.filter((skill) => skillSet.has(skill.name));
      if (Array.isArray(userPrompt.skills)) {
        userPrompt.skills.push(...matchedSkill);
      } else if (matchedSkill.length > 0) {
        userPrompt.skills = matchedSkill;
      }
    }
    userPrompt.skills = await this.normalizeSkills(userPrompt.skills, sessionId);
    this.throwIfAborted(signal);
    const userMessage = this.buildUserMessage(sessionId, userPrompt);
    this.appendSessionMessage(sessionId, userMessage);
    if (userPrompt.skills && userPrompt.skills.length > 0) {
      for (const skill of userPrompt.skills) {
        if (skill.isLoaded) {
          continue;
        }
        const skillMd = fs9.readFileSync(this.resolveSkillPath(skill.path), "utf8");
        const skillPrompt = `Use the skill document below to assist the user:

<${skill.name}-skill path="${this.resolveSkillPath(skill.path)}">
${skillMd}
</${skill.name}-skill>`;
        const skillMessage = this.buildSkillMessage(sessionId, skillPrompt, skill);
        this.appendSessionMessage(sessionId, skillMessage);
        this.onAssistantMessage(skillMessage, true);
      }
    }
    this.activeSessionId = sessionId;
    await this.activateSession(sessionId, controller);
  }
  async activateSession(sessionId, controller) {
    const startedAt = Date.now();
    const { client, model, baseURL, thinkingEnabled, reasoningEffort, debugLogEnabled, notify } = this.createOpenAIClient();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (!client) {
      this.updateSessionEntry(sessionId, (entry) => ({
        ...entry,
        status: "failed",
        failReason: "OpenAI API key not found",
        updateTime: now
      }));
      this.onAssistantMessage(
        this.buildAssistantMessage(
          sessionId,
          "OpenAI API key not found. Please configure ~/.deepcode/settings.json.",
          null
        ),
        false
      );
      this.maybeNotifyTaskCompletion(sessionId, notify, startedAt);
      return;
    }
    const sessionController = controller ?? new AbortController();
    if (sessionController.signal.aborted) {
      this.updateSessionEntry(sessionId, (entry) => ({
        ...entry,
        status: "interrupted",
        failReason: "interrupted",
        updateTime: now
      }));
      this.maybeNotifyTaskCompletion(sessionId, notify, startedAt);
      return;
    }
    this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      status: "processing",
      updateTime: now
    }));
    this.sessionControllers.set(sessionId, sessionController);
    try {
      const maxIterations = 8e4;
      let toolCalls = null;
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (this.isInterrupted(sessionId)) {
          return;
        }
        const session = this.getSession(sessionId);
        if (session == null || session.status === "interrupted" || session.status === "failed") {
          return;
        }
        const compactPromptTokenThreshold = getCompactPromptTokenThreshold(model);
        if (session.activeTokens > compactPromptTokenThreshold) {
          const message2 = this.buildAssistantMessage(
            sessionId,
            "The conversation is getting long, compacting...",
            null
          );
          message2.meta = { asThinking: true };
          this.onAssistantMessage(message2, false);
          await this.compactSession(sessionId, sessionController.signal);
        }
        const messages = this.buildOpenAIMessages(this.listSessionMessages(sessionId), thinkingEnabled);
        const thinkingOptions = buildThinkingRequestOptions(thinkingEnabled, reasoningEffort);
        const response = await this.createChatCompletionStream(
          client,
          {
            model,
            messages,
            tools: getTools(this.getPromptToolOptions()),
            ...thinkingOptions
          },
          { signal: sessionController.signal },
          sessionId,
          {
            enabled: debugLogEnabled,
            location: "SessionManager.activateSession",
            baseURL,
            params: { iteration, thinkingEnabled, reasoningEffort }
          }
        );
        const message = response.choices?.[0]?.message;
        const rawContent = message?.content;
        const content = typeof rawContent === "string" ? rawContent : "";
        const rawToolCalls = message?.tool_calls ?? null;
        toolCalls = Array.isArray(rawToolCalls) && rawToolCalls.length > 0 ? rawToolCalls : null;
        const rawThinking = message?.reasoning_content;
        const thinking = typeof rawThinking === "string" ? rawThinking : null;
        const refusal = message?.refusal ?? null;
        if (this.isInterrupted(sessionId)) {
          return;
        }
        const assistantMessage = this.buildAssistantMessage(sessionId, content, toolCalls, thinking);
        this.appendSessionMessage(sessionId, assistantMessage);
        this.onAssistantMessage(assistantMessage, true);
        let waitingForUser = false;
        if (toolCalls) {
          const toolAppendResult = await this.appendToolMessages(sessionId, toolCalls);
          waitingForUser = toolAppendResult.waitingForUser;
        }
        if (this.isInterrupted(sessionId)) {
          return;
        }
        const responseUsage = response.usage ?? null;
        this.updateSessionEntry(sessionId, (entry) => ({
          ...entry,
          assistantReply: content,
          assistantThinking: thinking,
          assistantRefusal: refusal,
          toolCalls,
          usage: accumulateUsage(entry.usage, responseUsage),
          activeTokens: getTotalTokens(responseUsage),
          status: refusal ? "failed" : waitingForUser ? "waiting_for_user" : toolCalls ? "processing" : "completed",
          failReason: refusal ? refusal : entry.failReason,
          updateTime: (/* @__PURE__ */ new Date()).toISOString()
        }));
        if (refusal) {
          return;
        }
        if (waitingForUser) {
          return;
        }
        if (!toolCalls) {
          return;
        }
      }
      this.updateSessionEntry(sessionId, (entry) => ({
        ...entry,
        status: "completed",
        updateTime: (/* @__PURE__ */ new Date()).toISOString()
      }));
      this.onAssistantMessage(
        this.buildAssistantMessage(
          sessionId,
          "The AI agent has taken several steps but hasn't reached a conclusion yet. Do you want to continue?",
          null
        ),
        false
      );
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const aborted = this.isAbortLikeError(error) || sessionController.signal.aborted;
      this.updateSessionEntry(sessionId, (entry) => ({
        ...entry,
        status: aborted ? "interrupted" : "failed",
        failReason: aborted ? "interrupted" : errMessage,
        updateTime: (/* @__PURE__ */ new Date()).toISOString()
      }));
      if (!aborted) {
        this.onAssistantMessage(this.buildAssistantMessage(sessionId, `Request failed: ${errMessage}`, null), false);
      }
    } finally {
      if (this.sessionControllers.get(sessionId) === sessionController) {
        this.sessionControllers.delete(sessionId);
      }
      this.maybeNotifyTaskCompletion(sessionId, notify, startedAt);
    }
  }
  async compactSession(sessionId, signal) {
    this.throwIfAborted(signal);
    const { client, model, baseURL, thinkingEnabled, reasoningEffort, debugLogEnabled } = this.createOpenAIClient();
    if (!client) {
      return;
    }
    const sessionMessages = this.listSessionMessages(sessionId).filter((message) => !message.compacted);
    if (sessionMessages.length === 0) {
      return;
    }
    const startIndex = sessionMessages.findIndex((message) => message.role !== "system");
    if (startIndex === -1) {
      return;
    }
    const searchStart = Math.floor(startIndex + (sessionMessages.length - startIndex) * 2 / 3);
    let endIndex = -1;
    for (let i = Math.max(searchStart, startIndex); i < sessionMessages.length; i += 1) {
      if (sessionMessages[i].role !== "tool") {
        endIndex = i;
        break;
      }
    }
    if (endIndex === -1 || endIndex <= startIndex) {
      return;
    }
    const compactPrompt = getCompactPrompt(sessionMessages.slice(startIndex, endIndex));
    const thinkingOptions = buildThinkingRequestOptions(thinkingEnabled, reasoningEffort);
    const response = await this.createChatCompletionStream(
      client,
      {
        model,
        messages: [{ role: "user", content: compactPrompt }],
        ...thinkingOptions
      },
      signal ? { signal } : void 0,
      sessionId,
      {
        enabled: debugLogEnabled,
        location: "SessionManager.compactSession",
        baseURL,
        params: { thinkingEnabled, reasoningEffort }
      }
    );
    this.throwIfAborted(signal);
    const rawLlmResponse = response.choices?.[0]?.message?.content;
    const llmResponse = typeof rawLlmResponse === "string" ? rawLlmResponse : "";
    const compactedSummary = llmResponse.replace(/<analysis>[\s\S]*?<\/analysis>/gi, "").trim();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const responseUsage = response.usage ?? null;
    this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      usage: accumulateUsage(entry.usage, responseUsage),
      activeTokens: getTotalTokens(responseUsage),
      updateTime: now
    }));
    for (let i = startIndex; i < endIndex; i += 1) {
      sessionMessages[i] = { ...sessionMessages[i], compacted: true, updateTime: now };
    }
    const summaryMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "system",
      content: `There are earlier parts of the conversation. Here is a summary: 

${compactedSummary}`,
      contentParams: null,
      messageParams: null,
      compacted: false,
      visible: false,
      createTime: now,
      updateTime: now,
      meta: {
        isSummary: true
      }
    };
    sessionMessages.splice(endIndex, 0, summaryMessage);
    this.saveSessionMessages(sessionId, sessionMessages);
  }
  getPromptToolOptions() {
    return {
      webSearchEnabled: true
    };
  }
  reportNewPrompt() {
    const { machineId } = this.createOpenAIClient();
    if (!machineId) {
      return;
    }
    void fetch(DEFAULT_NEW_PROMPT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: machineId
      },
      body: JSON.stringify({})
    }).then(async (response) => {
      if (response.ok) {
        return;
      }
      const body = await response.text().catch(() => "");
      throw new Error(`New prompt API request failed with status ${response.status}${body ? `: ${body}` : ""}`);
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to report new prompt: ${message}`);
    });
  }
  interruptActiveSession() {
    const controller = this.activePromptController;
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
    const sessionId = this.activeSessionId;
    if (sessionId) {
      this.interruptSession(sessionId);
    }
  }
  interruptSession(sessionId) {
    const session = this.getSession(sessionId);
    const processIds = this.getProcessIds(session?.processes ?? null);
    const killedPids = [];
    const failedPids = [];
    for (const pid of processIds) {
      const killedGroup = this.killProcessGroup(pid);
      if (killedGroup) {
        killedPids.push(pid);
        continue;
      }
      try {
        process.kill(pid, "SIGKILL");
        killedPids.push(pid);
      } catch {
        failedPids.push(pid);
      }
    }
    const controller = this.sessionControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.sessionControllers.delete(sessionId);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      status: "interrupted",
      failReason: "interrupted",
      processes: null,
      updateTime: now
    }));
    const contentParts = ["Interrupted."];
    if (killedPids.length > 0) {
      contentParts.push(`Killed processes: ${killedPids.join(", ")}.`);
    }
    if (failedPids.length > 0) {
      contentParts.push(`Failed to kill processes: ${failedPids.join(", ")}.`);
    }
    this.onAssistantMessage(this.buildUserMessage(sessionId, { text: contentParts.join(" ") }), false);
  }
  isInterrupted(sessionId) {
    return !this.sessionControllers.has(sessionId);
  }
  listSessions() {
    const index = this.loadSessionsIndex();
    return index.entries;
  }
  getSession(sessionId) {
    const index = this.loadSessionsIndex();
    return index.entries.find((entry) => entry.id === sessionId) ?? null;
  }
  listSessionMessages(sessionId) {
    const messagePath = this.getSessionMessagesPath(sessionId);
    if (!fs9.existsSync(messagePath)) {
      return [];
    }
    const raw = fs9.readFileSync(messagePath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const messages = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        messages.push(this.normalizeSessionMessage(parsed));
      } catch {
      }
    }
    return messages;
  }
  normalizeSessionMessage(message) {
    if (message.role !== "tool") {
      return message;
    }
    const nextMeta = message.meta ? { ...message.meta } : void 0;
    const normalizedParamsMd = this.buildToolParamsSnippet(nextMeta?.function ?? null);
    if (nextMeta && normalizedParamsMd) {
      nextMeta.paramsMd = normalizedParamsMd;
    }
    const normalizedResultMd = typeof message.content === "string" ? this.buildToolResultSnippet(message.content) : "";
    if (nextMeta && normalizedResultMd) {
      nextMeta.resultMd = normalizedResultMd;
    }
    return {
      ...message,
      visible: typeof message.content === "string" ? !this.isInvisibleExecution(message.content) : message.visible,
      meta: nextMeta
    };
  }
  getProjectCode(projectRoot) {
    return projectRoot.replace(/[\\/]/g, "-").replace(/:/g, "");
  }
  getProjectStorage() {
    const projectCode = this.getProjectCode(this.projectRoot);
    const projectDir = path8.join(os5.homedir(), ".deepcode", "projects", projectCode);
    const sessionsIndexPath = path8.join(projectDir, "sessions-index.json");
    return { projectCode, projectDir, sessionsIndexPath };
  }
  ensureProjectDir() {
    const { projectDir } = this.getProjectStorage();
    fs9.mkdirSync(projectDir, { recursive: true });
    return projectDir;
  }
  loadSessionsIndex() {
    const { sessionsIndexPath } = this.getProjectStorage();
    this.ensureProjectDir();
    if (!fs9.existsSync(sessionsIndexPath)) {
      return { version: 1, entries: [], originalPath: this.projectRoot };
    }
    try {
      const raw = fs9.readFileSync(sessionsIndexPath, "utf8");
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed.entries) ? parsed.entries.map((entry) => this.normalizeSessionEntry(entry)) : [];
      return {
        version: 1,
        entries,
        originalPath: parsed.originalPath || this.projectRoot
      };
    } catch {
      return { version: 1, entries: [], originalPath: this.projectRoot };
    }
  }
  saveSessionsIndex(index) {
    const { sessionsIndexPath } = this.getProjectStorage();
    this.ensureProjectDir();
    const normalized = {
      version: 1,
      entries: index.entries.map((entry) => ({
        ...entry,
        processes: this.serializeProcesses(entry.processes)
      })),
      originalPath: this.projectRoot
    };
    fs9.writeFileSync(sessionsIndexPath, JSON.stringify(normalized, null, 2), "utf8");
  }
  getSessionMessagesPath(sessionId) {
    const { projectDir } = this.getProjectStorage();
    return path8.join(projectDir, `${sessionId}.jsonl`);
  }
  removeSessionMessages(sessionIds) {
    for (const sessionId of sessionIds) {
      const messagePath = this.getSessionMessagesPath(sessionId);
      try {
        if (fs9.existsSync(messagePath)) {
          fs9.unlinkSync(messagePath);
        }
      } catch {
      }
    }
  }
  appendSessionMessage(sessionId, message) {
    this.ensureProjectDir();
    const messagePath = this.getSessionMessagesPath(sessionId);
    fs9.appendFileSync(messagePath, `${JSON.stringify(message)}
`, "utf8");
  }
  saveSessionMessages(sessionId, messages) {
    this.ensureProjectDir();
    const messagePath = this.getSessionMessagesPath(sessionId);
    const payload = messages.map((message) => JSON.stringify(message)).join("\n");
    fs9.writeFileSync(messagePath, payload ? `${payload}
` : "", "utf8");
  }
  updateSessionEntry(sessionId, updater) {
    const index = this.loadSessionsIndex();
    const entryIndex = index.entries.findIndex((entry) => entry.id === sessionId);
    if (entryIndex === -1) {
      return null;
    }
    const updated = updater({ ...index.entries[entryIndex] });
    index.entries[entryIndex] = updated;
    this.saveSessionsIndex(index);
    this.onSessionEntryUpdated?.(updated);
    return updated;
  }
  buildUserMessage(sessionId, prompt) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const imageParams = prompt.imageUrls?.filter((url) => Boolean(url)).map((url) => ({
      type: "image_url",
      image_url: { url }
    })) ?? [];
    return {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      content: prompt.text ?? "",
      contentParams: imageParams.length > 0 ? imageParams : null,
      messageParams: null,
      compacted: false,
      visible: true,
      createTime: now,
      updateTime: now
    };
  }
  applyInitCommandPrompt(userPrompt) {
    if (userPrompt.text !== "/init") {
      return;
    }
    userPrompt.text = this.renderInitCommandPrompt();
  }
  renderInitCommandPrompt() {
    const templatePath = path8.join(getExtensionRoot2(), "docs", "prompts", "init_command.md.ejs");
    const template = fs9.readFileSync(templatePath, "utf8");
    return ejs.render(template, {
      agentsMdFile: this.getEffectiveProjectAgentsMdFile()
    });
  }
  getEffectiveProjectAgentsMdFile() {
    return this.loadProjectAgentInstructions()?.displayPath ?? null;
  }
  loadProjectAgentInstructions() {
    const candidatePaths = [
      {
        absolutePath: path8.join(this.projectRoot, ".deepcode", "AGENTS.md"),
        displayPath: "./.deepcode/AGENTS.md"
      },
      {
        absolutePath: path8.join(this.projectRoot, "AGENTS.md"),
        displayPath: "./AGENTS.md"
      }
    ];
    for (const candidatePath of candidatePaths) {
      const content = this.readNonEmptyFile(candidatePath.absolutePath);
      if (content) {
        return {
          content,
          displayPath: candidatePath.displayPath
        };
      }
    }
    return null;
  }
  readNonEmptyFile(filePath) {
    try {
      if (!fs9.existsSync(filePath)) {
        return null;
      }
      const content = fs9.readFileSync(filePath, "utf8").trim();
      return content || null;
    } catch {
      return null;
    }
  }
  loadAgentInstructions() {
    const projectInstructions = this.loadProjectAgentInstructions();
    if (projectInstructions) {
      return projectInstructions.content;
    }
    return this.readNonEmptyFile(path8.join(os5.homedir(), ".deepcode", "AGENTS.md"));
  }
  buildSystemMessage(sessionId, content, contentParams = null) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: crypto.randomUUID(),
      sessionId,
      role: "system",
      content,
      contentParams,
      messageParams: null,
      compacted: false,
      visible: false,
      createTime: now,
      updateTime: now
    };
  }
  buildSkillMessage(sessionId, content, skill) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: crypto.randomUUID(),
      sessionId,
      role: "system",
      content,
      contentParams: null,
      messageParams: null,
      compacted: false,
      visible: true,
      createTime: now,
      updateTime: now,
      meta: { skill: { ...skill, isLoaded: true } }
    };
  }
  buildAssistantMessage(sessionId, content, toolCalls, reasoningContent) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const hasReasoningContent = reasoningContent != null;
    const messageParams = toolCalls || hasReasoningContent ? {} : null;
    if (toolCalls) {
      messageParams.tool_calls = toolCalls;
    }
    if (hasReasoningContent) {
      messageParams.reasoning_content = reasoningContent;
    }
    return {
      id: crypto.randomUUID(),
      sessionId,
      role: "assistant",
      content,
      contentParams: null,
      messageParams,
      compacted: false,
      visible: (content || reasoningContent || "").trim() ? true : false,
      createTime: now,
      updateTime: now,
      meta: toolCalls ? { asThinking: true } : void 0
    };
  }
  buildToolMessage(sessionId, toolCallId, content, toolFunction) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const paramsMd = this.buildToolParamsSnippet(toolFunction);
    const resultMd = this.buildToolResultSnippet(content);
    const isInvisibleExecution = this.isInvisibleExecution(content);
    return {
      id: crypto.randomUUID(),
      sessionId,
      role: "tool",
      content,
      contentParams: null,
      messageParams: { tool_call_id: toolCallId },
      compacted: false,
      visible: !isInvisibleExecution,
      createTime: now,
      updateTime: now,
      meta: {
        function: toolFunction ?? void 0,
        paramsMd,
        resultMd
      }
    };
  }
  async appendToolMessages(sessionId, toolCalls) {
    const toolExecutions = await this.toolExecutor.executeToolCalls(sessionId, toolCalls, {
      onProcessStart: (pid, command) => this.addSessionProcess(sessionId, pid, command),
      onProcessExit: (pid) => this.removeSessionProcess(sessionId, pid),
      shouldStop: () => this.isInterrupted(sessionId)
    });
    if (this.isInterrupted(sessionId)) {
      return { waitingForUser: false };
    }
    let waitingForUser = false;
    const followUpMessages = [];
    for (const execution of toolExecutions) {
      if (execution.result.awaitUserResponse === true) {
        waitingForUser = true;
      }
      const toolFunction = this.findToolFunction(toolCalls, execution.toolCallId);
      const toolMessage = this.buildToolMessage(sessionId, execution.toolCallId, execution.content, toolFunction);
      this.appendSessionMessage(sessionId, toolMessage);
      this.onAssistantMessage(toolMessage, true);
      for (const followUpMessage of execution.result.followUpMessages ?? []) {
        if (followUpMessage.role !== "system") {
          continue;
        }
        followUpMessages.push(
          this.buildSystemMessage(sessionId, followUpMessage.content, followUpMessage.contentParams ?? null)
        );
      }
    }
    for (const followUpMessage of followUpMessages) {
      this.appendSessionMessage(sessionId, followUpMessage);
    }
    return { waitingForUser };
  }
  buildOpenAIMessages(messages, thinkingEnabled) {
    const activeMessages = messages.filter((message) => !message.compacted);
    const toolPairings = this.pairToolMessages(activeMessages);
    const openAIMessages = [];
    for (let index = 0; index < activeMessages.length; index += 1) {
      const message = activeMessages[index];
      if (message.role === "tool") {
        continue;
      }
      openAIMessages.push(this.sessionMessageToOpenAIMessage(message, thinkingEnabled));
      const toolCalls = this.getAssistantToolCalls(message);
      if (toolCalls.length === 0) {
        continue;
      }
      for (let toolCallIndex = 0; toolCallIndex < toolCalls.length; toolCallIndex += 1) {
        const toolCallId = this.getToolCallId(toolCalls[toolCallIndex]);
        if (!toolCallId) {
          continue;
        }
        const pairedToolIndex = toolPairings.get(this.buildToolPairingKey(index, toolCallIndex));
        if (pairedToolIndex != null) {
          openAIMessages.push(this.sessionMessageToOpenAIMessage(activeMessages[pairedToolIndex], thinkingEnabled));
          continue;
        }
        openAIMessages.push(this.buildInterruptedOpenAIToolMessage(toolCalls, toolCallId));
      }
    }
    return openAIMessages;
  }
  sessionMessageToOpenAIMessage(message, thinkingEnabled) {
    const base = {
      role: message.role,
      content: message.content ?? ""
    };
    const messageParams = message.messageParams;
    if (messageParams?.tool_calls) {
      base.tool_calls = messageParams.tool_calls;
    }
    if (messageParams?.tool_call_id) {
      base.tool_call_id = messageParams.tool_call_id;
    }
    if (typeof messageParams?.reasoning_content === "string") {
      base.reasoning_content = messageParams.reasoning_content;
    } else if (thinkingEnabled && message.role === "assistant") {
      base.reasoning_content = "";
    }
    if ((message.role === "user" || message.role === "system") && message.contentParams) {
      const contentParts = [];
      if (message.content) {
        contentParts.push({ type: "text", text: message.content });
      }
      const params = Array.isArray(message.contentParams) ? message.contentParams : [message.contentParams];
      for (const param of params) {
        if (param && typeof param === "object") {
          contentParts.push(param);
        }
      }
      const contentValue = contentParts.length > 0 ? contentParts : message.content ?? "";
      base.content = contentValue;
    }
    return base;
  }
  pairToolMessages(messages) {
    const pairings = /* @__PURE__ */ new Map();
    const usedToolMessageIndexes = /* @__PURE__ */ new Set();
    for (let assistantIndex = 0; assistantIndex < messages.length; assistantIndex += 1) {
      const toolCalls = this.getAssistantToolCalls(messages[assistantIndex]);
      for (let toolCallIndex = 0; toolCallIndex < toolCalls.length; toolCallIndex += 1) {
        const toolCallId = this.getToolCallId(toolCalls[toolCallIndex]);
        if (!toolCallId) {
          continue;
        }
        const toolIndex = this.findPairableToolMessageIndex(
          messages,
          assistantIndex,
          toolCallId,
          usedToolMessageIndexes
        );
        if (toolIndex == null) {
          continue;
        }
        usedToolMessageIndexes.add(toolIndex);
        pairings.set(this.buildToolPairingKey(assistantIndex, toolCallIndex), toolIndex);
      }
    }
    return pairings;
  }
  findPairableToolMessageIndex(messages, assistantIndex, toolCallId, usedToolMessageIndexes) {
    let firstMatchingIndex = null;
    for (let index = assistantIndex + 1; index < messages.length; index += 1) {
      const message = messages[index];
      if (message.role !== "tool" || usedToolMessageIndexes.has(index)) {
        continue;
      }
      const candidateToolCallId = this.getToolMessageCallId(message);
      if (candidateToolCallId !== toolCallId) {
        continue;
      }
      if (firstMatchingIndex == null) {
        firstMatchingIndex = index;
      }
      if (!this.isInterruptedToolMessage(message)) {
        return index;
      }
    }
    return firstMatchingIndex;
  }
  getAssistantToolCalls(message) {
    if (message.role !== "assistant") {
      return [];
    }
    const messageParams = message.messageParams;
    return Array.isArray(messageParams?.tool_calls) ? messageParams.tool_calls : [];
  }
  getToolCallId(toolCall) {
    if (!toolCall || typeof toolCall !== "object") {
      return null;
    }
    const id = toolCall.id;
    return typeof id === "string" && id ? id : null;
  }
  getToolMessageCallId(message) {
    const messageParams = message.messageParams;
    const toolCallId = messageParams?.tool_call_id;
    return typeof toolCallId === "string" && toolCallId ? toolCallId : null;
  }
  buildToolPairingKey(assistantIndex, toolCallIndex) {
    return `${assistantIndex}:${toolCallIndex}`;
  }
  isInterruptedToolMessage(message) {
    if (typeof message.content !== "string" || !message.content.trim()) {
      return false;
    }
    try {
      const parsed = JSON.parse(message.content);
      return parsed.metadata?.interrupted === true;
    } catch {
      return false;
    }
  }
  buildInterruptedOpenAIToolMessage(toolCalls, toolCallId) {
    const toolFunction = this.findToolFunction(toolCalls, toolCallId);
    return {
      role: "tool",
      content: this.buildInterruptedToolResult(toolFunction, "Previous tool call did not complete."),
      tool_call_id: toolCallId
    };
  }
  findToolFunction(toolCalls, toolCallId) {
    for (const toolCall of toolCalls) {
      if (!toolCall || typeof toolCall !== "object") {
        continue;
      }
      const record = toolCall;
      if (record.id === toolCallId) {
        return record.function ?? null;
      }
    }
    return null;
  }
  buildToolParamsSnippet(toolFunction) {
    if (!toolFunction || typeof toolFunction !== "object") {
      return "";
    }
    const args2 = toolFunction.arguments;
    const toolName = toolFunction.name;
    if (typeof args2 !== "string") {
      return "";
    }
    const trimmed = args2.trim();
    if (!trimmed) {
      return "";
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return this.formatToolParamsSnippet(
          typeof toolName === "string" ? toolName : null,
          parsed
        );
      }
    } catch {
    }
    return trimmed;
  }
  formatToolParamsSnippet(toolName, args2) {
    if (toolName === "bash") {
      const command = typeof args2.command === "string" ? args2.command.trim() : "";
      const description = typeof args2.description === "string" ? args2.description.trim() : "";
      if (command && description) {
        return `${command}  # ${description}`;
      }
      if (command) {
        return command;
      }
      if (description) {
        return description;
      }
    }
    const firstKey = Object.keys(args2)[0];
    if (!firstKey) {
      return "";
    }
    const value = args2[firstKey];
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (toolName === "read" && text.startsWith(this.projectRoot)) {
      return text.slice(this.projectRoot.length).replace(/^[\\/]/, "");
    }
    return text;
  }
  buildToolResultSnippet(content) {
    const trimmed = content.trim();
    if (!trimmed) {
      return "";
    }
    const maxLength = 2e3;
    try {
      const parsed = JSON.parse(content);
      if (parsed.output !== void 0) {
        if (typeof parsed.output === "string") {
          return this.formatToolResultSnippet(parsed.output, maxLength);
        }
        return this.formatToolResultSnippet(JSON.stringify(parsed.output), maxLength);
      }
    } catch {
    }
    return this.formatToolResultSnippet(content, maxLength);
  }
  formatToolResultSnippet(value, maxLength) {
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength)}... (total ${value.length} chars)`;
  }
  isInvisibleExecution(content) {
    if (!content.trim()) {
      return false;
    }
    try {
      const parsed = JSON.parse(content);
      return parsed.name === "bash" && parsed.ok !== true;
    } catch {
      return false;
    }
  }
  maybeNotifyTaskCompletion(sessionId, notifyCommand, startedAt) {
    if (!notifyCommand) {
      return;
    }
    const session = this.getSession(sessionId);
    if (!session || session.status !== "completed" && session.status !== "failed") {
      return;
    }
    launchNotifyScript(notifyCommand, Date.now() - startedAt, this.projectRoot);
  }
  addSessionProcess(sessionId, processId, command) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.updateSessionEntry(sessionId, (entry) => {
      const processes = new Map(entry.processes ?? []);
      processes.set(String(processId), { startTime: now, command });
      return {
        ...entry,
        processes,
        updateTime: now
      };
    });
  }
  removeSessionProcess(sessionId, processId) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.updateSessionEntry(sessionId, (entry) => {
      const processes = new Map(entry.processes ?? []);
      processes.delete(String(processId));
      return {
        ...entry,
        processes: processes.size > 0 ? processes : null,
        updateTime: now
      };
    });
  }
  getProcessIds(processes) {
    if (!processes) {
      return [];
    }
    const ids = [];
    for (const pid of processes.keys()) {
      const parsed = Number(pid);
      if (Number.isInteger(parsed) && parsed > 0) {
        ids.push(parsed);
      }
    }
    return ids;
  }
  buildInterruptedToolResult(toolFunction, reason) {
    const toolName = toolFunction && typeof toolFunction === "object" && typeof toolFunction.name === "string" ? toolFunction.name : "tool";
    return JSON.stringify(
      {
        ok: false,
        name: toolName,
        error: reason,
        metadata: {
          interrupted: true
        }
      },
      null,
      2
    );
  }
  killProcessGroup(pid) {
    if (process.platform === "win32") {
      return false;
    }
    try {
      process.kill(-pid, "SIGKILL");
      return true;
    } catch {
      return false;
    }
  }
  normalizeSessionEntry(entry) {
    const value = entry && typeof entry === "object" ? entry : {};
    return {
      id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
      summary: typeof value.summary === "string" ? value.summary : null,
      assistantReply: typeof value.assistantReply === "string" ? value.assistantReply : null,
      assistantThinking: typeof value.assistantThinking === "string" ? value.assistantThinking : null,
      assistantRefusal: typeof value.assistantRefusal === "string" ? value.assistantRefusal : null,
      toolCalls: Array.isArray(value.toolCalls) ? value.toolCalls : null,
      status: this.normalizeSessionStatus(value.status),
      failReason: typeof value.failReason === "string" ? value.failReason : null,
      usage: value.usage ?? null,
      activeTokens: typeof value.activeTokens === "number" ? value.activeTokens : 0,
      createTime: typeof value.createTime === "string" ? value.createTime : (/* @__PURE__ */ new Date()).toISOString(),
      updateTime: typeof value.updateTime === "string" ? value.updateTime : (/* @__PURE__ */ new Date()).toISOString(),
      processes: this.deserializeProcesses(value.processes)
    };
  }
  normalizeSessionStatus(status) {
    if (status === "failed" || status === "pending" || status === "processing" || status === "waiting_for_user" || status === "completed" || status === "interrupted") {
      return status;
    }
    return "pending";
  }
  deserializeProcesses(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const processes = /* @__PURE__ */ new Map();
    for (const [pid, entry] of Object.entries(value)) {
      if (!pid) {
        continue;
      }
      if (typeof entry === "string") {
        processes.set(pid, { startTime: entry, command: "Running process..." });
      } else if (typeof entry === "object" && entry !== null) {
        const obj = entry;
        const startTime = typeof obj.startTime === "string" ? obj.startTime : (/* @__PURE__ */ new Date()).toISOString();
        const command = typeof obj.command === "string" ? obj.command : "Running process...";
        processes.set(pid, { startTime, command });
      }
    }
    return processes.size > 0 ? processes : null;
  }
  serializeProcesses(processes) {
    if (!processes || processes.size === 0) {
      return null;
    }
    const serialized = {};
    for (const [pid, entry] of processes.entries()) {
      serialized[pid] = entry;
    }
    return serialized;
  }
};

// src/clientFactory.ts
import * as fs10 from "fs";
import * as os6 from "os";
import * as path9 from "path";
import OpenAI from "openai";

// src/settings.ts
function resolveReasoningEffort(value) {
  return value === "high" || value === "max" ? value : "max";
}
function resolveThinkingEnabled(settings, model) {
  if (typeof settings?.thinkingEnabled === "boolean") {
    return settings.thinkingEnabled;
  }
  const legacyThinking = settings?.env?.THINKING;
  if (typeof legacyThinking === "string" && legacyThinking.trim()) {
    return legacyThinking.trim().toLowerCase() === "enabled";
  }
  return defaultsToThinkingMode(model);
}
function resolveSettings(settings, defaults) {
  const env = settings?.env ?? {};
  const topLevelModel = typeof settings?.model === "string" ? settings.model.trim() : "";
  const model = topLevelModel || env.MODEL?.trim() || defaults.model;
  const notify = typeof settings?.notify === "string" ? settings.notify.trim() : "";
  const webSearchTool = typeof settings?.webSearchTool === "string" ? settings.webSearchTool.trim() : "";
  return {
    apiKey: env.API_KEY?.trim(),
    baseURL: env.BASE_URL?.trim() || defaults.baseURL,
    model,
    thinkingEnabled: resolveThinkingEnabled(settings, model),
    reasoningEffort: resolveReasoningEffort(settings?.reasoningEffort),
    debugLogEnabled: settings?.debugLogEnabled === true,
    notify: notify || void 0,
    webSearchTool: webSearchTool || void 0
  };
}
function modelConfigKey(config) {
  return config.thinkingEnabled ? `thinking:${config.reasoningEffort}` : "thinking:none";
}
function applyModelConfigSelection(settings, current, selected) {
  const changed = selected.model !== current.model || modelConfigKey(selected) !== modelConfigKey(current);
  const next = { ...settings ?? {} };
  if (!changed) {
    return { settings: next, changed: false };
  }
  if (selected.model !== current.model || Object.prototype.hasOwnProperty.call(next, "model")) {
    next.model = selected.model;
  } else {
    delete next.model;
  }
  next.thinkingEnabled = selected.thinkingEnabled;
  if (selected.thinkingEnabled) {
    next.reasoningEffort = selected.reasoningEffort;
  }
  return { settings: next, changed: true };
}

// src/clientFactory.ts
var DEFAULT_MODEL = "deepseek-v4-pro";
var DEFAULT_BASE_URL = "https://api.deepseek.com";
function readSettings() {
  try {
    const settingsPath = path9.join(os6.homedir(), ".deepcode", "settings.json");
    if (!fs10.existsSync(settingsPath)) {
      return null;
    }
    const raw = fs10.readFileSync(settingsPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function resolveCurrentSettings() {
  return resolveSettings(readSettings(), {
    model: DEFAULT_MODEL,
    baseURL: DEFAULT_BASE_URL
  });
}
function writeLastProjectRoot(projectRoot) {
  const settingsPath = path9.join(os6.homedir(), ".deepcode", "settings.json");
  let settings = {};
  try {
    if (fs10.existsSync(settingsPath)) {
      const raw = fs10.readFileSync(settingsPath, "utf8");
      settings = JSON.parse(raw);
    }
  } catch {
  }
  settings.lastProjectRoot = projectRoot;
  const dir = path9.dirname(settingsPath);
  fs10.mkdirSync(dir, { recursive: true });
  fs10.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}
function createOpenAIClient() {
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
    baseURL: settings.baseURL || void 0
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
function getMachineId() {
  try {
    const idPath = path9.join(os6.homedir(), ".deepcode", "machine-id");
    if (fs10.existsSync(idPath)) {
      const raw = fs10.readFileSync(idPath, "utf8").trim();
      if (raw) {
        return raw;
      }
    }
    const generated = `${os6.hostname()}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    fs10.mkdirSync(path9.dirname(idPath), { recursive: true });
    fs10.writeFileSync(idPath, generated, "utf8");
    return generated;
  } catch {
    return void 0;
  }
}

// src/ui/PromptInput.tsx
import React2, { useEffect as useEffect3, useState as useState2 } from "react";
import { Box as Box2, Text as Text2, useApp, useStdout } from "ink";
import chalk from "chalk";

// src/ui/promptBuffer.ts
var EMPTY_BUFFER = { text: "", cursor: 0 };
function insertText(state, value) {
  if (!value) {
    return state;
  }
  const text = state.text.slice(0, state.cursor) + value + state.text.slice(state.cursor);
  return { text, cursor: state.cursor + value.length };
}
function backspace(state) {
  if (state.cursor === 0) {
    return state;
  }
  const text = state.text.slice(0, state.cursor - 1) + state.text.slice(state.cursor);
  return { text, cursor: state.cursor - 1 };
}
function deleteForward(state) {
  if (state.cursor >= state.text.length) {
    return state;
  }
  const text = state.text.slice(0, state.cursor) + state.text.slice(state.cursor + 1);
  return { text, cursor: state.cursor };
}
function moveLeft(state) {
  if (state.cursor === 0) {
    return state;
  }
  return { ...state, cursor: state.cursor - 1 };
}
function moveRight(state) {
  if (state.cursor >= state.text.length) {
    return state;
  }
  return { ...state, cursor: state.cursor + 1 };
}
function moveWordLeft(state) {
  let cursor = state.cursor;
  while (cursor > 0 && /\s/.test(state.text[cursor - 1] ?? "")) {
    cursor--;
  }
  while (cursor > 0 && !/\s/.test(state.text[cursor - 1] ?? "")) {
    cursor--;
  }
  return { ...state, cursor };
}
function moveWordRight(state) {
  let cursor = state.cursor;
  while (cursor < state.text.length && /\s/.test(state.text[cursor] ?? "")) {
    cursor++;
  }
  while (cursor < state.text.length && !/\s/.test(state.text[cursor] ?? "")) {
    cursor++;
  }
  return { ...state, cursor };
}
function moveUp(state) {
  const { line, column, lineStart } = locate(state);
  if (line === 0) {
    return { ...state, cursor: 0 };
  }
  const previousLineEnd = lineStart - 1;
  const previousLineStart = state.text.lastIndexOf("\n", previousLineEnd - 1) + 1;
  const previousLineLength = previousLineEnd - previousLineStart;
  const targetColumn = Math.min(column, previousLineLength);
  return { ...state, cursor: previousLineStart + targetColumn };
}
function moveDown(state) {
  const { column, lineEnd } = locate(state);
  if (lineEnd >= state.text.length) {
    return { ...state, cursor: state.text.length };
  }
  const nextLineStart = lineEnd + 1;
  const nextLineNewline = state.text.indexOf("\n", nextLineStart);
  const nextLineEnd = nextLineNewline === -1 ? state.text.length : nextLineNewline;
  const nextLineLength = nextLineEnd - nextLineStart;
  const targetColumn = Math.min(column, nextLineLength);
  return { ...state, cursor: nextLineStart + targetColumn };
}
function moveLineStart(state) {
  const { lineStart } = locate(state);
  return { ...state, cursor: lineStart };
}
function moveLineEnd(state) {
  const { lineEnd } = locate(state);
  return { ...state, cursor: lineEnd };
}
function killLine(state) {
  const { lineEnd } = locate(state);
  if (state.cursor >= lineEnd) {
    return state;
  }
  const text = state.text.slice(0, state.cursor) + state.text.slice(lineEnd);
  return { text, cursor: state.cursor };
}
function deleteWordBefore(state) {
  const end = state.cursor;
  let start = end;
  while (start > 0 && /\s/.test(state.text[start - 1] ?? "")) {
    start--;
  }
  while (start > 0 && !/\s/.test(state.text[start - 1] ?? "")) {
    start--;
  }
  if (start === end) {
    return state;
  }
  return {
    text: state.text.slice(0, start) + state.text.slice(end),
    cursor: start
  };
}
function deleteWordAfter(state) {
  const start = state.cursor;
  let end = start;
  while (end < state.text.length && /\s/.test(state.text[end] ?? "")) {
    end++;
  }
  while (end < state.text.length && !/\s/.test(state.text[end] ?? "")) {
    end++;
  }
  if (start === end) {
    return state;
  }
  return {
    text: state.text.slice(0, start) + state.text.slice(end),
    cursor: start
  };
}
function isEmpty(state) {
  return state.text.length === 0;
}
function getCurrentSlashToken(state) {
  const text = state.text;
  if (text.length === 0) {
    return null;
  }
  const beforeCursor = text.slice(0, state.cursor);
  const lastNewline = beforeCursor.lastIndexOf("\n");
  const lineStart = lastNewline + 1;
  const line = beforeCursor.slice(lineStart);
  if (!line.startsWith("/")) {
    return null;
  }
  if (/\s/.test(line)) {
    return null;
  }
  return line;
}
function locate(state) {
  const before = state.text.slice(0, state.cursor);
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineNumber = before.split("\n").length - 1;
  const after = state.text.slice(state.cursor);
  const nextNewline = after.indexOf("\n");
  const lineEnd = nextNewline === -1 ? state.text.length : state.cursor + nextNewline;
  return {
    line: lineNumber,
    column: state.cursor - lineStart,
    lineStart,
    lineEnd
  };
}

// src/ui/slashCommands.ts
var BUILTIN_SLASH_COMMANDS = [
  {
    kind: "skills",
    name: "skills",
    label: "/skills",
    description: "List available skills"
  },
  {
    kind: "model",
    name: "model",
    label: "/model",
    description: "Select model, thinking mode and thinking effort"
  },
  {
    kind: "new",
    name: "new",
    label: "/new",
    description: "Start a fresh conversation"
  },
  {
    kind: "init",
    name: "init",
    label: "/init",
    description: "Initialize an AGENTS.md file with instructions for LLM"
  },
  {
    kind: "resume",
    name: "resume",
    label: "/resume",
    description: "Pick a previous conversation to continue"
  },
  {
    kind: "exit",
    name: "exit",
    label: "/exit",
    description: "Quit Deep Code CLI"
  }
];
function buildSlashCommands(skills) {
  const skillItems = skills.map((skill) => ({
    kind: "skill",
    name: skill.name,
    label: `/${skill.name}`,
    description: skill.description || "(no description)",
    skill
  }));
  return [...skillItems, ...BUILTIN_SLASH_COMMANDS];
}
function filterSlashCommands(items, token) {
  if (!token.startsWith("/")) {
    return [];
  }
  const query = token.slice(1).toLowerCase();
  if (!query) {
    return items;
  }
  return items.filter((item) => item.name.toLowerCase().includes(query));
}
function findExactSlashCommand(items, token) {
  if (!token.startsWith("/")) {
    return null;
  }
  const query = token.slice(1);
  const matches = items.filter((item) => item.name === query);
  return matches.find((item) => item.kind !== "skill") ?? matches[0] ?? null;
}
function formatSlashCommandDescription(description) {
  return (description || "(no description)").trim().replace(/\s+/g, " ");
}
function formatSlashCommandLabel(item) {
  return item.kind === "skill" && item.skill?.isLoaded ? `${item.label} \u2713` : item.label;
}

// src/ui/clipboard.ts
import { spawnSync, execSync as execSync2 } from "child_process";
import * as fs11 from "fs";
import * as os7 from "os";
import * as path10 from "path";
var PNG_MIME = "image/png";
var IMAGE_MIME_BY_EXT = /* @__PURE__ */ new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"]
]);
function bufferToDataUrl(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
function isImageFilePath(value) {
  return IMAGE_MIME_BY_EXT.has(path10.extname(value.trim()).toLowerCase());
}
function mimeTypeForPath(value) {
  return IMAGE_MIME_BY_EXT.get(path10.extname(value.trim()).toLowerCase()) ?? PNG_MIME;
}
function tryRun(command, args2) {
  try {
    const result = spawnSync(command, args2, { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
      return null;
    }
    return result.stdout;
  } catch {
    return null;
  }
}
function readImageFile(filePath) {
  try {
    if (!isImageFilePath(filePath)) {
      return null;
    }
    const buffer = fs11.readFileSync(filePath);
    if (buffer.length === 0) {
      return null;
    }
    const mimeType = mimeTypeForPath(filePath);
    return { dataUrl: bufferToDataUrl(buffer, mimeType), mimeType };
  } catch {
    return null;
  }
}
function parseOsascriptHexData(output, format) {
  const prefix = `\xABdata ${format}`;
  const idx = output.indexOf(prefix);
  if (idx === -1) return null;
  const hexStart = idx + prefix.length;
  const hexEnd = output.indexOf("\xBB", hexStart);
  if (hexEnd === -1) return null;
  let hexStr = output.slice(hexStart, hexEnd).trim();
  if (hexStr.length === 0) return null;
  if (hexStr.length % 2 !== 0) {
    hexStr = "0" + hexStr;
  }
  try {
    return Buffer.from(hexStr, "hex");
  } catch {
    return null;
  }
}
function readMacClipboardImage() {
  const pngpaste = tryRun("pngpaste", ["-"]);
  if (pngpaste && pngpaste.length > 0) {
    return { dataUrl: bufferToDataUrl(pngpaste, PNG_MIME), mimeType: PNG_MIME };
  }
  const pngOutput = tryRun("osascript", ["-e", "the clipboard as \xABclass PNGf\xBB"]);
  if (pngOutput) {
    const pngBuffer = parseOsascriptHexData(pngOutput.toString("utf8"), "PNGf");
    if (pngBuffer && pngBuffer.length > 0) {
      return { dataUrl: bufferToDataUrl(pngBuffer, PNG_MIME), mimeType: PNG_MIME };
    }
  }
  const tiffOutput = tryRun("osascript", ["-e", "the clipboard as \xABclass TIFF\xBB"]);
  if (tiffOutput) {
    const tiffBuffer = parseOsascriptHexData(tiffOutput.toString("utf8"), "TIFF");
    if (tiffBuffer && tiffBuffer.length > 0) {
      const pngBuffer = convertTiffToPng(tiffBuffer);
      if (pngBuffer) {
        return { dataUrl: bufferToDataUrl(pngBuffer, PNG_MIME), mimeType: PNG_MIME };
      }
    }
  }
  const fileUrl = tryRun("osascript", ["-e", "get POSIX path of (the clipboard as \xABclass furl\xBB)"]);
  const filePath = fileUrl?.toString("utf8").trim();
  if (filePath) {
    return readImageFile(filePath);
  }
  return null;
}
function convertTiffToPng(tiffBuffer) {
  const tempDir = fs11.mkdtempSync(path10.join(os7.tmpdir(), "deepcode-tiff-"));
  try {
    const tiffPath = path10.join(tempDir, "clipboard.tiff");
    const pngPath = path10.join(tempDir, "clipboard.png");
    fs11.writeFileSync(tiffPath, tiffBuffer);
    try {
      execSync2(`sips -s format png "${tiffPath}" --out "${pngPath}"`, {
        encoding: "buffer",
        stdio: "pipe",
        timeout: 1e4
      });
    } catch {
      return null;
    }
    if (!fs11.existsSync(pngPath)) {
      return null;
    }
    const pngBuffer = fs11.readFileSync(pngPath);
    return pngBuffer.length > 0 ? pngBuffer : null;
  } catch {
    return null;
  } finally {
    try {
      fs11.rmSync(tempDir, { recursive: true, force: true });
    } catch {
    }
  }
}
function readClipboardImage() {
  if (process.platform === "darwin") {
    return readMacClipboardImage();
  }
  if (process.platform === "linux") {
    const xclip = tryRun("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"]);
    if (xclip && xclip.length > 0) {
      return { dataUrl: bufferToDataUrl(xclip, PNG_MIME), mimeType: PNG_MIME };
    }
    const wlPaste = tryRun("wl-paste", ["--type", "image/png"]);
    if (wlPaste && wlPaste.length > 0) {
      return { dataUrl: bufferToDataUrl(wlPaste, PNG_MIME), mimeType: PNG_MIME };
    }
    return null;
  }
  if (process.platform === "win32") {
    const script = "Add-Type -AssemblyName System.Windows.Forms;$img = [System.Windows.Forms.Clipboard]::GetImage();if ($img) { $ms = New-Object System.IO.MemoryStream;$img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);[Console]::OpenStandardOutput().Write($ms.ToArray(), 0, $ms.Length); }";
    const out = tryRun("powershell", ["-NoProfile", "-Command", script]);
    if (out && out.length > 0) {
      return { dataUrl: bufferToDataUrl(out, PNG_MIME), mimeType: PNG_MIME };
    }
    return null;
  }
  return null;
}
async function readClipboardImageAsync() {
  return new Promise((resolve6, reject) => {
    setImmediate(() => {
      try {
        resolve6(readClipboardImage());
      } catch (error) {
        reject(error);
      }
    });
  });
}

// src/ui/prompt/useTerminalInput.ts
import { useEffect, useRef } from "react";
import { useStdin } from "ink";
var rawModeSetters = /* @__PURE__ */ new Set();
function acquireRawMode(setRawMode) {
  if (rawModeSetters.size === 0) {
    setRawMode(true);
  }
  rawModeSetters.add(setRawMode);
}
function releaseRawMode(setRawMode) {
  rawModeSetters.delete(setRawMode);
  if (rawModeSetters.size === 0) {
    setRawMode(false);
  }
}
var BACKSPACE_BYTES = /* @__PURE__ */ new Set(["\x7F", "\b"]);
var FORWARD_DELETE_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[3~", "\x1B[P"]);
var HOME_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[H", "\x1B[1~", "\x1B[7~", "\x1BOH"]);
var END_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[F", "\x1B[4~", "\x1B[8~", "\x1BOF"]);
var SHIFT_RETURN_SEQUENCES = /* @__PURE__ */ new Set(["\x1B\r", "\x1B[13;2u"]);
var META_RETURN_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[13;3u", "\x1B[13;4u"]);
var CTRL_LEFT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;5D", "\x1B[5D"]);
var CTRL_RIGHT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;5C", "\x1B[5C"]);
var META_LEFT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;3D", "\x1B[3D", "\x1Bb"]);
var META_RIGHT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;3C", "\x1B[3C", "\x1Bf"]);
var TERMINAL_FOCUS_IN = "\x1B[I";
var TERMINAL_FOCUS_OUT = "\x1B[O";
function parseTerminalInput(data) {
  const raw = String(data);
  let input = raw;
  const key = {
    upArrow: raw === "\x1B[A",
    downArrow: raw === "\x1B[B",
    leftArrow: raw === "\x1B[D" || CTRL_LEFT_SEQUENCES.has(raw) || META_LEFT_SEQUENCES.has(raw),
    rightArrow: raw === "\x1B[C" || CTRL_RIGHT_SEQUENCES.has(raw) || META_RIGHT_SEQUENCES.has(raw),
    home: HOME_SEQUENCES.has(raw),
    end: END_SEQUENCES.has(raw),
    pageDown: raw === "\x1B[6~",
    pageUp: raw === "\x1B[5~",
    return: raw === "\r" || SHIFT_RETURN_SEQUENCES.has(raw) || META_RETURN_SEQUENCES.has(raw),
    escape: raw === "\x1B",
    ctrl: CTRL_LEFT_SEQUENCES.has(raw) || CTRL_RIGHT_SEQUENCES.has(raw),
    shift: SHIFT_RETURN_SEQUENCES.has(raw),
    tab: raw === "	" || raw === "\x1B[Z",
    backspace: BACKSPACE_BYTES.has(raw),
    delete: FORWARD_DELETE_SEQUENCES.has(raw),
    meta: META_LEFT_SEQUENCES.has(raw) || META_RIGHT_SEQUENCES.has(raw) || META_RETURN_SEQUENCES.has(raw),
    focusIn: raw === TERMINAL_FOCUS_IN,
    focusOut: raw === TERMINAL_FOCUS_OUT
  };
  if (input <= "" && !key.return) {
    input = String.fromCharCode(input.charCodeAt(0) + "a".charCodeAt(0) - 1);
    key.ctrl = true;
  }
  const isKnownEscapeSequence = key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || key.home || key.end || key.pageDown || key.pageUp || key.tab || key.delete || key.return || key.ctrl || key.meta || key.focusIn || key.focusOut;
  if (raw.startsWith("\x1B")) {
    input = raw.slice(1);
    key.meta = key.meta || !isKnownEscapeSequence;
  }
  const isLatinUppercase = input >= "A" && input <= "Z";
  const isCyrillicUppercase = input >= "\u0410" && input <= "\u042F";
  if (input.length === 1 && (isLatinUppercase || isCyrillicUppercase)) {
    key.shift = true;
  }
  if (key.tab && input === "[Z") {
    key.shift = true;
  }
  if (key.tab || key.backspace || key.delete) {
    input = "";
  }
  return { input, key };
}
function useTerminalInput(inputHandler, options = {}) {
  const { setRawMode, internal_eventEmitter } = useStdin();
  const isActive = options.isActive ?? true;
  const handlerRef = useRef(inputHandler);
  handlerRef.current = inputHandler;
  useEffect(() => {
    if (!isActive) {
      return;
    }
    acquireRawMode(setRawMode);
    return () => {
      releaseRawMode(setRawMode);
    };
  }, [isActive, setRawMode]);
  useEffect(() => {
    if (!isActive) {
      return;
    }
    const handleData = (data) => {
      const { input, key } = parseTerminalInput(data);
      handlerRef.current(input, key);
    };
    internal_eventEmitter?.on("input", handleData);
    return () => {
      internal_eventEmitter?.removeListener("input", handleData);
    };
  }, [isActive, internal_eventEmitter]);
}

// src/ui/prompt/cursor.ts
import { useLayoutEffect, useEffect as useEffect2, useRef as useRef2, useState, useCallback } from "react";
function cursorUp(rows) {
  return rows > 0 ? `\x1B[${rows}A` : "";
}
function cursorDown(rows) {
  return rows > 0 ? `\x1B[${rows}B` : "";
}
function cursorForward(columns) {
  return columns > 0 ? `\x1B[${columns}C` : "";
}
function showCursor() {
  return "\x1B[?25h";
}
function hideCursor() {
  return "\x1B[?25l";
}
function enableTerminalFocusReporting() {
  return "\x1B[?1004h";
}
function disableTerminalFocusReporting() {
  return "\x1B[?1004l";
}
function getPromptCursorPlacement(state, screenWidth, prefixWidth, footerText) {
  const width = Math.max(1, screenWidth);
  const cursor = Math.max(0, Math.min(state.cursor, state.text.length));
  const beforeCursor = state.text.slice(0, cursor);
  const at = state.text[cursor];
  const displayText = beforeCursor + (typeof at === "undefined" || at === "\n" ? " " : at) + (at === "\n" ? "\n" : "") + (typeof at === "undefined" ? "" : state.text.slice(cursor + 1));
  const cursorPosition = measureTextPosition(beforeCursor, width, prefixWidth);
  const promptRows = measureTextRows(displayText, width, prefixWidth);
  const footerRows = 1 + measureTextRows(footerText, width, 0);
  return {
    rowsUp: promptRows - 1 - cursorPosition.row + footerRows + 1,
    column: cursorPosition.column
  };
}
function measureTextRows(text, width, initialColumn) {
  return measureTextPosition(text, width, initialColumn).row + 1;
}
function measureTextPosition(text, width, initialColumn) {
  let row = 0;
  let column = Math.min(initialColumn, width - 1);
  for (const char of Array.from(text)) {
    if (char === "\n") {
      row++;
      column = Math.min(initialColumn, width - 1);
      continue;
    }
    const charColumns = textWidth(char);
    if (column + charColumns > width) {
      row++;
      column = Math.min(initialColumn, width - 1);
    }
    column += charColumns;
    if (column >= width) {
      row++;
      column = Math.min(initialColumn, width - 1);
    }
  }
  return { row, column };
}
function textWidth(value) {
  let width = 0;
  for (const char of Array.from(value.normalize())) {
    width += characterWidth(char);
  }
  return width;
}
function characterWidth(char) {
  const codePoint = char.codePointAt(0) ?? 0;
  if (codePoint === 0 || codePoint < 32 || codePoint >= 127 && codePoint < 160) {
    return 0;
  }
  if (codePoint >= 768 && codePoint <= 879) {
    return 0;
  }
  if (codePoint >= 4352 && codePoint <= 4447 || codePoint >= 11904 && codePoint <= 42191 || codePoint >= 44032 && codePoint <= 55203 || codePoint >= 63744 && codePoint <= 64255 || codePoint >= 65040 && codePoint <= 65049 || codePoint >= 65072 && codePoint <= 65135 || codePoint >= 65280 && codePoint <= 65376 || codePoint >= 65504 && codePoint <= 65510) {
    return 2;
  }
  return 1;
}
function useTerminalFocusReporting(stdout, isActive) {
  useLayoutEffect(() => {
    if (!isActive || !stdout?.isTTY) {
      return;
    }
    stdout.write(enableTerminalFocusReporting());
    return () => {
      stdout.write(disableTerminalFocusReporting());
    };
  }, [isActive, stdout]);
}
function useFocusState(stdout) {
  const [hasFocus, setHasFocus] = useState(true);
  const timeoutRef = useRef2(null);
  const stdoutRef = useRef2(stdout);
  stdoutRef.current = stdout;
  const handleFocusEvent = useCallback((focused) => {
    setHasFocus(focused);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!focused) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const s = stdoutRef.current;
        if (s?.isTTY) {
          s.write(disableTerminalFocusReporting());
          s.write(enableTerminalFocusReporting());
        }
      }, 5e3);
    }
  }, []);
  const resetFocus = useCallback(() => {
    setHasFocus(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  useEffect2(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  return { hasFocus, handleFocusEvent, resetFocus };
}
function useTerminalCursor(stdout, isActive, placement) {
  useTerminalFocusReporting(stdout, isActive);
  const { hasFocus, handleFocusEvent, resetFocus } = useFocusState(stdout);
  const directWriteRef = useRef2(null);
  const activePlacementRef = useRef2(null);
  const lastPlacementRef = useRef2(null);
  const unmountingRef = useRef2(false);
  useLayoutEffect(() => {
    if (!stdout?.isTTY) {
      return;
    }
    const stream = stdout;
    const originalWrite = stream.write;
    const directWrite = (data) => {
      originalWrite.call(stdout, data);
    };
    const restorePromptCursor = () => {
      if (unmountingRef.current) {
        return;
      }
      const activePlacement = activePlacementRef.current;
      if (!activePlacement) {
        return;
      }
      directWrite("\r" + cursorDown(activePlacement.rowsUp) + hideCursor());
      activePlacementRef.current = null;
      Promise.resolve().then(() => {
        if (unmountingRef.current || activePlacementRef.current) {
          return;
        }
        const latest = directWriteRef.current;
        const p = lastPlacementRef.current;
        if (latest && p) {
          latest(showCursor() + cursorUp(p.rowsUp) + "\r" + cursorForward(p.column));
          activePlacementRef.current = p;
        }
      });
    };
    const patchedWrite = (...args2) => {
      restorePromptCursor();
      return originalWrite.apply(stdout, args2);
    };
    directWriteRef.current = directWrite;
    stream.write = patchedWrite;
    return () => {
      restorePromptCursor();
      stream.write = originalWrite;
      directWriteRef.current = null;
    };
  }, [stdout]);
  useLayoutEffect(() => {
    if (!isActive || !stdout?.isTTY) {
      return;
    }
    unmountingRef.current = false;
    const directWrite = directWriteRef.current;
    if (!directWrite) {
      return;
    }
    if (placement) {
      directWrite(showCursor() + cursorUp(placement.rowsUp) + "\r" + cursorForward(placement.column));
      activePlacementRef.current = placement;
      lastPlacementRef.current = placement;
    } else {
      directWrite(hideCursor());
      activePlacementRef.current = null;
      lastPlacementRef.current = null;
    }
    return () => {
      unmountingRef.current = true;
      lastPlacementRef.current = null;
      const activePlacement = activePlacementRef.current;
      if (!activePlacement) {
        return;
      }
      directWrite("\r" + cursorDown(activePlacement.rowsUp) + hideCursor());
      activePlacementRef.current = null;
    };
  }, [isActive, placement?.column, placement?.rowsUp, stdout]);
  return { hasFocus, handleFocusEvent, resetFocus };
}

// src/ui/SlashCommandMenu.tsx
import React from "react";
import { Box, Text } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
var SlashCommandMenu = React.memo(function SlashCommandMenu2({
  items,
  activeIndex,
  maxVisible = 6,
  width
}) {
  const labelColumnWidth = React.useMemo(() => {
    if (items.length === 0) {
      return 0;
    }
    const longestLabel = Math.max(...items.map((s) => s.label.length));
    const contentWidth = longestLabel + 2;
    const maxAllowed = Math.max(10, width - 2 >> 1);
    return Math.min(contentWidth, maxAllowed);
  }, [items, width]);
  if (items.length === 0) {
    return null;
  }
  const visibleStart = Math.min(
    Math.max(0, activeIndex - Math.floor((maxVisible - 1) / 2)),
    Math.max(0, items.length - maxVisible)
  );
  const visibleItems = items.slice(visibleStart, visibleStart + maxVisible);
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 1, width, children: [
    visibleStart > 0 ? /* @__PURE__ */ jsx(Box, { marginLeft: 2, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u25B2" }) }) : null,
    visibleItems.map((item, idx) => {
      const actualIndex = visibleStart + idx;
      return /* @__PURE__ */ jsxs(Box, { gap: 2, flexDirection: "row", flexGrow: 1, children: [
        /* @__PURE__ */ jsx(Box, { width: labelColumnWidth, flexShrink: 0, children: /* @__PURE__ */ jsxs(Text, { color: actualIndex === activeIndex ? "#229ac3" : void 0, wrap: "truncate-end", children: [
          actualIndex === activeIndex ? "\u203A " : "  ",
          /* @__PURE__ */ jsx(Text, { bold: true, children: formatSlashCommandLabel(item) })
        ] }) }),
        /* @__PURE__ */ jsx(Box, { flexGrow: 1, children: /* @__PURE__ */ jsx(Text, { color: actualIndex === activeIndex ? "#229ac3" : void 0, wrap: "truncate-end", dimColor: true, children: formatSlashCommandDescription(item.description) }) })
      ] }, item.label);
    }),
    /* @__PURE__ */ jsxs(Box, { marginLeft: 2, flexDirection: "column", children: [
      visibleStart + visibleItems.length < items.length ? /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u25BC" }) : null,
      /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "(",
        activeIndex + 1,
        "/",
        items.length,
        ") \u2191\u2193 to navigate \xB7 Enter to select"
      ] })
    ] })
  ] });
});
var SlashCommandMenu_default = SlashCommandMenu;

// src/ui/PromptInput.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var SPINNER_FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var PROMPT_PREFIX_WIDTH = 2;
var MODEL_COMMAND_MODELS = ["deepseek-v4-pro", "deepseek-v4-flash"];
var MODEL_COMMAND_THINKING_OPTIONS = [
  { label: "Thinking mode [max]", thinkingEnabled: true, reasoningEffort: "max" },
  { label: "Thinking mode [high]", thinkingEnabled: true, reasoningEffort: "high" },
  { label: "No thinking", thinkingEnabled: false }
];
var PromptPrefixLine = React2.memo(function PromptPrefixLine2({ busy }) {
  const [spinnerIndex, setSpinnerIndex] = useState2(0);
  useEffect3(() => {
    if (!busy) {
      setSpinnerIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setSpinnerIndex((index) => (index + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, [busy]);
  const prefix = busy ? `${SPINNER_FRAMES[spinnerIndex]} ` : "> ";
  return /* @__PURE__ */ jsx2(Text2, { color: busy ? "yellow" : "green", children: prefix });
});
var PromptInput = React2.memo(function PromptInput2({
  skills,
  modelConfig,
  screenWidth,
  promptHistory,
  busy,
  loadingText,
  disabled,
  placeholder,
  onSubmit,
  onModelConfigChange,
  onInterrupt
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [buffer, setBuffer] = useState2(EMPTY_BUFFER);
  const [imageUrls, setImageUrls] = useState2([]);
  const [selectedSkills, setSelectedSkills] = useState2([]);
  const [statusMessage, setStatusMessage] = useState2(null);
  const [pendingExit, setPendingExit] = useState2(false);
  const [menuIndex, setMenuIndex] = useState2(0);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState2(false);
  const [skillsDropdownIndex, setSkillsDropdownIndex] = useState2(0);
  const [modelDropdownStep, setModelDropdownStep] = useState2(null);
  const [modelDropdownIndex, setModelDropdownIndex] = useState2(0);
  const [pendingModel, setPendingModel] = useState2(null);
  const [historyCursor, setHistoryCursor] = useState2(-1);
  const [draftBeforeHistory, setDraftBeforeHistory] = useState2(null);
  const lastCtrlDAt = React2.useRef(0);
  const slashItems = React2.useMemo(() => buildSlashCommands(skills), [skills]);
  const slashToken = getCurrentSlashToken(buffer);
  const slashMenu = React2.useMemo(
    () => showSkillsDropdown || modelDropdownStep ? [] : slashToken ? filterSlashCommands(slashItems, slashToken) : [],
    [showSkillsDropdown, modelDropdownStep, slashToken, slashItems]
  );
  const showMenu = slashMenu.length > 0;
  const promptHistoryKey = React2.useMemo(() => promptHistory.join("\0"), [promptHistory]);
  const footerText = statusMessage ? statusMessage : busy ? loadingText && loadingText.trim() ? loadingText : "esc to interrupt \xB7 ctrl+c to cancel input" : "enter send \xB7 shift+enter newline \xB7 ctrl+v image \xB7 / commands \xB7 ctrl+d exit";
  const cursorPlacement = React2.useMemo(() => {
    if (!showMenu && !showSkillsDropdown) {
      return getPromptCursorPlacement(buffer, screenWidth, PROMPT_PREFIX_WIDTH, footerText);
    }
    return null;
  }, [buffer, screenWidth, footerText, showMenu, showSkillsDropdown]);
  const { hasFocus, handleFocusEvent, resetFocus } = useTerminalCursor(stdout, !disabled, cursorPlacement);
  useEffect3(() => {
    if (!busy) {
      resetFocus();
    }
  }, [busy, resetFocus]);
  useEffect3(() => {
    if (!showMenu) {
      setMenuIndex(0);
      return;
    }
    if (menuIndex >= slashMenu.length) {
      setMenuIndex(slashMenu.length - 1);
    }
  }, [slashMenu, showMenu, menuIndex]);
  useEffect3(() => {
    if (skillsDropdownIndex >= skills.length) {
      setSkillsDropdownIndex(Math.max(0, skills.length - 1));
    }
  }, [skills.length, skillsDropdownIndex]);
  useEffect3(() => {
    if (!modelDropdownStep) {
      return;
    }
    const optionCount = modelDropdownStep === "model" ? MODEL_COMMAND_MODELS.length : MODEL_COMMAND_THINKING_OPTIONS.length;
    if (modelDropdownIndex >= optionCount) {
      setModelDropdownIndex(Math.max(0, optionCount - 1));
    }
  }, [modelDropdownIndex, modelDropdownStep]);
  useEffect3(() => {
    if (!statusMessage) {
      return;
    }
    const timer = setTimeout(() => setStatusMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);
  useEffect3(() => {
    setHistoryCursor(-1);
    setDraftBeforeHistory(null);
  }, [promptHistoryKey]);
  useTerminalInput(
    (input, key) => {
      if (key.focusIn) {
        handleFocusEvent(true);
        return;
      }
      if (key.focusOut) {
        handleFocusEvent(false);
        return;
      }
      if (disabled) {
        return;
      }
      if (key.escape) {
        if (modelDropdownStep) {
          closeModelDropdown();
          return;
        }
        if (showSkillsDropdown) {
          setShowSkillsDropdown(false);
          return;
        }
        if (busy) {
          onInterrupt();
          setStatusMessage("Interrupting\u2026");
        }
        return;
      }
      if (key.ctrl && (input === "d" || input === "D")) {
        if (!isEmpty(buffer)) {
          updateBuffer((s) => deleteForward(s));
          return;
        }
        const now = Date.now();
        if (pendingExit && now - lastCtrlDAt.current < 2e3) {
          exit();
          return;
        }
        lastCtrlDAt.current = now;
        setPendingExit(true);
        setStatusMessage("press ctrl+d again to exit");
        return;
      }
      if (key.ctrl && (input === "c" || input === "C")) {
        if (busy) {
          onInterrupt();
          setStatusMessage("Interrupting\u2026");
        } else if (!isEmpty(buffer)) {
          setBuffer(EMPTY_BUFFER);
        } else {
          setStatusMessage("press ctrl+d to exit");
        }
        return;
      }
      if (pendingExit && (!key.ctrl || input !== "d" && input !== "D")) {
        setPendingExit(false);
      }
      if (historyCursor !== -1 && !key.upArrow && !key.downArrow) {
        exitHistoryBrowsing();
      }
      if (showSkillsDropdown) {
        if (skills.length === 0) {
          setShowSkillsDropdown(false);
        } else {
          if (key.upArrow) {
            setSkillsDropdownIndex((idx) => (idx - 1 + skills.length) % skills.length);
            return;
          }
          if (key.downArrow) {
            setSkillsDropdownIndex((idx) => (idx + 1) % skills.length);
            return;
          }
          if (input === " " && !key.ctrl && !key.meta || key.return && !key.shift && !key.meta) {
            const skill = skills[skillsDropdownIndex];
            if (skill) {
              toggleSelectedSkill(skill);
            }
            return;
          }
          if (key.tab) {
            setShowSkillsDropdown(false);
            return;
          }
        }
      }
      if (modelDropdownStep) {
        const optionCount = modelDropdownStep === "model" ? MODEL_COMMAND_MODELS.length : MODEL_COMMAND_THINKING_OPTIONS.length;
        if (key.upArrow) {
          setModelDropdownIndex((idx) => (idx - 1 + optionCount) % optionCount);
          return;
        }
        if (key.downArrow) {
          setModelDropdownIndex((idx) => (idx + 1) % optionCount);
          return;
        }
        if (input === " " && !key.ctrl && !key.meta || key.return && !key.shift && !key.meta) {
          selectModelDropdownItem();
          return;
        }
        if (key.tab) {
          closeModelDropdown();
          return;
        }
      }
      if (key.ctrl && (input === "v" || input === "V")) {
        setStatusMessage("Reading clipboard...");
        readClipboardImageAsync().then((image) => {
          if (image) {
            setImageUrls((prev) => [...prev, image.dataUrl]);
            setStatusMessage("Attached image from clipboard");
          } else {
            setStatusMessage("No image found in clipboard");
          }
        }).catch(() => {
          setStatusMessage("Failed to read clipboard");
        });
        return;
      }
      if (isClearImageAttachmentsShortcut(input, key)) {
        if (imageUrls.length > 0) {
          setImageUrls([]);
          setStatusMessage("Cleared attached images");
        } else {
          setStatusMessage("No attached images to clear");
        }
        return;
      }
      const noModifier = !key.shift && !key.ctrl && !key.meta;
      const isPlainReturn = key.return && !key.shift && !key.meta;
      if (showMenu) {
        if (key.upArrow) {
          setMenuIndex((idx) => (idx - 1 + slashMenu.length) % slashMenu.length);
          return;
        }
        if (key.downArrow) {
          setMenuIndex((idx) => (idx + 1) % slashMenu.length);
          return;
        }
        if (key.tab || key.return && !key.shift && !key.meta) {
          const selected = slashMenu[menuIndex];
          if (selected) {
            handleSlashSelection(selected);
            return;
          }
        }
      }
      if (busy && isPlainReturn) {
        setStatusMessage("wait for the current response or press esc to interrupt");
        return;
      }
      if (key.return) {
        const isShiftEnter = key.shift || key.meta;
        if (isShiftEnter) {
          updateBuffer((s) => insertText(s, "\n"));
          return;
        }
        submitCurrentBuffer();
        return;
      }
      if (key.delete) {
        updateBuffer((s) => deleteForward(s));
        return;
      }
      if (key.backspace) {
        updateBuffer((s) => backspace(s));
        return;
      }
      if ((key.ctrl || key.meta) && key.leftArrow) {
        updateBuffer((s) => moveWordLeft(s));
        return;
      }
      if ((key.ctrl || key.meta) && key.rightArrow) {
        updateBuffer((s) => moveWordRight(s));
        return;
      }
      if (key.leftArrow) {
        updateBuffer((s) => moveLeft(s));
        return;
      }
      if (key.rightArrow) {
        updateBuffer((s) => moveRight(s));
        return;
      }
      if (key.home) {
        updateBuffer((s) => moveLineStart(s));
        return;
      }
      if (key.end) {
        updateBuffer((s) => moveLineEnd(s));
        return;
      }
      if (key.upArrow) {
        if (noModifier && (historyCursor !== -1 || buffer.cursor === 0) && promptHistory.length > 0) {
          navigateHistory(-1);
          return;
        }
        updateBuffer((s) => moveUp(s));
        return;
      }
      if (key.downArrow) {
        if (noModifier && (historyCursor !== -1 || buffer.cursor === buffer.text.length)) {
          navigateHistory(1);
          return;
        }
        updateBuffer((s) => moveDown(s));
        return;
      }
      if (key.ctrl && (input === "p" || input === "P")) {
        navigateHistory(-1);
        return;
      }
      if (key.ctrl && (input === "n" || input === "N")) {
        navigateHistory(1);
        return;
      }
      if (key.ctrl && (input === "a" || input === "A")) {
        updateBuffer((s) => moveLineStart(s));
        return;
      }
      if (key.ctrl && (input === "e" || input === "E")) {
        updateBuffer((s) => moveLineEnd(s));
        return;
      }
      if (key.ctrl && (input === "b" || input === "B")) {
        updateBuffer((s) => moveLeft(s));
        return;
      }
      if (key.ctrl && (input === "f" || input === "F")) {
        updateBuffer((s) => moveRight(s));
        return;
      }
      if (key.meta && (input === "b" || input === "B")) {
        updateBuffer((s) => moveWordLeft(s));
        return;
      }
      if (key.meta && (input === "f" || input === "F")) {
        updateBuffer((s) => moveWordRight(s));
        return;
      }
      if (key.ctrl && (input === "k" || input === "K")) {
        updateBuffer((s) => killLine(s));
        return;
      }
      if (key.ctrl && (input === "u" || input === "U")) {
        updateBuffer(() => EMPTY_BUFFER);
        return;
      }
      if (key.ctrl && (input === "w" || input === "W")) {
        updateBuffer((s) => deleteWordBefore(s));
        return;
      }
      if (key.meta && (input === "d" || input === "D")) {
        updateBuffer((s) => deleteWordAfter(s));
        return;
      }
      if (key.meta && (input === "\x7F" || input === "\b")) {
        updateBuffer((s) => deleteWordBefore(s));
        return;
      }
      if (key.ctrl && (input === "j" || input === "J")) {
        updateBuffer((s) => insertText(s, "\n"));
        return;
      }
      if (input.startsWith("\x1B")) {
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        const sanitized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        updateBuffer((s) => insertText(s, sanitized));
      }
    },
    { isActive: !disabled }
  );
  function exitHistoryBrowsing() {
    setHistoryCursor(-1);
    setDraftBeforeHistory(null);
  }
  function updateBuffer(updater) {
    exitHistoryBrowsing();
    setBuffer(updater);
  }
  function navigateHistory(direction) {
    if (promptHistory.length === 0) {
      return;
    }
    const previousCursor = historyCursor === -1 ? promptHistory.length : historyCursor;
    const nextCursor = Math.max(0, Math.min(promptHistory.length, previousCursor + direction));
    const draft = historyCursor === -1 ? buffer.text : draftBeforeHistory;
    if (historyCursor === -1) {
      setDraftBeforeHistory(buffer.text);
    }
    if (nextCursor === promptHistory.length) {
      const text2 = draft ?? "";
      setBuffer({ text: text2, cursor: text2.length });
      setHistoryCursor(-1);
      setDraftBeforeHistory(null);
      return;
    }
    const text = promptHistory[nextCursor] ?? "";
    setBuffer({ text, cursor: text.length });
    setHistoryCursor(nextCursor);
  }
  function handleSlashSelection(item) {
    if (busy && item.kind !== "exit") {
      setStatusMessage("wait for the current response or press esc to interrupt");
      return;
    }
    if (item.kind === "skill" && item.skill) {
      addSelectedSkill(item.skill);
      clearSlashToken();
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "skills") {
      clearSlashToken();
      setShowSkillsDropdown(true);
      return;
    }
    if (item.kind === "model") {
      clearSlashToken();
      openModelDropdown();
      return;
    }
    if (item.kind === "new") {
      onSubmit({ text: "", imageUrls: [], command: "new" });
      setBuffer(EMPTY_BUFFER);
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "init") {
      onSubmit(buildInitPromptSubmission(selectedSkills));
      setBuffer(EMPTY_BUFFER);
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "resume") {
      onSubmit({ text: "", imageUrls: [], command: "resume" });
      setBuffer(EMPTY_BUFFER);
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "exit") {
      onSubmit({ text: "/exit", imageUrls: [], command: "exit" });
      setBuffer(EMPTY_BUFFER);
      return;
    }
  }
  function submitCurrentBuffer() {
    if (busy) {
      setStatusMessage("wait for the current response or press esc to interrupt");
      return;
    }
    const trimmed = buffer.text.trim();
    if (!trimmed && imageUrls.length === 0 && selectedSkills.length === 0) {
      return;
    }
    if (trimmed.startsWith("/")) {
      const exactMatch = findExactSlashCommand(slashItems, trimmed.split(/\s+/, 1)[0]);
      if (exactMatch) {
        handleSlashSelection(exactMatch);
        return;
      }
    }
    onSubmit({
      text: buffer.text,
      imageUrls,
      selectedSkills
    });
    setBuffer(EMPTY_BUFFER);
    setImageUrls([]);
    setSelectedSkills([]);
    setShowSkillsDropdown(false);
  }
  function addSelectedSkill(skill) {
    setSelectedSkills((prev) => addUniqueSkill(prev, skill));
  }
  function toggleSelectedSkill(skill) {
    setSelectedSkills((prev) => toggleSkillSelection(prev, skill));
  }
  function clearSlashToken() {
    exitHistoryBrowsing();
    setBuffer((state) => removeCurrentSlashToken(state));
  }
  function openModelDropdown() {
    const currentModelIndex = MODEL_COMMAND_MODELS.findIndex((model) => model === modelConfig.model);
    setPendingModel(null);
    setModelDropdownStep("model");
    setModelDropdownIndex(currentModelIndex >= 0 ? currentModelIndex : 0);
    setShowSkillsDropdown(false);
  }
  function closeModelDropdown() {
    setModelDropdownStep(null);
    setPendingModel(null);
  }
  function selectModelDropdownItem() {
    if (modelDropdownStep === "model") {
      const model = MODEL_COMMAND_MODELS[modelDropdownIndex] ?? modelConfig.model;
      setPendingModel(model);
      setModelDropdownStep("thinking");
      setModelDropdownIndex(getThinkingOptionIndex(modelConfig));
      return;
    }
    const option = MODEL_COMMAND_THINKING_OPTIONS[modelDropdownIndex] ?? MODEL_COMMAND_THINKING_OPTIONS[0];
    const selection = {
      model: pendingModel ?? modelConfig.model,
      thinkingEnabled: option.thinkingEnabled,
      reasoningEffort: option.reasoningEffort ?? modelConfig.reasoningEffort
    };
    closeModelDropdown();
    Promise.resolve(onModelConfigChange(selection)).then((message) => {
      if (message) {
        setStatusMessage(message);
      }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Failed to update model settings: ${message}`);
    });
  }
  const visibleSkillStart = Math.min(Math.max(0, skillsDropdownIndex - 7), Math.max(0, skills.length - 8));
  const visibleSkills = skills.slice(visibleSkillStart, visibleSkillStart + 8);
  const modelDropdownItems = modelDropdownStep === "model" ? MODEL_COMMAND_MODELS.map((model) => ({
    label: model,
    selected: model === (pendingModel ?? modelConfig.model),
    description: model === modelConfig.model ? "current model" : ""
  })) : MODEL_COMMAND_THINKING_OPTIONS.map((option) => ({
    label: option.label,
    selected: getThinkingOptionIndex(modelConfig) === MODEL_COMMAND_THINKING_OPTIONS.indexOf(option),
    description: option.thinkingEnabled ? `reasoningEffort: ${option.reasoningEffort}` : "thinking disabled"
  }));
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", width: screenWidth, children: [
    imageUrls.length > 0 ? /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", borderStyle: "round", borderColor: "magenta", paddingX: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { color: "magentaBright", bold: true, children: "\u{1F5BC} Image Attached" }),
      /* @__PURE__ */ jsx2(Text2, { color: "magenta", children: `${imageUrls.length} image${imageUrls.length === 1 ? "" : "s"} pasted` }),
      /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: IMAGE_ATTACHMENT_CLEAR_HINT })
    ] }) : null,
    selectedSkills.length > 0 ? /* @__PURE__ */ jsxs2(Box2, { children: [
      /* @__PURE__ */ jsx2(Text2, { color: "magenta", wrap: "truncate-end", children: formatSelectedSkillsStatus(selectedSkills) }),
      /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: " (use /skills to edit)" })
    ] }) : null,
    /* @__PURE__ */ jsxs2(
      Box2,
      {
        borderStyle: "single",
        borderTop: true,
        borderBottom: true,
        borderLeft: false,
        borderRight: false,
        borderDimColor: true,
        children: [
          /* @__PURE__ */ jsx2(PromptPrefixLine, { busy }),
          /* @__PURE__ */ jsx2(Text2, { children: renderBufferWithCursor(buffer, !disabled && hasFocus, placeholder) })
        ]
      }
    ),
    showSkillsDropdown ? /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { color: "magenta", bold: true, children: "Select Skills" }),
      skills.length === 0 ? /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: "No skills found" }) : visibleSkills.map((skill, idx) => {
        const skillIndex = visibleSkillStart + idx;
        const selected = isSkillSelected(selectedSkills, skill);
        const active = skillIndex === skillsDropdownIndex;
        return /* @__PURE__ */ jsxs2(Text2, { color: active ? "cyanBright" : void 0, wrap: "truncate-end", children: [
          active ? "\u203A " : "  ",
          selected ? "\u25CF" : "\u25CB",
          " ",
          /* @__PURE__ */ jsx2(Text2, { bold: true, children: skill.name }),
          skill.isLoaded ? /* @__PURE__ */ jsx2(Text2, { color: "green", children: " \u2713" }) : null,
          /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: `  ${skill.path}` })
        ] }, skill.path || skill.name);
      }),
      visibleSkillStart > 0 ? /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
        "\u2026 ",
        visibleSkillStart,
        " above"
      ] }) : null,
      visibleSkillStart + visibleSkills.length < skills.length ? /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
        "\u2026 ",
        skills.length - visibleSkillStart - visibleSkills.length,
        " more"
      ] }) : null,
      /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: "space toggle \xB7 enter toggle \xB7 esc to close" })
    ] }) : null,
    modelDropdownStep ? /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { color: "magenta", bold: true, children: modelDropdownStep === "model" ? "Select Model" : "Select Thinking Mode" }),
      modelDropdownItems.map((item, idx) => {
        const active = idx === modelDropdownIndex;
        return /* @__PURE__ */ jsxs2(Text2, { color: active ? "cyanBright" : void 0, wrap: "truncate-end", children: [
          active ? "\u203A " : "  ",
          item.selected ? "\u25CF" : "\u25CB",
          " ",
          /* @__PURE__ */ jsx2(Text2, { bold: true, children: item.label }),
          item.description ? /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: `  ${item.description}` }) : null
        ] }, item.label);
      }),
      /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: modelDropdownStep === "model" ? "space/enter select model \xB7 esc to cancel" : "space/enter apply \xB7 esc to cancel" })
    ] }) : null,
    /* @__PURE__ */ jsx2(SlashCommandMenu_default, { width: screenWidth, items: slashMenu, activeIndex: menuIndex }),
    !showMenu && /* @__PURE__ */ jsx2(Box2, { children: /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: footerText }) })
  ] });
});
var IMAGE_ATTACHMENT_CLEAR_HINT = "Ctrl+X to clear";
function formatSelectedSkillsStatus(skills) {
  const names = skills.map((skill) => skill.name).filter(Boolean);
  if (names.length === 0) {
    return "";
  }
  return `\u26A1 ${names.join(", ")}`;
}
function isSkillSelected(skills, skill) {
  return skills.some((item) => item.name === skill.name);
}
function addUniqueSkill(skills, skill) {
  if (isSkillSelected(skills, skill)) {
    return skills;
  }
  return [...skills, skill];
}
function toggleSkillSelection(skills, skill) {
  return isSkillSelected(skills, skill) ? skills.filter((item) => item.name !== skill.name) : [...skills, skill];
}
function buildInitPromptSubmission(selectedSkills) {
  return {
    text: "/init",
    imageUrls: [],
    selectedSkills: selectedSkills.length > 0 ? selectedSkills : void 0
  };
}
function getThinkingOptionIndex(config) {
  const index = MODEL_COMMAND_THINKING_OPTIONS.findIndex((option) => {
    if (!config.thinkingEnabled) {
      return !option.thinkingEnabled;
    }
    return option.thinkingEnabled && option.reasoningEffort === config.reasoningEffort;
  });
  return index >= 0 ? index : 0;
}
function removeCurrentSlashToken(state) {
  let start = state.cursor;
  while (start > 0 && !/\s/.test(state.text[start - 1] ?? "")) {
    start -= 1;
  }
  const token = state.text.slice(start, state.cursor);
  if (!token.startsWith("/")) {
    return state;
  }
  const text = `${state.text.slice(0, start)}${state.text.slice(state.cursor)}`;
  return { text, cursor: start };
}
function isClearImageAttachmentsShortcut(input, key) {
  return key.ctrl && (input === "x" || input === "X");
}
function renderBufferWithCursor(state, isFocused, placeholder) {
  const text = state.text || "";
  const cursor = Math.max(0, Math.min(state.cursor, text.length));
  const before = text.slice(0, cursor);
  const at = text[cursor];
  const after = text.slice(cursor + 1);
  if (text.length === 0 && placeholder) {
    if (!isFocused) {
      return chalk.dim(`  ${placeholder}`);
    }
    return renderCursorCell(" ") + chalk.dim(` ${placeholder}`);
  }
  if (!isFocused) {
    return text.endsWith("\n") ? `${text} ` : text;
  }
  if (typeof at === "undefined") {
    return before + renderCursorCell(" ");
  }
  if (at === "\n") {
    return before + renderCursorCell(" ") + "\n" + after;
  }
  return before + renderCursorCell(at) + after;
}
function renderCursorCell(value) {
  return `\x1B[7m${value}\x1B[27m`;
}

// src/ui/MessageView.tsx
import { Box as Box3, Text as Text3 } from "ink";

// src/ui/markdown.ts
import chalk2 from "chalk";
function renderMarkdown(text) {
  if (!text) {
    return "";
  }
  const fenceSegments = splitByFences(text);
  return fenceSegments.map((segment) => {
    if (segment.kind === "code") {
      const langTag = segment.lang ? chalk2.dim(`[${segment.lang}]`) + "\n" : "";
      return langTag + chalk2.cyan(segment.body);
    }
    return renderInlineBlock(segment.body);
  }).join("");
}
function splitByFences(text) {
  const segments = [];
  const lines = text.split(/\r?\n/);
  let buffer = [];
  let inFence = false;
  let fenceLang = "";
  let fenceBody = [];
  const flushText = () => {
    if (buffer.length === 0) {
      return;
    }
    segments.push({ kind: "text", body: buffer.join("\n") });
    buffer = [];
  };
  for (const line of lines) {
    const fenceMatch = /^\s*```(\w*)\s*$/.exec(line);
    if (fenceMatch) {
      if (!inFence) {
        flushText();
        inFence = true;
        fenceLang = fenceMatch[1] ?? "";
        fenceBody = [];
      } else {
        segments.push({ kind: "code", lang: fenceLang, body: fenceBody.join("\n") });
        inFence = false;
        fenceLang = "";
        fenceBody = [];
      }
      continue;
    }
    if (inFence) {
      fenceBody.push(line);
    } else {
      buffer.push(line);
    }
  }
  if (inFence) {
    segments.push({ kind: "code", lang: fenceLang, body: fenceBody.join("\n") });
  } else {
    flushText();
  }
  return segments;
}
function renderInlineBlock(text) {
  return text.split("\n").map((line) => renderInlineLine(line)).join("\n");
}
function renderInlineLine(line) {
  const headingMatch = /^(\s*)(#{1,6})\s+(.*)$/.exec(line);
  if (headingMatch) {
    const [, lead, hashes, content] = headingMatch;
    const styled = hashes.length <= 2 ? chalk2.bold.cyanBright(content) : chalk2.bold.cyan(content);
    return `${lead}${chalk2.dim(hashes)} ${styled}`;
  }
  const listMatch = /^(\s*)([-*+])\s+(.*)$/.exec(line);
  if (listMatch) {
    const [, lead, bullet, content] = listMatch;
    return `${lead}${chalk2.yellow(bullet)} ${renderInlineSpans(content)}`;
  }
  const numListMatch = /^(\s*)(\d+\.)\s+(.*)$/.exec(line);
  if (numListMatch) {
    const [, lead, marker, content] = numListMatch;
    return `${lead}${chalk2.yellow(marker)} ${renderInlineSpans(content)}`;
  }
  const quoteMatch = /^(\s*)>\s?(.*)$/.exec(line);
  if (quoteMatch) {
    const [, lead, content] = quoteMatch;
    return `${lead}${chalk2.dim("\u2502 ")}${chalk2.italic(renderInlineSpans(content))}`;
  }
  return renderInlineSpans(line);
}
function renderInlineSpans(text) {
  if (!text) {
    return text;
  }
  let result = text;
  result = result.replace(/`([^`]+)`/g, (_, inner) => chalk2.cyan(inner));
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, inner) => chalk2.bold(inner));
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, inner) => chalk2.italic(inner));
  result = result.replace(/_([^_\n]+)_/g, (_, inner) => chalk2.italic(inner));
  return result;
}

// src/ui/MessageView.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function MessageView({ message, collapsed }) {
  if (!message.visible) {
    return null;
  }
  if (message.role === "user") {
    const text = message.content || "";
    const imageParams = Array.isArray(message.contentParams) ? message.contentParams : null;
    const hasImages = imageParams !== null && imageParams.length > 0;
    return /* @__PURE__ */ jsx3(Box3, { marginLeft: 1, marginBottom: 1, flexDirection: "column", marginY: 0, children: /* @__PURE__ */ jsxs3(Box3, { flexGrow: 1, gap: 1, children: [
      /* @__PURE__ */ jsx3(Box3, { children: /* @__PURE__ */ jsx3(Text3, { color: "#229ac3", children: `>` }) }),
      /* @__PURE__ */ jsxs3(Box3, { flexGrow: 1, children: [
        /* @__PURE__ */ jsx3(Text3, { color: "#229ac3", children: text }),
        Array.isArray(message.contentParams) && message.contentParams.length > 0 ? /* @__PURE__ */ jsx3(Text3, { color: "#229ac3", children: `  \u{1F4CE} ${message.contentParams.length} image attachment(s)` }) : null
      ] })
    ] }) });
  }
  if (message.role === "assistant") {
    const isThinking = Boolean(message.meta?.asThinking);
    const content = (message.content || "").trim();
    if (isThinking) {
      const summary = buildThinkingSummary(content, message.messageParams);
      if (collapsed !== false) {
        return /* @__PURE__ */ jsx3(Box3, { marginLeft: 1, marginY: 0, children: /* @__PURE__ */ jsx3(StatusLine, { bulletColor: "gray", name: "Thinking", params: summary }) });
      }
      return /* @__PURE__ */ jsxs3(Box3, { marginLeft: 1, flexDirection: "column", marginY: 0, children: [
        /* @__PURE__ */ jsx3(StatusLine, { bulletColor: "gray", name: "Thinking", params: summary }),
        /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", children: content ? /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: renderMarkdown(content) }) : null })
      ] });
    }
    return /* @__PURE__ */ jsxs3(Box3, { marginLeft: 1, marginBottom: 1, flexGrow: 1, gap: 1, marginY: 0, children: [
      /* @__PURE__ */ jsx3(Box3, { children: /* @__PURE__ */ jsx3(Text3, { color: "#229ac3", children: "\u2726" }) }),
      /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", flexGrow: 1, children: content ? /* @__PURE__ */ jsx3(Text3, { children: renderMarkdown(content) }) : null })
    ] });
  }
  if (message.role === "tool") {
    const summary = buildToolSummary(message);
    const diffLines = getToolDiffPreviewLines(summary);
    return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginLeft: 1, marginBottom: 1, marginY: 0, children: [
      /* @__PURE__ */ jsx3(
        StatusLine,
        {
          bulletColor: summary.ok ? "green" : "red",
          name: formatStatusName(summary.name),
          params: formatToolStatusParams(summary)
        }
      ),
      diffLines.length > 0 ? /* @__PURE__ */ jsx3(DiffPreview, { lines: diffLines }) : null
    ] });
  }
  if (message.role === "system") {
    if (message.meta?.skill) {
      return /* @__PURE__ */ jsx3(Box3, { marginY: 0, marginLeft: 1, marginBottom: 1, children: /* @__PURE__ */ jsxs3(Text3, { color: "magenta", children: [
        "\u26A1 Loaded skill: ",
        message.meta.skill.name
      ] }) });
    }
    if (message.meta?.isSummary) {
      return /* @__PURE__ */ jsx3(Box3, { marginY: 0, marginLeft: 1, marginBottom: 1, children: /* @__PURE__ */ jsx3(Text3, { dimColor: true, italic: true, children: "(conversation summary inserted)" }) });
    }
    return null;
  }
  return null;
}
function StatusLine({
  bulletColor,
  name,
  params
}) {
  return /* @__PURE__ */ jsx3(Text3, { wrap: "truncate-end", children: [
    /* @__PURE__ */ jsx3(Text3, { color: bulletColor, children: "\u2727" }, "bullet"),
    " ",
    /* @__PURE__ */ jsx3(Text3, { bold: true, children: name }, "name"),
    params ? /* @__PURE__ */ jsx3(Text3, { color: "white", children: `  ${params}` }, "params") : null
  ] });
}
function formatToolStatusParams(summary) {
  const params = firstNonEmptyLine(summary.params);
  return summary.name.toLowerCase() === "bash" ? params : truncate(params, 120);
}
function buildToolSummary(message) {
  const payload = parseToolPayload(message.content);
  const metaFunctionName = message.meta?.function && typeof message.meta.function.name === "string" ? message.meta.function.name : null;
  const name = payload.name || metaFunctionName || "tool";
  const params = name === "AskUserQuestion" ? extractAskUserQuestionParams(message) || getMetaParams(message) : getMetaParams(message);
  return {
    name,
    params,
    ok: payload.ok !== false,
    metadata: payload.metadata
  };
}
function getMetaParams(message) {
  return typeof message.meta?.paramsMd === "string" ? message.meta.paramsMd.trim() : "";
}
function extractAskUserQuestionParams(message) {
  const fromFunction = extractQuestionsFromToolFunction(message.meta?.function);
  if (fromFunction) {
    return fromFunction;
  }
  const params = getMetaParams(message);
  if (!params) {
    return "";
  }
  try {
    const parsed = JSON.parse(params);
    return extractQuestionsFromValue(parsed);
  } catch {
    return "";
  }
}
function extractQuestionsFromToolFunction(toolFunction) {
  if (!toolFunction || typeof toolFunction !== "object") {
    return "";
  }
  const args2 = toolFunction.arguments;
  if (typeof args2 !== "string" || !args2.trim()) {
    return "";
  }
  try {
    const parsed = JSON.parse(args2);
    return extractQuestionsFromValue(parsed?.questions);
  } catch {
    return "";
  }
}
function extractQuestionsFromValue(value) {
  if (!Array.isArray(value)) {
    return "";
  }
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return "";
    }
    return typeof item.question === "string" ? item.question.trim() : "";
  }).filter(Boolean).join(" / ");
}
function parseToolPayload(content) {
  if (!content) {
    return { name: null, ok: true, metadata: null };
  }
  try {
    const parsed = JSON.parse(content);
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null,
      ok: parsed.ok !== false,
      metadata: isPlainRecord(parsed.metadata) ? parsed.metadata : null
    };
  } catch {
    return { name: null, ok: true, metadata: null };
  }
}
function getToolDiffPreviewLines(summary) {
  if (!summary.ok || !["edit", "write"].includes(summary.name.toLowerCase())) {
    return [];
  }
  const diffPreview = summary.metadata?.diff_preview;
  if (typeof diffPreview !== "string" || !diffPreview.trim()) {
    return [];
  }
  return parseDiffPreview(diffPreview);
}
function parseDiffPreview(diffPreview) {
  return diffPreview.split("\n").filter((line) => line && !line.startsWith("--- ") && !line.startsWith("+++ ") && !line.startsWith("@@ ")).map((line) => {
    if (line.startsWith("+")) {
      return { marker: "+", content: line.slice(1), kind: "added" };
    }
    if (line.startsWith("-")) {
      return { marker: "-", content: line.slice(1), kind: "removed" };
    }
    return {
      marker: " ",
      content: line.startsWith(" ") ? line.slice(1) : line,
      kind: "context"
    };
  });
}
function DiffPreview({ lines }) {
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginLeft: 2, children: [
    /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "\u2514 Changes" }),
    /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", marginLeft: 2, children: lines.map((line, index) => /* @__PURE__ */ jsxs3(Text3, { wrap: "truncate-end", children: [
      /* @__PURE__ */ jsx3(Text3, { color: line.kind === "added" ? "green" : line.kind === "removed" ? "red" : "gray", children: line.marker }),
      /* @__PURE__ */ jsx3(Text3, { color: line.kind === "added" ? "green" : line.kind === "removed" ? "red" : void 0, children: line.content })
    ] }, `${index}-${line.marker}-${line.content}`)) })
  ] });
}
function isPlainRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function formatStatusName(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Tool";
}
function truncate(value, max) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}\u2026`;
}
function firstNonEmptyLine(value) {
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}
function buildThinkingSummary(content, messageParams) {
  if (content) {
    const normalized = content.replace(/\r?\n/g, " ").replace(/\s+/g, " ");
    let result = truncate(normalized, 100);
    if (result.endsWith(":") || result.endsWith("\uFF1A")) {
      result = result.slice(0, -1);
    }
    return result;
  }
  const params = messageParams;
  if (typeof params?.reasoning_content === "string" && params.reasoning_content.trim()) {
    return "(reasoning...)";
  }
  return "";
}

// src/ui/SessionList.tsx
import { useState as useState4, useMemo } from "react";
import { Box as Box4, Text as Text4 } from "ink";

// src/ui/useTerminalSize.ts
import { useEffect as useEffect4, useState as useState3 } from "react";
import { useStdout as useStdout2 } from "ink";
var DEFAULT_COLUMNS = 80;
var DEFAULT_ROWS = 24;
function useTerminalSize() {
  const { stdout } = useStdout2();
  const readSize = () => ({
    columns: stdout?.columns ?? DEFAULT_COLUMNS,
    rows: stdout?.rows ?? DEFAULT_ROWS
  });
  const [size, setSize] = useState3(() => readSize());
  useEffect4(() => {
    setSize(readSize());
    if (!stdout?.on) {
      return;
    }
    const handleResize = () => {
      setSize(readSize());
    };
    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);
  return size;
}

// src/ui/SessionList.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function SessionList({ sessions, onSelect, onCancel }) {
  const [index, setIndex] = useState4(0);
  const { columns, rows } = useTerminalSize();
  const maxVisibleSessions = useMemo(() => {
    const reservedLines = 8;
    const linesPerSession = 3;
    const availableLines = Math.max(0, Math.min(rows, 30) - reservedLines);
    return Math.max(1, Math.floor(availableLines / linesPerSession));
  }, [rows]);
  const safeIndex = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.max(0, Math.min(index, sessions.length - 1));
  }, [index, sessions.length]);
  const scrollOffset = useMemo(() => {
    if (safeIndex < maxVisibleSessions) return 0;
    return safeIndex - maxVisibleSessions + 1;
  }, [safeIndex, maxVisibleSessions]);
  const visibleSessions = useMemo(() => {
    return sessions.slice(scrollOffset, scrollOffset + maxVisibleSessions);
  }, [sessions, scrollOffset, maxVisibleSessions]);
  useTerminalInput((input, key) => {
    if (key.escape || key.ctrl && (input === "c" || input === "C")) {
      onCancel();
      return;
    }
    if (sessions.length === 0) {
      return;
    }
    if (key.upArrow) {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setIndex((i) => Math.min(sessions.length - 1, i + 1));
      return;
    }
    if (key.pageUp) {
      setIndex((i) => Math.max(0, i - maxVisibleSessions));
      return;
    }
    if (key.pageDown) {
      setIndex((i) => Math.min(sessions.length - 1, i + maxVisibleSessions));
      return;
    }
    if (key.home) {
      setIndex(0);
      return;
    }
    if (key.end) {
      setIndex(sessions.length - 1);
      return;
    }
    if (key.return) {
      const session = sessions[safeIndex];
      if (session) {
        onSelect(session.id);
      }
    }
  });
  if (sessions.length === 0) {
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx4(Text4, { color: "yellow", children: "No previous sessions found." }),
      /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "Press Esc to go back." })
    ] });
  }
  return /* @__PURE__ */ jsx4(
    Box4,
    {
      flexDirection: "column",
      width: Math.max(20, columns - 6),
      height: Math.max(5, Math.min(rows - 1, 30)),
      overflow: "hidden",
      paddingX: 1,
      marginTop: 1,
      children: /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", borderStyle: "round", borderDimColor: true, flexGrow: 1, overflow: "hidden", children: [
        /* @__PURE__ */ jsxs4(Box4, { paddingX: 1, children: [
          /* @__PURE__ */ jsx4(Text4, { bold: true, color: "cyanBright", children: "Resume a session" }),
          /* @__PURE__ */ jsxs4(Text4, { bold: true, color: "#229ac3", children: [
            " ",
            "(",
            sessions.length,
            " total)"
          ] })
        ] }),
        /* @__PURE__ */ jsxs4(
          Box4,
          {
            borderTop: true,
            borderBottom: true,
            borderLeft: false,
            borderRight: false,
            borderStyle: "round",
            borderDimColor: true,
            flexDirection: "column",
            flexGrow: 1,
            paddingX: 1,
            overflow: "hidden",
            children: [
              visibleSessions.map((session, i) => {
                const actualIndex = scrollOffset + i;
                return /* @__PURE__ */ jsxs4(Box4, { height: 2, marginBottom: 1, children: [
                  /* @__PURE__ */ jsx4(Box4, { children: /* @__PURE__ */ jsx4(Text4, { color: "#229ac3", children: actualIndex === safeIndex ? "\u203A " : "  " }) }),
                  /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", flexGrow: 1, children: [
                    /* @__PURE__ */ jsxs4(Box4, { width: "100%", children: [
                      /* @__PURE__ */ jsx4(
                        Text4,
                        {
                          ...actualIndex === safeIndex ? { bold: true } : {},
                          color: actualIndex === safeIndex ? "#229ac3" : void 0,
                          children: formatSessionTitle(session.summary || "Untitled")
                        }
                      ),
                      /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
                        " (",
                        session.status,
                        ")"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx4(Box4, { width: "100%", children: /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
                      formatTimestamp(session.updateTime),
                      " "
                    ] }) })
                  ] })
                ] }, session.id);
              }),
              scrollOffset > 0 || scrollOffset + maxVisibleSessions < sessions.length ? /* @__PURE__ */ jsxs4(Box4, { marginTop: 1, children: [
                scrollOffset > 0 ? /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
                  "\u2026 ",
                  scrollOffset,
                  " newer sessions above. "
                ] }) : null,
                scrollOffset + maxVisibleSessions < sessions.length ? /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
                  "\u2026 ",
                  sessions.length - scrollOffset - maxVisibleSessions,
                  " older sessions below."
                ] }) : null
              ] }) : null
            ]
          }
        ),
        /* @__PURE__ */ jsx4(Box4, { children: /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "\u2191/\u2193 navigate \xB7 PgUp/PgDn page \xB7 Enter select \xB7 Esc cancel" }) })
      ] })
    }
  );
}
function formatTimestamp(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return value;
    }
    return date.toLocaleString();
  } catch {
    return value;
  }
}
function formatSessionTitle(value, max = 70) {
  return truncate2(value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim(), max);
}
function truncate2(value, max) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}\u2026`;
}

// src/ui/loadingText.ts
var STALL_THRESHOLD_MS = 3e3;
function buildLoadingText(input) {
  const { progress, processes, now } = input;
  const processText = buildProcessLoadingText(processes, now);
  if (processText) {
    return processText;
  }
  if (!progress) {
    return "Thinking...";
  }
  const startedAt = parseTimestamp(progress.startedAt);
  if (startedAt === null) {
    return "Thinking...";
  }
  const elapsedMs = Math.max(0, now - startedAt);
  if (elapsedMs < STALL_THRESHOLD_MS) {
    return "Thinking...";
  }
  const elapsedSeconds = Math.floor(elapsedMs / 1e3);
  const tokens = progress.formattedTokens || "0";
  return `Thinking... (${elapsedSeconds}s) \xB7 \u2193 ${tokens} tokens`;
}
function buildProcessLoadingText(processes, now) {
  if (!processes || processes.size === 0) {
    return null;
  }
  const first = processes.values().next().value;
  if (!first) {
    return null;
  }
  return `(${formatElapsedTime(first.startTime, now)}) ${first.command}`;
}
function formatElapsedTime(startTimeIso, now) {
  const startTime = parseTimestamp(startTimeIso);
  const elapsedMs = startTime === null ? 0 : Math.max(0, now - startTime);
  const elapsedSeconds = Math.floor(elapsedMs / 1e3);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }
  return `${seconds}s`;
}
function parseTimestamp(value) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

// src/ui/thinkingState.ts
function findExpandedThinkingId(messages) {
  let expanded = null;
  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    if (message.meta?.asThinking) {
      expanded = message.id;
    } else {
      expanded = null;
    }
  }
  return expanded;
}

// src/ui/WelcomeScreen.tsx
import { useMemo as useMemo2, useState as useState5 } from "react";
import { Box as Box5, Text as Text6 } from "ink";
import * as os8 from "node:os";
import path11 from "node:path";

// src/ui/ThemedGradient.tsx
import { Text as Text5 } from "ink";
import Gradient from "ink-gradient";
import { jsx as jsx5 } from "react/jsx-runtime";
var THEME_COLOR = "#229ac3";
var ThemedGradient = ({ children, ...props }) => {
  return /* @__PURE__ */ jsx5(Gradient, { colors: [THEME_COLOR, THEME_COLOR], children: /* @__PURE__ */ jsx5(Text5, { ...props, children }) });
};

// src/AsciiArt.ts
var AsciiLogo = [
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557      \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557    \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D",
  "\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D    \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2550\u255D     \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551         \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D          \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D"
].join("\n");

// src/ui/WelcomeScreen.tsx
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var TITLE_PANEL_WIDTH = 70;
var PANEL_CONTENT_HEIGHT = 8;
var SHORTCUT_TIPS = [
  { label: "Enter", description: "Send the prompt" },
  { label: "Shift+Enter", description: "Insert a newline" },
  { label: "Ctrl+V", description: "Paste an image from the clipboard" },
  { label: "Esc", description: "Interrupt the current model turn" },
  { label: "/", description: "Open the skills and commands menu" },
  { label: "Ctrl+D twice", description: "Quit Deep Code CLI" }
];
function WelcomeScreen({
  projectRoot,
  settings,
  skills,
  version,
  width
}) {
  const tips = useMemo2(() => buildWelcomeTips(skills), [skills]);
  const [tipIndex] = useState5(() => randomTipIndex(tips.length));
  const compact = width < TITLE_PANEL_WIDTH + 42;
  const cwd = formatHomeRelativePath(projectRoot);
  const tip = tips[Math.min(tipIndex, Math.max(0, tips.length - 1))] ?? tips[0];
  const panelWidth = compact ? void 0 : Math.min(width, 72);
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", marginY: 1, children: [
    /* @__PURE__ */ jsx6(Box5, { flexDirection: "column", width: panelWidth, children: /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", paddingX: 1, children: [
      /* @__PURE__ */ jsx6(Box5, { flexDirection: "column", justifyContent: "center", paddingX: 1, children: /* @__PURE__ */ jsx6(Box5, { justifyContent: "center", width: compact ? void 0 : TITLE_PANEL_WIDTH, children: /* @__PURE__ */ jsx6(ThemedGradient, { children: AsciiLogo }) }) }),
      /* @__PURE__ */ jsxs5(
        Box5,
        {
          borderStyle: "round",
          borderColor: "#229ac3",
          flexDirection: "column",
          flexGrow: 1,
          height: compact ? void 0 : PANEL_CONTENT_HEIGHT,
          marginTop: compact ? 1 : 0,
          paddingX: 1,
          children: [
            /* @__PURE__ */ jsxs5(Box5, { flexGrow: 1, marginBottom: compact ? 1 : 0, children: [
              /* @__PURE__ */ jsxs5(Text6, { color: "#229ac3", children: [
                ">",
                "_ Deep Code "
              ] }),
              /* @__PURE__ */ jsxs5(Text6, { color: "gray", children: [
                " (v",
                version || "unknown",
                ")"
              ] })
            ] }),
            !compact ? /* @__PURE__ */ jsx6(Text6, { children: " " }) : null,
            /* @__PURE__ */ jsx6(SettingRow, { label: "Model", value: settings.model }),
            /* @__PURE__ */ jsx6(SettingRow, { label: "Thinking Enabled", value: String(settings.thinkingEnabled) }),
            /* @__PURE__ */ jsx6(SettingRow, { label: "Reasoning Effort", value: settings.reasoningEffort }),
            /* @__PURE__ */ jsx6(SettingRow, { label: "CWD", value: cwd })
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx6(Box5, { flexDirection: "column", width: panelWidth, paddingX: 1, children: tip ? /* @__PURE__ */ jsx6(Box5, { marginTop: 1, children: /* @__PURE__ */ jsxs5(Text6, { dimColor: true, children: [
      "Tips: ",
      tip.label,
      " - ",
      tip.description
    ] }) }) : null })
  ] });
}
function SettingRow({ label, value }) {
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "row", children: [
    /* @__PURE__ */ jsx6(Box5, { width: 20, children: /* @__PURE__ */ jsx6(Text6, { children: label }) }),
    /* @__PURE__ */ jsx6(Box5, { flexGrow: 1, justifyContent: "flex-end", children: /* @__PURE__ */ jsx6(Text6, { children: value }) })
  ] });
}
function formatHomeRelativePath(value, home = os8.homedir()) {
  const normalizedValue = path11.resolve(value);
  const normalizedHome = path11.resolve(home);
  const relative2 = path11.relative(normalizedHome, normalizedValue);
  if (relative2 === "") {
    return "~";
  }
  if (!relative2.startsWith("..") && !path11.isAbsolute(relative2)) {
    return `~${path11.sep}${relative2}`;
  }
  return normalizedValue;
}
function buildWelcomeTips(skills) {
  const slashTips = buildSlashCommands(skills).filter((item) => item.kind !== "skill" || item.skill?.isLoaded).map((item) => ({
    label: item.label,
    description: formatSlashCommandDescription(item.description)
  }));
  return [
    ...slashTips,
    ...SHORTCUT_TIPS.filter((tip) => !BUILTIN_SLASH_COMMANDS.some((command) => command.label === tip.label))
  ];
}
function randomTipIndex(length) {
  return length > 0 ? Math.floor(Math.random() * length) : 0;
}

// src/ui/AskUserQuestionPrompt.tsx
import { useEffect as useEffect5, useMemo as useMemo3, useState as useState6 } from "react";
import { Box as Box6, Text as Text7 } from "ink";
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
var OTHER_VALUE = "__other__";
function AskUserQuestionPrompt({ questions, onSubmit, onCancel }) {
  const [questionIndex, setQuestionIndex] = useState6(0);
  const [cursorIndex, setCursorIndex] = useState6(0);
  const [answers, setAnswers] = useState6({});
  const [selectedValues, setSelectedValues] = useState6({});
  const [otherTexts, setOtherTexts] = useState6({});
  const [statusMessage, setStatusMessage] = useState6(null);
  const question = questions[questionIndex];
  const options = useMemo3(() => buildOptions(question), [question]);
  const selectedForQuestion = selectedValues[questionIndex] ?? [];
  const otherText = otherTexts[questionIndex] ?? "";
  const isCurrentOther = options[cursorIndex]?.isOther === true;
  useEffect5(() => {
    if (!statusMessage) {
      return;
    }
    const timer = setTimeout(() => setStatusMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);
  useEffect5(() => {
    setQuestionIndex(0);
    setCursorIndex(0);
    setAnswers({});
    setSelectedValues({});
    setOtherTexts({});
    setStatusMessage(null);
  }, [questions]);
  useEffect5(() => {
    if (cursorIndex >= options.length) {
      setCursorIndex(Math.max(0, options.length - 1));
    }
  }, [cursorIndex, options.length]);
  useTerminalInput((input, key) => {
    if (!question) {
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.ctrl && (input === "c" || input === "C")) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setCursorIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (key.downArrow) {
      setCursorIndex((index) => Math.min(options.length - 1, index + 1));
      return;
    }
    if (key.backspace && isCurrentOther) {
      setOtherTexts((prev) => ({
        ...prev,
        [questionIndex]: (prev[questionIndex] ?? "").slice(0, -1)
      }));
      return;
    }
    if (key.return) {
      commitCurrentQuestion();
      return;
    }
    if (isCurrentOther && input && !key.ctrl && !key.meta && !input.startsWith("\x1B")) {
      const sanitized = input.replace(/\r/g, "");
      if (sanitized) {
        setOtherTexts((prev) => ({
          ...prev,
          [questionIndex]: `${prev[questionIndex] ?? ""}${sanitized}`
        }));
      }
      return;
    }
    if (question.multiSelect && input === " " && !key.ctrl && !key.meta) {
      toggleCurrentOption();
      return;
    }
    if (question.multiSelect && input && /^[1-9]$/.test(input)) {
      const nextIndex = Number(input) - 1;
      if (nextIndex >= 0 && nextIndex < options.length) {
        toggleOption(options[nextIndex]?.value ?? "");
      }
    }
  });
  if (!question) {
    return null;
  }
  function toggleCurrentOption() {
    const value = options[cursorIndex]?.value;
    if (value) {
      toggleOption(value);
    }
  }
  function toggleOption(value) {
    setSelectedValues((prev) => {
      const current = prev[questionIndex] ?? [];
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [questionIndex]: next };
    });
  }
  function commitCurrentQuestion() {
    const answer = buildAnswerForQuestion(question, options[cursorIndex], selectedForQuestion, otherText);
    if (!answer) {
      setStatusMessage(
        question.multiSelect ? "Select at least one option with Space, or type an Other answer." : "Select an option, or type an Other answer."
      );
      return;
    }
    const nextAnswers = {
      ...answers,
      [question.question]: answer
    };
    setAnswers(nextAnswers);
    if (questionIndex >= questions.length - 1) {
      onSubmit(nextAnswers);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setCursorIndex(0);
  }
  return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", borderStyle: "round", borderColor: "yellow", paddingX: 1, marginY: 1, children: [
    /* @__PURE__ */ jsxs6(Box6, { marginBottom: 1, children: [
      /* @__PURE__ */ jsx7(Text7, { color: "yellow", bold: true, children: "Answer questions" }),
      /* @__PURE__ */ jsxs6(Text7, { dimColor: true, children: [
        " ",
        questionIndex + 1,
        "/",
        questions.length
      ] })
    ] }),
    /* @__PURE__ */ jsx7(Text7, { bold: true, children: question.question }),
    /* @__PURE__ */ jsx7(Box6, { flexDirection: "column", marginTop: 1, children: options.map((option, index) => {
      const isCursor = index === cursorIndex;
      const isSelected = option.isOther ? selectedForQuestion.includes(OTHER_VALUE) || Boolean(otherText.trim()) : selectedForQuestion.includes(option.value) || answers[question.question] === option.label;
      const marker = question.multiSelect ? isSelected ? "[x]" : "[ ]" : isSelected ? "\u25CF" : "\u25CB";
      return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", children: [
        /* @__PURE__ */ jsxs6(Text7, { color: isCursor ? "cyanBright" : void 0, children: [
          isCursor ? "\u203A " : "  ",
          marker,
          " ",
          /* @__PURE__ */ jsx7(Text7, { bold: isCursor, children: option.label })
        ] }),
        option.isOther ? /* @__PURE__ */ jsx7(
          Box6,
          {
            marginLeft: 4,
            marginTop: 0,
            borderStyle: "single",
            borderColor: isCursor ? "cyanBright" : "gray",
            paddingX: 1,
            width: 64,
            children: otherText ? /* @__PURE__ */ jsxs6(Text7, { color: "white", children: [
              otherText,
              isCursor ? /* @__PURE__ */ jsx7(Text7, { color: "cyanBright", children: "\u258C" }) : null
            ] }) : /* @__PURE__ */ jsx7(Text7, { dimColor: true, children: isCursor ? "type your answer here" : "type a custom answer" })
          }
        ) : null,
        option.description ? /* @__PURE__ */ jsxs6(Text7, { dimColor: true, children: [
          " ",
          option.description
        ] }) : null
      ] }, option.value);
    }) }),
    /* @__PURE__ */ jsx7(Box6, { marginTop: 1, children: /* @__PURE__ */ jsx7(Text7, { dimColor: true, children: statusMessage ?? (isCurrentOther ? "Type your answer \xB7 Backspace edit \xB7 Enter submit/next \xB7 \u2191 choose presets \xB7 Esc type manually" : question.multiSelect ? "\u2191/\u2193 move \xB7 Space toggle \xB7 Enter submit/next \xB7 Esc type manually" : "\u2191/\u2193 move \xB7 Enter select/next \xB7 Esc type manually") }) })
  ] });
}
function buildOptions(question) {
  if (!question) {
    return [];
  }
  return [
    ...question.options.map((option) => ({
      label: option.label,
      description: option.description,
      value: option.label
    })),
    {
      label: "Other",
      value: OTHER_VALUE,
      isOther: true
    }
  ];
}
function buildAnswerForQuestion(question, focusedOption, selectedValues, otherText) {
  const trimmedOther = otherText.trim();
  if (question.multiSelect) {
    const labels = selectedValues.filter((value) => value !== OTHER_VALUE).map((value) => value.trim()).filter(Boolean);
    if (selectedValues.includes(OTHER_VALUE) && !trimmedOther) {
      return null;
    }
    if (trimmedOther) {
      labels.push(trimmedOther);
    }
    return labels.length > 0 ? labels.join(", ") : null;
  }
  if (!focusedOption) {
    return null;
  }
  if (focusedOption.isOther) {
    return trimmedOther || null;
  }
  return focusedOption.label;
}

// src/ui/askUserQuestion.ts
function findPendingAskUserQuestion(messages, status) {
  if (status !== "waiting_for_user") {
    return null;
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "tool" || message.visible === false) {
      continue;
    }
    const questions = parseAskUserQuestionContent(message.content);
    if (questions.length === 0) {
      continue;
    }
    return {
      messageId: message.id,
      sessionId: message.sessionId,
      questions
    };
  }
  return null;
}
function formatAskUserQuestionAnswers(answers) {
  const answersText = Object.entries(answers).map(([question, answer]) => `"${escapeAnswerPart(question)}"="${escapeAnswerPart(answer)}"`).join(", ");
  return `User has answered your questions: ${answersText}. You can now continue with the user's answers in mind.`;
}
function parseAskUserQuestionContent(content) {
  if (!content) {
    return [];
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed.awaitUserResponse !== true) {
      return [];
    }
    const metadata = parsed.metadata;
    if (!metadata || metadata.kind !== "ask_user_question") {
      return [];
    }
    return normalizeQuestions(metadata.questions);
  } catch {
    return [];
  }
}
function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const questions = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const question = typeof item.question === "string" ? item.question.trim() : "";
    const rawOptions = item.options;
    if (!question || !Array.isArray(rawOptions) || rawOptions.length === 0) {
      continue;
    }
    const options = rawOptions.map((option) => normalizeOption(option)).filter((option) => Boolean(option));
    if (options.length === 0) {
      continue;
    }
    const multiSelect = typeof item.multiSelect === "boolean" ? item.multiSelect : void 0;
    questions.push({ question, multiSelect, options });
  }
  return questions;
}
function normalizeOption(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label) {
    return null;
  }
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  return {
    label,
    description: description || void 0
  };
}
function escapeAnswerPart(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ").trim();
}

// src/ui/exitSummary.ts
import chalk3 from "chalk";
import gradientString from "gradient-string";
var ANSI_RE = /\u001b\[[0-9;]*[a-zA-Z]/g;
function visibleLength(text) {
  return text.replace(ANSI_RE, "").length;
}
function padRight(text, width) {
  const padding = Math.max(0, width - visibleLength(text));
  return text + " ".repeat(padding);
}
function padLeft(text, width) {
  const padding = Math.max(0, width - visibleLength(text));
  return " ".repeat(padding) + text;
}
function formatNumber(n) {
  return n.toLocaleString("en-US");
}
function extractUsageFields(usage) {
  const empty = {
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0
  };
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
    return empty;
  }
  const record = usage;
  const promptTokens = typeof record.prompt_tokens === "number" ? record.prompt_tokens : 0;
  const completionTokens = typeof record.completion_tokens === "number" ? record.completion_tokens : 0;
  let cachedTokens = 0;
  const promptDetails = record.prompt_tokens_details;
  if (promptDetails && typeof promptDetails === "object" && !Array.isArray(promptDetails)) {
    const cached = promptDetails.cached_tokens;
    if (typeof cached === "number") {
      cachedTokens = cached;
    }
  }
  if (cachedTokens === 0 && typeof record.prompt_cache_hit_tokens === "number") {
    cachedTokens = record.prompt_cache_hit_tokens;
  }
  return { promptTokens, completionTokens, cachedTokens };
}
function buildExitSummaryText(input) {
  const { session, messages, model } = input;
  const assistantCount = messages.filter((m) => m.role === "assistant").length;
  const innerWidth = 98;
  const contentWidth = innerWidth - 4;
  const borderColor = chalk3.hex("#229ac3");
  const titleColor = gradientString("#229ac3", "#7d33f7");
  const line = (text) => `${borderColor("\u2502")}  ${padRight(text, contentWidth)}  ${borderColor("\u2502")}`;
  const header = chalk3.bold(titleColor("Goodbye!"));
  const rows = ["", `${header}`, ""];
  const usage = extractUsageFields(session?.usage ?? null);
  const modelName = model ?? "unknown";
  const hasUsage = usage.promptTokens > 0 || usage.completionTokens > 0;
  if (hasUsage) {
    const colModel = 34;
    const colReqs = 8;
    const colInput = 16;
    const colOutput = 16;
    const colCached = 18;
    const tableWidth = colModel + colReqs + colInput + colOutput + colCached;
    const divider = "\u2500".repeat(tableWidth);
    const headerRow = padRight("Model Usage", colModel) + padLeft("Reqs", colReqs) + padLeft("Input Tokens", colInput) + padLeft("Output Tokens", colOutput) + padLeft("Cached Tokens", colCached);
    rows.push(chalk3.bold(headerRow));
    rows.push(divider);
    const reqsStr = String(assistantCount).padStart(colReqs);
    const inputStr = formatNumber(usage.promptTokens).padStart(colInput);
    const outputStr = formatNumber(usage.completionTokens).padStart(colOutput);
    const cachedStr = formatNumber(usage.cachedTokens).padStart(colCached);
    const dataRow = padRight(modelName, colModel) + padRight(reqsStr, colReqs) + padRight(chalk3.yellow(inputStr), colInput) + padRight(chalk3.yellow(outputStr), colOutput) + padRight(chalk3.yellow(cachedStr), colCached);
    rows.push(dataRow);
    rows.push("");
  }
  rows.push("");
  const border = borderColor("\u2500".repeat(innerWidth));
  const top = `${borderColor("\u256D")}${border}${borderColor("\u256E")}`;
  const bottom = `${borderColor("\u2570")}${border}${borderColor("\u256F")}`;
  const body = rows.map((row) => line(row)).join("\n");
  return [top, body, bottom].join("\n");
}

// src/ui/App.tsx
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
function App({ projectRoot, version = "", onRestart }) {
  const { exit } = useApp2();
  const { stdout, write } = useStdout3();
  const { columns } = useTerminalSize();
  const [view, setView] = useState7("chat");
  const [busy, setBusy] = useState7(false);
  const [skills, setSkills] = useState7([]);
  const [messages, setMessages] = useState7([]);
  const [sessions, setSessions] = useState7([]);
  const [statusLine, setStatusLine] = useState7("");
  const [errorLine, setErrorLine] = useState7(null);
  const [streamProgress, setStreamProgress] = useState7(null);
  const [runningProcesses, setRunningProcesses] = useState7(null);
  const [activeStatus, setActiveStatus] = useState7(null);
  const [dismissedQuestionIds, setDismissedQuestionIds] = useState7(() => /* @__PURE__ */ new Set());
  const [isExiting, setIsExiting] = useState7(false);
  const [showWelcome, setShowWelcome] = useState7(true);
  const [welcomeNonce, setWelcomeNonce] = useState7(0);
  const [resolvedSettings, setResolvedSettings] = useState7(() => resolveCurrentSettings2());
  const [nowTick, setNowTick] = useState7(0);
  const messagesRef = useRef3([]);
  messagesRef.current = messages;
  const sessionManager = useMemo4(() => {
    return new SessionManager({
      projectRoot,
      createOpenAIClient: () => createOpenAIClient2(),
      getResolvedSettings: () => resolveCurrentSettings2(),
      renderMarkdown: (text) => text,
      onAssistantMessage: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onSessionEntryUpdated: (entry) => {
        setStatusLine(buildStatusLine(entry));
        setRunningProcesses(entry.processes);
        setActiveStatus(entry.status);
      },
      onLlmStreamProgress: (progress) => {
        if (progress.phase === "end") {
          setStreamProgress(null);
          return;
        }
        setStreamProgress(progress);
      }
    });
  }, [projectRoot]);
  useEffect6(() => {
    if (!busy) {
      return;
    }
    const id = setInterval(() => setNowTick((tick) => tick + 1), 500);
    return () => clearInterval(id);
  }, [busy]);
  function loadVisibleMessages(manager, sessionId) {
    return manager.listSessionMessages(sessionId).filter((m) => m.visible);
  }
  const refreshSessionsList = useCallback2(() => {
    setSessions(sessionManager.listSessions());
  }, [sessionManager]);
  const refreshSkills = useCallback2(
    async (sessionId) => {
      try {
        const list = await sessionManager.listSkills(sessionId ?? sessionManager.getActiveSessionId() ?? void 0);
        setSkills(list);
      } catch {
      }
    },
    [sessionManager]
  );
  useEffect6(() => {
    refreshSessionsList();
    void refreshSkills();
  }, [refreshSessionsList, refreshSkills]);
  const writeRef = useRef3(write);
  writeRef.current = write;
  const handlePrompt = useCallback2(
    async (submission) => {
      if (submission.command === "exit") {
        setIsExiting(true);
        setTimeout(() => {
          const activeSessionId = sessionManager.getActiveSessionId();
          const session = activeSessionId ? sessionManager.getSession(activeSessionId) : null;
          const allMessages = activeSessionId ? sessionManager.listSessionMessages(activeSessionId) : messagesRef.current;
          const resolved = resolveCurrentSettings2();
          const summary = buildExitSummaryText({ session, messages: allMessages, model: resolved.model });
          process.stdout.write("\n");
          process.stdout.write(chalk4.green("> /exit "));
          process.stdout.write("\n\n");
          process.stdout.write(summary);
          process.stdout.write("\n\n");
          exit();
        }, 0);
        return;
      }
      if (submission.command === "new") {
        if (onRestart) {
          onRestart();
        } else {
          writeRef.current("\x1B[2J\x1B[3J\x1B[H");
          sessionManager.setActiveSessionId(null);
          setMessages([]);
          setStatusLine("");
          setErrorLine(null);
          setRunningProcesses(null);
          setActiveStatus(null);
          setDismissedQuestionIds(/* @__PURE__ */ new Set());
          setShowWelcome(true);
          setWelcomeNonce((n) => n + 1);
          await refreshSkills();
          refreshSessionsList();
        }
        return;
      }
      if (submission.command === "resume") {
        setShowWelcome(false);
        refreshSessionsList();
        setView("session-list");
        return;
      }
      const prompt = {
        text: submission.text,
        imageUrls: submission.imageUrls,
        skills: submission.selectedSkills && submission.selectedSkills.length > 0 ? submission.selectedSkills : void 0
      };
      const trimmedText = (submission.text ?? "").trim();
      const selectedSkillNames = submission.selectedSkills?.map((skill) => skill.name).filter(Boolean) ?? [];
      const userDisplayContent = trimmedText || (selectedSkillNames.length > 0 ? `Use skills: ${selectedSkillNames.join(", ")}` : "") || (submission.imageUrls.length > 0 ? "\u{1F5BC} Image" : "");
      if (userDisplayContent) {
        setMessages((prev) => [...prev, buildSyntheticUserMessage(userDisplayContent, submission.imageUrls.length)]);
      }
      setBusy(true);
      setErrorLine(null);
      setRunningProcesses(null);
      try {
        await sessionManager.handleUserPrompt(prompt);
        await refreshSkills();
        refreshSessionsList();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrorLine(message);
      } finally {
        setBusy(false);
        setStreamProgress(null);
        setRunningProcesses(null);
      }
    },
    [exit, onRestart, sessionManager, refreshSkills, refreshSessionsList]
  );
  const handleInterrupt = useCallback2(() => {
    sessionManager.interruptActiveSession();
  }, [sessionManager]);
  const handleModelConfigChange = useCallback2((selection) => {
    const current = resolveCurrentSettings2();
    const { changed } = writeModelConfigSelection(selection, current);
    const next = resolveCurrentSettings2();
    setResolvedSettings(next);
    if (!changed) {
      return "Model settings unchanged";
    }
    return `Model settings updated: ${formatModelConfig(current)} \u2192 ${formatModelConfig(next)}`;
  }, []);
  const handleSubmit = useCallback2(
    (submission) => {
      void handlePrompt(submission);
    },
    [handlePrompt]
  );
  const handleSelectSession = useCallback2(
    async (sessionId) => {
      const currentSessionId = sessionManager.getActiveSessionId();
      if (currentSessionId !== sessionId) {
        process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
      }
      sessionManager.setActiveSessionId(sessionId);
      setMessages([]);
      setShowWelcome(false);
      setWelcomeNonce((n) => n + 1);
      setView("chat");
      setTimeout(() => {
        setMessages(loadVisibleMessages(sessionManager, sessionId));
        setShowWelcome(true);
      }, 0);
      const session = sessionManager.getSession(sessionId);
      setStatusLine(session ? buildStatusLine(session) : "");
      setRunningProcesses(session?.processes ?? null);
      setActiveStatus(session?.status ?? null);
      await refreshSkills(sessionId);
    },
    [sessionManager, refreshSkills]
  );
  const [stableColumns, setStableColumns] = useState7(columns);
  useEffect6(() => {
    const timer = setTimeout(() => setStableColumns(columns), 100);
    return () => clearTimeout(timer);
  }, [columns]);
  const lastRenderedColumnsRef = useRef3(null);
  useEffect6(() => {
    if (!stdout?.isTTY) {
      return;
    }
    if (stableColumns <= 0) {
      return;
    }
    if (lastRenderedColumnsRef.current === null) {
      lastRenderedColumnsRef.current = stableColumns;
      return;
    }
    if (lastRenderedColumnsRef.current === stableColumns) {
      return;
    }
    lastRenderedColumnsRef.current = stableColumns;
    writeRef.current("\x1B[2J\x1B[H");
    setMessages([]);
    setShowWelcome(false);
    setWelcomeNonce((n) => n + 1);
    const activeSessionId = sessionManager.getActiveSessionId();
    const nextMessages = activeSessionId && !busy ? loadVisibleMessages(sessionManager, activeSessionId) : messagesRef.current;
    setTimeout(() => {
      setMessages(nextMessages);
      setShowWelcome(true);
    }, 0);
  }, [busy, sessionManager, stableColumns, stdout]);
  const screenWidth = useMemo4(() => stableColumns ?? stdout?.columns ?? 80, [stableColumns, stdout]);
  const promptHistory = useMemo4(() => {
    return messages.filter((message) => message.role === "user" && typeof message.content === "string").map((message) => (message.content ?? "").trim()).filter((content) => content.length > 0);
  }, [messages]);
  const expandedThinkingId = findExpandedThinkingId(messages);
  const pendingQuestion = useMemo4(() => findPendingAskUserQuestion(messages, activeStatus), [activeStatus, messages]);
  const shouldShowQuestionPrompt = Boolean(pendingQuestion && !dismissedQuestionIds.has(pendingQuestion.messageId));
  const loadingText = useMemo4(
    () => busy ? buildLoadingText({ progress: streamProgress, processes: runningProcesses, now: Date.now() }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowTick forces periodic recalculation for spinner animation
    [busy, streamProgress, runningProcesses, nowTick]
  );
  const welcomeSettings = resolvedSettings;
  const welcomeItem = useMemo4(
    () => ({
      id: `__welcome__${welcomeNonce}`,
      sessionId: "",
      role: "system",
      content: "",
      contentParams: null,
      messageParams: null,
      compacted: false,
      visible: true,
      createTime: "",
      updateTime: ""
    }),
    [welcomeNonce]
  );
  const staticItems = useMemo4(() => {
    if (showWelcome && view === "chat") {
      return [welcomeItem, ...messages];
    }
    return messages;
  }, [showWelcome, view, messages, welcomeItem]);
  const handleQuestionAnswers = useCallback2(
    (answers) => {
      void handlePrompt({
        text: formatAskUserQuestionAnswers(answers),
        imageUrls: []
      });
    },
    [handlePrompt]
  );
  const handleQuestionCancel = useCallback2(() => {
    if (!pendingQuestion) {
      return;
    }
    setDismissedQuestionIds((prev) => new Set(prev).add(pendingQuestion.messageId));
  }, [pendingQuestion]);
  return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", width: screenWidth, minWidth: 80, overflowX: "visible", children: [
    /* @__PURE__ */ jsx8(Static, { items: staticItems, children: (item) => {
      if (item.id.startsWith("__welcome__")) {
        return /* @__PURE__ */ jsx8(
          WelcomeScreen,
          {
            projectRoot,
            settings: welcomeSettings,
            skills,
            version,
            width: screenWidth
          },
          item.id
        );
      }
      return /* @__PURE__ */ jsx8(MessageView, { message: item, collapsed: isCollapsedThinking(item, expandedThinkingId) }, item.id);
    } }),
    statusLine ? /* @__PURE__ */ jsx8(Box7, { children: /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: statusLine }) }) : null,
    errorLine ? /* @__PURE__ */ jsx8(Box7, { children: /* @__PURE__ */ jsxs7(Text8, { color: "red", children: [
      "Error: ",
      errorLine
    ] }) }) : null,
    view === "session-list" ? /* @__PURE__ */ jsx8(
      SessionList,
      {
        sessions,
        onSelect: (id) => void handleSelectSession(id),
        onCancel: () => setView("chat")
      }
    ) : shouldShowQuestionPrompt && pendingQuestion && !busy ? /* @__PURE__ */ jsx8(
      AskUserQuestionPrompt,
      {
        questions: pendingQuestion.questions,
        onSubmit: handleQuestionAnswers,
        onCancel: handleQuestionCancel
      }
    ) : isExiting ? null : /* @__PURE__ */ jsx8(
      PromptInput,
      {
        screenWidth,
        skills,
        modelConfig: resolvedSettings,
        promptHistory,
        busy,
        loadingText,
        onSubmit: handleSubmit,
        onModelConfigChange: handleModelConfigChange,
        onInterrupt: handleInterrupt,
        placeholder: "Type your message..."
      }
    )
  ] });
}
function isCollapsedThinking(message, expandedId) {
  if (message.role !== "assistant") {
    return false;
  }
  if (!message.meta?.asThinking) {
    return false;
  }
  return message.id !== expandedId;
}
function buildSyntheticUserMessage(content, imageCount) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: `local-${Math.random().toString(36).slice(2)}`,
    sessionId: "local",
    role: "user",
    content,
    contentParams: imageCount > 0 ? Array.from({ length: imageCount }, () => ({
      type: "image_url",
      image_url: { url: "" }
    })) : null,
    messageParams: null,
    compacted: false,
    visible: true,
    createTime: now,
    updateTime: now
  };
}
function buildStatusLine(entry) {
  const parts = [];
  parts.push(`status: ${entry.status}`);
  if (typeof entry.activeTokens === "number" && entry.activeTokens > 0) {
    parts.push(`tokens: ${entry.activeTokens}`);
  }
  if (entry.failReason) {
    parts.push(`fail: ${entry.failReason}`);
  }
  return parts.join(" \xB7 ");
}
function readSettings2() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs12.existsSync(settingsPath)) {
      return null;
    }
    const raw = fs12.readFileSync(settingsPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  fs12.mkdirSync(path12.dirname(settingsPath), { recursive: true });
  fs12.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
`, "utf8");
}
function writeModelConfigSelection(selection, current = resolveCurrentSettings2()) {
  const rawSettings = readSettings2();
  const result = applyModelConfigSelection(rawSettings, current, selection);
  if (result.changed) {
    writeSettings(result.settings);
  }
  return result;
}
function resolveCurrentSettings2() {
  return resolveSettings(readSettings2(), {
    model: DEFAULT_MODEL,
    baseURL: DEFAULT_BASE_URL
  });
}
function createOpenAIClient2() {
  const settings = resolveCurrentSettings2();
  if (!settings.apiKey) {
    return {
      client: null,
      model: settings.model,
      baseURL: settings.baseURL,
      thinkingEnabled: settings.thinkingEnabled,
      reasoningEffort: settings.reasoningEffort,
      debugLogEnabled: settings.debugLogEnabled,
      notify: settings.notify,
      webSearchTool: settings.webSearchTool,
      machineId: getMachineId2()
    };
  }
  const client = new OpenAI2({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL || void 0
  });
  return {
    client,
    model: settings.model,
    baseURL: settings.baseURL,
    thinkingEnabled: settings.thinkingEnabled,
    reasoningEffort: settings.reasoningEffort,
    debugLogEnabled: settings.debugLogEnabled,
    notify: settings.notify,
    webSearchTool: settings.webSearchTool,
    machineId: getMachineId2()
  };
}
function getMachineId2() {
  try {
    const idPath = path12.join(os9.homedir(), ".deepcode", "machine-id");
    if (fs12.existsSync(idPath)) {
      const raw = fs12.readFileSync(idPath, "utf8").trim();
      if (raw) {
        return raw;
      }
    }
    const generated = `${os9.hostname()}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    fs12.mkdirSync(path12.dirname(idPath), { recursive: true });
    fs12.writeFileSync(idPath, generated, "utf8");
    return generated;
  } catch {
    return void 0;
  }
}
function getSettingsPath() {
  return path12.join(os9.homedir(), ".deepcode", "settings.json");
}
function formatThinkingMode(settings) {
  if (!settings.thinkingEnabled) {
    return "no thinking";
  }
  return `thinking ${settings.reasoningEffort}`;
}
function formatModelConfig(settings) {
  return `${settings.model}, ${formatThinkingMode(settings)}`;
}

// src/ui/UpdatePrompt.tsx
import { useState as useState8 } from "react";
import { Box as Box8, Text as Text9, useApp as useApp3, useInput } from "ink";
import { jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
function UpdatePrompt({ currentVersion, latestVersion, installCommand, onSelect }) {
  const { exit } = useApp3();
  const [selectedIndex, setSelectedIndex] = useState8(0);
  const options = [
    {
      value: "install",
      label: `Install the latest version with \`${installCommand}\``
    },
    {
      value: "ignore-once",
      label: "Ignore once"
    },
    {
      value: "ignore-version",
      label: `Ignore this version (${latestVersion})`
    }
  ];
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (key.downArrow || key.tab) {
      setSelectedIndex((index) => (index + 1) % options.length);
      return;
    }
    if (key.return) {
      onSelect(options[selectedIndex]?.value ?? "ignore-once");
      exit();
      return;
    }
    if (key.escape || key.ctrl && (input === "c" || input === "C")) {
      onSelect("ignore-once");
      exit();
      return;
    }
    if (/^[1-3]$/.test(input)) {
      onSelect(options[Number(input) - 1]?.value ?? "ignore-once");
      exit();
    }
  });
  return /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", marginY: 1, children: [
    /* @__PURE__ */ jsxs8(Text9, { bold: true, children: [
      "Deep Code latest version has been released: ",
      currentVersion,
      " -> ",
      latestVersion
    ] }),
    /* @__PURE__ */ jsx9(Box8, { flexDirection: "column", marginTop: 1, children: options.map((option, index) => {
      const selected = index === selectedIndex;
      return /* @__PURE__ */ jsxs8(Text9, { color: selected ? "green" : void 0, children: [
        selected ? "> " : "  ",
        index + 1,
        ". ",
        option.label
      ] }, option.value);
    }) }),
    /* @__PURE__ */ jsx9(Box8, { marginTop: 1, children: /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Use Up/Down to choose, Enter to confirm, Esc to ignore once." }) })
  ] });
}

// src/updateCheck.ts
import { spawn as spawn4 } from "child_process";
import React8 from "react";
import * as fs13 from "fs";
import * as os10 from "os";
import * as path13 from "path";
import { render } from "ink";
import chalk5 from "chalk";
var UPDATE_STATE_FILE = "update-check.json";
var NPM_VIEW_TIMEOUT_MS = 5e3;
var MAX_NPM_VIEW_OUTPUT_CHARS = 64 * 1024;
var TENCENT_MIRROR_REGISTRY = "https://mirrors.cloud.tencent.com/npm/";
async function promptForPendingUpdate(packageInfo2) {
  const state = readUpdateState();
  const pending = state.pending;
  if (!pending) {
    return { installed: false };
  }
  if (compareVersions(packageInfo2.version, pending.latestVersion) >= 0) {
    writeUpdateState({ ...state, pending: null });
    return { installed: false };
  }
  if (state.ignoredVersions?.includes(pending.latestVersion)) {
    writeUpdateState({ ...state, pending: null });
    return { installed: false };
  }
  const installSpec = `${pending.packageName}@${pending.latestVersion}`;
  const installCommand = `npm install -g ${installSpec}`;
  const choice = await promptUpdateChoice({
    currentVersion: packageInfo2.version,
    latestVersion: pending.latestVersion,
    installCommand
  });
  if (choice === "install") {
    const ok = await runNpmInstallGlobal(installSpec);
    if (ok) {
      writeUpdateState({ ...state, pending: null });
      process.stdout.write(
        `
${chalk5.red("Deep Code has been updated. Please restart the CLI to use the new version.")}

`
      );
    }
    return { installed: ok };
  }
  if (choice === "ignore-version") {
    const ignoredVersions = Array.from(/* @__PURE__ */ new Set([...state.ignoredVersions ?? [], pending.latestVersion]));
    writeUpdateState({ ...state, pending: null, ignoredVersions });
    return { installed: false };
  }
  writeUpdateState({ ...state, pending: null });
  return { installed: false };
}
async function checkForNpmUpdate(packageInfo2) {
  if (!packageInfo2.name || !packageInfo2.version) {
    return;
  }
  try {
    const latestVersion = await fetchLatestNpmVersion(packageInfo2.name);
    if (!latestVersion || compareVersions(latestVersion, packageInfo2.version) <= 0) {
      clearPendingUpdate();
      return;
    }
    const state = readUpdateState();
    if (state.ignoredVersions?.includes(latestVersion)) {
      clearPendingUpdate(state);
      return;
    }
    writeUpdateState({
      ...state,
      pending: {
        currentVersion: packageInfo2.version,
        latestVersion,
        packageName: packageInfo2.name,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch {
  }
}
function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const width = Math.max(left.length, right.length);
  for (let index = 0; index < width; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }
  return 0;
}
function getUpdateStatePath() {
  return path13.join(os10.homedir(), ".deepcode", UPDATE_STATE_FILE);
}
async function promptUpdateChoice({
  currentVersion,
  latestVersion,
  installCommand
}) {
  return new Promise((resolve6) => {
    let selected = false;
    let instance = null;
    const handleSelect = (choice) => {
      if (selected) {
        return;
      }
      selected = true;
      resolve6(choice);
      instance?.unmount();
    };
    instance = render(
      React8.createElement(UpdatePrompt, {
        currentVersion,
        latestVersion,
        installCommand,
        onSelect: handleSelect
      }),
      { exitOnCtrlC: false }
    );
  });
}
async function runNpmInstallGlobal(installSpec) {
  return new Promise((resolve6) => {
    const child = spawn4("npm", ["install", "-g", installSpec], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.on("error", (error) => {
      process.stderr.write(`Failed to start npm install: ${error.message}
`);
      resolve6(false);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve6(true);
        return;
      }
      process.stderr.write(`npm install exited with code ${code ?? "unknown"}.
`);
      resolve6(false);
    });
  });
}
async function fetchLatestNpmVersion(packageName) {
  const mirrorResult = await runNpmViewLatestVersion(packageName, TENCENT_MIRROR_REGISTRY, NPM_VIEW_TIMEOUT_MS);
  if (mirrorResult.ok) {
    return parseNpmViewVersion(mirrorResult.stdout);
  }
  const result = await runNpmViewLatestVersion(packageName, void 0, NPM_VIEW_TIMEOUT_MS);
  if (!result.ok) {
    return null;
  }
  return parseNpmViewVersion(result.stdout);
}
function runNpmViewLatestVersion(packageName, registry, timeoutMs) {
  return new Promise((resolve6) => {
    const args2 = ["view", packageName, "dist-tags.latest", "--json"];
    if (registry) {
      args2.push("--registry", registry);
    }
    const child = spawn4("npm", args2, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    let stdout = "";
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve6(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false });
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      if (stdout.length >= MAX_NPM_VIEW_OUTPUT_CHARS) {
        return;
      }
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      stdout += text.slice(0, MAX_NPM_VIEW_OUTPUT_CHARS - stdout.length);
    });
    child.on("error", () => finish({ ok: false }));
    child.on("close", (code) => {
      finish(code === 0 ? { ok: true, stdout } : { ok: false });
    });
  });
}
function parseNpmViewVersion(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "string" && parsed.trim() ? parsed.trim() : null;
  } catch {
    return trimmed.split(/\r?\n/)[0]?.trim() || null;
  }
}
function readUpdateState() {
  const statePath = getUpdateStatePath();
  if (!fs13.existsSync(statePath)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs13.readFileSync(statePath, "utf8"));
    return {
      pending: parsed.pending ?? null,
      ignoredVersions: Array.isArray(parsed.ignoredVersions) ? parsed.ignoredVersions.filter(
        (value) => typeof value === "string" && value.trim().length > 0
      ) : []
    };
  } catch {
    return {};
  }
}
function writeUpdateState(state) {
  const statePath = getUpdateStatePath();
  fs13.mkdirSync(path13.dirname(statePath), { recursive: true });
  fs13.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}
`, "utf8");
}
function clearPendingUpdate(state = readUpdateState()) {
  if (!state.pending) {
    return;
  }
  writeUpdateState({ ...state, pending: null });
}
function parseVersion(value) {
  return value.split("-", 1)[0].split(".").map((part) => Number.parseInt(part, 10)).map((part) => Number.isFinite(part) ? part : 0);
}

// src/headless.ts
import * as readline from "readline";
import * as fs14 from "fs";
function jsonReplacer(_key, value) {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
}
function serializeEntry(entry) {
  const processes = entry.processes ? Object.fromEntries(entry.processes) : null;
  return { ...entry, processes };
}
function parseHeadlessArgs(args2) {
  const options = {};
  for (let i = 0; i < args2.length; i += 1) {
    const arg = args2[i];
    if (arg === "--project-root" && i + 1 < args2.length) {
      options.projectRoot = args2[i + 1];
      i += 1;
    }
  }
  return options;
}
async function runHeadless(args2, packageVersion, overrides = {}) {
  const opts = parseHeadlessArgs(args2);
  return runHeadlessWithOptions({
    ...overrides,
    projectRoot: opts.projectRoot
  }, packageVersion);
}
async function runHeadlessWithOptions(options, packageVersion) {
  const projectRoot = options.projectRoot && options.projectRoot.trim().length > 0 ? options.projectRoot : process.cwd();
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const createOpenAIClient3 = options.createOpenAIClient ?? createOpenAIClient;
  const exitOnClose = options.exitOnClose ?? true;
  function emit(event) {
    output.write(`${JSON.stringify(event, jsonReplacer)}
`);
  }
  const manager = new SessionManager({
    projectRoot,
    createOpenAIClient: createOpenAIClient3,
    getResolvedSettings: () => resolveCurrentSettings(),
    renderMarkdown: (text) => text,
    onAssistantMessage: (message) => {
      emit({ type: "message", message });
    },
    onSessionEntryUpdated: (entry) => {
      emit({ type: "session", entry: serializeEntry(entry) });
    },
    onLlmStreamProgress: (progress) => {
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
  let chain = Promise.resolve();
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    let inbound;
    try {
      inbound = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emit({ type: "error", error: `Invalid JSON: ${message}` });
      return;
    }
    chain = chain.then(() => handleInbound(inbound)).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "error", error: `Internal error: ${message}` });
    });
  });
  return new Promise((resolve6) => {
    rl.on("close", () => {
      chain.finally(() => {
        if (exitOnClose) {
          process.exit(0);
        }
        resolve6();
      });
    });
  });
  async function handleInbound(inbound) {
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
        const messages = manager.listSessionMessages(inbound.sessionId).filter((m) => m.visible);
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
          const prompt = {
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
          const stat = fs14.statSync(newPath);
          if (!stat.isDirectory()) {
            emit({ type: "error", id: inbound.id, error: `path is not a directory: ${newPath}` });
            return;
          }
        } catch (err) {
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
          const sessionId = manager.getActiveSessionId() ?? void 0;
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
        const value = inbound;
        emit({
          type: "error",
          error: `Unknown inbound type: ${String(value.type)}`
        });
      }
    }
  }
}

// src/cli.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
var args = process.argv.slice(2);
var packageInfo = readPackageInfo();
if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${packageInfo.version || "unknown"}
`);
  process.exit(0);
}
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(
    [
      "deepcode - Deep Code CLI",
      "",
      "Usage:",
      "  deepcode               Launch the interactive TUI in the current directory",
      "  deepcode headless      Run a headless NDJSON server over stdio (for native frontends)",
      "  deepcode --version     Print the version",
      "  deepcode --help        Show this help",
      "",
      "Headless options:",
      "  --project-root <path>  Use the given directory as the project root (default: cwd)",
      "",
      "Configuration:",
      "  ~/.deepcode/settings.json   API key, model, base URL",
      "  ~/.agents/skills/*/SKILL.md  User-level skills",
      "  ./.agents/skills/*/SKILL.md  Project-level skills",
      "  ./.deepcode/skills/*/SKILL.md Legacy project-level skills",
      "",
      "Inside the TUI:",
      "  enter            Send the prompt",
      "  shift+enter      Insert a newline",
      "  home/end         Move within the current line",
      "  alt+left/right   Move by word",
      "  ctrl+w           Delete the previous word",
      "  ctrl+v           Paste an image from the clipboard",
      "  ctrl+x           Clear pasted images",
      "  esc              Interrupt the current model turn",
      "  /                Open the skills/commands menu",
      "  /new             Start a fresh conversation",
      "  /init            Initialize an AGENTS.md file with instructions for LLM",
      "  /resume          Pick a previous conversation to continue",
      "  /exit            Quit",
      "  ctrl+d twice     Quit"
    ].join("\n") + "\n"
  );
  process.exit(0);
}
if (args[0] === "headless") {
  configureWindowsShell();
  void runHeadless(args.slice(1), packageInfo.version || "unknown").catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`deepcode headless: ${message}
`);
    process.exit(1);
  });
} else {
  configureWindowsShell();
  if (!process.stdin.isTTY) {
    process.stderr.write(
      "deepcode requires an interactive terminal (TTY). Re-run from a real terminal session, or use `deepcode headless` for a programmatic interface.\n"
    );
    process.exit(1);
  }
  void main();
}
async function main() {
  const updatePromptResult = await promptForPendingUpdate(packageInfo);
  const restartRef = { current: null };
  function startApp() {
    const inkInstance = render2(
      /* @__PURE__ */ jsx10(App, { projectRoot: process.cwd(), version: packageInfo.version, onRestart: () => restartRef.current?.() }),
      { exitOnCtrlC: false }
    );
    restartRef.current = () => {
      process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
      inkInstance.unmount();
      startApp();
    };
    inkInstance.waitUntilExit().then(() => {
      if (!restartRef.current) {
        process.exit(0);
      }
    });
  }
  if (!updatePromptResult.installed) {
    void checkForNpmUpdate(packageInfo);
  }
  startApp();
}
function configureWindowsShell() {
  process.env.NoDefaultCurrentDirectoryInExePath = "1";
  try {
    setShellIfWindows();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`deepcode: ${message}
`);
    process.exit(1);
  }
}
function readPackageInfo() {
  try {
    const bundleDir = dirname9(fileURLToPath3(import.meta.url));
    const packageJsonCandidates = [resolve5(bundleDir, "../package.json"), resolve5(bundleDir, "package.json")];
    const packageJson = packageJsonCandidates.map((candidate) => {
      try {
        return readFileSync10(candidate, "utf8");
      } catch {
        return "";
      }
    }).find((content) => content.length > 0);
    if (!packageJson) {
      return { name: "@vegamo/deepcode-cli", version: "" };
    }
    const pkg = JSON.parse(packageJson);
    return {
      name: typeof pkg.name === "string" ? pkg.name : "@vegamo/deepcode-cli",
      version: typeof pkg.version === "string" ? pkg.version : ""
    };
  } catch {
    return { name: "@vegamo/deepcode-cli", version: "" };
  }
}
