#!/usr/bin/env node
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) =>
  function __require() {
    return (mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports);
  };

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "@vegamo/deepcode-cli",
      version: "0.2.13",
      description: "Deep Code CLI - Vibe coding for the deepseek-v4 model in your terminal",
      license: "MIT",
      type: "module",
      repository: {
        type: "git",
        url: "https://github.com/lessweb/deepcode-cli.git",
      },
      homepage: "https://deepcode.vegamo.cn",
      bin: {
        deepcode: "./dist/cli.js",
      },
      main: "./dist/cli.js",
      files: [
        "dist/cli.js",
        "templates/tools/**",
        "templates/prompts/**",
        "templates/skills/**",
        "README.md",
        "LICENSE",
      ],
      engines: {
        node: ">=22",
      },
      scripts: {
        typecheck: "tsc -p ./ --noEmit",
        bundle:
          'esbuild ./src/cli.tsx --bundle --platform=node --format=esm --target=node18 --outfile=dist/cli.js --banner:js="#!/usr/bin/env node" --jsx=automatic --jsx-import-source=react --packages=external --log-override:empty-import-meta=silent',
        lint: "eslint src/",
        "lint:fix": "eslint src/ --fix",
        format: "prettier --write 'src/**/*.{ts,tsx}'",
        "format:check": "prettier --check 'src/**/*.{ts,tsx}'",
        check: "npm run typecheck && npm run lint && npm run format:check",
        build: `npm run check && npm run bundle && node -e "require('fs').chmodSync('dist/cli.js', 0o755)"`,
        test: "node src/tests/run-tests.mjs",
        "test:single": "tsx --test",
        prepack: "npm run build",
        prepare: "husky",
      },
      dependencies: {
        chalk: "^5.6.2",
        ejs: "^5.0.2",
        "gradient-string": "^3.0.0",
        "gray-matter": "^4.0.3",
        ignore: "^7.0.5",
        ink: "^7.0.1",
        "ink-gradient": "^4.0.0",
        openai: "^6.35.0",
        react: "^19.2.5",
        zod: "^4.4.3",
      },
      devDependencies: {
        "@eslint/js": "^9.39.4",
        "@types/ejs": "^3.1.5",
        "@types/node": "^25.6.0",
        "@types/react": "^19.2.14",
        esbuild: "^0.28.0",
        eslint: "^9.39.4",
        "eslint-config-prettier": "^10.1.8",
        "eslint-plugin-react-hooks": "^7.1.1",
        glob: "^13.0.6",
        husky: "^9.1.7",
        "lint-staged": "^17.0.4",
        prettier: "^3.8.3",
        tsx: "^4.21.0",
        typescript: "^6.0.3",
        "typescript-eslint": "^8.59.2",
      },
    };
  },
});

// src/cli.tsx
import { render as render2 } from "ink";

// src/common/shell-utils.ts
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as pathWin32 from "path/win32";
var WINDOWS_GIT_LOCATIONS = ["C:\\Program Files\\Git\\cmd\\git.exe", "C:\\Program Files (x86)\\Git\\cmd\\git.exe"];
var WINDOWS_BASH_LOCATIONS = ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe"];
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
  const bashPath = resolveWindowsGitBashPath({
    findExecutableCandidates: findAllWindowsExecutableCandidates,
    findGitExecPath,
    existsSync: fs.existsSync,
  });
  if (bashPath) {
    cachedGitBashPath = bashPath;
    return bashPath;
  }
  throw new Error(
    "Deep Code on Windows requires Git Bash. Install Git for Windows, or ensure Git's bash.exe is available in PATH."
  );
}
function resolveWindowsGitBashPath(lookup) {
  return firstExistingWindowsPath(
    [
      ...lookup.findExecutableCandidates("bash"),
      ...WINDOWS_BASH_LOCATIONS,
      ...gitExecPathToBashCandidates(lookup.findGitExecPath()),
      ...lookup.findExecutableCandidates("git").flatMap(gitExecutableToBashCandidates),
    ],
    lookup.existsSync
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
function buildShellEnv(shellPath, extraEnv = {}) {
  const env = {
    ...process.env,
    ...extraEnv,
    SHELL: shellPath,
    GIT_EDITOR: "true",
  };
  if (process.platform === "win32") {
    const tmpdir3 = windowsPathToPosixPath(os.tmpdir());
    env.TMPDIR = tmpdir3;
    env.TMPPREFIX = path.posix.join(tmpdir3, "zsh");
  }
  return env;
}
function findAllWindowsExecutableCandidates(executable) {
  const extraCandidates =
    executable === "git" ? WINDOWS_GIT_LOCATIONS : executable === "bash" ? WINDOWS_BASH_LOCATIONS : [];
  try {
    const output = execFileSync("where.exe", [executable], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    let whereResults = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (executable === "bash") {
      whereResults = whereResults.filter((candidate) => !/system32[\\/]bash\.exe$/i.test(candidate));
    }
    return filterWindowsExecutableCandidates([...whereResults, ...extraCandidates]);
  } catch {
    return filterWindowsExecutableCandidates(extraCandidates);
  }
}
function findGitExecPath() {
  try {
    const output = execFileSync("git", ["--exec-path"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
    return output || null;
  } catch {
    return null;
  }
}
function gitExecPathToBashCandidates(execPath) {
  if (!execPath) {
    return [];
  }
  const normalized = execPath.replace(/\//g, "\\");
  return [
    pathWin32.join(normalized, "..", "..", "..", "bin", "bash.exe"),
    pathWin32.join(normalized, "..", "..", "bin", "bash.exe"),
  ];
}
function gitExecutableToBashCandidates(gitPath) {
  return [pathWin32.join(gitPath, "..", "..", "bin", "bash.exe"), pathWin32.join(gitPath, "..", "bin", "bash.exe")];
}
function firstExistingWindowsPath(candidates, existsSync12) {
  const seen = /* @__PURE__ */ new Set();
  for (const candidate of candidates) {
    const normalized = pathWin32.resolve(candidate);
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (getShellKind(normalized) === "bash" && existsSync12(normalized)) {
      return normalized;
    }
  }
  return null;
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

// src/updateCheck.ts
import { spawn as spawn5 } from "child_process";
import React13 from "react";
import * as fs13 from "fs";
import * as os10 from "os";
import * as path14 from "path";
import { render } from "ink";
import chalk6 from "chalk";

// src/ui/App.tsx
import {
  useCallback as useCallback3,
  useEffect as useEffect5,
  useLayoutEffect as useLayoutEffect2,
  useMemo as useMemo8,
  useRef as useRef6,
  useState as useState9,
} from "react";
import {
  Box as Box10,
  Static,
  Text as Text11,
  useApp as useApp2,
  useStdout as useStdout2,
  useWindowSize as useWindowSize3,
} from "ink";
import chalk5 from "chalk";
import * as fs12 from "fs";
import * as os9 from "os";
import * as path13 from "path";
import OpenAI from "openai";

// src/session.ts
import * as fs9 from "fs";
import * as path9 from "path";
import * as os6 from "os";
import * as crypto2 from "crypto";
import { fileURLToPath as fileURLToPath2 } from "url";
import matter from "gray-matter";
import ejs2 from "ejs";

// src/common/notify.ts
import { spawn } from "child_process";
function formatDurationSeconds(durationMs) {
  const safeMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return String(Math.floor(safeMs / 1e3));
}
function buildNotifyEnv(durationMs, baseEnv = process.env, context = {}) {
  const env = {
    ...baseEnv,
    DURATION: formatDurationSeconds(durationMs),
  };
  delete env.STATUS;
  delete env.FAIL_REASON;
  delete env.BODY;
  delete env.TITLE;
  if (context.status) {
    env.STATUS = context.status;
  }
  if (context.failReason) {
    env.FAIL_REASON = context.failReason;
  }
  if (context.body) {
    env.BODY = context.body;
  }
  if (context.title) {
    env.TITLE = context.title;
  }
  return env;
}
function launchNotifyScript(
  notifyPath,
  durationMs,
  workingDirectory,
  spawnProcess = spawn,
  configuredEnv = {},
  context = {}
) {
  const commandPath = notifyPath?.trim();
  if (!commandPath) {
    return;
  }
  const options = {
    cwd: workingDirectory,
    detached: process.platform !== "win32",
    env: buildNotifyEnv(durationMs, { ...process.env, ...configuredEnv }, context),
    stdio: "ignore",
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
      } catch {}
    });
    child.unref();
  } catch {}
}

// src/common/openai-thinking.ts
function buildThinkingRequestOptions(thinkingEnabled, _baseURL, reasoningEffort = "max") {
  const thinking = { type: thinkingEnabled ? "enabled" : "disabled" };
  return {
    thinking,
    ...(thinkingEnabled ? { extra_body: { reasoning_effort: reasoningEffort } } : {}),
  };
}

// src/common/model-capabilities.ts
var DEEPSEEK_V4_MODELS = /* @__PURE__ */ new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
var NON_MULTIMODAL_MODELS = /* @__PURE__ */ new Set([
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  "deepseek-chat",
  "deepseek-reasoner",
]);
function defaultsToThinkingMode(model) {
  return DEEPSEEK_V4_MODELS.has(model);
}
function supportsMultimodal(model) {
  return !NON_MULTIMODAL_MODELS.has(model.trim());
}

// src/prompt.ts
import { execFileSync as execFileSync2, execSync } from "child_process";
import * as fs2 from "fs";
import * as os2 from "os";
import * as path2 from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
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
var SYSTEM_PROMPT_BASE = `\u4F60\u662F\u540D\u53EBDeep Code\u7684\u4EA4\u4E92\u5F0FCLI\u5DE5\u5177\uFF0C\u5E2E\u52A9\u7528\u6237\u5B8C\u6210\u8F6F\u4EF6\u5DE5\u7A0B\u4EFB\u52A1\u3002 Use the instructions below and the tools available to you to assist the user.

\u91CD\u8981\uFF1A\u4E25\u7981\u7F16\u9020\u4EFB\u4F55\u975E\u7F16\u7A0B\u76F8\u5173\u7684 URL\u3002\u5BF9\u4E8E\u7F16\u7A0B\u94FE\u63A5\uFF0C\u4EC5\u9650\u4F7F\u7528\uFF1A1) \u7528\u6237\u63D0\u4F9B\u7684\u4E0A\u4E0B\u6587\uFF1B2) \u4F60\u786E\u5B9A\u7684\u5B98\u65B9\u6587\u6863\u4E3B\u57DF\u540D\u3002\u5728\u8F93\u51FA\u524D\uFF0C\u5FC5\u987B\u81EA\u67E5\u8BE5\u94FE\u63A5\u662F\u5426\u5B58\u5728\u4E8E\u4F60\u7684\u4E0A\u4E0B\u6587\u8BB0\u5FC6\u4E2D\uFF1B\u82E5\u4E0D\u5B58\u5728\uFF0C\u8BF7\u660E\u786E\u8BF4\u660E\u65E0\u6CD5\u63D0\u4F9B\u3002`;
var DEFAULT_SKILL_TEMPLATES = ["agent-drift-guard.md", "plan-and-execute.md"];
function readToolDocs(extensionRoot, options = {}) {
  const toolsDir = path2.join(extensionRoot, "templates", "tools");
  if (!fs2.existsSync(toolsDir)) {
    return "";
  }
  const entries = fs2.readdirSync(toolsDir);
  const docs = entries
    .filter((entry) => entry.endsWith(".md") || entry.endsWith(".md.ejs"))
    .sort()
    .map((entry) => {
      const fullPath = path2.join(toolsDir, entry);
      try {
        const template = fs2.readFileSync(fullPath, "utf8");
        const content = entry.endsWith(".ejs")
          ? ejs.render(template, { supportsMultimodal: supportsMultimodal(options.model ?? "") })
          : template;
        return content.trim();
      } catch {
        return "";
      }
    })
    .filter((content) => content.length > 0);
  return docs.join("\n\n");
}
function readDefaultSkillDocs(extensionRoot) {
  const skillsDir = path2.join(extensionRoot, "templates", "skills");
  return DEFAULT_SKILL_TEMPLATES.map((entry) => {
    const fullPath = path2.join(skillsDir, entry);
    try {
      return {
        name: path2.basename(entry, ".md"),
        content: fs2.readFileSync(fullPath, "utf8").trim(),
      };
    } catch {
      return null;
    }
  }).filter((skill) => Boolean(skill?.content));
}
function getDefaultSkillPrompt() {
  const skillDocs = readDefaultSkillDocs(getExtensionRoot());
  if (skillDocs.length === 0) {
    return "";
  }
  const blocks = skillDocs.map(
    (skill) => `<${skill.name}-skill>
${skill.content}
</${skill.name}-skill>`
  );
  return `Use the skill documents below to assist the user:
${blocks.join("\n\n")}`;
}
function getCurrentDateAndModelPrompt(model) {
  const date = /* @__PURE__ */ new Date();
  let prompt = `\u4ECA\u5929\u662F${date.getFullYear()}\u5E74${date.getMonth() + 1}\u6708${date.getDate()}\u65E5\u3002\u968F\u7740\u5BF9\u8BDD\u7684\u8FDB\u884C\uFF0C\u65F6\u95F4\u5728\u6D41\u901D\u3002`;
  prompt += model
    ? `
\u5F53\u524DLLM\u6A21\u578B\u4E3A${model}\uFF0C\u5BF9\u8BDD\u4E2D\u53EF\u901A\u8FC7/model\u547D\u4EE4\u5207\u6362\u6A21\u578B\u3002`
    : "";
  return prompt;
}
function getSystemPrompt(_projectRoot, options = {}) {
  const toolDocs = readToolDocs(getExtensionRoot(), options);
  const basePrompt = toolDocs
    ? `${SYSTEM_PROMPT_BASE}

# Available Tools

${toolDocs}`
    : SYSTEM_PROMPT_BASE;
  return basePrompt;
}
function getCompactPrompt(sessionMessages) {
  const jsonl = sessionMessages
    .map((message) =>
      JSON.stringify({
        id: message.id,
        role: message.role,
        content: message.content,
        contentParams: message.contentParams,
        messageParams: message.messageParams,
        createTime: message.createTime,
      })
    )
    .join("\n");
  return `${COMPACT_PROMPT_BASE}

conversation below:

\`\`\`jsonl
${jsonl}
\`\`\``;
}
function getRuntimeContext(projectRoot2, model) {
  const uname = getUnameInfo();
  const shellPath = getShellPathInfo();
  const shellModeOpts = process.platform === "win32" ? { "shell mode": "git-bash" } : {};
  const runtimeVersions = getRuntimeVersionInfo();
  const env = {
    "root path": projectRoot2,
    pwd: projectRoot2,
    homedir: os2.homedir(),
    "system info": uname,
    "shell path": shellPath,
    ...shellModeOpts,
    ...runtimeVersions,
    "command installed": {
      ripgrep: checkToolInstalled("rg"),
      jq: checkToolInstalled("jq"),
    },
  };
  return `${getCurrentDateAndModelPrompt(model)}

# Local Workspace Environment

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
        windowsHide: true,
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
        windowsHide: true,
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
        windowsHide: true,
      }).trim();
    }
    return execSync("uname -a", { encoding: "utf8" }).trim();
  } catch {
    return `${os2.type()} ${os2.release()} ${os2.arch()}`;
  }
}
function getExtensionRoot() {
  if (typeof __dirname !== "undefined") {
    return path2.resolve(__dirname, "..");
  }
  const currentFilePath = fileURLToPath(import.meta.url);
  return path2.resolve(path2.dirname(currentFilePath), "..");
}
function getTools(_options = {}, externalTools = []) {
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
              description: "The shell command to execute",
            },
            description: {
              type: "string",
              description:
                'Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description - just describe what it does.',
            },
          },
          required: ["command"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "AskUserQuestion",
        description:
          "When the task has ambiguities or multiple implementation approaches, use this tool to pause execution and ask the user a question to get clarification or make a decision.",
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
                    description: "The question to ask the user.",
                  },
                  multiSelect: {
                    type: "boolean",
                    description: "Whether the user may choose multiple options.",
                  },
                  options: {
                    type: "array",
                    description: "A list of predefined options for the user to choose from.",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: "string",
                          description: "The display text for the option.",
                        },
                        description: {
                          type: "string",
                          description:
                            "A detailed explanation or hint about this option to help the user understand what happens if they choose it.",
                        },
                      },
                      required: ["label"],
                    },
                  },
                },
                required: ["question", "options"],
              },
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "UpdatePlan",
        description:
          "Update the current task plan. The plan argument must be the complete markdown task list to show as the latest progress state.",
        parameters: {
          type: "object",
          properties: {
            plan: {
              type: "string",
              description:
                "The complete markdown task list, including task status markers such as [ ], [>], [x], and optional notes.",
            },
            explanation: {
              type: "string",
              description: "Optional short reason for changing the plan.",
            },
          },
          required: ["plan"],
          additionalProperties: false,
        },
      },
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
              description: "UNIX-style path to file",
            },
            offset: {
              type: "number",
              description: "Line number to start reading from",
            },
            limit: {
              type: "number",
              description: "Number of lines to read",
            },
            pages: {
              type: "string",
              description: 'Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files.',
            },
          },
          required: ["file_path"],
          additionalProperties: false,
        },
      },
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
              description: "Absolute path to file",
            },
            content: {
              type: "string",
              description: "Complete file content as a single string. Serialize JSON documents before writing.",
            },
          },
          required: ["file_path", "content"],
          additionalProperties: false,
        },
      },
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
              description: "Absolute path to file. Optional when snippet_id is provided.",
            },
            snippet_id: {
              type: "string",
              description:
                "Snippet id returned by the Read or Edit tool to scope the search range after a partial read.",
            },
            old_string: {
              type: "string",
              description: "Exact text to replace inside the file or snippet scope",
            },
            new_string: {
              type: "string",
              description: "Replacement text (must differ from old_string)",
            },
            replace_all: {
              type: "boolean",
              description: "Replace all occurences of old_string (default false)",
              default: false,
            },
            expected_occurrences: {
              type: "number",
              description: "Expected number of matches, especially useful as a safety check with replace_all",
            },
          },
          required: ["old_string", "new_string"],
          additionalProperties: false,
        },
      },
    },
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
            description:
              "A search query phrased as a clear, specific natural language question or statement that includes key context.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  });
  for (const tool of externalTools) {
    tools.push(tool);
  }
  return tools;
}

// src/tools/ask-user-question-handler.ts
async function handleAskUserQuestionTool(args2, _context) {
  const questions = parseQuestions(args2.questions);
  if (!questions.ok) {
    return {
      ok: false,
      name: "AskUserQuestion",
      error: questions.error,
    };
  }
  const metadata = {
    kind: "ask_user_question",
    questions: questions.value,
  };
  return {
    ok: true,
    name: "AskUserQuestion",
    output: buildQuestionSummary(questions.value),
    metadata,
    awaitUserResponse: true,
  };
}
function parseQuestions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      error: '"questions" must be a non-empty array.',
    };
  }
  const questions = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        ok: false,
        error: `Question at index ${index} must be an object.`,
      };
    }
    const question = typeof item.question === "string" ? item.question.trim() : "";
    if (!question) {
      return {
        ok: false,
        error: `Question at index ${index} is missing a non-empty "question" string.`,
      };
    }
    const rawOptions = item.options;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
      return {
        ok: false,
        error: `Question at index ${index} must include a non-empty "options" array.`,
      };
    }
    const options = [];
    for (let optionIndex = 0; optionIndex < rawOptions.length; optionIndex += 1) {
      const option = rawOptions[optionIndex];
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return {
          ok: false,
          error: `Option ${optionIndex} for question ${index} must be an object.`,
        };
      }
      const label = typeof option.label === "string" ? option.label.trim() : "";
      if (!label) {
        return {
          ok: false,
          error: `Option ${optionIndex} for question ${index} is missing a non-empty "label" string.`,
        };
      }
      const description = typeof option.description === "string" ? option.description.trim() : void 0;
      options.push({
        label,
        description: description || void 0,
      });
    }
    const multiSelect = typeof item.multiSelect === "boolean" ? item.multiSelect : void 0;
    questions.push({
      question,
      multiSelect,
      options,
    });
  }
  return {
    ok: true,
    value: questions,
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

// src/common/bash-timeout.ts
var DEFAULT_BASH_TIMEOUT_MS = 10 * 60 * 1e3;
var MIN_BASH_TIMEOUT_MS = 60 * 1e3;
var BASH_TIMEOUT_INCREMENT_MS = 5 * 60 * 1e3;
var BASH_TIMEOUT_DECREMENT_MS = 60 * 1e3;
function clampBashTimeoutMs(timeoutMs, minTimeoutMs = MIN_BASH_TIMEOUT_MS) {
  if (!Number.isFinite(timeoutMs)) {
    return DEFAULT_BASH_TIMEOUT_MS;
  }
  const minimum = Number.isFinite(minTimeoutMs) ? Math.max(1, Math.round(minTimeoutMs)) : MIN_BASH_TIMEOUT_MS;
  return Math.max(minimum, Math.round(timeoutMs));
}

// src/common/process-tree.ts
import { spawnSync } from "child_process";
function killProcessTree(pid, signal = "SIGKILL", deps = {}) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  const platform2 = deps.platform ?? process.platform;
  const killPid = deps.killPid ?? ((targetPid, targetSignal) => process.kill(targetPid, targetSignal));
  if (platform2 === "win32") {
    const runTaskkill = deps.runTaskkill ?? runWindowsTaskkill;
    if (runTaskkill(pid)) {
      return true;
    }
    return killDirectProcess(pid, signal, killPid);
  }
  if (deps.killGroupOnNonWindows !== false && killDirectProcess(-pid, signal, killPid)) {
    return true;
  }
  return killDirectProcess(pid, signal, killPid);
}
function runWindowsTaskkill(pid, spawnSyncImpl = spawnSync) {
  const result = spawnSyncImpl("taskkill", ["/PID", String(pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
  return !result.error && result.status === 0;
}
function killDirectProcess(pid, signal, killPid) {
  try {
    killPid(pid, signal);
    return true;
  } catch {
    return false;
  }
}

// src/tools/bash-handler.ts
var MAX_OUTPUT_CHARS = 3e4;
var MAX_CAPTURE_CHARS = 10 * 1024 * 1024;
var sessionWorkingDirs = /* @__PURE__ */ new Map();
async function handleBashTool(args2, context) {
  const command = typeof args2.command === "string" ? args2.command : "";
  if (!command.trim()) {
    return {
      ok: false,
      name: "bash",
      error: 'Missing required "command" string.',
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
    startCwd,
    execution.timedOut,
    execution.timeoutMs,
    execution.deadlineAtMs
  );
  updateSessionCwd(context.sessionId, startCwd, result.cwd);
  if (execution.error || result.exitCode !== 0 || result.signal !== null) {
    const errorMessage = buildErrorMessage(result.exitCode, result.signal, execution.error, execution.timedOut);
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
  return new Promise((resolve8) => {
    const detached = process.platform !== "win32";
    const configuredEnv = context.createOpenAIClient?.().env ?? {};
    const minTimeoutMs = context.bashMinTimeoutMs;
    const initialTimeoutMs = clampBashTimeoutMs(context.bashTimeoutMs ?? DEFAULT_BASH_TIMEOUT_MS, minTimeoutMs);
    const startedAtMs = Date.now();
    let timeoutMs = initialTimeoutMs;
    let deadlineAtMs = startedAtMs + timeoutMs;
    let timedOut = false;
    let settled = false;
    let timeoutTimer = null;
    const child = spawn2(shellPath, shellArgs, {
      cwd,
      env: buildShellEnv(shellPath, configuredEnv),
      detached,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const pid = child.pid;
    const getTimeoutInfo = () => ({
      timeoutMs,
      startedAtMs,
      deadlineAtMs,
      timedOut,
    });
    const stopTimeoutTimer = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };
    const triggerTimeout = () => {
      if (settled || timedOut || typeof pid !== "number") {
        return;
      }
      timedOut = true;
      stopTimeoutTimer();
      killProcessTree(pid, "SIGKILL");
    };
    const scheduleTimeout = () => {
      stopTimeoutTimer();
      if (settled) {
        return;
      }
      const remainingMs = Math.max(0, deadlineAtMs - Date.now());
      timeoutTimer = setTimeout(triggerTimeout, remainingMs);
    };
    const timeoutControl = {
      getInfo: getTimeoutInfo,
      setTimeoutMs: (nextTimeoutMs) => {
        timeoutMs = clampBashTimeoutMs(nextTimeoutMs, minTimeoutMs);
        deadlineAtMs = startedAtMs + timeoutMs;
        if (deadlineAtMs <= Date.now()) {
          triggerTimeout();
        } else {
          scheduleTimeout();
        }
        return getTimeoutInfo();
      },
    };
    if (typeof pid === "number") {
      context.onProcessStart?.(pid, command);
      context.onProcessTimeoutControl?.(pid, timeoutControl);
      scheduleTimeout();
    }
    let stdout = "";
    let stderr = "";
    let error;
    child.stdout?.on("data", (chunk) => {
      stdout = appendChunk(stdout, chunk);
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      context.onProcessStdout?.(pid, text);
    });
    child.stderr?.on("data", (chunk) => {
      stderr = appendChunk(stderr, chunk);
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      context.onProcessStdout?.(pid, text);
    });
    child.on("error", (spawnError) => {
      error = spawnError.message;
    });
    child.on("close", (code, signal) => {
      settled = true;
      stopTimeoutTimer();
      if (typeof pid === "number") {
        context.onProcessTimeoutControl?.(pid, null);
        context.onProcessExit?.(pid);
      }
      resolve8({
        stdout,
        stderr,
        exitCode: typeof code === "number" ? code : null,
        signal: signal ?? null,
        error,
        timedOut,
        timeoutMs,
        deadlineAtMs,
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
function buildToolCommandResult(
  stdout,
  stderr,
  marker,
  exitCode,
  signal,
  shellPath,
  startCwd,
  timedOut = false,
  timeoutMs,
  deadlineAtMs
) {
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
    startCwd,
    timedOut,
    timeoutMs,
    deadlineAt: typeof deadlineAtMs === "number" ? new Date(deadlineAtMs).toISOString() : void 0,
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
function buildErrorMessage(exitCode, signal, error, timedOut = false) {
  if (error) {
    return error;
  }
  if (timedOut) {
    return "Command timed out.";
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
    startCwd: result.startCwd,
  };
  if (typeof result.timedOut === "boolean") {
    metadata.timedOut = result.timedOut;
  }
  if (typeof result.timeoutMs === "number") {
    metadata.timeoutMs = result.timeoutMs;
  }
  if (result.deadlineAt) {
    metadata.deadlineAt = result.deadlineAt;
  }
  const outputValue = result.output ? result.output : void 0;
  return {
    ok: result.ok,
    name,
    output: outputValue,
    error: errorMessage,
    metadata,
  };
}

// src/tools/edit-handler.ts
import * as fs4 from "fs";
import { z as z2 } from "zod";

// src/common/file-utils.ts
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
    timestamp: Math.floor(stat.mtimeMs),
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
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const oldChanged = oldLines.slice(prefix, oldLines.length - suffix);
  const newChanged = newLines.slice(prefix, newLines.length - suffix);
  const oldStart = original === null ? 0 : prefix + 1;
  const newStart = prefix + 1;
  const previewLines = [
    `--- ${original === null ? "/dev/null" : `a/${filePath}`}`,
    `+++ b/${filePath}`,
    `@@ -${oldStart},${oldChanged.length} +${newStart},${newChanged.length} @@`,
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

// src/common/runtime.ts
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
      error: `InputValidationError: ${preprocessed.error}`,
    };
  }
  const parsed = schema.safeParse(preprocessed.input);
  if (!parsed.success) {
    return {
      ok: false,
      name,
      error: `InputValidationError: ${formatZodError(parsed.error)}`,
    };
  }
  return handler(parsed.data, context);
}
function formatZodError(error) {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid tool input.";
  }
  const path16 = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path16}${issue.message}`;
}

// src/common/state.ts
import * as path4 from "path";
var fileStatesBySession = /* @__PURE__ */ new Map();
var snippetsBySession = /* @__PURE__ */ new Map();
var snippetCountersBySession = /* @__PURE__ */ new Map();
var fileVersionsBySession = /* @__PURE__ */ new Map();
function normalizeFilePath(filePath, platform2 = process.platform) {
  const nativePath = normalizeNativeFilePath(filePath, platform2);
  return platform2 === "win32" ? path4.win32.normalize(nativePath) : path4.normalize(nativePath);
}
function normalizeNativeFilePath(filePath, platform2 = process.platform) {
  if (platform2 !== "win32") {
    return filePath;
  }
  if (isGitBashAbsolutePath(filePath)) {
    return posixPathToWindowsPath(filePath);
  }
  return filePath;
}
function isAbsoluteFilePath(filePath, platform2 = process.platform) {
  const nativePath = normalizeNativeFilePath(filePath, platform2);
  if (platform2 !== "win32") {
    return path4.isAbsolute(nativePath);
  }
  const normalized = path4.win32.normalize(nativePath);
  return path4.win32.isAbsolute(normalized) && (/^[A-Za-z]:[\\/]/.test(normalized) || /^\\\\/.test(normalized));
}
function isGitBashAbsolutePath(filePath) {
  return /^\/[A-Za-z](?:\/|$)/.test(filePath) || /^\/cygdrive\/[A-Za-z](?:\/|$)/.test(filePath);
}
function recordFileState(sessionId, state, options = {}) {
  if (!sessionId || !state.filePath) {
    return;
  }
  let sessionState = fileStatesBySession.get(sessionId);
  if (!sessionState) {
    sessionState = /* @__PURE__ */ new Map();
    fileStatesBySession.set(sessionId, sessionState);
  }
  const normalizedPath = normalizeFilePath(state.filePath);
  const currentVersion = getFileVersion(sessionId, normalizedPath);
  const nextVersion = options.incrementVersion ? currentVersion + 1 : currentVersion;
  setFileVersion(sessionId, normalizedPath, nextVersion);
  sessionState.set(normalizedPath, {
    ...state,
    filePath: normalizedPath,
    version: nextVersion,
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
    lineEndings: state?.lineEndings,
  });
}
function getFileState(sessionId, filePath) {
  if (!sessionId || !filePath) {
    return null;
  }
  return fileStatesBySession.get(sessionId)?.get(normalizeFilePath(filePath)) ?? null;
}
function getFileVersion(sessionId, filePath) {
  if (!sessionId || !filePath) {
    return 0;
  }
  return fileVersionsBySession.get(sessionId)?.get(normalizeFilePath(filePath)) ?? 0;
}
function setFileVersion(sessionId, filePath, version) {
  let sessionVersions = fileVersionsBySession.get(sessionId);
  if (!sessionVersions) {
    sessionVersions = /* @__PURE__ */ new Map();
    fileVersionsBySession.set(sessionId, sessionVersions);
  }
  sessionVersions.set(normalizeFilePath(filePath), version);
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
    preview,
    fileVersion: getFileVersion(sessionId, filePath),
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
function hasSnippetOutdatedFileVersion(sessionId, snippet) {
  return getFileVersion(sessionId, snippet.filePath) > snippet.fileVersion;
}

// src/tools/edit-handler.ts
var MAX_CANDIDATE_COUNT = 5;
var REPLACE_ALL_MATCH_THRESHOLD = 5;
var SHORT_REPLACE_ALL_LENGTH = 40;
var MIN_FUZZY_SCORE = 0.8;
var CLOSEST_MATCH_CONTEXT_LINES = 2;
var OUTDATED_SNIPPET_NOT_FOUND_ERROR =
  "old_string was not found in this snippet scope. The file has changed since this snippet was created. Read the file again before editing.";
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
  }, z2.number().int().min(1, "expected_occurrences must be >= 1.").optional()),
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
          error: 'Missing required "file_path" string or "snippet_id" string.',
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
          error: "file_path must be an absolute path.",
        };
      }
      if (snippetId && !snippet) {
        return {
          ok: false,
          name: "edit",
          error: `Unknown snippet_id: ${snippetId}`,
        };
      }
      if (snippet && snippet.filePath !== filePath) {
        return {
          ok: false,
          name: "edit",
          error: "snippet_id does not belong to the provided file_path.",
        };
      }
      if (input.old_string === "") {
        return {
          ok: false,
          name: "edit",
          error: "old_string must not be empty.",
        };
      }
      if (input.old_string === input.new_string) {
        return {
          ok: false,
          name: "edit",
          error: "new_string must differ from old_string.",
        };
      }
      if (!fs4.existsSync(filePath)) {
        return {
          ok: false,
          name: "edit",
          error: `File not found: ${filePath}`,
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
          error: `Failed to stat file: ${message}`,
        };
      }
      if (stat.isDirectory()) {
        return {
          ok: false,
          name: "edit",
          error: "file_path points to a directory.",
        };
      }
      const fileState = getFileState(context.sessionId, filePath);
      if (!fileState) {
        return {
          ok: false,
          name: "edit",
          error: "Must read file before editing.",
        };
      }
      if (!snippet && !isFullFileView(fileState)) {
        return {
          ok: false,
          name: "edit",
          error: "File was only partially read. Use snippet_id or read the full file before editing.",
        };
      }
      if (hasFileChangedSinceState(filePath, fileState)) {
        return {
          ok: false,
          name: "edit",
          error: "File has been modified since read. Read it again before editing.",
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
          const tabStrippedOldString = stripReadResultLineTabs(oldString);
          if (tabStrippedOldString !== oldString) {
            const tabStrippedMatches = findOccurrences(raw, tabStrippedOldString, scope);
            if (tabStrippedMatches.length === 1) {
              matches = tabStrippedMatches;
              matchedVia = "line_leading_tab_correction";
              replacementOldString = tabStrippedOldString;
              replacementNewString = stripReadResultLineTabs(newString);
            }
          }
        }
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
          if (snippet && hasSnippetOutdatedFileVersion(context.sessionId, snippet)) {
            return {
              ok: false,
              name: "edit",
              error: OUTDATED_SNIPPET_NOT_FOUND_ERROR,
              metadata: {
                scope: formatScopeMetadata(scope),
              },
            };
          }
          const closestMatch = findClosestMatch(raw, oldString, scope, lineIndex);
          return {
            ok: false,
            name: "edit",
            error: "old_string not found in file.",
            metadata: closestMatch
              ? {
                  scope: formatScopeMetadata(scope),
                  closest_match: buildClosestMatchMetadata(context.sessionId, filePath, closestMatch),
                }
              : {
                  scope: formatScopeMetadata(scope),
                },
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
              candidates: buildCandidateMetadata(context.sessionId, filePath, raw, matches),
            },
          };
        }
        const expectedOccurrences = input.expected_occurrences ?? null;
        const replaceAllGuardError = validateReplaceAllGuard({
          replaceAll,
          matchCount: matches.length,
          oldString: replacementOldString,
          expectedOccurrences,
        });
        if (replaceAllGuardError) {
          return {
            ok: false,
            name: "edit",
            error: replaceAllGuardError,
            metadata: {
              match_count: matches.length,
              scope: formatScopeMetadata(scope),
              candidates: buildCandidateMetadata(context.sessionId, filePath, raw, matches),
            },
          };
        }
        const updated = applyReplacement(raw, replacementOldString, replacementNewString, matches, replaceAll);
        const diffPreview = buildDiffPreview(filePath, raw, updated);
        writeTextFile(filePath, updated, metadata.encoding, metadata.lineEndings);
        const freshMetadata = readTextFileWithMetadata(filePath);
        recordFileState(
          context.sessionId,
          {
            filePath,
            content: freshMetadata.content,
            timestamp: freshMetadata.timestamp,
            encoding: freshMetadata.encoding,
            lineEndings: freshMetadata.lineEndings,
          },
          { incrementVersion: true }
        );
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
            scope: formatScopeMetadata(scope),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "edit",
          error: message,
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
      },
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
      snippetId: null,
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
    snippetId: snippet.id,
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
      endLine: offsetToLine(raw, Math.max(startOffset, endOffset - 1)),
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
      endLine: offsetToLine(raw, Math.max(startOffset, endOffset - 1)),
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
  const needsExplicitCount =
    input.expectedOccurrences === null &&
    (input.matchCount > REPLACE_ALL_MATCH_THRESHOLD || (isShortFragment && input.matchCount > 1));
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
function stripReadResultLineTabs(value) {
  return value.replaceAll("\n	", "\n");
}
function buildCandidateMetadata(sessionId, filePath, raw, matches) {
  return matches.slice(0, MAX_CANDIDATE_COUNT).map((match) => {
    const preview = buildPreview(raw, match.startLine, match.endLine);
    const snippet = createSnippet(sessionId, filePath, match.startLine, match.endLine, preview);
    return {
      snippet_id: snippet?.id ?? null,
      start_line: match.startLine,
      end_line: match.endLine,
      preview,
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
    preview,
  };
}
function formatScopeMetadata(scope) {
  return {
    file_path: scope.filePath,
    start_line: scope.startLine,
    end_line: scope.endLine,
    snippet_id: scope.snippetId,
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
        strategy: "loose_escape",
      };
      if (!bestLooseMatch || candidate.score > bestLooseMatch.score) {
        bestLooseMatch = candidate;
      }
    }
    if (bestLooseMatch && bestLooseMatch.score >= MIN_FUZZY_SCORE) {
      return expandClosestMatch(raw, lineIndex, scope, bestLooseMatch);
    }
  }
  const targetLineCount = Math.max(1, oldString.split(/\r?\n/).length);
  const windowSizes = Array.from(
    /* @__PURE__ */ new Set([Math.max(1, targetLineCount - 1), targetLineCount, targetLineCount + 1])
  );
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
        strategy: "fuzzy_window",
      };
      if (!bestMatch || candidate.score > bestMatch.score) {
        bestMatch = candidate;
      }
    }
  }
  return bestMatch ? expandClosestMatch(raw, lineIndex, scope, bestMatch) : null;
}
function expandClosestMatch(raw, lineIndex, scope, closestMatch) {
  const startLine = clamp(closestMatch.startLine - CLOSEST_MATCH_CONTEXT_LINES, scope.startLine, scope.endLine);
  const endLine = clamp(closestMatch.endLine + CLOSEST_MATCH_CONTEXT_LINES, startLine, scope.endLine);
  return {
    ...closestMatch,
    text: sliceLines(raw, lineIndex, startLine, endLine),
    startLine,
    endLine,
  };
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
      if (slashEnd < source.length) {
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
          content:
            "You correct file-edit strings when the only problem is escaping. Return XML only using <response><corrected_old_string>...</corrected_old_string><corrected_new_string>...</corrected_new_string></response>. Do not change semantics; only fix quoting or escaping so corrected_old_string matches the snippet exactly.",
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
</output_format>`,
        },
      ],
      ...buildThinkingRequestOptions(thinkingEnabled, baseURL, reasoningEffort),
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
      newString: correctedNewString,
    };
  }
  return null;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeLooseText(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\\+(?=["'`\\])/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
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
  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
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
  "target/",
];
async function handleReadTool(args2, context) {
  let filePath = typeof args2.file_path === "string" ? normalizeFilePath(args2.file_path) : "";
  if (!filePath.trim()) {
    return {
      ok: false,
      name: "read",
      error: 'Missing required "file_path" string.',
    };
  }
  if (!isAbsoluteFilePath(filePath)) {
    if (filePath.startsWith("../") || filePath.startsWith("..\\")) {
      return {
        ok: false,
        name: "read",
        error: "file_path must be an absolute path.",
      };
    }
    const normalizedSuffix = normalizeRelativeSuffix(filePath);
    const isIgnored = loadGitignoreMatcher(context.projectRoot);
    const matches = normalizedSuffix ? findSuffixMatches(context.projectRoot, normalizedSuffix, isIgnored) : [];
    if (matches.length > 1) {
      return {
        ok: false,
        name: "read",
        error:
          `file_path must be an absolute path. The file_path is ambiguous and may refer to multiple files:
${matches.slice(0, 3).join("\n")}` +
          (matches.length > 3
            ? `
...and ${matches.length - 3} more.`
            : ""),
      };
    }
    const resolvedPath = path5.resolve(context.projectRoot, filePath);
    if (!fs5.existsSync(resolvedPath)) {
      if (matches.length > 0) {
        return {
          ok: false,
          name: "read",
          error: `file_path must be an absolute path. The file_path "${filePath}" is ambiguous.`,
        };
      } else {
        return {
          ok: false,
          name: "read",
          error: `File not found: ${filePath}`,
        };
      }
    }
    filePath = resolvedPath;
  }
  if (!fs5.existsSync(filePath)) {
    return {
      ok: false,
      name: "read",
      error: `File not found: ${filePath}`,
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
      error: `Failed to stat file: ${message}`,
    };
  }
  if (stat.isDirectory()) {
    return {
      ok: false,
      name: "read",
      error: "file_path points to a directory. Use bash ls for directories.",
    };
  }
  const ext = path5.extname(filePath).toLowerCase();
  try {
    if (ext === ".ipynb") {
      const output = readNotebook(filePath);
      markFileRead(context.sessionId, filePath, {
        content: "",
        timestamp: Math.floor(stat.mtimeMs),
        isPartialView: true,
      });
      return {
        ok: true,
        name: "read",
        output,
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
          error: `PDF has ${pageCount} pages; provide "pages" to read a range.`,
        };
      }
      if (pageRange && pageRange.count > PDF_MAX_PAGE_RANGE) {
        return {
          ok: false,
          name: "read",
          error: `PDF page range exceeds ${PDF_MAX_PAGE_RANGE} pages.`,
        };
      }
      if (pageRange && pageCount !== null && pageRange.end > pageCount) {
        return {
          ok: false,
          name: "read",
          error: `PDF page range exceeds total page count (${pageCount}).`,
        };
      }
      const base64 = buffer.toString("base64");
      markFileRead(context.sessionId, filePath, {
        content: "",
        timestamp: Math.floor(stat.mtimeMs),
        isPartialView: true,
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
          pages: pageRange ? `${pageRange.start}-${pageRange.end}` : null,
        },
      };
    }
    if (isImageExtension(ext)) {
      const buffer = fs5.readFileSync(filePath);
      const mime = getImageMimeType(ext);
      markFileRead(context.sessionId, filePath, {
        content: "",
        timestamp: Math.floor(stat.mtimeMs),
        isPartialView: true,
      });
      return {
        ok: true,
        name: "read",
        output: "File loaded.",
        metadata: {
          mime,
          bytes: buffer.length,
        },
        followUpMessages: [buildImageFollowUpMessage(filePath, mime, buffer)],
      };
    }
    const offset = parseLineNumber(args2.offset, "offset");
    const limit = parseLineLimit(args2.limit);
    if (!offset.ok) {
      return {
        ok: false,
        name: "read",
        error: offset.error,
      };
    }
    if (!limit.ok) {
      return {
        ok: false,
        name: "read",
        error: limit.error,
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
      lineEndings: textResult.lineEndings,
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
      metadata: snippet
        ? {
            snippet: {
              id: snippet.id,
              filePath: snippet.filePath,
              startLine: snippet.startLine,
              endLine: snippet.endLine,
            },
          }
        : void 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      name: "read",
      error: message,
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
function loadGitignoreMatcher(projectRoot2) {
  const gitignorePath = path5.join(projectRoot2, ".gitignore");
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
      timestamp: metadata.timestamp,
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
      timestamp: metadata.timestamp,
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
    timestamp: metadata.timestamp,
  };
}
function formatWithLineNumbers2(lines, startLineNumber) {
  return lines
    .map((line, index) => {
      const lineNumber = startLineNumber + index;
      const trimmedLine = line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) : line;
      return `${String(lineNumber).padStart(LINE_NUMBER_WIDTH, " ")}	${trimmedLine}`;
    })
    .join("\n");
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
          url: `data:${mime};base64,${buffer.toString("base64")}`,
        },
      },
    ],
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

// src/tools/update-plan-handler.ts
import { z as z3 } from "zod";
var updatePlanSchema = z3.strictObject({
  plan: z3.string().trim().min(1, "plan must not be empty."),
  explanation: z3.string().trim().optional(),
});
async function handleUpdatePlanTool(args2, _context) {
  return executeValidatedTool("UpdatePlan", updatePlanSchema, args2, _context, async (input) => ({
    ok: true,
    name: "UpdatePlan",
    output: "Plan updated.",
    metadata: {
      plan: input.plan,
      ...(input.explanation ? { explanation: input.explanation } : {}),
    },
  }));
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
      error: 'Missing required "query" string.',
    };
  }
  const llmContext = context.createOpenAIClient?.();
  const scriptPath = llmContext?.webSearchTool?.trim();
  if (scriptPath) {
    return executeConfiguredWebSearch(query, scriptPath, context, llmContext?.env ?? {});
  }
  if (!hasUsableClient(llmContext)) {
    return {
      ok: false,
      name: "WebSearch",
      error:
        "WebSearch default mode requires a valid LLM configuration in ~/.deepcode/settings.json or ./.deepcode/settings.json.",
    };
  }
  return executeDefaultWebSearch(query, llmContext, context);
}
function hasUsableClient(value) {
  return Boolean(value?.client);
}
async function executeConfiguredWebSearch(query, scriptPath, context, configuredEnv) {
  const execution = await runWebSearchScript(scriptPath, query, context, configuredEnv);
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
        truncated,
      },
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
        truncated,
      },
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
      stderr: execution.stderr || void 0,
    },
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
        languageReason: prepared.decision.reason,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      name: "WebSearch",
      error: `WebSearch default mode failed: ${message}`,
    };
  }
}
async function runWebSearchScript(scriptPath, query, context, configuredEnv) {
  return new Promise((resolve8) => {
    const child = spawn3(scriptPath, [query], {
      cwd: context.projectRoot,
      env: { ...process.env, ...configuredEnv },
      stdio: ["ignore", "pipe", "pipe"],
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
      resolve8({
        stdout,
        stderr,
        exitCode: typeof code === "number" ? code : null,
        signal: signal ?? null,
        error,
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
        translated: true,
      };
    }
  }
  if (decision.dominantLanguage === "zh" && !containsChinese) {
    const translatedQuery = await translateQuery(query, "Chinese", llmContext);
    if (translatedQuery) {
      return {
        resolvedQuery: translatedQuery,
        decision,
        translated: true,
      };
    }
  }
  return {
    resolvedQuery: query,
    decision,
    translated: false,
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
    reason: typeof result.reason === "string" ? result.reason : "",
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
  return stripCodeFence(await chat(llmContext, prompt))
    .trim()
    .replace(/^['"]|['"]$/g, "");
}
async function chat(llmContext, prompt) {
  const response = await llmContext.client.chat.completions.create({
    model: llmContext.model,
    messages: [{ role: "user", content: prompt }],
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
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
        Token: machineId,
      },
      body: JSON.stringify({ query }),
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
  const clippedQuery =
    normalizedQuery.length > maxQueryLength ? `${normalizedQuery.slice(0, maxQueryLength - 3)}...` : normalizedQuery;
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
import { z as z4 } from "zod";
var writeSchema = z4.strictObject({
  file_path: z4.string().min(1, "file_path is required."),
  content: z4.string({
    error:
      "content must be a string. If you are writing JSON, serialize the full document to text before calling write.",
  }),
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
          error: "file_path must be an absolute path.",
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
            error: `Failed to stat file: ${message}`,
          };
        }
        if (stat.isDirectory()) {
          return {
            ok: false,
            name: "write",
            error: "file_path points to a directory.",
          };
        }
        if (stat.size > 0) {
          const fileState = getFileState(context.sessionId, filePath);
          if (!fileState || !isFullFileView(fileState)) {
            return {
              ok: false,
              name: "write",
              error: "Must read the full existing file before writing.",
            };
          }
          if (hasFileChangedSinceState(filePath, fileState)) {
            return {
              ok: false,
              name: "write",
              error: "File has been modified since read. Read it again before writing.",
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
        recordFileState(
          context.sessionId,
          {
            filePath,
            content: freshMetadata.content,
            timestamp: freshMetadata.timestamp,
            encoding: freshMetadata.encoding,
            lineEndings: freshMetadata.lineEndings,
          },
          { incrementVersion: true }
        );
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
            ...repairMetadata,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          name: "write",
          error: message,
        };
      }
    },
    {
      preprocess: (rawInput) => {
        const filePath = typeof rawInput.file_path === "string" ? normalizeFilePath(rawInput.file_path) : "";
        const content = rawInput.content;
        if (
          filePath.toLowerCase().endsWith(".json") &&
          content !== null &&
          typeof content === "object" &&
          !Buffer.isBuffer(content)
        ) {
          repairMetadata = {
            input_repaired: true,
            repair_kind: "json-stringify-content",
          };
          return {
            ok: true,
            input: {
              ...rawInput,
              file_path: filePath,
              content: JSON.stringify(content, null, 2),
            },
          };
        }
        repairMetadata = null;
        return {
          ok: true,
          input: typeof rawInput.file_path === "string" ? { ...rawInput, file_path: filePath } : rawInput,
        };
      },
    }
  );
}

// src/tools/executor.ts
var ToolExecutor = class {
  projectRoot;
  createOpenAIClient;
  mcpManager;
  toolHandlers = /* @__PURE__ */ new Map();
  constructor(projectRoot2, createOpenAIClient2, mcpManager) {
    this.projectRoot = projectRoot2;
    this.createOpenAIClient = createOpenAIClient2;
    this.mcpManager = mcpManager;
    this.registerToolHandlers();
  }
  async executeToolCalls(sessionId, toolCalls, hooks) {
    const parsedCalls = toolCalls
      .map((toolCall) => this.parseToolCall(toolCall))
      .filter((toolCall) => Boolean(toolCall));
    const executions = [];
    for (const toolCall of parsedCalls) {
      if (hooks?.shouldStop?.()) {
        break;
      }
      const result = await this.executeToolCall(sessionId, toolCall, hooks);
      executions.push({
        toolCallId: toolCall.id,
        content: this.formatToolResult(result),
        result,
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
    this.toolHandlers.set("UpdatePlan", handleUpdatePlanTool);
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
        arguments: rawArguments,
      },
    };
  }
  async executeToolCall(sessionId, toolCall, hooks) {
    const toolName = toolCall.function.name;
    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      if (this.mcpManager?.isMcpTool(toolName)) {
        const parsedArgs2 = this.parseToolArguments(toolCall.function.arguments);
        const args2 = parsedArgs2.ok ? parsedArgs2.args : {};
        return this.mcpManager.executeMcpTool(toolName, args2);
      }
      return {
        ok: false,
        name: toolName,
        error: `Unknown tool: ${toolName}`,
      };
    }
    const parsedArgs = this.parseToolArguments(toolCall.function.arguments);
    if (!parsedArgs.ok) {
      return {
        ok: false,
        name: toolName,
        error: parsedArgs.error,
      };
    }
    try {
      return await handler(parsedArgs.args, {
        sessionId,
        projectRoot: this.projectRoot,
        toolCall,
        createOpenAIClient: this.createOpenAIClient,
        onProcessStart: hooks?.onProcessStart,
        onProcessExit: hooks?.onProcessExit,
        onProcessStdout: hooks?.onProcessStdout,
        onProcessTimeoutControl: hooks?.onProcessTimeoutControl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        name: toolName,
        error: message,
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
        error: `InputParseError: Failed to parse tool arguments: ${message}. Ensure the tool call arguments are valid JSON. Prefer Edit over Write for large existing-file changes.`,
      };
    }
  }
  formatToolResult(result) {
    const payload = {
      ok: result.ok,
      name: result.name,
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

// src/mcp/mcp-client.ts
import { spawn as spawn4 } from "child_process";
import { createInterface } from "readline";
import * as os3 from "os";
import * as path6 from "path";
var McpClient = class {
  constructor(serverName, command, args2 = [], env, onNotification) {
    this.serverName = serverName;
    this.command = command;
    this.args = args2;
    this.env = env;
    this.notificationHandler = onNotification ?? null;
  }
  serverName;
  command;
  args;
  env;
  process = null;
  reader = null;
  nextId = 1;
  pendingRequests = /* @__PURE__ */ new Map();
  stderrBuffer = "";
  notificationHandler = null;
  async connect(timeoutMs) {
    return new Promise((resolve8, reject) => {
      const childEnv = {
        ...process.env,
        ...this.env,
      };
      const args2 = this.withNpxYesArg(this.command, this.args);
      const isWindows = os3.platform() === "win32";
      if (isWindows) {
        this.process = spawn4(this.command, args2, {
          stdio: ["pipe", "pipe", "pipe"],
          env: childEnv,
          shell: true,
          windowsHide: true,
        });
      } else {
        this.process = spawn4(this.command, args2, {
          stdio: ["pipe", "pipe", "pipe"],
          env: childEnv,
        });
      }
      this.process.on("error", (err) => {
        reject(this.withStderr(`Failed to start MCP server "${this.serverName}" (${this.command}): ${err.message}`));
      });
      this.process.on("close", (code) => {
        const error = this.withStderr(`MCP server "${this.serverName}" exited with code ${code}`);
        for (const [, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(error);
        }
        this.pendingRequests.clear();
      });
      if (this.process.stderr) {
        this.process.stderr.on("data", (data) => {
          this.appendStderr(data.toString("utf8"));
        });
      }
      this.reader = createInterface({ input: this.process.stdout });
      this.reader.on("line", (line) => {
        this.handleLine(line);
      });
      this.sendRequest(
        "initialize",
        {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "deepcode-cli", version: "0.1.0" },
        },
        timeoutMs
      )
        .then((result) => {
          const initResult = result;
          const serverVersion = initResult?.protocolVersion;
          if (serverVersion && serverVersion !== "2025-03-26" && serverVersion !== "2024-11-05") {
            reject(
              new Error(
                `Unsupported MCP protocol version "${serverVersion}" from server "${this.serverName}". Client supports 2025-03-26 and 2024-11-05.`
              )
            );
            return;
          }
          this.sendNotification("notifications/initialized");
          resolve8();
        })
        .catch(reject);
    });
  }
  async listTools(timeoutMs) {
    const tools = [];
    let cursor;
    for (let page = 0; page < 100; page++) {
      const params = cursor ? { cursor } : {};
      const result = await this.sendRequest("tools/list", params, timeoutMs);
      tools.push(...(result.tools ?? []));
      cursor = typeof result.nextCursor === "string" && result.nextCursor ? result.nextCursor : void 0;
      if (!cursor) {
        return tools;
      }
    }
    throw this.withStderr(`MCP server "${this.serverName}" returned too many tools/list pages`);
  }
  async callTool(name, args2, timeoutMs = 6e4) {
    return await this.sendRequest("tools/call", { name, arguments: args2 }, timeoutMs);
  }
  async listPrompts(timeoutMs) {
    const prompts = [];
    let cursor;
    for (let page = 0; page < 100; page++) {
      const params = cursor ? { cursor } : {};
      const result = await this.sendRequest("prompts/list", params, timeoutMs);
      prompts.push(...(result.prompts ?? []));
      cursor = typeof result.nextCursor === "string" && result.nextCursor ? result.nextCursor : void 0;
      if (!cursor) {
        return prompts;
      }
    }
    throw this.withStderr(`MCP server "${this.serverName}" returned too many prompts/list pages`);
  }
  async getPrompt(name, args2, timeoutMs = 3e4) {
    return await this.sendRequest("prompts/get", { name, arguments: args2 }, timeoutMs);
  }
  async listResources(timeoutMs) {
    const resources = [];
    let cursor;
    for (let page = 0; page < 100; page++) {
      const params = cursor ? { cursor } : {};
      const result = await this.sendRequest("resources/list", params, timeoutMs);
      resources.push(...(result.resources ?? []));
      cursor = typeof result.nextCursor === "string" && result.nextCursor ? result.nextCursor : void 0;
      if (!cursor) {
        return resources;
      }
    }
    throw this.withStderr(`MCP server "${this.serverName}" returned too many resources/list pages`);
  }
  async readResource(uri, timeoutMs = 3e4) {
    return await this.sendRequest("resources/read", { uri }, timeoutMs);
  }
  disconnect() {
    if (this.reader) {
      this.reader.close();
      this.reader = null;
    }
    if (this.process) {
      if (typeof this.process.pid === "number") {
        killProcessTree(this.process.pid, "SIGTERM", { killGroupOnNonWindows: false });
      } else {
        this.process.kill();
      }
      this.process = null;
    }
  }
  sendRequest(method, params, timeoutMs = 3e4) {
    return new Promise((resolve8, reject) => {
      const id = this.nextId++;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          this.withStderr(
            `Timed out after ${timeoutMs}ms waiting for MCP server "${this.serverName}" to respond to ${method}`
          )
        );
      }, timeoutMs);
      this.pendingRequests.set(id, { resolve: resolve8, reject, timer });
      this.writeLine(JSON.stringify(request));
    });
  }
  sendNotification(method, params) {
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };
    this.writeLine(JSON.stringify(notification));
  }
  writeLine(data) {
    if (this.process?.stdin) {
      this.process.stdin.write(data + "\n");
    }
  }
  handleLine(line) {
    try {
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            this.handleSingleMessage(item);
          }
        }
        return;
      }
      if (parsed && typeof parsed === "object") {
        this.handleSingleMessage(parsed);
      }
    } catch {}
  }
  handleSingleMessage(msg) {
    if (!("id" in msg)) {
      const notification = msg;
      if (this.notificationHandler && typeof notification.method === "string") {
        try {
          this.notificationHandler(notification.method, notification.params);
        } catch {}
      }
      return;
    }
    const message = msg;
    if (message.id !== void 0 && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) {
        pending.reject(this.withStderr(`MCP error: ${message.error.message}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }
  withNpxYesArg(command, args2) {
    const executable = path6
      .basename(command)
      .toLowerCase()
      .replace(/\.cmd$/, "");
    if (executable !== "npx") {
      return args2;
    }
    if (args2.includes("-y") || args2.includes("--yes")) {
      return args2;
    }
    return ["-y", ...args2];
  }
  appendStderr(text) {
    this.stderrBuffer = `${this.stderrBuffer}${text}`;
    if (this.stderrBuffer.length > 4e3) {
      this.stderrBuffer = this.stderrBuffer.slice(-4e3);
    }
  }
  withStderr(message) {
    const stderr = this.stderrBuffer.trim();
    return new Error(stderr ? `${message}. stderr: ${stderr}` : message);
  }
};

// src/mcp/mcp-manager.ts
var MCP_STARTUP_TIMEOUT_MS = 3e4;
var MCP_CALL_TOOL_TIMEOUT_MS = 6e4;
var McpManager = class {
  clients = [];
  tools = [];
  prompts = [];
  resources = [];
  initialized = false;
  disposed = false;
  configuredServerNames = [];
  serverStatuses = [];
  onToolsListChanged = null;
  onStatusChanged = null;
  prepare(servers) {
    if (!servers || Object.keys(servers).length === 0) return;
    this.disposed = false;
    for (const name of Object.keys(servers)) {
      if (!this.configuredServerNames.includes(name)) {
        this.configuredServerNames.push(name);
      }
      if (this.serverStatuses.some((status) => status.name === name)) {
        continue;
      }
      this.setStatus({
        name,
        status: "starting",
        connected: false,
        toolCount: 0,
        tools: [],
        promptCount: 0,
        prompts: [],
        resourceCount: 0,
        resources: [],
      });
    }
  }
  async initialize(servers) {
    if (this.initialized || this.disposed) return;
    this.initialized = true;
    if (!servers || Object.keys(servers).length === 0) return;
    const entries = Object.entries(servers);
    this.prepare(servers);
    for (const [name, config] of entries) {
      if (this.disposed) break;
      let client = null;
      try {
        client = new McpClient(name, config.command, config.args ?? [], config.env, (method) => {
          if (method === "notifications/tools/list_changed") {
            this.refreshServerTools(name, client).catch(() => {});
          }
        });
        await client.connect(MCP_STARTUP_TIMEOUT_MS);
        if (this.disposed) {
          client.disconnect();
          break;
        }
        this.clients.push(client);
        const serverTools = await client.listTools(MCP_STARTUP_TIMEOUT_MS);
        if (this.disposed) break;
        const toolNamespacedNames = [];
        for (const tool of serverTools) {
          const namespacedName = `mcp__${name}__${tool.name}`;
          this.tools.push({
            serverName: name,
            originalName: tool.name,
            namespacedName,
            definition: tool,
            client,
          });
          toolNamespacedNames.push(namespacedName);
        }
        let serverPrompts = [];
        try {
          serverPrompts = await client.listPrompts(MCP_STARTUP_TIMEOUT_MS);
        } catch {}
        if (this.disposed) break;
        const promptNamespacedNames = [];
        for (const prompt of serverPrompts) {
          const namespacedName = `mcp__${name}__${prompt.name}`;
          this.prompts.push({
            serverName: name,
            namespacedName,
            definition: prompt,
            client,
          });
          promptNamespacedNames.push(namespacedName);
        }
        let serverResources = [];
        try {
          serverResources = await client.listResources(MCP_STARTUP_TIMEOUT_MS);
        } catch {}
        if (this.disposed) break;
        const resourceNamespacedNames = [];
        for (const resource of serverResources) {
          const namespacedName = `mcp__${name}__${resource.name}`;
          this.resources.push({
            serverName: name,
            namespacedName,
            definition: resource,
            client,
          });
          resourceNamespacedNames.push(namespacedName);
        }
        this.setStatus({
          name,
          status: "ready",
          connected: true,
          toolCount: serverTools.length,
          tools: toolNamespacedNames,
          promptCount: serverPrompts.length,
          prompts: promptNamespacedNames,
          resourceCount: serverResources.length,
          resources: resourceNamespacedNames,
        });
      } catch (err) {
        if (this.disposed) break;
        client?.disconnect();
        const message = err instanceof Error ? err.message : String(err);
        this.setStatus({
          name,
          status: "failed",
          connected: false,
          error: message,
          toolCount: 0,
          tools: [],
          promptCount: 0,
          prompts: [],
          resourceCount: 0,
          resources: [],
        });
      }
    }
  }
  getStatus() {
    const result = [...this.serverStatuses];
    const knownNames = new Set(result.map((s) => s.name));
    for (const name of this.configuredServerNames) {
      if (!knownNames.has(name)) {
        result.push({
          name,
          status: "starting",
          connected: false,
          toolCount: 0,
          tools: [],
          promptCount: 0,
          prompts: [],
          resourceCount: 0,
          resources: [],
        });
      }
    }
    return result;
  }
  getMcpToolDefinitions() {
    return this.tools.map((t) => ({
      type: "function",
      function: {
        name: t.namespacedName,
        description: t.definition.description ?? `${t.serverName}: ${t.originalName}`,
        parameters: {
          type: "object",
          properties: t.definition.inputSchema.properties,
          required: t.definition.inputSchema.required,
          ...(t.definition.inputSchema.additionalProperties !== void 0
            ? { additionalProperties: t.definition.inputSchema.additionalProperties }
            : {}),
        },
      },
    }));
  }
  isMcpTool(name) {
    return name.startsWith("mcp__");
  }
  async executeMcpTool(name, args2, timeoutMs = MCP_CALL_TOOL_TIMEOUT_MS) {
    const tool = this.tools.find((t) => t.namespacedName === name);
    if (!tool) {
      return { ok: false, name, error: `Unknown MCP tool: ${name}` };
    }
    try {
      const result = await tool.client.callTool(tool.originalName, args2, timeoutMs);
      const text = result.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
      return {
        ok: !result.isError,
        name,
        output: text || JSON.stringify(result.content),
      };
    } catch (err) {
      return {
        ok: false,
        name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  async getMcpPrompt(name, args2) {
    const prompt = this.prompts.find((p) => p.namespacedName === name);
    if (!prompt) {
      return { ok: false, name, error: `Unknown MCP prompt: ${name}` };
    }
    try {
      const result = await prompt.client.getPrompt(prompt.definition.name, args2);
      const text = result.messages
        .filter((m) => m.content.type === "text" && m.content.text)
        .map((m) => `[${m.role}] ${m.content.text}`)
        .join("\n");
      return {
        ok: true,
        name,
        output: text || JSON.stringify(result),
      };
    } catch (err) {
      return {
        ok: false,
        name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  async readMcpResource(name, uri) {
    const resource = this.resources.find((r) => r.namespacedName === name);
    if (!resource) {
      return { ok: false, name, error: `Unknown MCP resource: ${name}` };
    }
    try {
      const result = await resource.client.readResource(uri);
      const text = result.contents
        .filter((c) => c.text)
        .map((c) => c.text)
        .join("\n");
      return {
        ok: true,
        name,
        output: text || JSON.stringify(result.contents),
      };
    } catch (err) {
      return {
        ok: false,
        name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  disconnect() {
    this.disposed = true;
    for (const client of this.clients) {
      client.disconnect();
    }
    this.clients = [];
    this.tools = [];
    this.prompts = [];
    this.resources = [];
    this.serverStatuses = [];
    this.configuredServerNames = [];
    this.initialized = false;
  }
  async refreshServerTools(serverName, client) {
    const serverTools = await client.listTools(MCP_STARTUP_TIMEOUT_MS);
    this.tools = this.tools.filter((t) => t.serverName !== serverName);
    const toolNamespacedNames = [];
    for (const tool of serverTools) {
      const namespacedName = `mcp__${serverName}__${tool.name}`;
      this.tools.push({
        serverName,
        originalName: tool.name,
        namespacedName,
        definition: tool,
        client,
      });
      toolNamespacedNames.push(namespacedName);
    }
    const existing = this.serverStatuses.find((s) => s.name === serverName);
    if (existing) {
      existing.toolCount = serverTools.length;
      existing.tools = toolNamespacedNames;
    }
    this.onToolsListChanged?.();
  }
  setOnToolsListChanged(handler) {
    this.onToolsListChanged = handler;
  }
  setOnStatusChanged(handler) {
    this.onStatusChanged = handler;
  }
  setStatus(status) {
    if (this.disposed) return;
    const index = this.serverStatuses.findIndex((s) => s.name === status.name);
    if (index === -1) {
      this.serverStatuses.push(status);
    } else {
      this.serverStatuses[index] = status;
    }
    this.onStatusChanged?.();
  }
};

// src/common/error-logger.ts
import * as fs7 from "fs";
import * as path7 from "path";
import * as os4 from "os";
var LOG_DIR = path7.join(os4.homedir(), ".deepcode", "logs");
var ERROR_LOG_PATH = path7.join(LOG_DIR, "error.log");
function ensureLogDir() {
  if (!fs7.existsSync(LOG_DIR)) {
    fs7.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function maskSensitive(text) {
  return text
    .replace(/(Authorization:\s*Bearer\s+)[^\s\r\n]+/gi, "$1***MASKED***")
    .replace(/((?:api[Kk]ey|api_key|secret)\s*[:=]\s*"?)[^",}\s]+/gi, "$1***MASKED***");
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
        stack: entry.error.stack ? maskSensitive(entry.error.stack) : void 0,
      },
      request: sanitizeRequestPayload(entry.request),
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
  } catch {}
}

// src/common/debug-logger.ts
import * as fs8 from "fs";
import * as os5 from "os";
import * as path8 from "path";
var DEBUG_LOG_FILE = "debug.log";
function logOpenAIChatCompletionDebug(entry) {
  try {
    const logPath = getDebugLogPath();
    fs8.mkdirSync(path8.dirname(logPath), { recursive: true });
    fs8.appendFileSync(
      logPath,
      `${JSON.stringify(toSerializable(entry))}
`,
      "utf8"
    );
  } catch {}
}
function getDebugLogPath() {
  return path8.join(os5.homedir(), ".deepcode", "logs", DEBUG_LOG_FILE);
}
function normalizeDebugError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: "UnknownError",
    message: String(error),
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
var NEW_PROMPT_REPORT_TIMEOUT_MS = 3e3;
var DEFAULT_COMPACT_PROMPT_TOKEN_THRESHOLD = 128 * 1024;
var DEEPSEEK_V4_COMPACT_PROMPT_TOKEN_THRESHOLD = 512 * 1024;
function getCompactPromptTokenThreshold(model) {
  return DEEPSEEK_V4_MODELS.has(model)
    ? DEEPSEEK_V4_COMPACT_PROMPT_TOKEN_THRESHOLD
    : DEFAULT_COMPACT_PROMPT_TOKEN_THRESHOLD;
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
    signal: options.signal instanceof AbortSignal ? { aborted: options.signal.aborted } : options.signal,
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
function usageWithRequestCount(usage) {
  const totalReqs = typeof usage.total_reqs === "number" ? usage.total_reqs + 1 : 1;
  return {
    ...usage,
    total_reqs: totalReqs,
  };
}
function accumulateUsagePerModel(current, model, next) {
  if (next == null) {
    return current ?? null;
  }
  const usagePerModel = { ...(current ?? {}) };
  const modelName = model.trim() || "unknown";
  usagePerModel[modelName] = accumulateUsage(usagePerModel[modelName] ?? null, usageWithRequestCount(next));
  return usagePerModel;
}
function getExtensionRoot2() {
  if (typeof __dirname !== "undefined") {
    return path9.resolve(__dirname, "..");
  }
  const currentFilePath = fileURLToPath2(import.meta.url);
  return path9.resolve(path9.dirname(currentFilePath), "..");
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
  onMcpStatusChanged;
  onProcessStdout;
  activeSessionId = null;
  activePromptController = null;
  sessionControllers = /* @__PURE__ */ new Map();
  processTimeoutControls = /* @__PURE__ */ new Map();
  toolExecutor;
  mcpManager = new McpManager();
  mcpToolDefinitions = [];
  constructor(options) {
    this.projectRoot = options.projectRoot;
    this.createOpenAIClient = options.createOpenAIClient;
    this.getResolvedSettings = options.getResolvedSettings;
    this.onAssistantMessage = options.onAssistantMessage;
    this.onSessionEntryUpdated = options.onSessionEntryUpdated;
    this.onLlmStreamProgress = options.onLlmStreamProgress;
    this.onMcpStatusChanged = options.onMcpStatusChanged;
    this.onProcessStdout = options.onProcessStdout;
    this.toolExecutor = new ToolExecutor(this.projectRoot, this.createOpenAIClient, this.mcpManager);
    this.mcpManager.prepare(this.getResolvedSettings().mcpServers);
  }
  async initMcpServers(servers) {
    this.mcpManager.setOnToolsListChanged(() => {
      this.mcpToolDefinitions = this.mcpManager.getMcpToolDefinitions();
    });
    this.mcpManager.setOnStatusChanged(() => {
      this.onMcpStatusChanged?.();
    });
    await this.mcpManager.initialize(servers);
    this.mcpToolDefinitions = this.mcpManager.getMcpToolDefinitions();
  }
  getMcpStatus() {
    return this.mcpManager.getStatus();
  }
  dispose() {
    this.mcpManager.disconnect();
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
      phase,
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
    const requestId = crypto2.randomUUID();
    const startedAt = /* @__PURE__ */ new Date().toISOString();
    const startedAtMs = Date.now();
    let estimatedTokens = 0;
    this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "start", sessionId);
    const streamRequest = {
      ...request,
      stream: true,
      stream_options: {
        ...(isUsageRecord(request.stream_options) ? request.stream_options : {}),
        include_usage: true,
      },
    };
    let response;
    try {
      response = await client.chat.completions.create(streamRequest, options);
    } catch (error) {
      this.logChatCompletionDebug(debug, {
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        location: debug?.location ?? "SessionManager.createChatCompletionStream:create",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        baseURL: debug?.baseURL,
        durationMs: Date.now() - startedAtMs,
        params: { ...debug?.params, options: summarizeCompletionOptions(options) },
        request: streamRequest,
        error: normalizeDebugError(error),
      });
      logApiError({
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        location: "SessionManager.createChatCompletionStream:create",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : void 0,
        },
        request: streamRequest,
      });
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "end", sessionId);
      throw error;
    }
    if (!response || typeof response[Symbol.asyncIterator] !== "function") {
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "end", sessionId);
      this.logChatCompletionDebug(debug, {
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        location: debug?.location ?? "SessionManager.createChatCompletionStream",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        baseURL: debug?.baseURL,
        durationMs: Date.now() - startedAtMs,
        params: { ...debug?.params, options: summarizeCompletionOptions(options) },
        request: streamRequest,
        response,
      });
      return response;
    }
    let content = "";
    let reasoningContent = "";
    let refusal = null;
    let usage = null;
    const responseChunks = [];
    const toolCallsByIndex = /* @__PURE__ */ new Map();
    const trackText = (value) => {
      if (typeof value !== "string" || value.length === 0) {
        return;
      }
      estimatedTokens += this.estimateStreamTokens(value);
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "update", sessionId);
    };
    try {
      for await (const chunk of response) {
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
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        location: debug?.location ?? "SessionManager.createChatCompletionStream:stream",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        baseURL: debug?.baseURL,
        durationMs: Date.now() - startedAtMs,
        params: { ...debug?.params, options: summarizeCompletionOptions(options) },
        request: streamRequest,
        responseChunks,
        error: normalizeDebugError(error),
      });
      logApiError({
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        location: "SessionManager.createChatCompletionStream:stream",
        requestId,
        sessionId,
        model: typeof request.model === "string" ? request.model : void 0,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : void 0,
        },
        request: streamRequest,
      });
      throw error;
    } finally {
      this.emitLlmStreamProgress(requestId, startedAt, estimatedTokens, "end", sessionId);
    }
    const toolCalls = Array.from(toolCallsByIndex.entries())
      .sort(([left], [right]) => left - right)
      .map(([, toolCall]) => toolCall);
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
      usage,
    };
    this.logChatCompletionDebug(debug, {
      timestamp: /* @__PURE__ */ new Date().toISOString(),
      location: debug?.location ?? "SessionManager.createChatCompletionStream",
      requestId,
      sessionId,
      model: typeof request.model === "string" ? request.model : void 0,
      baseURL: debug?.baseURL,
      durationMs: Date.now() - startedAtMs,
      params: { ...debug?.params, options: summarizeCompletionOptions(options) },
      request: streamRequest,
      responseChunks,
      response: finalResponse,
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
    const simpleSkills = skills
      .filter((x) => !x.isLoaded)
      .map((x) => {
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
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        },
        options?.signal ? { signal: options.signal } : void 0,
        options?.sessionId,
        {
          enabled: debugLogEnabled,
          location: "SessionManager.identifyMatchingSkillNames",
          baseURL,
          params: { purpose: "skill-matching" },
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
    const homeDir = os6.homedir();
    const agentsRoot = path9.join(homeDir, ".agents", "skills");
    const legacyProjectSkillsRoot = path9.join(this.projectRoot, ".deepcode", "skills");
    const projectAgentsSkillsRoot = path9.join(this.projectRoot, ".agents", "skills");
    const skillsByName = /* @__PURE__ */ new Map();
    const collectSkills = (root, displayRoot) => {
      if (!fs9.existsSync(root)) {
        return [];
      }
      let entries;
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
        const skillPath = path9.join(root, skillName, "SKILL.md");
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
      return path9.join(os6.homedir(), skillPath.slice(2));
    }
    if (skillPath.startsWith("~\\")) {
      return path9.join(os6.homedir(), skillPath.slice(2));
    }
    if (skillPath.startsWith("./")) {
      return path9.join(this.projectRoot, skillPath.slice(2));
    }
    if (skillPath.startsWith(".\\")) {
      return path9.join(this.projectRoot, skillPath.slice(2));
    }
    if (path9.isAbsolute(skillPath)) {
      return skillPath;
    }
    return path9.join(os6.homedir(), skillPath);
  }
  readSkillInfo(skillPath, displayPath, fallbackName) {
    const fallbackSkill = {
      name: fallbackName.replace(/_/g, "-"),
      path: displayPath,
      description: "",
    };
    try {
      const skillMd = fs9.readFileSync(skillPath, "utf8");
      const parsed = matter(skillMd);
      return {
        name:
          typeof parsed.data.name === "string" && parsed.data.name.trim()
            ? parsed.data.name.trim()
            : fallbackSkill.name,
        path: displayPath,
        description: typeof parsed.data.description === "string" ? parsed.data.description.trim() : "",
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
        isLoaded: Boolean(existingSkill?.isLoaded || skill.isLoaded),
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
      const matchedSkill =
        availableSkillsByKey.get(this.getSkillKey(skill)) ??
        availableSkillsByKey.get(this.getSkillKeyByName(skill.name));
      if (!matchedSkill) {
        return skill;
      }
      return {
        ...matchedSkill,
        ...skill,
        description: matchedSkill.description || skill.description,
        isLoaded: Boolean(matchedSkill.isLoaded || skill.isLoaded),
      };
    });
  }
  getActiveSessionId() {
    return this.activeSessionId;
  }
  setActiveSessionId(sessionId) {
    this.activeSessionId = sessionId;
  }
  addSessionSystemMessage(sessionId, content, visible, meta) {
    const message = this.buildSystemMessage(sessionId, content, null, visible, meta);
    if (sessionId) this.appendSessionMessage(sessionId, message);
    this.onAssistantMessage(message, false);
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
    const sessionId = crypto2.randomUUID();
    const now = /* @__PURE__ */ new Date().toISOString();
    const index = this.loadSessionsIndex();
    const entry = {
      id: sessionId,
      summary: userPrompt.text ? userPrompt.text.slice(0, 100) : "[Image Prompt]",
      assistantReply: null,
      assistantThinking: null,
      assistantRefusal: null,
      toolCalls: null,
      status: "pending",
      failReason: null,
      usage: null,
      usagePerModel: null,
      activeTokens: 0,
      createTime: now,
      updateTime: now,
      processes: null,
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
    const promptToolOptions = this.getPromptToolOptions();
    const systemPrompt = getSystemPrompt(this.projectRoot, promptToolOptions);
    const systemMessage = this.buildSystemMessage(sessionId, systemPrompt);
    this.appendSessionMessage(sessionId, systemMessage);
    const defaultSkillPrompt = getDefaultSkillPrompt();
    if (defaultSkillPrompt) {
      const defaultSkillMessage = this.buildSystemMessage(sessionId, defaultSkillPrompt);
      this.appendSessionMessage(sessionId, defaultSkillMessage);
    }
    const runtimeContextMessage = this.buildSystemMessage(
      sessionId,
      getRuntimeContext(this.projectRoot, promptToolOptions.model)
    );
    this.appendSessionMessage(sessionId, runtimeContextMessage);
    const agentInstructions = this.loadAgentInstructions();
    if (agentInstructions) {
      const instructionsMessage = this.buildSystemMessage(sessionId, agentInstructions);
      this.appendSessionMessage(sessionId, instructionsMessage);
    }
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
    const now = /* @__PURE__ */ new Date().toISOString();
    const updated = this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      status: "pending",
      failReason: null,
      updateTime: now,
    }));
    if (!updated) {
      await this.createSession(userPrompt, controller);
      return;
    }
    if (this.isContinuePrompt(userPrompt)) {
      this.activeSessionId = sessionId;
      await this.activateSession(sessionId, controller);
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
  isContinuePrompt(userPrompt) {
    return (
      typeof userPrompt.text === "string" &&
      userPrompt.text.trim() === "/continue" &&
      (!userPrompt.imageUrls || userPrompt.imageUrls.length === 0) &&
      (!userPrompt.skills || userPrompt.skills.length === 0)
    );
  }
  async activateSession(sessionId, controller) {
    const startedAt = Date.now();
    const { client, model, baseURL, thinkingEnabled, reasoningEffort, debugLogEnabled, notify, env } =
      this.createOpenAIClient();
    const now = /* @__PURE__ */ new Date().toISOString();
    if (!client) {
      this.updateSessionEntry(sessionId, (entry) => ({
        ...entry,
        status: "failed",
        failReason: "OpenAI API key not found",
        updateTime: now,
      }));
      this.onAssistantMessage(
        this.buildAssistantMessage(
          sessionId,
          "OpenAI API key not found. Please configure ~/.deepcode/settings.json or ./.deepcode/settings.json.",
          null
        ),
        false
      );
      this.maybeNotifyTaskCompletion(sessionId, notify, startedAt, env);
      return;
    }
    const sessionController = controller ?? new AbortController();
    if (sessionController.signal.aborted) {
      this.updateSessionEntry(sessionId, (entry) => ({
        ...entry,
        status: "interrupted",
        failReason: "interrupted",
        updateTime: now,
      }));
      this.maybeNotifyTaskCompletion(sessionId, notify, startedAt, env);
      return;
    }
    this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      status: "processing",
      updateTime: now,
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
        const pendingToolCalls = this.getTrailingPendingToolCalls(this.listSessionMessages(sessionId));
        if (pendingToolCalls.length > 0) {
          const toolAppendResult = await this.appendToolMessages(sessionId, pendingToolCalls);
          if (this.isInterrupted(sessionId)) {
            return;
          }
          if (toolAppendResult.waitingForUser) {
            this.updateSessionEntry(sessionId, (entry) => ({
              ...entry,
              toolCalls: pendingToolCalls,
              status: "waiting_for_user",
              updateTime: /* @__PURE__ */ new Date().toISOString(),
            }));
            return;
          }
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
        const messages = this.buildOpenAIMessages(this.listSessionMessages(sessionId), thinkingEnabled, model);
        const thinkingOptions = buildThinkingRequestOptions(thinkingEnabled, baseURL, reasoningEffort);
        const response = await this.createChatCompletionStream(
          client,
          {
            model,
            messages,
            tools: getTools(this.getPromptToolOptions(), this.mcpToolDefinitions),
            ...thinkingOptions,
          },
          { signal: sessionController.signal },
          sessionId,
          {
            enabled: debugLogEnabled,
            location: "SessionManager.activateSession",
            baseURL,
            params: { iteration, thinkingEnabled, reasoningEffort },
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
          usagePerModel: accumulateUsagePerModel(entry.usagePerModel, model, responseUsage),
          activeTokens: getTotalTokens(responseUsage),
          status: refusal ? "failed" : waitingForUser ? "waiting_for_user" : toolCalls ? "processing" : "completed",
          failReason: refusal ? refusal : entry.failReason,
          updateTime: /* @__PURE__ */ new Date().toISOString(),
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
        updateTime: /* @__PURE__ */ new Date().toISOString(),
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
        updateTime: /* @__PURE__ */ new Date().toISOString(),
      }));
      if (!aborted) {
        this.onAssistantMessage(this.buildAssistantMessage(sessionId, `Request failed: ${errMessage}`, null), false);
      }
    } finally {
      if (this.sessionControllers.get(sessionId) === sessionController) {
        this.sessionControllers.delete(sessionId);
      }
      this.maybeNotifyTaskCompletion(sessionId, notify, startedAt, env);
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
    const searchStart = Math.floor(startIndex + ((sessionMessages.length - startIndex) * 2) / 3);
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
    const thinkingOptions = buildThinkingRequestOptions(thinkingEnabled, baseURL, reasoningEffort);
    const response = await this.createChatCompletionStream(
      client,
      {
        model,
        messages: [{ role: "user", content: compactPrompt }],
        ...thinkingOptions,
      },
      signal ? { signal } : void 0,
      sessionId,
      {
        enabled: debugLogEnabled,
        location: "SessionManager.compactSession",
        baseURL,
        params: { thinkingEnabled, reasoningEffort },
      }
    );
    this.throwIfAborted(signal);
    const rawLlmResponse = response.choices?.[0]?.message?.content;
    const llmResponse = typeof rawLlmResponse === "string" ? rawLlmResponse : "";
    const compactedSummary = llmResponse.replace(/<analysis>[\s\S]*?<\/analysis>/gi, "").trim();
    const now = /* @__PURE__ */ new Date().toISOString();
    const responseUsage = response.usage ?? null;
    this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      usage: accumulateUsage(entry.usage, responseUsage),
      usagePerModel: accumulateUsagePerModel(entry.usagePerModel, model, responseUsage),
      activeTokens: getTotalTokens(responseUsage),
      updateTime: now,
    }));
    for (let i = startIndex; i < endIndex; i += 1) {
      sessionMessages[i] = { ...sessionMessages[i], compacted: true, updateTime: now };
    }
    const summaryMessage = {
      id: crypto2.randomUUID(),
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
        isSummary: true,
      },
    };
    sessionMessages.splice(endIndex, 0, summaryMessage);
    this.saveSessionMessages(sessionId, sessionMessages);
  }
  getPromptToolOptions() {
    return {
      model: this.getResolvedSettings().model,
      webSearchEnabled: true,
    };
  }
  reportNewPrompt() {
    const { machineId } = this.createOpenAIClient();
    if (!machineId) {
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NEW_PROMPT_REPORT_TIMEOUT_MS);
    void fetch(DEFAULT_NEW_PROMPT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: machineId,
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
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
      this.processTimeoutControls.delete(this.getProcessControlKey(sessionId, pid));
      if (killProcessTree(pid, "SIGKILL")) {
        killedPids.push(pid);
        continue;
      }
      failedPids.push(pid);
    }
    const controller = this.sessionControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.sessionControllers.delete(sessionId);
    }
    const now = /* @__PURE__ */ new Date().toISOString();
    this.updateSessionEntry(sessionId, (entry) => ({
      ...entry,
      status: "interrupted",
      failReason: "interrupted",
      processes: null,
      updateTime: now,
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
  adjustActiveBashTimeout(deltaMs) {
    const sessionId = this.activeSessionId;
    if (!sessionId || !Number.isFinite(deltaMs)) {
      return null;
    }
    const session = this.getSession(sessionId);
    if (!session?.processes) {
      return null;
    }
    let selectedPid = null;
    for (const pid of session.processes.keys()) {
      if (this.processTimeoutControls.has(this.getProcessControlKey(sessionId, pid))) {
        selectedPid = pid;
      }
    }
    if (!selectedPid) {
      return null;
    }
    const control = this.processTimeoutControls.get(this.getProcessControlKey(sessionId, selectedPid));
    if (!control) {
      return null;
    }
    const current = control.getInfo();
    const next = control.setTimeoutMs(current.timeoutMs + deltaMs);
    this.updateSessionProcessTimeout(sessionId, selectedPid, next);
    return this.buildBashTimeoutAdjustment(selectedPid, next);
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
      } catch {}
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
      meta: nextMeta,
    };
  }
  getProjectCode(projectRoot2) {
    return projectRoot2.replace(/[\\/]/g, "-").replace(/:/g, "");
  }
  getProjectStorage() {
    const projectCode = this.getProjectCode(this.projectRoot);
    const projectDir = path9.join(os6.homedir(), ".deepcode", "projects", projectCode);
    const sessionsIndexPath = path9.join(projectDir, "sessions-index.json");
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
      const entries = Array.isArray(parsed.entries)
        ? parsed.entries.map((entry) => this.normalizeSessionEntry(entry))
        : [];
      return {
        version: 1,
        entries,
        originalPath: parsed.originalPath || this.projectRoot,
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
        processes: this.serializeProcesses(entry.processes),
      })),
      originalPath: this.projectRoot,
    };
    fs9.writeFileSync(sessionsIndexPath, JSON.stringify(normalized, null, 2), "utf8");
  }
  getSessionMessagesPath(sessionId) {
    const { projectDir } = this.getProjectStorage();
    return path9.join(projectDir, `${sessionId}.jsonl`);
  }
  removeSessionMessages(sessionIds) {
    for (const sessionId of sessionIds) {
      const messagePath = this.getSessionMessagesPath(sessionId);
      try {
        if (fs9.existsSync(messagePath)) {
          fs9.unlinkSync(messagePath);
        }
      } catch {}
    }
  }
  appendSessionMessage(sessionId, message) {
    this.ensureProjectDir();
    const messagePath = this.getSessionMessagesPath(sessionId);
    fs9.appendFileSync(
      messagePath,
      `${JSON.stringify(message)}
`,
      "utf8"
    );
  }
  saveSessionMessages(sessionId, messages) {
    this.ensureProjectDir();
    const messagePath = this.getSessionMessagesPath(sessionId);
    const payload = messages.map((message) => JSON.stringify(message)).join("\n");
    fs9.writeFileSync(
      messagePath,
      payload
        ? `${payload}
`
        : "",
      "utf8"
    );
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
    const now = /* @__PURE__ */ new Date().toISOString();
    const imageParams =
      prompt.imageUrls
        ?.filter((url) => Boolean(url))
        .map((url) => ({
          type: "image_url",
          image_url: { url },
        })) ?? [];
    return {
      id: crypto2.randomUUID(),
      sessionId,
      role: "user",
      content: prompt.text ?? "",
      contentParams: imageParams.length > 0 ? imageParams : null,
      messageParams: null,
      compacted: false,
      visible: true,
      createTime: now,
      updateTime: now,
    };
  }
  renderInitCommandPrompt() {
    const templatePath = path9.join(getExtensionRoot2(), "templates", "prompts", "init_command.md.ejs");
    const template = fs9.readFileSync(templatePath, "utf8");
    return ejs2.render(template, {
      agentsMdFile: this.getEffectiveProjectAgentsMdFile(),
    });
  }
  getEffectiveProjectAgentsMdFile() {
    return this.loadProjectAgentInstructions()?.displayPath ?? null;
  }
  loadProjectAgentInstructions() {
    const candidatePaths = [
      {
        absolutePath: path9.join(this.projectRoot, ".deepcode", "AGENTS.md"),
        displayPath: "./.deepcode/AGENTS.md",
      },
      {
        absolutePath: path9.join(this.projectRoot, "AGENTS.md"),
        displayPath: "./AGENTS.md",
      },
    ];
    for (const candidatePath of candidatePaths) {
      const content = this.readNonEmptyFile(candidatePath.absolutePath);
      if (content) {
        return {
          content,
          displayPath: candidatePath.displayPath,
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
    return this.readNonEmptyFile(path9.join(os6.homedir(), ".deepcode", "AGENTS.md"));
  }
  buildSystemMessage(sessionId, content, contentParams = null, visible = false, meta) {
    const now = /* @__PURE__ */ new Date().toISOString();
    return {
      id: crypto2.randomUUID(),
      sessionId,
      role: "system",
      content,
      contentParams,
      messageParams: null,
      compacted: false,
      visible,
      createTime: now,
      updateTime: now,
      meta,
    };
  }
  buildSkillMessage(sessionId, content, skill) {
    const now = /* @__PURE__ */ new Date().toISOString();
    return {
      id: crypto2.randomUUID(),
      sessionId,
      role: "system",
      content,
      contentParams: null,
      messageParams: null,
      compacted: false,
      visible: true,
      createTime: now,
      updateTime: now,
      meta: { skill: { ...skill, isLoaded: true } },
    };
  }
  buildAssistantMessage(sessionId, content, toolCalls, reasoningContent) {
    const now = /* @__PURE__ */ new Date().toISOString();
    const hasReasoningContent = reasoningContent != null;
    const messageParams = toolCalls || hasReasoningContent ? {} : null;
    if (toolCalls) {
      messageParams.tool_calls = toolCalls;
    }
    if (hasReasoningContent) {
      messageParams.reasoning_content = reasoningContent;
    }
    return {
      id: crypto2.randomUUID(),
      sessionId,
      role: "assistant",
      content,
      contentParams: null,
      messageParams,
      compacted: false,
      visible: (content || reasoningContent || "").trim() ? true : false,
      createTime: now,
      updateTime: now,
      meta: toolCalls ? { asThinking: true } : void 0,
    };
  }
  buildToolMessage(sessionId, toolCallId, content, toolFunction) {
    const now = /* @__PURE__ */ new Date().toISOString();
    const paramsMd = this.buildToolParamsSnippet(toolFunction);
    const resultMd = this.buildToolResultSnippet(content);
    const isInvisibleExecution = this.isInvisibleExecution(content);
    return {
      id: crypto2.randomUUID(),
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
        resultMd,
      },
    };
  }
  async appendToolMessages(sessionId, toolCalls) {
    const toolExecutions = await this.toolExecutor.executeToolCalls(sessionId, toolCalls, {
      onProcessStart: (pid, command) => this.addSessionProcess(sessionId, pid, command),
      onProcessExit: (pid) => this.removeSessionProcess(sessionId, pid),
      onProcessStdout: (pid, chunk) => this.onProcessStdout?.(Number(pid), chunk),
      onProcessTimeoutControl: (pid, control) => this.setSessionProcessTimeoutControl(sessionId, pid, control),
      shouldStop: () => this.isInterrupted(sessionId),
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
  buildOpenAIMessages(messages, thinkingEnabled, model) {
    const activeMessages = messages.filter((message) => !message.compacted);
    const toolPairings = this.pairToolMessages(activeMessages);
    const openAIMessages = [];
    for (let index = 0; index < activeMessages.length; index += 1) {
      const message = activeMessages[index];
      if (message.role === "tool") {
        continue;
      }
      openAIMessages.push(this.sessionMessageToOpenAIMessage(message, thinkingEnabled, model));
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
          openAIMessages.push(
            this.sessionMessageToOpenAIMessage(activeMessages[pairedToolIndex], thinkingEnabled, model)
          );
          continue;
        }
        openAIMessages.push(this.buildInterruptedOpenAIToolMessage(toolCalls, toolCallId));
      }
    }
    return openAIMessages;
  }
  sessionMessageToOpenAIMessage(message, thinkingEnabled, model) {
    const content = this.renderOpenAIMessageContent(message);
    const base = {
      role: message.role,
      content,
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
      if (content) {
        contentParts.push({ type: "text", text: content });
      }
      const params = Array.isArray(message.contentParams) ? message.contentParams : [message.contentParams];
      for (const param of params) {
        const part = param;
        if (part && (part.type !== "image_url" || supportsMultimodal(model))) {
          contentParts.push(part);
        }
      }
      const contentValue = contentParts.length > 0 ? contentParts : content;
      base.content = contentValue;
    }
    return base;
  }
  renderOpenAIMessageContent(message) {
    if (message.role === "user" && message.content === "/init") {
      return this.renderInitCommandPrompt();
    }
    return message.content ?? "";
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
  getTrailingPendingToolCalls(messages) {
    const activeMessages = messages.filter((message) => !message.compacted);
    const latestMessage = activeMessages[activeMessages.length - 1];
    if (!latestMessage || latestMessage.role !== "assistant") {
      return [];
    }
    const toolCalls = this.getAssistantToolCalls(latestMessage);
    if (toolCalls.length === 0) {
      return [];
    }
    return toolCalls.filter((toolCall) => Boolean(this.getToolCallId(toolCall)));
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
      tool_call_id: toolCallId,
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
        return this.formatToolParamsSnippet(typeof toolName === "string" ? toolName : null, parsed);
      }
    } catch {}
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
    } else if (toolName === "UpdatePlan") {
      return typeof args2.explanation === "string" ? args2.explanation.trim() : "";
    } else if (toolName === "write") {
      return typeof args2.file_path === "string" ? args2.file_path.trim() : "";
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
    } catch {}
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
  maybeNotifyTaskCompletion(sessionId, notifyCommand, startedAt, configuredEnv = {}) {
    if (!notifyCommand) {
      return;
    }
    const session = this.getSession(sessionId);
    if (!session || (session.status !== "completed" && session.status !== "failed")) {
      return;
    }
    let body;
    const messages = this.listSessionMessages(sessionId);
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg.role === "assistant" && msg.content) {
        body = msg.content;
        break;
      }
    }
    launchNotifyScript(notifyCommand, Date.now() - startedAt, this.projectRoot, void 0, configuredEnv, {
      status: session.status,
      failReason: session.failReason ?? void 0,
      body,
      title: session.summary ?? void 0,
    });
  }
  addSessionProcess(sessionId, processId, command) {
    const now = /* @__PURE__ */ new Date().toISOString();
    this.updateSessionEntry(sessionId, (entry) => {
      const processes = new Map(entry.processes ?? []);
      processes.set(String(processId), { startTime: now, command });
      return {
        ...entry,
        processes,
        updateTime: now,
      };
    });
  }
  removeSessionProcess(sessionId, processId) {
    const now = /* @__PURE__ */ new Date().toISOString();
    this.processTimeoutControls.delete(this.getProcessControlKey(sessionId, processId));
    this.updateSessionEntry(sessionId, (entry) => {
      const processes = new Map(entry.processes ?? []);
      processes.delete(String(processId));
      return {
        ...entry,
        processes: processes.size > 0 ? processes : null,
        updateTime: now,
      };
    });
  }
  setSessionProcessTimeoutControl(sessionId, processId, control) {
    const key = this.getProcessControlKey(sessionId, processId);
    if (!control) {
      this.processTimeoutControls.delete(key);
      return;
    }
    this.processTimeoutControls.set(key, control);
    this.updateSessionProcessTimeout(sessionId, processId, control.getInfo());
  }
  updateSessionProcessTimeout(sessionId, processId, info) {
    const now = /* @__PURE__ */ new Date().toISOString();
    this.updateSessionEntry(sessionId, (entry) => {
      const processes = new Map(entry.processes ?? []);
      const pid = String(processId);
      const processInfo = processes.get(pid);
      if (!processInfo) {
        return entry;
      }
      processes.set(pid, {
        ...processInfo,
        timeoutMs: info.timeoutMs,
        deadlineAt: new Date(info.deadlineAtMs).toISOString(),
        timedOut: info.timedOut,
      });
      return {
        ...entry,
        processes,
        updateTime: now,
      };
    });
  }
  buildBashTimeoutAdjustment(processId, info) {
    return {
      processId,
      timeoutMs: info.timeoutMs,
      deadlineAt: new Date(info.deadlineAtMs).toISOString(),
      timedOut: info.timedOut,
    };
  }
  getProcessControlKey(sessionId, processId) {
    return `${sessionId}:${String(processId)}`;
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
    const toolName =
      toolFunction && typeof toolFunction === "object" && typeof toolFunction.name === "string"
        ? toolFunction.name
        : "tool";
    return JSON.stringify(
      {
        ok: false,
        name: toolName,
        error: reason,
        metadata: {
          interrupted: true,
        },
      },
      null,
      2
    );
  }
  normalizeSessionEntry(entry) {
    const value = entry && typeof entry === "object" ? entry : {};
    return {
      id: typeof value.id === "string" ? value.id : crypto2.randomUUID(),
      summary: typeof value.summary === "string" ? value.summary : null,
      assistantReply: typeof value.assistantReply === "string" ? value.assistantReply : null,
      assistantThinking: typeof value.assistantThinking === "string" ? value.assistantThinking : null,
      assistantRefusal: typeof value.assistantRefusal === "string" ? value.assistantRefusal : null,
      toolCalls: Array.isArray(value.toolCalls) ? value.toolCalls : null,
      status: this.normalizeSessionStatus(value.status),
      failReason: typeof value.failReason === "string" ? value.failReason : null,
      usage: value.usage ?? null,
      usagePerModel: this.normalizeUsagePerModel(value),
      activeTokens: typeof value.activeTokens === "number" ? value.activeTokens : 0,
      createTime: typeof value.createTime === "string" ? value.createTime : /* @__PURE__ */ new Date().toISOString(),
      updateTime: typeof value.updateTime === "string" ? value.updateTime : /* @__PURE__ */ new Date().toISOString(),
      processes: this.deserializeProcesses(value.processes),
    };
  }
  normalizeSessionStatus(status) {
    if (
      status === "failed" ||
      status === "pending" ||
      status === "processing" ||
      status === "waiting_for_user" ||
      status === "completed" ||
      status === "interrupted"
    ) {
      return status;
    }
    return "pending";
  }
  normalizeUsagePerModel(entry) {
    if (!Object.prototype.hasOwnProperty.call(entry, "usagePerModel")) {
      return null;
    }
    if (!isUsageRecord(entry.usagePerModel)) {
      return null;
    }
    const usagePerModel = {};
    for (const [model, usage] of Object.entries(entry.usagePerModel)) {
      if (!model || !isUsageRecord(usage)) {
        continue;
      }
      usagePerModel[model] = usage;
    }
    return usagePerModel;
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
        const startTime = typeof obj.startTime === "string" ? obj.startTime : /* @__PURE__ */ new Date().toISOString();
        const command = typeof obj.command === "string" ? obj.command : "Running process...";
        processes.set(pid, {
          startTime,
          command,
          timeoutMs: typeof obj.timeoutMs === "number" ? obj.timeoutMs : void 0,
          deadlineAt: typeof obj.deadlineAt === "string" ? obj.deadlineAt : void 0,
          timedOut: typeof obj.timedOut === "boolean" ? obj.timedOut : void 0,
        });
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

// src/settings.ts
function resolveReasoningEffort(value) {
  return value === "high" || value === "max" ? value : void 0;
}
function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "enabled", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "disabled", "no", "off"].includes(normalized)) {
    return false;
  }
  return void 0;
}
function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeEnv(env) {
  const result = {};
  if (!env) {
    return result;
  }
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}
function collectDeepcodeEnv(processEnv = process.env) {
  const result = {};
  for (const [key, value] of Object.entries(processEnv)) {
    if (!key.startsWith("DEEPCODE_") || typeof value !== "string") {
      continue;
    }
    const strippedKey = key.slice("DEEPCODE_".length);
    if (strippedKey) {
      result[strippedKey] = value;
    }
  }
  return result;
}
function extractMcpEnv(env) {
  const result = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("MCP_")) {
      continue;
    }
    const strippedKey = key.slice("MCP_".length);
    if (strippedKey) {
      result[strippedKey] = value;
    }
  }
  return result;
}
function mergeMcpServers(userSettings, projectSettings, userEnv, projectEnv, systemEnv) {
  const userServers = userSettings?.mcpServers ?? {};
  const projectServers = projectSettings?.mcpServers ?? {};
  const serverNames = /* @__PURE__ */ new Set([...Object.keys(userServers), ...Object.keys(projectServers)]);
  if (serverNames.size === 0) {
    return void 0;
  }
  const userMcpEnv = extractMcpEnv(userEnv);
  const projectMcpEnv = extractMcpEnv(projectEnv);
  const systemMcpEnv = extractMcpEnv(systemEnv);
  const merged = {};
  for (const name of serverNames) {
    const userConfig = userServers[name];
    const projectConfig = projectServers[name];
    const command = projectConfig?.command ?? userConfig?.command;
    if (!command) {
      continue;
    }
    const env = {
      ...userEnv,
      ...(userConfig?.env ?? {}),
      ...userMcpEnv,
      ...projectEnv,
      ...(projectConfig?.env ?? {}),
      ...projectMcpEnv,
      ...systemEnv,
      ...systemMcpEnv,
    };
    const config = {
      command,
      args: projectConfig?.args ?? userConfig?.args,
    };
    if (Object.keys(env).length > 0) {
      config.env = env;
    }
    merged[name] = config;
  }
  return Object.keys(merged).length > 0 ? merged : void 0;
}
function resolveSettingsSources(userSettings, projectSettings, defaults, processEnv = process.env) {
  const userEnv = normalizeEnv(userSettings?.env);
  const projectEnv = normalizeEnv(projectSettings?.env);
  const systemEnv = collectDeepcodeEnv(processEnv);
  const env = {
    ...userEnv,
    ...projectEnv,
    ...systemEnv,
  };
  const model =
    trimString(systemEnv.MODEL) ||
    trimString(projectSettings?.model) ||
    trimString(projectEnv.MODEL) ||
    trimString(userSettings?.model) ||
    trimString(userEnv.MODEL) ||
    defaults.model;
  const thinkingEnabled =
    parseBoolean(systemEnv.THINKING_ENABLED) ??
    parseBoolean(projectSettings?.thinkingEnabled) ??
    parseBoolean(projectEnv.THINKING_ENABLED) ??
    parseBoolean(userSettings?.thinkingEnabled) ??
    parseBoolean(userEnv.THINKING_ENABLED) ??
    defaultsToThinkingMode(model);
  const reasoningEffort =
    resolveReasoningEffort(systemEnv.REASONING_EFFORT) ??
    resolveReasoningEffort(projectSettings?.reasoningEffort) ??
    resolveReasoningEffort(projectEnv.REASONING_EFFORT) ??
    resolveReasoningEffort(userSettings?.reasoningEffort) ??
    resolveReasoningEffort(userEnv.REASONING_EFFORT) ??
    "max";
  const debugLogEnabled =
    parseBoolean(systemEnv.DEBUG_LOG_ENABLED) ??
    parseBoolean(projectSettings?.debugLogEnabled) ??
    parseBoolean(projectEnv.DEBUG_LOG_ENABLED) ??
    parseBoolean(userSettings?.debugLogEnabled) ??
    parseBoolean(userEnv.DEBUG_LOG_ENABLED) ??
    false;
  const notify =
    trimString(systemEnv.NOTIFY) || trimString(projectSettings?.notify) || trimString(userSettings?.notify) || "";
  const webSearchTool =
    trimString(systemEnv.WEB_SEARCH_TOOL) ||
    trimString(projectSettings?.webSearchTool) ||
    trimString(userSettings?.webSearchTool) ||
    "";
  return {
    env,
    apiKey: trimString(env.API_KEY) || void 0,
    baseURL: trimString(env.BASE_URL) || defaults.baseURL,
    model,
    thinkingEnabled,
    reasoningEffort,
    debugLogEnabled,
    notify: notify || void 0,
    webSearchTool: webSearchTool || void 0,
    mcpServers: mergeMcpServers(userSettings, projectSettings, userEnv, projectEnv, systemEnv),
  };
}
function modelConfigKey(config) {
  return config.thinkingEnabled ? `thinking:${config.reasoningEffort}` : "thinking:none";
}
function applyModelConfigSelection(settings, current, selected) {
  const changed = selected.model !== current.model || modelConfigKey(selected) !== modelConfigKey(current);
  const next = { ...(settings ?? {}) };
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

// src/ui/PromptInput.tsx
import React5, { useEffect as useEffect2, useMemo as useMemo2, useState as useState3 } from "react";
import { Box as Box4, Text as Text4, useApp, useStdout } from "ink";
import chalk3 from "chalk";

// src/ui/constants.ts
var ARGS_SEPARATOR = " | ";

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
    cursor: start,
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
    cursor: start,
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
    lineEnd,
  };
}

// src/ui/promptUndoRedo.ts
function createPromptUndoRedoState() {
  return { undoStack: [], redoStack: [] };
}
function recordPromptEdit(history, current, next, maxUndoEntries = 1e3) {
  if (next.text === current.text || next.text === history.undoStack.at(-1)?.text) {
    return;
  }
  history.undoStack.push(current);
  if (history.undoStack.length > maxUndoEntries) {
    history.undoStack = history.undoStack.slice(-maxUndoEntries);
  }
  history.redoStack = [];
}
function undoPromptEdit(history, current) {
  const previous = history.undoStack.pop();
  if (!previous) {
    return null;
  }
  history.redoStack.push(current);
  return previous;
}
function redoPromptEdit(history, current) {
  const next = history.redoStack.pop();
  if (!next) {
    return null;
  }
  history.undoStack.push(current);
  return next;
}
function clearPromptUndoRedoState(history) {
  history.undoStack = [];
  history.redoStack = [];
}

// src/ui/slashCommands.ts
var BUILTIN_SLASH_COMMANDS = [
  {
    kind: "skills",
    name: "skills",
    label: "/skills",
    description: "List available skills",
  },
  {
    kind: "model",
    name: "model",
    label: "/model",
    description: "Select model, thinking mode and effort control",
  },
  {
    kind: "new",
    name: "new",
    label: "/new",
    description: "Start a fresh conversation",
  },
  {
    kind: "init",
    name: "init",
    label: "/init",
    description: "Initialize an AGENTS.md file with instructions for LLM",
  },
  {
    kind: "resume",
    name: "resume",
    label: "/resume",
    description: "Pick a previous conversation to continue",
  },
  {
    kind: "continue",
    name: "continue",
    label: "/continue",
    description: "Continue the active conversation or pick one to resume",
  },
  {
    kind: "mcp",
    name: "mcp",
    label: "/mcp",
    description: "Show MCP server status and available tools",
  },
  {
    kind: "raw",
    name: "raw",
    label: "/raw",
    args: ["lite", "normal", "raw-scrollback"],
    description: "Toggle display mode for viewing or collapsing reasoning content",
  },
  {
    kind: "exit",
    name: "exit",
    label: "/exit",
    description: "Quit Deep Code CLI",
  },
];
function buildSlashCommands(skills) {
  const skillItems = skills.map((skill) => ({
    kind: "skill",
    name: skill.name,
    label: `/${skill.name}`,
    description: skill.description || "(no description)",
    skill,
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

// src/ui/fileMentions.ts
import * as fs10 from "fs";
import * as path10 from "path";
import ignore2 from "ignore";
var DEFAULT_MAX_ITEMS = 2e3;
var DEFAULT_MAX_DEPTH = 8;
function scanFileMentionItems(root, maxItems = DEFAULT_MAX_ITEMS) {
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  const gitRoot = findGitRoot(root);
  const visitedDirectories = /* @__PURE__ */ new Set();
  function addItem(item) {
    if (items.length >= maxItems || seen.has(item.path)) {
      return;
    }
    seen.add(item.path);
    items.push(item);
  }
  function visit(directory, depth, matchers) {
    if (items.length >= maxItems || depth > DEFAULT_MAX_DEPTH) {
      return;
    }
    const currentMatchers = [...matchers, ...loadDirectoryIgnoreMatchers(directory, gitRoot)];
    let entries;
    try {
      entries = fs10.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const entry of entries) {
      if (items.length >= maxItems) {
        return;
      }
      if (entry.name === "." || entry.name === ".." || entry.name === ".git") {
        continue;
      }
      const absolute = path10.join(directory, entry.name);
      const relative3 = toMentionPath(path10.relative(root, absolute));
      if (!relative3) {
        continue;
      }
      const entryType = getMentionEntryType(entry, absolute);
      if (!entryType) {
        continue;
      }
      if (matchesAnyIgnore(absolute, entryType === "directory", currentMatchers)) {
        continue;
      }
      if (entryType === "directory") {
        const realPath = safeRealpath(absolute);
        if (realPath) {
          if (visitedDirectories.has(realPath)) {
            continue;
          }
          visitedDirectories.add(realPath);
        }
        addItem({ path: `${relative3}/`, type: "directory" });
        visit(absolute, depth + 1, currentMatchers);
        continue;
      }
      if (entryType === "file") {
        addItem({ path: relative3, type: "file" });
      }
    }
  }
  const rootRealPath = safeRealpath(root);
  if (rootRealPath) {
    visitedDirectories.add(rootRealPath);
  }
  visit(root, 0, loadAncestorIgnoreMatchers(root, gitRoot));
  return items;
}
function getMentionEntryType(entry, absolute) {
  if (entry.isDirectory()) {
    return "directory";
  }
  if (entry.isFile()) {
    return "file";
  }
  if (!entry.isSymbolicLink()) {
    return null;
  }
  try {
    const stat = fs10.statSync(absolute);
    if (stat.isDirectory()) {
      return "directory";
    }
    if (stat.isFile()) {
      return "file";
    }
  } catch {
    return null;
  }
  return null;
}
function safeRealpath(absolute) {
  try {
    return fs10.realpathSync(absolute);
  } catch {
    return null;
  }
}
function loadDirectoryIgnoreMatchers(directory, gitRoot) {
  const matchers = [];
  if (gitRoot && isPathInsideOrEqual(directory, gitRoot)) {
    const gitignoreMatcher = loadIgnoreFileMatcher(directory, path10.join(directory, ".gitignore"));
    if (gitignoreMatcher) {
      matchers.push(gitignoreMatcher);
    }
    if (path10.resolve(directory) === path10.resolve(gitRoot)) {
      const gitExcludeMatcher = loadIgnoreFileMatcher(directory, path10.join(directory, ".git", "info", "exclude"));
      if (gitExcludeMatcher) {
        matchers.push(gitExcludeMatcher);
      }
    }
  }
  const ignoreMatcher = loadIgnoreFileMatcher(directory, path10.join(directory, ".ignore"));
  if (ignoreMatcher) {
    matchers.push(ignoreMatcher);
  }
  return matchers;
}
function loadAncestorIgnoreMatchers(root, gitRoot) {
  const resolvedRoot = path10.resolve(root);
  const ancestors = [];
  let current = path10.dirname(resolvedRoot);
  while (gitRoot && isPathInsideOrEqual(current, gitRoot)) {
    ancestors.push(current);
    if (path10.resolve(current) === path10.resolve(gitRoot)) {
      break;
    }
    current = path10.dirname(current);
  }
  return ancestors.reverse().flatMap((directory) => loadDirectoryIgnoreMatchers(directory, gitRoot));
}
function loadIgnoreFileMatcher(base, ignoreFilePath) {
  try {
    if (!fs10.existsSync(ignoreFilePath)) {
      return null;
    }
    const content = fs10.readFileSync(ignoreFilePath, "utf8");
    if (!content.trim()) {
      return null;
    }
    return { base, matcher: ignore2().add(content) };
  } catch {
    return null;
  }
}
function matchesAnyIgnore(absolute, isDir, matchers) {
  let ignored = false;
  for (const { base, matcher } of matchers) {
    const relative3 = toMentionPath(path10.relative(base, absolute));
    if (!relative3 || relative3.startsWith("../")) {
      continue;
    }
    const result = matcher.test(isDir ? `${relative3}/` : relative3);
    if (result.ignored) {
      ignored = true;
    }
    if (result.unignored) {
      ignored = false;
    }
  }
  return ignored;
}
function findGitRoot(start) {
  let current = path10.resolve(start);
  while (true) {
    if (fs10.existsSync(path10.join(current, ".git"))) {
      return current;
    }
    const parent = path10.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}
function isPathInsideOrEqual(candidate, parent) {
  const relative3 = path10.relative(parent, candidate);
  return relative3 === "" || (!relative3.startsWith("..") && !path10.isAbsolute(relative3));
}
function filterFileMentionItems(items, query, maxResults = 12) {
  const normalizedQuery = normalizeForSearch(query);
  const scored = items
    .map((item, index) => ({ item, index, score: scoreFileMention(item.path, normalizedQuery) }))
    .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
    .sort((a, b) => a.score - b.score || a.item.path.length - b.item.path.length || a.index - b.index);
  return scored.slice(0, maxResults).map((entry) => entry.item);
}
function getCurrentFileMentionToken(state) {
  const text = state.text;
  const cursor = clampCursorToBoundary(text, state.cursor);
  const quoted = getCurrentQuotedFileMentionToken(text, cursor);
  if (quoted) {
    return quoted;
  }
  return getCurrentBareFileMentionToken(text, cursor);
}
function replaceCurrentFileMentionToken(state, token, selectedPath) {
  const inserted = `${formatFileMentionPath(selectedPath)} `;
  const end = token.end < state.text.length && isWhitespace(state.text[token.end] ?? "") ? token.end + 1 : token.end;
  const text = `${state.text.slice(0, token.start)}${inserted}${state.text.slice(end)}`;
  return { text, cursor: token.start + inserted.length };
}
function formatFileMentionPath(filePath) {
  if (!/[\s"]/.test(filePath)) {
    return `@${filePath}`;
  }
  return `@"${filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function getCurrentBareFileMentionToken(text, cursor) {
  const beforeCursor = text.slice(0, cursor);
  const afterCursor = text.slice(cursor);
  const start = findTokenStart(beforeCursor);
  const end = cursor + findTokenEnd(afterCursor);
  const token = text.slice(start, end);
  if (!token.startsWith("@") || token.startsWith('@"')) {
    return null;
  }
  if (start > 0 && !isWhitespace(text[start - 1] ?? "")) {
    return null;
  }
  return { query: token.slice(1), start, end, quoted: false };
}
function getCurrentQuotedFileMentionToken(text, cursor) {
  for (let index = cursor; index >= 0; index--) {
    if (text[index] !== "@" || text[index + 1] !== '"') {
      continue;
    }
    if (index > 0 && !isWhitespace(text[index - 1] ?? "")) {
      continue;
    }
    const closeQuote = findClosingQuote(text, index + 2);
    if (closeQuote !== -1 && cursor > closeQuote) {
      continue;
    }
    const end = closeQuote === -1 ? cursor : closeQuote + 1;
    return {
      query: unescapeQuotedMentionQuery(
        text.slice(index + 2, Math.min(cursor, closeQuote === -1 ? cursor : closeQuote))
      ),
      start: index,
      end,
      quoted: true,
    };
  }
  return null;
}
function findTokenStart(beforeCursor) {
  const whitespaceIndex = findLastWhitespaceIndex(beforeCursor);
  return whitespaceIndex === -1 ? 0 : whitespaceIndex + 1;
}
function findTokenEnd(afterCursor) {
  const whitespaceIndex = afterCursor.search(/\s/);
  return whitespaceIndex === -1 ? afterCursor.length : whitespaceIndex;
}
function findLastWhitespaceIndex(value) {
  for (let index = value.length - 1; index >= 0; index--) {
    if (isWhitespace(value[index] ?? "")) {
      return index;
    }
  }
  return -1;
}
function findClosingQuote(text, start) {
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      return index;
    }
  }
  return -1;
}
function unescapeQuotedMentionQuery(query) {
  return query.replace(/\\(["\\])/g, "$1");
}
function clampCursorToBoundary(text, cursor) {
  return Math.max(0, Math.min(cursor, text.length));
}
function scoreFileMention(itemPath, normalizedQuery) {
  if (!normalizedQuery) {
    return itemPath.endsWith("/") ? 5 : 10;
  }
  const normalizedPath = normalizeForSearch(itemPath);
  const normalizedBase = normalizeForSearch(path10.posix.basename(itemPath.replace(/\/$/, "")));
  if (normalizedPath === normalizedQuery) {
    return 0;
  }
  if (normalizedPath.startsWith(normalizedQuery)) {
    return 1;
  }
  if (normalizedBase.startsWith(normalizedQuery)) {
    return isQueryBoundary(normalizedBase[normalizedQuery.length] ?? "") ? 2 : 3;
  }
  const pathIndex = normalizedPath.indexOf(normalizedQuery);
  if (pathIndex !== -1) {
    return 20 + pathIndex;
  }
  const fuzzyScore = fuzzyMatchScore(normalizedPath, normalizedQuery);
  return fuzzyScore === null ? Number.POSITIVE_INFINITY : 100 + fuzzyScore;
}
function fuzzyMatchScore(value, query) {
  let valueIndex = 0;
  let score = 0;
  for (const char of query) {
    const nextIndex = value.indexOf(char, valueIndex);
    if (nextIndex === -1) {
      return null;
    }
    score += nextIndex - valueIndex;
    valueIndex = nextIndex + 1;
  }
  return score;
}
function normalizeForSearch(value) {
  return value.trim().toLocaleLowerCase();
}
function isQueryBoundary(value) {
  return value === "" || /[\s._/-]/.test(value);
}
function toMentionPath(value) {
  return value.split(path10.sep).join("/");
}
function isWhitespace(value) {
  return /\s/.test(value);
}

// src/ui/clipboard.ts
import { spawnSync as spawnSync2 } from "child_process";
import * as fs11 from "fs";
import * as os7 from "os";
import * as path11 from "path";
var PNG_MIME = "image/png";
var IMAGE_MIME_BY_EXT = /* @__PURE__ */ new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
]);
function bufferToDataUrl(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
function isImageFilePath(value) {
  return IMAGE_MIME_BY_EXT.has(path11.extname(value.trim()).toLowerCase());
}
function mimeTypeForPath(value) {
  return IMAGE_MIME_BY_EXT.get(path11.extname(value.trim()).toLowerCase()) ?? PNG_MIME;
}
function tryRun(command, args2) {
  try {
    const result = spawnSync2(command, args2, { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
      return null;
    }
    return result.stdout;
  } catch {
    return null;
  }
}
function tryRunStatus(command, args2) {
  try {
    const result = spawnSync2(command, args2, { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
    return result.status === 0;
  } catch {
    return false;
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
function readMacClipboardImage() {
  const pngpaste = tryRun("pngpaste", ["-"]);
  if (pngpaste && pngpaste.length > 0) {
    return { dataUrl: bufferToDataUrl(pngpaste, PNG_MIME), mimeType: PNG_MIME };
  }
  const tempDir = fs11.mkdtempSync(path11.join(os7.tmpdir(), "deepcode-clipboard-"));
  const screenshotPath = path11.join(tempDir, "clipboard.png");
  try {
    const saved = tryRunStatus("osascript", [
      "-e",
      "set png_data to (the clipboard as \xABclass PNGf\xBB)",
      "-e",
      `set fp to open for access POSIX file "${screenshotPath}" with write permission`,
      "-e",
      "write png_data to fp",
      "-e",
      "close access fp",
    ]);
    if (saved) {
      const image = readImageFile(screenshotPath);
      if (image) {
        return image;
      }
    }
    const fileUrl = tryRun("osascript", ["-e", "get POSIX path of (the clipboard as \xABclass furl\xBB)"]);
    const filePath = fileUrl?.toString("utf8").trim();
    if (filePath) {
      return readImageFile(filePath);
    }
    return null;
  } finally {
    try {
      fs11.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
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
    const script =
      "Add-Type -AssemblyName System.Windows.Forms;$img = [System.Windows.Forms.Clipboard]::GetImage();if ($img) { $ms = New-Object System.IO.MemoryStream;$img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);[Console]::OpenStandardOutput().Write($ms.ToArray(), 0, $ms.Length); }";
    const out = tryRun("powershell", ["-NoProfile", "-Command", script]);
    if (out && out.length > 0) {
      return { dataUrl: bufferToDataUrl(out, PNG_MIME), mimeType: PNG_MIME };
    }
    return null;
  }
  return null;
}
async function readClipboardImageAsync() {
  return new Promise((resolve8, reject) => {
    setImmediate(() => {
      try {
        const result = readClipboardImage();
        resolve8(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// src/ui/prompt/useTerminalInput.ts
import { useEffect, useRef } from "react";
import { useStdin } from "ink";
var BACKSPACE_BYTES = /* @__PURE__ */ new Set(["\x7F", "\b"]);
var FORWARD_DELETE_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[3~", "\x1B[P"]);
var HOME_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[H", "\x1B[1~", "\x1B[7~", "\x1BOH"]);
var END_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[F", "\x1B[4~", "\x1B[8~", "\x1BOF"]);
var SHIFT_RETURN_SEQUENCES = /* @__PURE__ */ new Set(["\x1B\r", "\x1B[13;2u", "\x1B[13;2~", "\x1B[27;2;13~"]);
var META_RETURN_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[13;3u", "\x1B[13;4u"]);
var CTRL_LEFT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;5D", "\x1B[5D"]);
var CTRL_RIGHT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;5C", "\x1B[5C"]);
var META_LEFT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;3D", "\x1B[3D", "\x1Bb"]);
var META_RIGHT_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[1;3C", "\x1B[3C", "\x1Bf"]);
var TERMINAL_FOCUS_IN = "\x1B[I";
var TERMINAL_FOCUS_OUT = "\x1B[O";
var CTRL_MINUS_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[45;5u", "\x1B[27;5;45~"]);
var CTRL_SHIFT_MINUS_SEQUENCES = /* @__PURE__ */ new Set(["\x1B[45;6u", "\x1B[27;6;45~"]);
function parseTerminalInput(data) {
  const raw = String(data);
  let input = raw;
  if (CTRL_MINUS_SEQUENCES.has(raw)) {
    input = "-";
    const key2 = {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      home: false,
      end: false,
      pageDown: false,
      pageUp: false,
      return: false,
      escape: false,
      ctrl: true,
      shift: false,
      tab: false,
      backspace: false,
      delete: false,
      meta: false,
      focusIn: false,
      focusOut: false,
    };
    return { input, key: key2 };
  }
  if (CTRL_SHIFT_MINUS_SEQUENCES.has(raw) || raw === "") {
    input = "-";
    const key2 = {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      home: false,
      end: false,
      pageDown: false,
      pageUp: false,
      return: false,
      escape: false,
      ctrl: true,
      shift: true,
      tab: false,
      backspace: false,
      delete: false,
      meta: false,
      focusIn: false,
      focusOut: false,
    };
    return { input, key: key2 };
  }
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
    focusOut: raw === TERMINAL_FOCUS_OUT,
  };
  if (input <= "" && !key.return) {
    input = String.fromCharCode(input.charCodeAt(0) + "a".charCodeAt(0) - 1);
    key.ctrl = true;
  }
  const isKnownEscapeSequence =
    key.upArrow ||
    key.downArrow ||
    key.leftArrow ||
    key.rightArrow ||
    key.home ||
    key.end ||
    key.pageDown ||
    key.pageUp ||
    key.tab ||
    key.delete ||
    key.return ||
    key.ctrl ||
    key.meta ||
    key.focusIn ||
    key.focusOut;
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
  const { stdin, setRawMode } = useStdin();
  const isActive = options.isActive ?? true;
  const handlerRef = useRef(inputHandler);
  handlerRef.current = inputHandler;
  useEffect(() => {
    if (!isActive) {
      return;
    }
    setRawMode(true);
    return () => {
      setRawMode(false);
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
    stdin?.on("data", handleData);
    return () => {
      stdin?.off("data", handleData);
    };
  }, [isActive, stdin]);
}

// src/ui/prompt/cursor.ts
import { useLayoutEffect, useRef as useRef2 } from "react";
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
function enableTerminalExtendedKeys() {
  return "\x1B[>4;1m";
}
function disableTerminalExtendedKeys() {
  return "\x1B[>4;0m";
}
function useHiddenTerminalCursor(stdout, isActive) {
  useLayoutEffect(() => {
    if (!isActive || !stdout?.isTTY) {
      return;
    }
    stdout.write(hideCursor());
    return () => {
      stdout.write(showCursor());
    };
  }, [isActive, stdout]);
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
function useTerminalExtendedKeys(stdout, isActive) {
  useLayoutEffect(() => {
    if (!isActive || !stdout?.isTTY) {
      return;
    }
    stdout.write(enableTerminalExtendedKeys());
    return () => {
      stdout.write(disableTerminalExtendedKeys());
    };
  }, [isActive, stdout]);
}

// src/ui/SlashCommandMenu.tsx
import React from "react";
import { Box, Text } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
var SlashCommandMenu = React.memo(function SlashCommandMenu2({ items, activeIndex, maxVisible = 6, width }) {
  const labelColumnWidth = React.useMemo(() => {
    if (items.length === 0) {
      return 0;
    }
    const longestLabel = Math.max(
      ...items.map((s) => s.label.length + (s.args ? s.args?.join(ARGS_SEPARATOR)?.length + 4 : 0))
    );
    const contentWidth = longestLabel + 2;
    const maxAllowed = Math.max(10, (width - 2) >> 1);
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
  return /* @__PURE__ */ jsxs(Box, {
    flexDirection: "column",
    marginBottom: 1,
    width,
    children: [
      visibleStart > 0
        ? /* @__PURE__ */ jsx(Box, {
            marginLeft: 2,
            children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u25B2" }),
          })
        : null,
      visibleItems.map((item, idx) => {
        const actualIndex = visibleStart + idx;
        return /* @__PURE__ */ jsxs(
          Box,
          {
            gap: 2,
            flexDirection: "row",
            flexGrow: 1,
            children: [
              /* @__PURE__ */ jsxs(Box, {
                width: labelColumnWidth,
                flexShrink: 0,
                gap: 2,
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    color: actualIndex === activeIndex ? "#229ac3" : void 0,
                    wrap: "truncate-end",
                    children: [
                      actualIndex === activeIndex ? "> " : "  ",
                      /* @__PURE__ */ jsx(Text, { bold: true, children: formatSlashCommandLabel(item) }),
                    ],
                  }),
                  item.args
                    ? /* @__PURE__ */ jsx(Text, { dimColor: true, children: item.args.join(ARGS_SEPARATOR) })
                    : null,
                ],
              }),
              /* @__PURE__ */ jsx(Box, {
                flexGrow: 1,
                children: /* @__PURE__ */ jsx(Text, {
                  color: actualIndex === activeIndex ? "#229ac3" : void 0,
                  wrap: "truncate-end",
                  dimColor: true,
                  children: formatSlashCommandDescription(item.description),
                }),
              }),
            ],
          },
          item.label
        );
      }),
      /* @__PURE__ */ jsxs(Box, {
        marginLeft: 2,
        flexDirection: "column",
        children: [
          visibleStart + visibleItems.length < items.length
            ? /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u25BC" })
            : null,
          /* @__PURE__ */ jsxs(Text, {
            dimColor: true,
            children: ["(", activeIndex + 1, "/", items.length, ") \u2191\u2193 to navigate \xB7 Enter to select"],
          }),
        ],
      }),
    ],
  });
});
var SlashCommandMenu_default = SlashCommandMenu;

// src/ui/DropdownMenu.tsx
import React2, { useMemo } from "react";
import { Box as Box2, Text as Text2 } from "ink";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function calculateVisibleStart(activeIndex, totalItems, maxVisible) {
  return Math.min(Math.max(0, activeIndex - Math.floor((maxVisible - 1) / 2)), Math.max(0, totalItems - maxVisible));
}
var DropdownMenu = React2.memo(function DropdownMenu2({
  items,
  activeIndex,
  maxVisible = 8,
  width,
  title,
  titleColor = "magenta",
  activeColor = "cyanBright",
  helpText,
  emptyText = "No items found",
  renderItem,
}) {
  const visibleStart = calculateVisibleStart(activeIndex, items?.length, maxVisible);
  const visibleItems = items?.slice(visibleStart, visibleStart + maxVisible);
  const labelColumnWidth = useMemo(() => {
    if (visibleItems.length === 0) {
      return 0;
    }
    const maxContentWidth = Math.max(
      ...visibleItems.map((item) => {
        let width2 = 2;
        if (item.selected !== void 0) {
          width2 += 2;
        }
        width2 += item.label.length;
        if (item.statusIndicator) {
          width2 += 2;
        }
        return width2;
      })
    );
    const maxAllowed = Math.max(10, (width - 2) >> 1);
    return Math.min(maxContentWidth, maxAllowed);
  }, [visibleItems, width]);
  if (items?.length === 0) {
    return /* @__PURE__ */ jsxs2(Box2, {
      flexDirection: "column",
      marginBottom: 1,
      width,
      children: [
        title ? /* @__PURE__ */ jsx2(Text2, { color: titleColor, bold: true, children: title }) : null,
        /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: emptyText }),
        helpText ? /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: helpText }) : null,
      ],
    });
  }
  return /* @__PURE__ */ jsxs2(Box2, {
    flexDirection: "column",
    marginBottom: 1,
    borderStyle: "round",
    borderDimColor: true,
    width,
    children: [
      title
        ? /* @__PURE__ */ jsx2(Box2, {
            borderStyle: "single",
            borderDimColor: true,
            borderBottom: true,
            borderRight: false,
            borderTop: false,
            borderLeft: false,
            paddingX: 1,
            children: /* @__PURE__ */ jsx2(Text2, { color: titleColor, bold: true, children: title }),
          })
        : null,
      visibleStart > 0
        ? /* @__PURE__ */ jsx2(Box2, {
            marginLeft: 2,
            children: /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: ["\u2026 ", visibleStart, " above"] }),
          })
        : null,
      /* @__PURE__ */ jsx2(Box2, {
        flexDirection: "column",
        children: visibleItems.map((item, idx) => {
          const actualIndex = visibleStart + idx;
          const isActive = actualIndex === activeIndex;
          if (renderItem) {
            return /* @__PURE__ */ jsx2(React2.Fragment, { children: renderItem(item, isActive) }, item.key);
          }
          return /* @__PURE__ */ jsxs2(
            Box2,
            {
              flexGrow: 1,
              flexDirection: "row",
              gap: 2,
              paddingX: 1,
              children: [
                /* @__PURE__ */ jsx2(Box2, {
                  width: labelColumnWidth,
                  flexShrink: 0,
                  children: /* @__PURE__ */ jsxs2(Text2, {
                    color: isActive ? activeColor : void 0,
                    wrap: "truncate-end",
                    children: [
                      isActive ? "> " : "  ",
                      item.selected !== void 0 ? (item.selected ? "\u25CF" : "\u25CB") : null,
                      " ",
                      /* @__PURE__ */ jsx2(Text2, { bold: true, children: item.label }),
                      item.statusIndicator
                        ? /* @__PURE__ */ jsxs2(Text2, {
                            color: item.statusIndicator.color,
                            children: [" ", item.statusIndicator.symbol],
                          })
                        : null,
                    ],
                  }),
                }),
                /* @__PURE__ */ jsx2(Box2, {
                  flexGrow: 1,
                  children: item.description
                    ? /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: `${item.description}` })
                    : null,
                }),
              ],
            },
            item.key
          );
        }),
      }),
      visibleStart + visibleItems.length < items.length
        ? /* @__PURE__ */ jsx2(Box2, {
            marginLeft: 2,
            children: /* @__PURE__ */ jsxs2(Text2, {
              dimColor: true,
              children: ["\u2026 ", items.length - visibleStart - visibleItems.length, " more"],
            }),
          })
        : null,
      helpText
        ? /* @__PURE__ */ jsx2(Box2, {
            borderStyle: "single",
            borderDimColor: true,
            borderBottom: false,
            borderRight: false,
            borderTop: true,
            borderLeft: false,
            paddingX: 1,
            children: /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: helpText }),
          })
        : null,
    ],
  });
});
var DropdownMenu_default = DropdownMenu;

// src/ui/components/RawModelDropdown/index.tsx
import { useState as useState2 } from "react";
import { useInput } from "ink";

// src/ui/contexts/AppContext.tsx
import { createContext, useContext } from "react";
var AppContext = createContext(null);
var useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    return { version: "unknown" };
  }
  return context;
};

// src/ui/contexts/RawModeContext.tsx
import {
  createContext as createContext2,
  useCallback,
  useContext as useContext2,
  useRef as useRef3,
  useState,
} from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var RAW_COMMAND_MODELS = [
  {
    label: "Lite mode",
    key: "Lite mode" /* Lite */,
    description: "Collapse chain-of-thought reasoning.",
  },
  {
    label: "Normal mode",
    key: "Normal mode" /* None */,
    description: "Show full chain-of-thought reasoning.",
  },
  {
    label: "Raw scrollback mode",
    key: "Raw scrollback mode" /* Raw */,
    description: "Show scrollback mode for copy-friendly terminal selection.",
  },
];
var RawModeContext = createContext2({
  mode: "Lite mode" /* Lite */,
  setMode: () => {},
  previousMode: "Lite mode" /* Lite */,
});
function useRawModeContext() {
  const context = useContext2(RawModeContext);
  if (!context) {
    throw new Error("useRawModeContext must be used within a RawModeProvider");
  }
  return context;
}
var RawModeProvider = ({ children }) => {
  const [mode, _setMode] = useState("Lite mode" /* Lite */);
  const previousModeRef = useRef3("Lite mode" /* Lite */);
  const setMode = useCallback((next) => {
    _setMode((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      if (resolved !== current) {
        previousModeRef.current = current;
      }
      return resolved;
    });
  }, []);
  return /* @__PURE__ */ jsx3(RawModeContext.Provider, {
    value: { mode, setMode, previousMode: previousModeRef.current },
    children,
  });
};

// src/ui/components/RawModelDropdown/index.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
var RawModelDropdown = ({ open = false, screenWidth, onSelect, onClose }) => {
  const { mode, setMode } = useRawModeContext();
  const [index, setIndex] = useState2(0);
  useInput(
    (input, key) => {
      if (key.upArrow) {
        setIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setIndex((i) => Math.min(RAW_COMMAND_MODELS.length - 1, i + 1));
        return;
      }
      if ((input === " " && !key.ctrl && !key.meta) || (key.return && !key.shift && !key.meta)) {
        setMode(RAW_COMMAND_MODELS[index].key);
        onClose?.(false);
        onSelect?.(RAW_COMMAND_MODELS[index].key);
        return;
      }
      if (key.escape) {
        onClose?.(false);
        return;
      }
    },
    { isActive: open }
  );
  if (!open) {
    return null;
  }
  return /* @__PURE__ */ jsx4(DropdownMenu_default, {
    title: "Select mode",
    items: RAW_COMMAND_MODELS.map((model) => ({ ...model, selected: model.key === mode })),
    helpText: "Space/Enter select mode \xB7 Esc to close",
    activeColor: "#229ac3",
    maxVisible: 6,
    activeIndex: index,
    width: screenWidth,
  });
};
var RawModelDropdown_default = RawModelDropdown;

// src/ui/components/MessageView/index.tsx
import { Box as Box3, Text as Text3 } from "ink";

// src/ui/components/MessageView/markdown.ts
import chalk from "chalk";
function renderMarkdown(text) {
  if (!text) {
    return "";
  }
  const fenceSegments = splitByFences(text);
  return fenceSegments
    .map((segment) => {
      if (segment.kind === "code") {
        const langTag = segment.lang ? chalk.dim(`[${segment.lang}]`) + "\n" : "";
        return langTag + chalk.cyan(segment.body);
      }
      return renderInlineBlock(segment.body);
    })
    .join("");
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
  return text
    .split("\n")
    .map((line) => renderInlineLine(line))
    .join("\n");
}
function renderInlineLine(line) {
  const headingMatch = /^(\s*)(#{1,6})\s+(.*)$/.exec(line);
  if (headingMatch) {
    const [, lead, hashes, content] = headingMatch;
    const styled = hashes.length <= 2 ? chalk.bold.cyanBright(content) : chalk.bold.cyan(content);
    return `${lead}${chalk.dim(hashes)} ${styled}`;
  }
  const listMatch = /^(\s*)([-*+])\s+(.*)$/.exec(line);
  if (listMatch) {
    const [, lead, bullet, content] = listMatch;
    return `${lead}${chalk.yellow(bullet)} ${renderInlineSpans(content)}`;
  }
  const numListMatch = /^(\s*)(\d+\.)\s+(.*)$/.exec(line);
  if (numListMatch) {
    const [, lead, marker, content] = numListMatch;
    return `${lead}${chalk.yellow(marker)} ${renderInlineSpans(content)}`;
  }
  const quoteMatch = /^(\s*)>\s?(.*)$/.exec(line);
  if (quoteMatch) {
    const [, lead, content] = quoteMatch;
    return `${lead}${chalk.dim("\u2502 ")}${chalk.italic(renderInlineSpans(content))}`;
  }
  return renderInlineSpans(line);
}
function renderInlineSpans(text) {
  if (!text) {
    return text;
  }
  let result = text;
  result = result.replace(/`([^`]+)`/g, (_, inner) => chalk.cyan(inner));
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, inner) => chalk.bold(inner));
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, inner) => chalk.italic(inner));
  result = result.replace(/_([^_\n]+)_/g, (_, inner) => chalk.italic(inner));
  return result;
}

// src/ui/components/MessageView/utils.ts
import chalk2 from "chalk";
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
function buildThinkingSummary(content, messageParams, mode) {
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
    return mode !== "Lite mode" /* Lite */ ? params?.reasoning_content || "" : "(reasoning...)";
  }
  return "";
}
function formatToolStatusParams(summary) {
  const params = firstNonEmptyLine(summary.params);
  return summary.name.toLowerCase() === "bash" ? params : truncate(params, 120);
}
function buildToolSummary(message) {
  const payload = parseToolPayload(message.content);
  const metaFunctionName =
    message.meta?.function && typeof message.meta.function.name === "string" ? message.meta.function.name : null;
  const name = payload.name || metaFunctionName || "tool";
  const params =
    name === "AskUserQuestion"
      ? extractAskUserQuestionParams(message) || getMetaParams(message)
      : getMetaParams(message);
  return {
    name,
    params,
    ok: payload.ok !== false,
    metadata: payload.metadata,
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
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return "";
      }
      return typeof item.question === "string" ? item.question.trim() : "";
    })
    .filter(Boolean)
    .join(" / ");
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
      metadata: isPlainRecord(parsed.metadata) ? parsed.metadata : null,
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
  return diffPreview
    .split("\n")
    .filter((line) => line && !line.startsWith("--- ") && !line.startsWith("+++ ") && !line.startsWith("@@ "))
    .map((line) => {
      if (line.startsWith("+")) {
        return { marker: "+", content: line.slice(1), kind: "added" };
      }
      if (line.startsWith("-")) {
        return { marker: "-", content: line.slice(1), kind: "removed" };
      }
      return {
        marker: " ",
        content: line.startsWith(" ") ? line.slice(1) : line,
        kind: "context",
      };
    });
}
function renderMessageToStdout(message, mode) {
  if (!message.visible) {
    return "";
  }
  if (message.role === "user") {
    const text = message.content || "(no content)";
    return chalk2(`> ${text}`);
  }
  if (message.role === "assistant") {
    const isThinking = Boolean(message.meta?.asThinking);
    const content = (message.content || "").trim();
    if (isThinking) {
      const summary = buildThinkingSummary(content, message.messageParams, mode);
      return `${chalk2("\u2727")} ${chalk2("Thinking")}${summary ? ` ${chalk2(summary)}` : ""}`;
    }
    return `${chalk2("\u2726")} ${content}`;
  }
  if (message.role === "tool") {
    const payload = parseToolPayload(message.content);
    const metaFunctionName =
      message.meta?.function && typeof message.meta.function.name === "string" ? message.meta.function.name : null;
    const name = payload.name || metaFunctionName || "tool";
    const metaParams = typeof message.meta?.paramsMd === "string" ? message.meta.paramsMd.trim() : "";
    const params = name.toLowerCase() === "bash" ? metaParams : truncate(metaParams, 120);
    const statusLine = `${chalk2("\u2727")} ${chalk2(formatStatusName(name))}${params ? ` ${chalk2(params)}` : ""}`;
    const metaResultMd = typeof message.meta?.resultMd === "string" ? message.meta.resultMd.trim() : "";
    const result = metaResultMd
      ? `
${chalk2.dim("  \u2514 Result")}
${metaResultMd}`
      : "";
    const summary = {
      name,
      params,
      ok: payload.ok !== false,
      metadata: payload.metadata,
    };
    const planLines = getUpdatePlanPreviewLines(summary);
    if (planLines.length > 0) {
      const planText = planLines.map((line) => `  ${line}`).join("\n");
      return `${statusLine}
${chalk2.dim("  \u2514 Plan")}
${planText}${result}`;
    }
    return `${statusLine}${result}`;
  }
  if (message.role === "system") {
    if (message.meta?.isModelChange) {
      return chalk2(`> ${message.content}`);
    }
    if (message.meta?.skill && typeof message.meta.skill === "object") {
      const skillName = message.meta.skill.name;
      return chalk2(`\u26A1 Loaded skill: ${typeof skillName === "string" ? skillName : ""}`);
    }
    if (message.meta?.isSummary) {
      return chalk2.dim.italic("(conversation summary inserted)");
    }
    return "";
  }
  return "";
}
function getUpdatePlanPreviewLines(summary) {
  if (!summary.ok || summary.name !== "UpdatePlan") {
    return [];
  }
  const plan = summary.metadata?.plan;
  if (typeof plan !== "string" || !plan.trim()) {
    return [];
  }
  return plan
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

// src/ui/components/MessageView/index.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
function MessageView({ message, collapsed, width = 80 }) {
  const { mode } = useRawModeContext();
  if (!message.visible) {
    return null;
  }
  if (message.role === "user") {
    const text = message.content || "(no content)";
    return /* @__PURE__ */ jsxs3(Box3, {
      marginLeft: 1,
      marginBottom: 1,
      flexDirection: "row",
      marginY: 0,
      flexGrow: 1,
      gap: 1,
      children: [
        /* @__PURE__ */ jsx5(Box3, { children: /* @__PURE__ */ jsx5(Text3, { color: "#229ac3", children: `>` }) }),
        /* @__PURE__ */ jsxs3(Box3, {
          flexGrow: 1,
          children: [
            /* @__PURE__ */ jsx5(Text3, { color: "#229ac3", children: text }),
            Array.isArray(message.contentParams) && message.contentParams.length > 0
              ? /* @__PURE__ */ jsx5(Text3, {
                  color: "#229ac3",
                  children: `  \u{1F4CE} ${message.contentParams.length} image attachment(s)`,
                })
              : null,
          ],
        }),
      ],
    });
  }
  if (message.role === "assistant") {
    const isThinking = Boolean(message.meta?.asThinking);
    const content = (message.content || "").trim();
    if (isThinking) {
      const summary = buildThinkingSummary(content, message.messageParams, mode);
      if (collapsed !== false) {
        return /* @__PURE__ */ jsx5(Box3, {
          marginLeft: 1,
          marginBottom: 1,
          marginY: 0,
          children: /* @__PURE__ */ jsx5(StatusLine, { width, bulletColor: "gray", name: "Thinking", params: summary }),
        });
      }
      return /* @__PURE__ */ jsxs3(Box3, {
        marginLeft: 1,
        flexDirection: "column",
        marginBottom: 1,
        marginY: 0,
        children: [
          /* @__PURE__ */ jsx5(StatusLine, {
            width,
            bulletColor: "gray",
            name: "Thinking",
            params: content ? "" : summary,
          }),
          /* @__PURE__ */ jsx5(Box3, {
            flexDirection: "column",
            marginLeft: 2,
            children: content
              ? /* @__PURE__ */ jsx5(Text3, { dimColor: true, children: renderMarkdown(content) })
              : null,
          }),
        ],
      });
    }
    const containerWidth = Math.max(1, width - 2);
    const contentWidth = Math.max(1, width - 4);
    return /* @__PURE__ */ jsxs3(Box3, {
      marginLeft: 1,
      marginBottom: 1,
      width: containerWidth,
      gap: 1,
      marginY: 0,
      flexDirection: "row",
      children: [
        /* @__PURE__ */ jsx5(Box3, {
          alignSelf: "stretch",
          children: /* @__PURE__ */ jsx5(Text3, { color: "#229ac3", children: "\u2726" }),
        }),
        /* @__PURE__ */ jsx5(Box3, {
          flexGrow: 1,
          width: contentWidth,
          children: content ? /* @__PURE__ */ jsx5(Text3, { wrap: "wrap", children: renderMarkdown(content) }) : null,
        }),
      ],
    });
  }
  if (message.role === "tool") {
    const summary = buildToolSummary(message);
    const diffLines = getToolDiffPreviewLines(summary);
    const planLines = getUpdatePlanPreviewLines(summary);
    return /* @__PURE__ */ jsxs3(Box3, {
      flexDirection: "column",
      marginLeft: 1,
      marginBottom: 1,
      marginY: 0,
      children: [
        /* @__PURE__ */ jsx5(StatusLine, {
          width,
          bulletColor: summary.ok ? "green" : "red",
          name: formatStatusName(summary.name),
          params: formatToolStatusParams(summary),
        }),
        diffLines.length > 0 ? /* @__PURE__ */ jsx5(DiffPreview, { lines: diffLines }) : null,
        planLines.length > 0 ? /* @__PURE__ */ jsx5(PlanPreview, { lines: planLines }) : null,
      ],
    });
  }
  if (message.role === "system") {
    if (message.meta?.isModelChange) {
      return /* @__PURE__ */ jsxs3(Box3, {
        marginY: 0,
        marginLeft: 1,
        marginBottom: 1,
        flexGrow: 1,
        flexDirection: "row",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx5(Box3, { children: /* @__PURE__ */ jsx5(Text3, { color: "#229ac3", children: `>` }) }),
          /* @__PURE__ */ jsx5(Box3, {
            flexGrow: 1,
            flexDirection: "column",
            children: /* @__PURE__ */ jsx5(Text3, { color: "#229ac3", children: message.content }),
          }),
        ],
      });
    }
    if (message.meta?.skill) {
      return /* @__PURE__ */ jsx5(Box3, {
        marginY: 0,
        marginLeft: 1,
        marginBottom: 1,
        children: /* @__PURE__ */ jsxs3(Text3, {
          color: "magenta",
          children: ["\u26A1 Loaded skill: ", message.meta.skill.name],
        }),
      });
    }
    if (message.meta?.isSummary) {
      return /* @__PURE__ */ jsx5(Box3, {
        marginY: 0,
        marginLeft: 1,
        marginBottom: 1,
        children: /* @__PURE__ */ jsx5(Text3, {
          dimColor: true,
          italic: true,
          children: "(conversation summary inserted)",
        }),
      });
    }
    return null;
  }
  return null;
}
function StatusLine({ bulletColor, name, params, width }) {
  const { mode } = useRawModeContext();
  const containerWidth = Math.max(1, width - 2);
  const contentWidth = Math.max(1, width - 4);
  return /* @__PURE__ */ jsxs3(Box3, {
    gap: 1,
    width: containerWidth,
    children: [
      /* @__PURE__ */ jsx5(Box3, {
        alignSelf: "stretch",
        children: /* @__PURE__ */ jsx5(Text3, { color: bulletColor, children: "\u2727" }, "bullet"),
      }),
      /* @__PURE__ */ jsx5(Box3, {
        flexGrow: 1,
        width: contentWidth,
        gap: 1,
        children: /* @__PURE__ */ jsxs3(Text3, {
          wrap: mode === "Lite mode" /* Lite */ ? "truncate-end" : "wrap",
          children: [
            /* @__PURE__ */ jsx5(Text3, { bold: true, children: name }, "name"),
            params ? /* @__PURE__ */ jsx5(Text3, { color: "white", children: ` ${params}` }, "params") : null,
          ],
        }),
      }),
    ],
  });
}
function DiffPreview({ lines }) {
  return /* @__PURE__ */ jsxs3(Box3, {
    flexDirection: "column",
    marginLeft: 2,
    children: [
      /* @__PURE__ */ jsx5(Text3, { dimColor: true, children: "\u2514 Changes" }),
      /* @__PURE__ */ jsx5(Box3, {
        flexDirection: "column",
        marginLeft: 2,
        children: lines.map((line, index) =>
          /* @__PURE__ */ jsxs3(
            Text3,
            {
              wrap: "truncate-end",
              children: [
                /* @__PURE__ */ jsx5(Text3, {
                  color: line.kind === "added" ? "green" : line.kind === "removed" ? "red" : "gray",
                  children: line.marker,
                }),
                /* @__PURE__ */ jsx5(Text3, {
                  color: line.kind === "added" ? "green" : line.kind === "removed" ? "red" : void 0,
                  children: line.content,
                }),
              ],
            },
            `${index}-${line.marker}-${line.content}`
          )
        ),
      }),
    ],
  });
}
function PlanPreview({ lines }) {
  return /* @__PURE__ */ jsxs3(Box3, {
    flexDirection: "column",
    marginLeft: 2,
    children: [
      /* @__PURE__ */ jsx5(Text3, { dimColor: true, children: "\u2514 Plan" }),
      /* @__PURE__ */ jsx5(Box3, {
        flexDirection: "column",
        marginLeft: 2,
        children: lines.map((line, index) =>
          /* @__PURE__ */ jsx5(Text3, { wrap: "wrap", children: line }, `${index}-${line}`)
        ),
      }),
    ],
  });
}

// src/ui/components/RawModeExitPrompt/index.tsx
import { useRef as useRef4 } from "react";
import { useInput as useInput2 } from "ink";
function RawModeExitPrompt({ onExit }) {
  const { previousMode } = useRawModeContext();
  const snapshotRef = useRef4(previousMode);
  useInput2(
    (_input, key) => {
      if (key.escape) {
        onExit(snapshotRef.current);
      }
    },
    { isActive: true }
  );
  return null;
}

// src/ui/PromptInput.tsx
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
var SPINNER_FRAMES = [
  "\u280B",
  "\u2819",
  "\u2839",
  "\u2838",
  "\u283C",
  "\u2834",
  "\u2826",
  "\u2827",
  "\u2807",
  "\u280F",
];
var MODEL_COMMAND_MODELS = ["deepseek-v4-pro", "deepseek-v4-flash"];
var MODEL_COMMAND_THINKING_OPTIONS = [
  { label: "Thinking mode [max]", thinkingEnabled: true, reasoningEffort: "max" },
  { label: "Thinking mode [high]", thinkingEnabled: true, reasoningEffort: "high" },
  { label: "No thinking", thinkingEnabled: false },
];
var PromptPrefixLine = React5.memo(function PromptPrefixLine2({ busy }) {
  const [spinnerIndex, setSpinnerIndex] = useState3(0);
  useEffect2(() => {
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
  return /* @__PURE__ */ jsx6(Text4, { color: busy ? "yellow" : "#229ac3", children: prefix });
});
var PromptInput = React5.memo(function PromptInput2({
  projectRoot: projectRoot2,
  skills,
  modelConfig,
  screenWidth,
  promptHistory,
  busy,
  loadingText,
  disabled,
  placeholder,
  runningProcesses,
  onSubmit,
  onModelConfigChange,
  onInterrupt,
  onToggleProcessStdout,
  onRawModeChange,
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [buffer, setBuffer] = useState3(EMPTY_BUFFER);
  const [imageUrls, setImageUrls] = useState3([]);
  const [selectedSkills, setSelectedSkills] = useState3([]);
  const [statusMessage, setStatusMessage] = useState3(null);
  const [pendingExit, setPendingExit] = useState3(false);
  const [menuIndex, setMenuIndex] = useState3(0);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState3(false);
  const [openRawModelDropdown, setOpenRawModelDropdown] = useState3(false);
  const [skillsDropdownIndex, setSkillsDropdownIndex] = useState3(0);
  const [modelDropdownStep, setModelDropdownStep] = useState3(null);
  const [modelDropdownIndex, setModelDropdownIndex] = useState3(0);
  const [pendingModel, setPendingModel] = useState3(null);
  const [fileMentionItems, setFileMentionItems] = useState3(() => scanFileMentionItems(projectRoot2));
  const [fileMentionIndex, setFileMentionIndex] = useState3(0);
  const [dismissedFileMentionKey, setDismissedFileMentionKey] = useState3(null);
  const [historyCursor, setHistoryCursor] = useState3(-1);
  const [draftBeforeHistory, setDraftBeforeHistory] = useState3(null);
  const [hasTerminalFocus, setHasTerminalFocus] = useState3(true);
  const lastCtrlDAt = React5.useRef(0);
  const undoRedoRef = React5.useRef(createPromptUndoRedoState());
  const wasBusyRef = React5.useRef(busy);
  const hadFileMentionTokenRef = React5.useRef(false);
  const fileMentionToken = getCurrentFileMentionToken(buffer);
  const hasFileMentionToken = fileMentionToken !== null;
  const fileMentionKey = fileMentionToken ? `${fileMentionToken.start}:${fileMentionToken.query}` : null;
  const fileMentionMatches = React5.useMemo(
    () => (fileMentionToken ? filterFileMentionItems(fileMentionItems, fileMentionToken.query) : []),
    [fileMentionItems, fileMentionToken]
  );
  const showFileMentionMenu =
    !showSkillsDropdown &&
    !modelDropdownStep &&
    fileMentionToken !== null &&
    fileMentionKey !== dismissedFileMentionKey;
  const slashItems = React5.useMemo(() => buildSlashCommands(skills), [skills]);
  const slashToken = getCurrentSlashToken(buffer);
  const slashMenu = React5.useMemo(
    () =>
      showSkillsDropdown || modelDropdownStep || showFileMentionMenu
        ? []
        : slashToken
          ? filterSlashCommands(slashItems, slashToken)
          : [],
    [showSkillsDropdown, modelDropdownStep, showFileMentionMenu, slashToken, slashItems]
  );
  const showMenu = slashMenu.length > 0;
  const promptHistoryKey = React5.useMemo(() => promptHistory.join("\0"), [promptHistory]);
  const hasRunningProcess = runningProcesses && runningProcesses.size > 0;
  const processHint = hasRunningProcess ? " \xB7 ctrl+o view output" : "";
  const footerText = statusMessage
    ? statusMessage
    : busy
      ? loadingText && loadingText.trim()
        ? `${loadingText}${processHint}`
        : `esc to interrupt \xB7 ctrl+c to cancel input${processHint}`
      : `enter send \xB7 shift+enter newline \xB7 @ files \xB7 ctrl+v image \xB7 / commands \xB7 ctrl+d exit${processHint}`;
  useTerminalFocusReporting(stdout, !disabled);
  useTerminalExtendedKeys(stdout, !disabled);
  useHiddenTerminalCursor(stdout, !disabled);
  const refreshFileMentionItems = React5.useCallback(() => {
    setFileMentionItems(scanFileMentionItems(projectRoot2));
  }, [projectRoot2]);
  useEffect2(() => {
    refreshFileMentionItems();
  }, [refreshFileMentionItems]);
  useEffect2(() => {
    if (wasBusyRef.current && !busy) {
      refreshFileMentionItems();
    }
    wasBusyRef.current = busy;
  }, [busy, refreshFileMentionItems]);
  useEffect2(() => {
    if (hasFileMentionToken && !hadFileMentionTokenRef.current) {
      refreshFileMentionItems();
    }
    hadFileMentionTokenRef.current = hasFileMentionToken;
  }, [hasFileMentionToken, refreshFileMentionItems]);
  useEffect2(() => {
    if (!showMenu) {
      setMenuIndex(0);
      return;
    }
    if (menuIndex >= slashMenu.length) {
      setMenuIndex(slashMenu.length - 1);
    }
  }, [slashMenu, showMenu, menuIndex]);
  useEffect2(() => {
    if (!fileMentionKey) {
      setDismissedFileMentionKey(null);
    }
  }, [fileMentionKey]);
  useEffect2(() => {
    if (!showFileMentionMenu) {
      setFileMentionIndex(0);
      return;
    }
    if (fileMentionIndex >= fileMentionMatches.length) {
      setFileMentionIndex(Math.max(0, fileMentionMatches.length - 1));
    }
  }, [fileMentionMatches.length, fileMentionIndex, showFileMentionMenu]);
  useEffect2(() => {
    if (skillsDropdownIndex >= skills.length) {
      setSkillsDropdownIndex(Math.max(0, skills.length - 1));
    }
  }, [skills.length, skillsDropdownIndex]);
  useEffect2(() => {
    if (!modelDropdownStep) {
      return;
    }
    const optionCount =
      modelDropdownStep === "model" ? MODEL_COMMAND_MODELS.length : MODEL_COMMAND_THINKING_OPTIONS.length;
    if (modelDropdownIndex >= optionCount) {
      setModelDropdownIndex(Math.max(0, optionCount - 1));
    }
  }, [modelDropdownIndex, modelDropdownStep]);
  useEffect2(() => {
    if (!statusMessage) {
      return;
    }
    const timer = setTimeout(() => setStatusMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);
  useEffect2(() => {
    setHistoryCursor(-1);
    setDraftBeforeHistory(null);
  }, [promptHistoryKey]);
  useTerminalInput(
    (input, key) => {
      if (key.focusIn) {
        setHasTerminalFocus(true);
        return;
      }
      if (key.focusOut) {
        setHasTerminalFocus(false);
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
        if (showFileMentionMenu && fileMentionKey) {
          setDismissedFileMentionKey(fileMentionKey);
          return;
        }
        if (busy) {
          onInterrupt();
          setStatusMessage("Interrupting\u2026");
        }
        return;
      }
      if (key.ctrl && (input === "o" || input === "O")) {
        if (runningProcesses && runningProcesses.size > 0 && onToggleProcessStdout) {
          onToggleProcessStdout();
        } else {
          setStatusMessage("No running process to inspect");
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
          clearUndoRedoStacks();
        } else {
          setStatusMessage("press ctrl+d to exit");
        }
        return;
      }
      if (pendingExit && (!key.ctrl || (input !== "d" && input !== "D"))) {
        setPendingExit(false);
      }
      if (openRawModelDropdown) {
        return;
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
          if ((input === " " && !key.ctrl && !key.meta) || (key.return && !key.shift && !key.meta)) {
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
        const optionCount =
          modelDropdownStep === "model" ? MODEL_COMMAND_MODELS.length : MODEL_COMMAND_THINKING_OPTIONS.length;
        if (key.upArrow) {
          setModelDropdownIndex((idx) => (idx - 1 + optionCount) % optionCount);
          return;
        }
        if (key.downArrow) {
          setModelDropdownIndex((idx) => (idx + 1) % optionCount);
          return;
        }
        if ((input === " " && !key.ctrl && !key.meta) || (key.return && !key.shift && !key.meta)) {
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
        readClipboardImageAsync()
          .then((image) => {
            if (image) {
              setImageUrls((prev) => [...prev, image.dataUrl]);
              setStatusMessage("Attached image from clipboard");
            } else {
              setStatusMessage("No image found in clipboard");
            }
          })
          .catch(() => {
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
      const returnAction = getPromptReturnKeyAction(key);
      const isPlainReturn = returnAction === "submit";
      if (showFileMentionMenu) {
        if (key.upArrow) {
          if (fileMentionMatches.length > 0) {
            setFileMentionIndex((idx) => (idx - 1 + fileMentionMatches.length) % fileMentionMatches.length);
          }
          return;
        }
        if (key.downArrow) {
          if (fileMentionMatches.length > 0) {
            setFileMentionIndex((idx) => (idx + 1) % fileMentionMatches.length);
          }
          return;
        }
        if (key.tab || returnAction === "submit") {
          const selected = fileMentionMatches[fileMentionIndex];
          if (selected && fileMentionToken) {
            insertFileMentionSelection(selected);
            return;
          }
          if (key.tab) {
            setDismissedFileMentionKey(fileMentionKey);
            return;
          }
          if (fileMentionKey) {
            setDismissedFileMentionKey(fileMentionKey);
          }
        }
      }
      if (showMenu) {
        if (key.upArrow) {
          setMenuIndex((idx) => (idx - 1 + slashMenu.length) % slashMenu.length);
          return;
        }
        if (key.downArrow) {
          setMenuIndex((idx) => (idx + 1) % slashMenu.length);
          return;
        }
        if (key.tab || returnAction === "submit") {
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
      if (returnAction === "newline") {
        updateBuffer((s) => insertText(s, "\n"));
        return;
      }
      if (returnAction === "submit") {
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
      if (key.ctrl && key.shift && input === "-") {
        redo();
        return;
      }
      if (key.ctrl && input === "-") {
        undo();
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
  function undo() {
    const previous = undoPromptEdit(undoRedoRef.current, buffer);
    if (!previous) {
      return;
    }
    exitHistoryBrowsing();
    setBuffer(previous);
  }
  function redo() {
    const next = redoPromptEdit(undoRedoRef.current, buffer);
    if (!next) {
      return;
    }
    exitHistoryBrowsing();
    setBuffer(next);
  }
  function clearUndoRedoStacks() {
    clearPromptUndoRedoState(undoRedoRef.current);
  }
  function exitHistoryBrowsing() {
    setHistoryCursor(-1);
    setDraftBeforeHistory(null);
  }
  function updateBuffer(updater) {
    exitHistoryBrowsing();
    setBuffer((current) => {
      const next = updater(current);
      recordPromptEdit(undoRedoRef.current, current, next);
      return next;
    });
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
  function insertFileMentionSelection(item) {
    if (!fileMentionToken) {
      return;
    }
    updateBuffer((state) => replaceCurrentFileMentionToken(state, fileMentionToken, item.path));
    setDismissedFileMentionKey(null);
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
    if (item.kind === "raw") {
      clearSlashToken();
      setOpenRawModelDropdown(true);
      return;
    }
    if (item.kind === "new") {
      onSubmit({ text: "", imageUrls: [], command: "new" });
      setBuffer(EMPTY_BUFFER);
      clearUndoRedoStacks();
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "init") {
      onSubmit(buildInitPromptSubmission(selectedSkills));
      setBuffer(EMPTY_BUFFER);
      clearUndoRedoStacks();
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "resume") {
      onSubmit({ text: "", imageUrls: [], command: "resume" });
      setBuffer(EMPTY_BUFFER);
      clearUndoRedoStacks();
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "continue") {
      onSubmit({ text: "/continue", imageUrls: [], command: "continue" });
      setBuffer(EMPTY_BUFFER);
      clearUndoRedoStacks();
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "mcp") {
      onSubmit({ text: "/mcp", imageUrls: [], command: "mcp" });
      setBuffer(EMPTY_BUFFER);
      clearUndoRedoStacks();
      setImageUrls([]);
      setSelectedSkills([]);
      setShowSkillsDropdown(false);
      return;
    }
    if (item.kind === "exit") {
      onSubmit({ text: "/exit", imageUrls: [], command: "exit" });
      setBuffer(EMPTY_BUFFER);
      clearUndoRedoStacks();
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
      selectedSkills,
    });
    setBuffer(EMPTY_BUFFER);
    clearUndoRedoStacks();
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
    clearUndoRedoStacks();
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
      reasoningEffort: option.reasoningEffort ?? modelConfig.reasoningEffort,
    };
    closeModelDropdown();
    Promise.resolve(onModelConfigChange(selection))
      .then((message) => {
        if (message) {
          setStatusMessage(message);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        setStatusMessage(`Failed to update model settings: ${message}`);
      });
  }
  const modelDropdownItems =
    modelDropdownStep === "model"
      ? MODEL_COMMAND_MODELS.map((model) => ({
          label: model,
          selected: model === (pendingModel ?? modelConfig.model),
          description: model === modelConfig.model ? "current model" : "",
        }))
      : MODEL_COMMAND_THINKING_OPTIONS.map((option) => ({
          label: option.label,
          selected: getThinkingOptionIndex(modelConfig) === MODEL_COMMAND_THINKING_OPTIONS.indexOf(option),
          description: option.thinkingEnabled ? `reasoningEffort: ${option.reasoningEffort}` : "thinking disabled",
        }));
  const showFooterText = useMemo2(
    () => showMenu || showSkillsDropdown || openRawModelDropdown || modelDropdownStep !== null || showFileMentionMenu,
    [showMenu, showSkillsDropdown, modelDropdownStep, openRawModelDropdown, showFileMentionMenu]
  );
  const matchedCommand = slashToken ? findExactSlashCommand(slashItems, slashToken) : null;
  const inlineHint = matchedCommand?.args ? ` ${matchedCommand.args.join(ARGS_SEPARATOR)}` : "";
  return /* @__PURE__ */ jsxs4(Box4, {
    flexDirection: "column",
    width: screenWidth,
    children: [
      imageUrls.length > 0
        ? /* @__PURE__ */ jsxs4(Box4, {
            children: [
              /* @__PURE__ */ jsx6(Text4, {
                color: "magenta",
                children: formatImageAttachmentStatus(imageUrls.length),
              }),
              /* @__PURE__ */ jsx6(Text4, { dimColor: true, children: ` (${IMAGE_ATTACHMENT_CLEAR_HINT})` }),
            ],
          })
        : null,
      selectedSkills.length > 0
        ? /* @__PURE__ */ jsxs4(Box4, {
            children: [
              /* @__PURE__ */ jsx6(Text4, {
                color: "magenta",
                wrap: "truncate-end",
                children: formatSelectedSkillsStatus(selectedSkills),
              }),
              /* @__PURE__ */ jsx6(Text4, { dimColor: true, children: " (use /skills to edit)" }),
            ],
          })
        : null,
      /* @__PURE__ */ jsxs4(Box4, {
        borderStyle: "single",
        borderTop: true,
        borderBottom: true,
        borderLeft: false,
        borderRight: false,
        borderDimColor: true,
        children: [
          /* @__PURE__ */ jsx6(PromptPrefixLine, { busy }),
          /* @__PURE__ */ jsx6(Text4, {
            children: renderBufferWithCursor(buffer, !disabled && hasTerminalFocus, placeholder),
          }),
          inlineHint ? /* @__PURE__ */ jsx6(Text4, { dimColor: true, children: inlineHint }) : null,
        ],
      }),
      /* @__PURE__ */ jsx6(RawModelDropdown_default, {
        open: openRawModelDropdown,
        onClose: setOpenRawModelDropdown,
        onSelect: (mode) => onRawModeChange?.(mode),
        screenWidth,
      }),
      showSkillsDropdown
        ? /* @__PURE__ */ jsx6(DropdownMenu_default, {
            width: screenWidth,
            title: "Select Skills",
            helpText: "Space toggle \xB7 Enter toggle \xB7 Esc to close",
            emptyText: "No skills found",
            items: skills.map((skill) => ({
              key: skill.path || skill.name,
              label: skill.name,
              description: skill.path,
              selected: isSkillSelected(selectedSkills, skill),
              statusIndicator: skill.isLoaded ? { symbol: "\u2713", color: "green" } : void 0,
            })),
            activeIndex: skillsDropdownIndex,
            activeColor: "#229ac3",
            maxVisible: 6,
          })
        : null,
      modelDropdownStep
        ? /* @__PURE__ */ jsx6(DropdownMenu_default, {
            width: screenWidth,
            title: modelDropdownStep === "model" ? "Select Model" : "Select Thinking Mode",
            helpText:
              modelDropdownStep === "model"
                ? "Space/Enter select model \xB7 Esc to cancel"
                : "Space/Enter apply \xB7 Esc to cancel",
            items: modelDropdownItems.map((item) => ({
              key: item.label,
              label: item.label,
              description: item.description,
              selected: item.selected,
            })),
            activeIndex: modelDropdownIndex,
            activeColor: "#229ac3",
            maxVisible: 6,
          })
        : null,
      showFileMentionMenu
        ? /* @__PURE__ */ jsx6(DropdownMenu_default, {
            width: screenWidth,
            title: "Mention File",
            helpText: "Enter/Tab insert \xB7 Esc close",
            emptyText: fileMentionToken?.query ? "No matching files" : "Type after @ to search files",
            items: fileMentionMatches.map((item) => ({
              key: item.path,
              label: item.path,
              description: item.type === "directory" ? "directory" : "file",
            })),
            activeIndex: fileMentionIndex,
            activeColor: "#229ac3",
            maxVisible: 8,
            renderItem: (item, isActive) =>
              /* @__PURE__ */ jsxs4(Box4, {
                flexDirection: "row",
                paddingX: 1,
                gap: 1,
                children: [
                  /* @__PURE__ */ jsx6(Text4, {
                    color: isActive ? "#229ac3" : void 0,
                    children: isActive ? "> " : "  ",
                  }),
                  /* @__PURE__ */ jsx6(Box4, {
                    flexGrow: 1,
                    children: /* @__PURE__ */ jsx6(Text4, {
                      color: isActive ? "#229ac3" : void 0,
                      wrap: "truncate-end",
                      bold: isActive,
                      children: item.label,
                    }),
                  }),
                  item.description
                    ? /* @__PURE__ */ jsx6(Box4, {
                        width: 10,
                        flexShrink: 0,
                        children: /* @__PURE__ */ jsx6(Text4, { dimColor: true, children: item.description }),
                      })
                    : null,
                ],
              }),
          })
        : null,
      /* @__PURE__ */ jsx6(SlashCommandMenu_default, { width: screenWidth, items: slashMenu, activeIndex: menuIndex }),
      !showFooterText &&
        /* @__PURE__ */ jsx6(Box4, { children: /* @__PURE__ */ jsx6(Text4, { dimColor: true, children: footerText }) }),
    ],
  });
});
var IMAGE_ATTACHMENT_CLEAR_HINT = "ctrl+x clear images";
function formatImageAttachmentStatus(count) {
  if (count <= 0) {
    return "";
  }
  return `\u{1F4CE} ${count} image${count === 1 ? "" : "s"} attached`;
}
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
    selectedSkills: selectedSkills.length > 0 ? selectedSkills : void 0,
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
function getPromptReturnKeyAction(key) {
  if (!key.return) {
    return null;
  }
  if (key.shift || key.meta) {
    return "newline";
  }
  return "submit";
}
function renderBufferWithCursor(state, isFocused, placeholder) {
  const text = state.text || "";
  const cursor = Math.max(0, Math.min(state.cursor, text.length));
  const before = text.slice(0, cursor);
  const at = text[cursor];
  const after = text.slice(cursor + 1);
  if (text.length === 0 && placeholder) {
    if (!isFocused) {
      return chalk3.dim(`  ${placeholder}`);
    }
    return renderCursorCell(" ") + chalk3.dim(` ${placeholder}`);
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

// src/ui/SessionList.tsx
import { useState as useState4, useMemo as useMemo3 } from "react";
import { Box as Box5, Text as Text5, useInput as useInput3, useWindowSize } from "ink";
import { jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
function SessionList({ sessions, onSelect, onCancel }) {
  const [index, setIndex] = useState4(0);
  const { columns, rows } = useWindowSize();
  const maxVisibleSessions = useMemo3(() => {
    const reservedLines = 8;
    const linesPerSession = 3;
    const availableLines = Math.max(0, Math.min(rows, 30) - reservedLines);
    return Math.max(1, Math.floor(availableLines / linesPerSession));
  }, [rows]);
  const safeIndex = useMemo3(() => {
    if (sessions.length === 0) return 0;
    return Math.max(0, Math.min(index, sessions.length - 1));
  }, [index, sessions.length]);
  const scrollOffset = useMemo3(() => {
    if (safeIndex < maxVisibleSessions) return 0;
    return safeIndex - maxVisibleSessions + 1;
  }, [safeIndex, maxVisibleSessions]);
  const visibleSessions = useMemo3(() => {
    return sessions.slice(scrollOffset, scrollOffset + maxVisibleSessions);
  }, [sessions, scrollOffset, maxVisibleSessions]);
  useInput3((input, key) => {
    if (key.escape || (key.ctrl && (input === "c" || input === "C"))) {
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
    return /* @__PURE__ */ jsxs5(Box5, {
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsx7(Text5, { color: "yellow", children: "No previous sessions found." }),
        /* @__PURE__ */ jsx7(Text5, { dimColor: true, children: "Press Esc to go back." }),
      ],
    });
  }
  return /* @__PURE__ */ jsx7(Box5, {
    flexDirection: "column",
    width: Math.max(20, columns - 6),
    height: Math.max(5, Math.min(rows - 1, 30)),
    overflow: "hidden",
    paddingX: 1,
    marginTop: 1,
    children: /* @__PURE__ */ jsxs5(Box5, {
      flexDirection: "column",
      borderStyle: "round",
      borderDimColor: true,
      flexGrow: 1,
      overflow: "hidden",
      children: [
        /* @__PURE__ */ jsxs5(Box5, {
          paddingX: 1,
          children: [
            /* @__PURE__ */ jsx7(Text5, { bold: true, color: "cyanBright", children: "Resume a session" }),
            /* @__PURE__ */ jsxs5(Text5, {
              bold: true,
              color: "#229ac3",
              children: [" ", "(", sessions.length, " total)"],
            }),
          ],
        }),
        /* @__PURE__ */ jsxs5(Box5, {
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
              return /* @__PURE__ */ jsxs5(
                Box5,
                {
                  height: 2,
                  marginBottom: 1,
                  children: [
                    /* @__PURE__ */ jsx7(Box5, {
                      children: /* @__PURE__ */ jsx7(Text5, {
                        color: "#229ac3",
                        children: actualIndex === safeIndex ? "> " : "  ",
                      }),
                    }),
                    /* @__PURE__ */ jsxs5(Box5, {
                      flexDirection: "column",
                      flexGrow: 1,
                      children: [
                        /* @__PURE__ */ jsxs5(Box5, {
                          width: "100%",
                          children: [
                            /* @__PURE__ */ jsx7(Text5, {
                              ...(actualIndex === safeIndex ? { bold: true } : {}),
                              color: actualIndex === safeIndex ? "#229ac3" : void 0,
                              children: formatSessionTitle(session.summary || "Untitled"),
                            }),
                            /* @__PURE__ */ jsxs5(Text5, { dimColor: true, children: [" (", session.status, ")"] }),
                          ],
                        }),
                        /* @__PURE__ */ jsx7(Box5, {
                          width: "100%",
                          children: /* @__PURE__ */ jsxs5(Text5, {
                            dimColor: true,
                            children: [formatTimestamp(session.updateTime), " "],
                          }),
                        }),
                      ],
                    }),
                  ],
                },
                session.id
              );
            }),
            scrollOffset > 0 || scrollOffset + maxVisibleSessions < sessions.length
              ? /* @__PURE__ */ jsxs5(Box5, {
                  marginTop: 1,
                  children: [
                    scrollOffset > 0
                      ? /* @__PURE__ */ jsxs5(Text5, {
                          dimColor: true,
                          children: ["\u2026 ", scrollOffset, " newer sessions above. "],
                        })
                      : null,
                    scrollOffset + maxVisibleSessions < sessions.length
                      ? /* @__PURE__ */ jsxs5(Text5, {
                          dimColor: true,
                          children: [
                            "\u2026 ",
                            sessions.length - scrollOffset - maxVisibleSessions,
                            " older sessions below.",
                          ],
                        })
                      : null,
                  ],
                })
              : null,
          ],
        }),
        /* @__PURE__ */ jsx7(Box5, {
          children: /* @__PURE__ */ jsx7(Text5, {
            dimColor: true,
            children: "\u2191/\u2193 navigate \xB7 PgUp/PgDn page \xB7 Enter select \xB7 Esc cancel",
          }),
        }),
      ],
    }),
  });
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
import { useMemo as useMemo4, useState as useState5 } from "react";
import { Box as Box6, Text as Text7 } from "ink";
import * as os8 from "node:os";
import path12 from "node:path";

// src/ui/ThemedGradient.tsx
import { Text as Text6 } from "ink";
import Gradient from "ink-gradient";
import { jsx as jsx8 } from "react/jsx-runtime";
var ThemedGradient = ({ children, ...props }) => {
  const gradient = ["#229ac3e6", "#229ac3e6"];
  if (gradient && gradient.length >= 2) {
    return /* @__PURE__ */ jsx8(Gradient, {
      colors: gradient,
      children: /* @__PURE__ */ jsx8(Text6, { ...props, children }),
    });
  }
  if (gradient && gradient.length === 1) {
    return /* @__PURE__ */ jsx8(Text6, { color: gradient[0], ...props, children });
  }
  return /* @__PURE__ */ jsx8(Text6, { color: "yellow", ...props, children });
};

// src/AsciiArt.ts
var AsciiLogo = [
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557      \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557    \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D",
  "\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D    \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2550\u255D     \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551         \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D          \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D",
].join("\n");

// src/ui/WelcomeScreen.tsx
import { jsx as jsx9, jsxs as jsxs6 } from "react/jsx-runtime";
var TITLE_PANEL_WIDTH = 70;
var PANEL_CONTENT_HEIGHT = 8;
var SHORTCUT_TIPS = [
  { label: "Enter", description: "Send the prompt" },
  { label: "Shift+Enter", description: "Insert a newline" },
  { label: "Ctrl+V", description: "Paste an image from the clipboard" },
  { label: "Esc", description: "Interrupt the current model turn" },
  { label: "/", description: "Open the skills and commands menu" },
  { label: "Ctrl+D twice", description: "Quit Deep Code CLI" },
];
function WelcomeScreen({ projectRoot: projectRoot2, settings, skills, width }) {
  const { version } = useAppContext();
  const tips = useMemo4(() => buildWelcomeTips(skills), [skills]);
  const [tipIndex] = useState5(() => randomTipIndex(tips.length));
  const compact = width < TITLE_PANEL_WIDTH + 42;
  const cwd = formatHomeRelativePath(projectRoot2);
  const tip = tips[Math.min(tipIndex, Math.max(0, tips.length - 1))] ?? tips[0];
  const panelWidth = compact ? void 0 : Math.min(width, 72);
  return /* @__PURE__ */ jsxs6(Box6, {
    flexDirection: "column",
    marginY: 1,
    children: [
      /* @__PURE__ */ jsx9(Box6, {
        flexDirection: "column",
        width: panelWidth,
        children: /* @__PURE__ */ jsxs6(Box6, {
          flexDirection: "column",
          paddingX: 1,
          children: [
            /* @__PURE__ */ jsx9(Box6, {
              flexDirection: "column",
              justifyContent: "center",
              paddingX: 1,
              children: /* @__PURE__ */ jsx9(Box6, {
                justifyContent: "center",
                width: compact ? void 0 : TITLE_PANEL_WIDTH,
                children: /* @__PURE__ */ jsx9(ThemedGradient, { children: AsciiLogo }),
              }),
            }),
            /* @__PURE__ */ jsxs6(Box6, {
              borderStyle: "round",
              borderColor: "#229ac3e6",
              flexDirection: "column",
              flexGrow: 1,
              height: compact ? void 0 : PANEL_CONTENT_HEIGHT,
              marginTop: compact ? 1 : 0,
              paddingX: 1,
              children: [
                /* @__PURE__ */ jsxs6(Box6, {
                  flexGrow: 1,
                  marginBottom: compact ? 1 : 0,
                  children: [
                    /* @__PURE__ */ jsxs6(Text7, { color: "#229ac3e6", children: [">", "_ Deep Code "] }),
                    /* @__PURE__ */ jsxs6(Text7, { color: "gray", children: [" (v", version || "unknown", ")"] }),
                  ],
                }),
                !compact ? /* @__PURE__ */ jsx9(Text7, { children: " " }) : null,
                /* @__PURE__ */ jsx9(SettingRow, { label: "Model", value: settings.model }),
                /* @__PURE__ */ jsx9(SettingRow, {
                  label: "Thinking Enabled",
                  value: String(settings.thinkingEnabled),
                }),
                /* @__PURE__ */ jsx9(SettingRow, {
                  label: "Reasoning Effort",
                  value: settings.thinkingEnabled ? settings.reasoningEffort : "-",
                }),
                /* @__PURE__ */ jsx9(SettingRow, { label: "CWD", value: cwd }),
              ],
            }),
          ],
        }),
      }),
      /* @__PURE__ */ jsx9(Box6, {
        flexDirection: "column",
        width: panelWidth,
        paddingX: 1,
        children: tip
          ? /* @__PURE__ */ jsx9(Box6, {
              marginTop: 1,
              children: /* @__PURE__ */ jsxs6(Text7, {
                dimColor: true,
                children: ["Tips: ", tip.label, " - ", tip.description],
              }),
            })
          : null,
      }),
    ],
  });
}
function SettingRow({ label, value }) {
  return /* @__PURE__ */ jsxs6(Box6, {
    flexDirection: "row",
    children: [
      /* @__PURE__ */ jsx9(Box6, { width: 20, children: /* @__PURE__ */ jsx9(Text7, { children: label }) }),
      /* @__PURE__ */ jsx9(Box6, {
        flexGrow: 1,
        justifyContent: "flex-end",
        children: /* @__PURE__ */ jsx9(Text7, { children: value }),
      }),
    ],
  });
}
function formatHomeRelativePath(value, home = os8.homedir()) {
  const normalizedValue = path12.resolve(value);
  const normalizedHome = path12.resolve(home);
  const relative3 = path12.relative(normalizedHome, normalizedValue);
  if (relative3 === "") {
    return "~";
  }
  if (!relative3.startsWith("..") && !path12.isAbsolute(relative3)) {
    return `~${path12.sep}${relative3}`;
  }
  return normalizedValue;
}
function buildWelcomeTips(skills) {
  const slashTips = buildSlashCommands(skills)
    .filter((item) => item.kind !== "skill" || item.skill?.isLoaded)
    .map((item) => ({
      label: item.label,
      description: formatSlashCommandDescription(item.description),
    }));
  return [
    ...slashTips,
    ...SHORTCUT_TIPS.filter((tip) => !BUILTIN_SLASH_COMMANDS.some((command) => command.label === tip.label)),
  ];
}
function randomTipIndex(length) {
  return length > 0 ? Math.floor(Math.random() * length) : 0;
}

// src/ui/AskUserQuestionPrompt.tsx
import { useEffect as useEffect3, useMemo as useMemo5, useState as useState6 } from "react";
import { Box as Box7, Text as Text8 } from "ink";
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
var OTHER_VALUE = "__other__";
function AskUserQuestionPrompt({ questions, onSubmit, onCancel }) {
  const [questionIndex, setQuestionIndex] = useState6(0);
  const [cursorIndex, setCursorIndex] = useState6(0);
  const [answers, setAnswers] = useState6({});
  const [selectedValues, setSelectedValues] = useState6({});
  const [otherTexts, setOtherTexts] = useState6({});
  const [statusMessage, setStatusMessage] = useState6(null);
  const question = questions[questionIndex];
  const options = useMemo5(() => buildOptions(question), [question]);
  const selectedForQuestion = selectedValues[questionIndex] ?? [];
  const otherText = otherTexts[questionIndex] ?? "";
  const isCurrentOther = options[cursorIndex]?.isOther === true;
  useEffect3(() => {
    if (!statusMessage) {
      return;
    }
    const timer = setTimeout(() => setStatusMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [statusMessage]);
  useEffect3(() => {
    setQuestionIndex(0);
    setCursorIndex(0);
    setAnswers({});
    setSelectedValues({});
    setOtherTexts({});
    setStatusMessage(null);
  }, [questions]);
  useEffect3(() => {
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
        [questionIndex]: (prev[questionIndex] ?? "").slice(0, -1),
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
          [questionIndex]: `${prev[questionIndex] ?? ""}${sanitized}`,
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
        question.multiSelect
          ? "Select at least one option with Space, or type an Other answer."
          : "Select an option, or type an Other answer."
      );
      return;
    }
    const nextAnswers = {
      ...answers,
      [question.question]: answer,
    };
    setAnswers(nextAnswers);
    if (questionIndex >= questions.length - 1) {
      onSubmit(nextAnswers);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setCursorIndex(0);
  }
  return /* @__PURE__ */ jsxs7(Box7, {
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "yellow",
    paddingX: 1,
    marginY: 1,
    children: [
      /* @__PURE__ */ jsxs7(Box7, {
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsx10(Text8, { color: "yellow", bold: true, children: "Answer questions" }),
          /* @__PURE__ */ jsxs7(Text8, { dimColor: true, children: [" ", questionIndex + 1, "/", questions.length] }),
        ],
      }),
      /* @__PURE__ */ jsx10(Text8, { bold: true, children: question.question }),
      /* @__PURE__ */ jsx10(Box7, {
        flexDirection: "column",
        marginTop: 1,
        children: options.map((option, index) => {
          const isCursor = index === cursorIndex;
          const isSelected = option.isOther
            ? selectedForQuestion.includes(OTHER_VALUE) || Boolean(otherText.trim())
            : selectedForQuestion.includes(option.value) || answers[question.question] === option.label;
          const marker = question.multiSelect ? (isSelected ? "[x]" : "[ ]") : isSelected ? "\u25CF" : "\u25CB";
          return /* @__PURE__ */ jsxs7(
            Box7,
            {
              flexDirection: "column",
              children: [
                /* @__PURE__ */ jsxs7(Text8, {
                  color: isCursor ? "cyanBright" : void 0,
                  children: [
                    isCursor ? "> " : "  ",
                    marker,
                    " ",
                    /* @__PURE__ */ jsx10(Text8, { bold: isCursor, children: option.label }),
                  ],
                }),
                option.isOther
                  ? /* @__PURE__ */ jsx10(Box7, {
                      marginLeft: 4,
                      marginTop: 0,
                      borderStyle: "single",
                      borderColor: isCursor ? "cyanBright" : "gray",
                      paddingX: 1,
                      width: 64,
                      children: otherText
                        ? /* @__PURE__ */ jsxs7(Text8, {
                            color: "white",
                            children: [
                              otherText,
                              isCursor
                                ? /* @__PURE__ */ jsx10(Text8, { color: "cyanBright", children: "\u258C" })
                                : null,
                            ],
                          })
                        : /* @__PURE__ */ jsx10(Text8, {
                            dimColor: true,
                            children: isCursor ? "type your answer here" : "type a custom answer",
                          }),
                    })
                  : null,
                option.description
                  ? /* @__PURE__ */ jsxs7(Text8, { dimColor: true, children: [" ", option.description] })
                  : null,
              ],
            },
            option.value
          );
        }),
      }),
      /* @__PURE__ */ jsx10(Box7, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx10(Text8, {
          dimColor: true,
          children:
            statusMessage ??
            (isCurrentOther
              ? "Type your answer \xB7 Backspace edit \xB7 Enter submit/next \xB7 \u2191 choose presets \xB7 Esc type manually"
              : question.multiSelect
                ? "\u2191/\u2193 move \xB7 Space toggle \xB7 Enter submit/next \xB7 Esc type manually"
                : "\u2191/\u2193 move \xB7 Enter select/next \xB7 Esc type manually"),
        }),
      }),
    ],
  });
}
function buildOptions(question) {
  if (!question) {
    return [];
  }
  return [
    ...question.options.map((option) => ({
      label: option.label,
      description: option.description,
      value: option.label,
    })),
    {
      label: "Other",
      value: OTHER_VALUE,
      isOther: true,
    },
  ];
}
function buildAnswerForQuestion(question, focusedOption, selectedValues, otherText) {
  const trimmedOther = otherText.trim();
  if (question.multiSelect) {
    const labels = selectedValues
      .filter((value) => value !== OTHER_VALUE)
      .map((value) => value.trim())
      .filter(Boolean);
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

// src/ui/McpStatusList.tsx
import React9, { useState as useState7, useMemo as useMemo6, useCallback as useCallback2 } from "react";
import { Box as Box8, Text as Text9, useInput as useInput4, useWindowSize as useWindowSize2 } from "ink";
import { jsx as jsx11, jsxs as jsxs8 } from "react/jsx-runtime";
function McpStatusList({ statuses, onCancel }) {
  const { columns, rows } = useWindowSize2();
  const [viewMode, setViewMode] = useState7("server-list");
  const [selectedServerIndex, setSelectedServerIndex] = useState7(0);
  const goBack = useCallback2(() => {
    setViewMode("server-list");
  }, []);
  const enterDetail = useCallback2(() => {
    const server = statuses[selectedServerIndex];
    if (server && server.status === "ready") {
      setViewMode("server-detail");
    }
  }, [statuses, selectedServerIndex]);
  useInput4((input, key) => {
    if (statuses.length === 0 && (key.escape || (key.ctrl && (input === "c" || input === "C")))) {
      onCancel();
    }
  });
  if (statuses.length === 0) {
    return /* @__PURE__ */ jsxs8(Box8, {
      flexDirection: "column",
      marginLeft: 1,
      paddingX: 1,
      gap: 1,
      borderStyle: "round",
      borderDimColor: true,
      children: [
        /* @__PURE__ */ jsxs8(Box8, {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx11(Text9, { color: "#229ac3", bold: true, children: "Manage MCP servers" }),
            /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "0 servers" }),
          ],
        }),
        /* @__PURE__ */ jsxs8(Box8, {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "No MCP servers configured." }),
            /* @__PURE__ */ jsx11(Text9, {
              dimColor: true,
              children: "Add MCP servers to your settings to get started.",
            }),
          ],
        }),
        /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "Esc to close" }),
      ],
    });
  }
  if (viewMode === "server-detail") {
    return /* @__PURE__ */ jsx11(ServerDetailView, {
      server: statuses[selectedServerIndex],
      onBack: goBack,
      onCancel,
      rows,
      columns,
    });
  }
  return /* @__PURE__ */ jsx11(ServerListView, {
    statuses,
    selectedIndex: selectedServerIndex,
    onSelect: setSelectedServerIndex,
    onEnter: enterDetail,
    onCancel,
    rows,
    columns,
  });
}
function ServerListView({ statuses, selectedIndex, onSelect, onEnter, onCancel, rows, columns }) {
  const [scrollOffset, setScrollOffset] = useState7(0);
  const serverCount = statuses.length;
  const maxVisible = useMemo6(() => {
    const reservedLines = 8;
    const availableLines = Math.max(0, Math.min(rows, 30) - reservedLines);
    return Math.max(1, Math.floor(availableLines / 3));
  }, [rows]);
  const labelColumnWidth = useMemo6(() => {
    if (serverCount === 0) return 0;
    const longestName = Math.max(...statuses.map((s) => s.name.length));
    const contentWidth = longestName + 5;
    const maxAllowed = Math.max(15, Math.floor((columns - 6) * 0.4));
    return Math.min(contentWidth, maxAllowed);
  }, [statuses, serverCount, columns]);
  const safeIndex = useMemo6(() => {
    if (serverCount === 0) return 0;
    return Math.max(0, Math.min(selectedIndex, serverCount - 1));
  }, [selectedIndex, serverCount]);
  React9.useEffect(() => {
    if (safeIndex < scrollOffset) {
      setScrollOffset(safeIndex);
    } else if (safeIndex >= scrollOffset + maxVisible) {
      setScrollOffset(safeIndex - maxVisible + 1);
    }
  }, [safeIndex, scrollOffset, maxVisible]);
  const visibleServers = useMemo6(() => {
    return statuses.slice(scrollOffset, scrollOffset + maxVisible);
  }, [statuses, scrollOffset, maxVisible]);
  useInput4((input, key) => {
    if (key.escape || (key.ctrl && (input === "c" || input === "C"))) {
      onCancel();
      return;
    }
    if (serverCount === 0) {
      return;
    }
    if (key.upArrow) {
      onSelect(Math.max(0, selectedIndex - 1));
      return;
    }
    if (key.downArrow) {
      onSelect(Math.min(serverCount - 1, selectedIndex + 1));
      return;
    }
    if (key.pageUp) {
      onSelect(Math.max(0, selectedIndex - maxVisible));
      return;
    }
    if (key.pageDown) {
      onSelect(Math.min(serverCount - 1, selectedIndex + maxVisible));
      return;
    }
    if (key.home) {
      onSelect(0);
      return;
    }
    if (key.end) {
      onSelect(serverCount - 1);
    }
    if (key.return) {
      onEnter();
      return;
    }
  });
  const readyCount = statuses.filter((s) => s.status === "ready").length;
  const startingCount = statuses.filter((s) => s.status === "starting").length;
  const failedCount = statuses.filter((s) => s.status === "failed").length;
  return /* @__PURE__ */ jsx11(Box8, {
    flexDirection: "column",
    width: Math.max(20, columns - 6),
    height: Math.max(5, Math.min(rows - 1, 30)),
    overflow: "hidden",
    paddingX: 1,
    marginTop: 1,
    children: /* @__PURE__ */ jsxs8(Box8, {
      flexDirection: "column",
      borderStyle: "round",
      borderDimColor: true,
      flexGrow: 1,
      overflow: "hidden",
      children: [
        /* @__PURE__ */ jsxs8(Box8, {
          paddingX: 1,
          gap: 1,
          children: [
            /* @__PURE__ */ jsx11(Text9, { bold: true, color: "#229ac3", children: "Manage MCP servers" }),
            /* @__PURE__ */ jsxs8(Box8, {
              gap: 1,
              children: [
                /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "(" }),
                /* @__PURE__ */ jsxs8(Text9, { color: "green", bold: true, children: [readyCount, " ready,"] }),
                /* @__PURE__ */ jsxs8(Text9, { color: "yellow", bold: true, children: [startingCount, " starting,"] }),
                /* @__PURE__ */ jsxs8(Text9, { color: "red", bold: true, children: [failedCount, " failed"] }),
                /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: ")" }),
              ],
            }),
          ],
        }),
        /* @__PURE__ */ jsxs8(Box8, {
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
            visibleServers.map((status, i) => {
              const actualIndex = scrollOffset + i;
              const isSelected = actualIndex === safeIndex;
              return /* @__PURE__ */ jsx11(
                ServerRow,
                {
                  status,
                  selected: isSelected,
                  labelColumnWidth,
                },
                `server-${status.name}`
              );
            }),
            scrollOffset > 0 || scrollOffset + maxVisible < serverCount
              ? /* @__PURE__ */ jsxs8(Box8, {
                  marginTop: 1,
                  children: [
                    scrollOffset > 0
                      ? /* @__PURE__ */ jsxs8(Text9, {
                          dimColor: true,
                          children: ["\u2026 ", scrollOffset, " servers above. "],
                        })
                      : null,
                    scrollOffset + maxVisible < serverCount
                      ? /* @__PURE__ */ jsxs8(Text9, {
                          dimColor: true,
                          children: ["\u2026 ", serverCount - scrollOffset - maxVisible, " servers below."],
                        })
                      : null,
                  ],
                })
              : null,
          ],
        }),
        /* @__PURE__ */ jsx11(Box8, {
          paddingX: 1,
          children: /* @__PURE__ */ jsx11(Text9, {
            dimColor: true,
            children: "\u2191/\u2193 navigate \xB7 Enter view details \xB7 Esc close",
          }),
        }),
      ],
    }),
  });
}
function ServerRow({ status, selected, labelColumnWidth }) {
  const icon = status.status === "ready" ? "\u2713" : status.status === "failed" ? "\u2717" : "\u25CF";
  const color = status.status === "ready" ? "green" : status.status === "failed" ? "red" : "yellow";
  const [dots, setDots] = React9.useState(0);
  React9.useEffect(() => {
    if (status.status !== "starting") return;
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, [status.status]);
  const detail =
    status.status === "ready"
      ? `Ready (${status.toolCount} tools, ${status.promptCount} prompts, ${status.resourceCount} resources)`
      : status.status === "failed"
        ? `Failed`
        : "Starting" + (dots > 0 ? ".".repeat(dots) : "   ");
  return /* @__PURE__ */ jsxs8(Box8, {
    flexDirection: "column",
    marginBottom: 1,
    children: [
      /* @__PURE__ */ jsxs8(Box8, {
        gap: 2,
        children: [
          /* @__PURE__ */ jsx11(Box8, {
            width: labelColumnWidth,
            flexShrink: 0,
            children: /* @__PURE__ */ jsxs8(Text9, {
              color: selected ? "#229ac3" : void 0,
              children: [
                selected ? "> " : "  ",
                /* @__PURE__ */ jsxs8(Text9, { color, children: [icon, " "] }),
                /* @__PURE__ */ jsx11(Text9, { bold: true, children: status.name }),
              ],
            }),
          }),
          /* @__PURE__ */ jsx11(Box8, {
            flexGrow: 1,
            children: /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: detail }),
          }),
        ],
      }),
      status.status === "failed" && status.error ? /* @__PURE__ */ jsx11(ErrorRow, { error: status.error }) : null,
    ],
  });
}
function ServerDetailView({ server, onBack, onCancel, rows, columns }) {
  const [activeIndex, setActiveIndex] = useState7(0);
  const allItems = useMemo6(() => {
    const items = [];
    server.tools.forEach((tool) => items.push({ type: "tool", name: tool }));
    server.prompts.forEach((prompt) => items.push({ type: "prompt", name: prompt }));
    server.resources.forEach((resource) => items.push({ type: "resource", name: resource }));
    return items;
  }, [server]);
  const totalItems = allItems.length;
  const maxVisible = useMemo6(() => {
    const reservedLines = 10;
    const availableLines = Math.max(0, Math.min(rows, 30) - reservedLines);
    return Math.max(1, availableLines);
  }, [rows]);
  const visibleStartRef = React9.useRef(0);
  const visibleStart = useMemo6(() => {
    if (totalItems === 0) return 0;
    const currentStart = visibleStartRef.current;
    let newStart = currentStart;
    if (activeIndex < currentStart) {
      newStart = activeIndex;
    } else if (activeIndex >= currentStart + maxVisible) {
      newStart = activeIndex - maxVisible + 1;
    }
    newStart = Math.max(0, Math.min(newStart, Math.max(0, totalItems - maxVisible)));
    visibleStartRef.current = newStart;
    return newStart;
  }, [activeIndex, maxVisible, totalItems]);
  const visibleItems = allItems.slice(visibleStart, visibleStart + maxVisible);
  useInput4((input, key) => {
    if (key.ctrl && (input === "c" || input === "C")) {
      onCancel();
      return;
    }
    if (key.escape) {
      onBack();
      return;
    }
    if (input === " " || key.return) {
      onBack();
      return;
    }
    if (key.upArrow) {
      setActiveIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setActiveIndex((prev) => Math.min(totalItems - 1, prev + 1));
      return;
    }
    if (key.pageUp) {
      setActiveIndex((prev) => Math.max(0, prev - maxVisible));
      return;
    }
    if (key.pageDown) {
      setActiveIndex((prev) => Math.min(totalItems - 1, prev + maxVisible));
      return;
    }
    if (key.home) {
      setActiveIndex(0);
      return;
    }
    if (key.end) {
      setActiveIndex(totalItems - 1);
    }
  });
  const icon = "\u2713";
  const color = "green";
  return /* @__PURE__ */ jsx11(Box8, {
    flexDirection: "column",
    width: Math.max(20, columns - 6),
    height: Math.max(5, Math.min(rows - 1, 30)),
    overflow: "hidden",
    paddingX: 1,
    marginTop: 1,
    children: /* @__PURE__ */ jsxs8(Box8, {
      flexDirection: "column",
      borderStyle: "round",
      borderDimColor: true,
      flexGrow: 1,
      overflow: "hidden",
      children: [
        /* @__PURE__ */ jsxs8(Box8, {
          paddingX: 1,
          gap: 1,
          children: [
            /* @__PURE__ */ jsxs8(Text9, { color, children: [icon, " "] }),
            /* @__PURE__ */ jsx11(Text9, { bold: true, color: "#229ac3", wrap: "truncate-end", children: server.name }),
            /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "\u2014 Details" }),
          ],
        }),
        /* @__PURE__ */ jsx11(Box8, {
          paddingX: 1,
          marginLeft: 3,
          children: /* @__PURE__ */ jsxs8(Text9, {
            wrap: "truncate-end",
            children: [
              server.toolCount,
              " tools, ",
              server.promptCount,
              " prompts, ",
              server.resourceCount,
              " resources",
            ],
          }),
        }),
        /* @__PURE__ */ jsxs8(Box8, {
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
            visibleStart > 0
              ? /* @__PURE__ */ jsx11(Box8, {
                  children: /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "\u25B2" }),
                })
              : /* @__PURE__ */ jsx11(Text9, { children: " " }),
            /* @__PURE__ */ jsx11(Box8, {
              paddingX: 1,
              flexDirection: "column",
              children:
                visibleItems.length === 0
                  ? /* @__PURE__ */ jsx11(Box8, {
                      paddingY: 1,
                      children: /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "No items available" }),
                    })
                  : visibleItems.map((item, idx) => {
                      const actualIndex = visibleStart + idx;
                      const isSelected = actualIndex === activeIndex;
                      return /* @__PURE__ */ jsx11(
                        ItemRow,
                        { item, selected: isSelected },
                        `${item.type}-${item.name}-${actualIndex}`
                      );
                    }),
            }),
            visibleStart > 0 || visibleStart + maxVisible < totalItems
              ? /* @__PURE__ */ jsxs8(Box8, {
                  marginTop: 1,
                  gap: 1,
                  children: [
                    totalItems - visibleStart - maxVisible > 0
                      ? /* @__PURE__ */ jsx11(Text9, { dimColor: true, children: "\u25BC" })
                      : /* @__PURE__ */ jsx11(Text9, { children: " " }),
                    visibleStart > 0
                      ? /* @__PURE__ */ jsxs8(Text9, {
                          dimColor: true,
                          children: ["\u2026 ", visibleStart, " items above. "],
                        })
                      : null,
                    totalItems - visibleStart - maxVisible > 0
                      ? /* @__PURE__ */ jsxs8(Text9, {
                          dimColor: true,
                          children: ["\u2026 ", totalItems - visibleStart - maxVisible, " items below."],
                        })
                      : null,
                  ],
                })
              : null,
          ],
        }),
        /* @__PURE__ */ jsx11(Box8, {
          paddingX: 1,
          children: /* @__PURE__ */ jsx11(Text9, {
            dimColor: true,
            children: "\u2191/\u2193 scroll \xB7 Space/Enter back \xB7 Esc back \xB7 Ctrl+C close",
          }),
        }),
      ],
    }),
  });
}
function ItemRow({ item, selected }) {
  const icon = item.type === "tool" ? "\u{1F527}" : item.type === "prompt" ? "\u{1F4DD}" : "\u{1F4E6}";
  return /* @__PURE__ */ jsxs8(Box8, {
    height: 1,
    flexDirection: "row",
    children: [
      /* @__PURE__ */ jsxs8(Text9, { dimColor: true, children: [icon, " "] }),
      /* @__PURE__ */ jsx11(Text9, {
        color: selected ? "#229ac3" : void 0,
        dimColor: true,
        wrap: "truncate-end",
        children: item.name,
      }),
    ],
  });
}
function ErrorRow({ error }) {
  const lines = error.split("\n").filter((line) => line.trim().length > 0);
  return /* @__PURE__ */ jsx11(Box8, {
    flexDirection: "column",
    marginLeft: 4,
    marginTop: 0,
    marginBottom: 0,
    borderStyle: "round",
    borderColor: "red",
    borderDimColor: true,
    children: lines.map((line, index) =>
      /* @__PURE__ */ jsx11(
        Box8,
        { children: /* @__PURE__ */ jsx11(Text9, { color: "red", dimColor: true, children: line }) },
        index
      )
    ),
  });
}

// src/ui/ProcessStdoutView.tsx
import React10, { useEffect as useEffect4, useMemo as useMemo7, useRef as useRef5, useState as useState8 } from "react";
import { Box as Box9, Text as Text10 } from "ink";
import { jsx as jsx12, jsxs as jsxs9 } from "react/jsx-runtime";
var REFRESH_INTERVAL_MS = 150;
var MAX_PANEL_HEIGHT = 30;
var MIN_PANEL_HEIGHT = 5;
var ProcessStdoutView = React10.memo(function ProcessStdoutView2({
  processStdoutRef,
  runningProcesses,
  onDismiss,
  onAdjustTimeout,
  screenWidth,
  screenHeight,
}) {
  const [stdoutText, setStdoutText] = useState8("");
  const [scrollOffset, setScrollOffset] = useState8(0);
  const [statusMessage, setStatusMessage] = useState8("");
  const statusTimerRef = useRef5(null);
  const panelHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(screenHeight - 1, MAX_PANEL_HEIGHT));
  const reservedRows = statusMessage ? 2 : 1;
  const visibleLineLimit = Math.max(1, panelHeight - reservedRows);
  useEffect4(() => {
    const updateStdout = () => {
      let text = "";
      if (runningProcesses && runningProcesses.size > 0) {
        for (const [pid, proc] of runningProcesses.entries()) {
          const pidNum = Number(pid);
          const stdout = processStdoutRef.current.get(pidNum) ?? "";
          if (text) {
            text += "\n";
          }
          if (runningProcesses.size > 1) {
            text += `\u2500\u2500 Process ${pid} [${proc.command}] \u2500\u2500
`;
          }
          text += stdout || "(no output yet)";
        }
      } else {
        text = "(no running processes)";
      }
      setStdoutText(text);
    };
    updateStdout();
    const interval = setInterval(updateStdout, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [processStdoutRef, runningProcesses]);
  useEffect4(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);
  const lines = useMemo7(() => stdoutText.split("\n"), [stdoutText]);
  const timeoutProcess = useMemo7(() => getLatestTimeoutProcess(runningProcesses), [runningProcesses]);
  const visibleLines = useMemo7(() => {
    if (lines.length <= visibleLineLimit) {
      return lines;
    }
    const outputLineLimit = Math.max(1, visibleLineLimit - 1);
    const start = Math.max(0, lines.length - outputLineLimit - scrollOffset);
    const slice = lines.slice(start, start + outputLineLimit);
    if (lines.length > visibleLineLimit) {
      slice.unshift(`... (${start} lines above \xB7 \u2191/\u2193 to scroll \xB7 ${lines.length} total lines) ...`);
    }
    return slice;
  }, [lines, scrollOffset, visibleLineLimit]);
  const setTemporaryStatus = (message) => {
    setStatusMessage(message);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => setStatusMessage(""), 2e3);
  };
  useTerminalInput(
    (input, key) => {
      if ((key.ctrl && (input === "o" || input === "O")) || key.escape) {
        onDismiss();
        return;
      }
      if (input === "+") {
        const adjustment = onAdjustTimeout(BASH_TIMEOUT_INCREMENT_MS);
        setTemporaryStatus(formatAdjustmentStatus(adjustment));
        return;
      }
      if (input === "-") {
        const adjustment = onAdjustTimeout(-BASH_TIMEOUT_DECREMENT_MS);
        setTemporaryStatus(formatAdjustmentStatus(adjustment));
        return;
      }
      if (key.upArrow) {
        setScrollOffset((s) => Math.min(s + 10, Math.max(0, lines.length - visibleLineLimit)));
        return;
      }
      if (key.downArrow) {
        setScrollOffset((s) => Math.max(s - 10, 0));
        return;
      }
      if (key.pageUp) {
        setScrollOffset((s) => Math.min(s + visibleLineLimit, Math.max(0, lines.length - visibleLineLimit)));
        return;
      }
      if (key.pageDown) {
        setScrollOffset((s) => Math.max(s - visibleLineLimit, 0));
        return;
      }
    },
    { isActive: true }
  );
  return /* @__PURE__ */ jsxs9(Box9, {
    flexDirection: "column",
    width: screenWidth,
    minWidth: 80,
    height: panelHeight,
    overflow: "hidden",
    children: [
      /* @__PURE__ */ jsxs9(Box9, {
        borderStyle: "single",
        borderBottom: true,
        borderLeft: false,
        borderRight: false,
        borderTop: false,
        children: [
          /* @__PURE__ */ jsx12(Text10, { bold: true, children: "\u{1F4DF} Process Output" }),
          /* @__PURE__ */ jsx12(Text10, {
            dimColor: true,
            children: ` (${formatTimeoutHint(
              timeoutProcess?.entry
            )} \xB7 +/- adjust \xB7 Ctrl+O or Esc to close \xB7 \u2191\u2193 PageUp/PageDown to scroll)`,
          }),
        ],
      }),
      /* @__PURE__ */ jsx12(Box9, {
        flexDirection: "column",
        paddingX: 1,
        overflow: "hidden",
        children: visibleLines.map((line, index) => /* @__PURE__ */ jsx12(Text10, { children: line }, `${index}`)),
      }),
      statusMessage
        ? /* @__PURE__ */ jsx12(Box9, {
            paddingX: 1,
            children: /* @__PURE__ */ jsx12(Text10, { dimColor: true, children: statusMessage }),
          })
        : null,
    ],
  });
});
function getLatestTimeoutProcess(runningProcesses) {
  if (!runningProcesses) {
    return null;
  }
  let latest = null;
  for (const [pid, entry] of runningProcesses.entries()) {
    if (typeof entry.timeoutMs !== "number") {
      continue;
    }
    latest = { pid, entry };
  }
  return latest;
}
function formatTimeoutHint(entry) {
  if (!entry || typeof entry.timeoutMs !== "number") {
    return "timeout unavailable";
  }
  return `timeout ${formatDuration(entry.timeoutMs)}`;
}
function formatAdjustmentStatus(adjustment) {
  if (!adjustment) {
    return "No adjustable Bash timeout";
  }
  return `Timeout set to ${formatDuration(adjustment.timeoutMs)}`;
}
function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 6e4));
  return `${totalMinutes}m`;
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
      questions,
    };
  }
  return null;
}
function formatAskUserQuestionAnswers(answers) {
  const answersText = Object.entries(answers)
    .map(([question, answer]) => `"${escapeAnswerPart(question)}"="${escapeAnswerPart(answer)}"`)
    .join(", ");
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
    description: description || void 0,
  };
}
function escapeAnswerPart(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ").trim();
}

// src/ui/exitSummary.ts
import chalk4 from "chalk";
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
    cachedTokens: 0,
    totalReqs: 0,
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
  const totalReqs = typeof record.total_reqs === "number" ? record.total_reqs : 0;
  return { promptTokens, completionTokens, cachedTokens, totalReqs };
}
function buildExitSummaryText(input) {
  const { session } = input;
  const innerWidth = 98;
  const contentWidth = innerWidth - 4;
  const borderColor = chalk4.hex("#229ac3e6");
  const titleColor = gradientString("#229ac3e6", "rgb(125 51 247 / 0.7)");
  const line = (text) => `${borderColor("\u2502")}  ${padRight(text, contentWidth)}  ${borderColor("\u2502")}`;
  const header = chalk4.bold(titleColor("Goodbye!"));
  const rows = ["", `${header}`, ""];
  const usageRows = Object.entries(session?.usagePerModel ?? {})
    .map(([modelName, usage]) => ({
      modelName,
      usage: extractUsageFields(usage),
    }))
    .filter(
      (row) =>
        row.usage.totalReqs > 0 ||
        row.usage.promptTokens > 0 ||
        row.usage.completionTokens > 0 ||
        row.usage.cachedTokens > 0
    )
    .sort(
      (left, right) => right.usage.totalReqs - left.usage.totalReqs || left.modelName.localeCompare(right.modelName)
    );
  const hasUsage = usageRows.length > 0;
  if (hasUsage) {
    const colModel = 34;
    const colReqs = 8;
    const colInput = 16;
    const colOutput = 16;
    const colCached = 18;
    const tableWidth = colModel + colReqs + colInput + colOutput + colCached;
    const divider = "\u2500".repeat(tableWidth);
    const headerRow =
      padRight("Model Usage", colModel) +
      padLeft("Reqs", colReqs) +
      padLeft("Input Tokens", colInput) +
      padLeft("Output Tokens", colOutput) +
      padLeft("Cached Tokens", colCached);
    rows.push(chalk4.bold(headerRow));
    rows.push(divider);
    for (const { modelName, usage } of usageRows) {
      const reqsStr = formatNumber(usage.totalReqs).padStart(colReqs);
      const inputStr = formatNumber(usage.promptTokens).padStart(colInput);
      const outputStr = formatNumber(usage.completionTokens).padStart(colOutput);
      const cachedStr = formatNumber(usage.cachedTokens).padStart(colCached);
      const dataRow =
        padRight(modelName, colModel) +
        padRight(reqsStr, colReqs) +
        padRight(chalk4.yellow(inputStr), colInput) +
        padRight(chalk4.yellow(outputStr), colOutput) +
        padRight(chalk4.yellow(cachedStr), colCached);
      rows.push(dataRow);
    }
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
import { jsx as jsx13, jsxs as jsxs10 } from "react/jsx-runtime";
var DEFAULT_MODEL = "deepseek-v4-pro";
var DEFAULT_BASE_URL = "https://api.deepseek.com";
function App({ projectRoot: projectRoot2, initialPrompt: initialPrompt2, onRestart }) {
  const { exit } = useApp2();
  const { stdout, write } = useStdout2();
  const { columns, rows } = useWindowSize3();
  const { mode, setMode } = useRawModeContext();
  const initialPromptSubmittedRef = useRef6(false);
  const processStdoutRef = useRef6(/* @__PURE__ */ new Map());
  const rawModeRef = useRef6(mode);
  const writeRef = useRef6(write);
  const lastRenderedColumnsRef = useRef6(null);
  const messagesRef = useRef6([]);
  const [view, setView] = useState9("chat");
  const [busy, setBusy] = useState9(false);
  const [skills, setSkills] = useState9([]);
  const [messages, setMessages] = useState9([]);
  const [sessions, setSessions] = useState9([]);
  const [statusLine, setStatusLine] = useState9("");
  const [errorLine, setErrorLine] = useState9(null);
  const [streamProgress, setStreamProgress] = useState9(null);
  const [runningProcesses, setRunningProcesses] = useState9(null);
  const [activeStatus, setActiveStatus] = useState9(null);
  const [dismissedQuestionIds, setDismissedQuestionIds] = useState9(() => /* @__PURE__ */ new Set());
  const [isExiting, setIsExiting] = useState9(false);
  const [showWelcome, setShowWelcome] = useState9(true);
  const [welcomeNonce, setWelcomeNonce] = useState9(0);
  const [resolvedSettings, setResolvedSettings] = useState9(() => resolveCurrentSettings(projectRoot2));
  const [nowTick, setNowTick] = useState9(0);
  const [mcpStatuses, setMcpStatuses] = useState9([]);
  const [showProcessStdout, setShowProcessStdout] = useState9(false);
  rawModeRef.current = mode;
  messagesRef.current = messages;
  const sessionManager = useMemo8(() => {
    return new SessionManager({
      projectRoot: projectRoot2,
      createOpenAIClient: () => createOpenAIClient(projectRoot2),
      getResolvedSettings: () => resolveCurrentSettings(projectRoot2),
      renderMarkdown: (text) => text,
      onAssistantMessage: (message) => {
        setMessages((prev) => [...prev, message]);
        if (rawModeRef.current === "Raw scrollback mode" /* Raw */) {
          process.stdout.write("\n");
          process.stdout.write(renderMessageToStdout(message, rawModeRef.current) + "\n\n");
        }
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
      },
      onMcpStatusChanged: () => {
        setMcpStatuses(sessionManager.getMcpStatus());
      },
      onProcessStdout: (pid, chunk) => {
        const buf = processStdoutRef.current;
        const current = buf.get(pid) ?? "";
        const MAX_STDOUT_BUFFER = 1e6;
        if (current.length >= MAX_STDOUT_BUFFER) {
          return;
        }
        const text = typeof chunk === "string" ? chunk : String(chunk);
        const available = MAX_STDOUT_BUFFER - current.length;
        buf.set(pid, current + text.slice(0, available));
      },
    });
  }, [projectRoot2]);
  useEffect5(() => {
    if (!busy) {
      return;
    }
    const id = setInterval(() => setNowTick((tick) => tick + 1), 500);
    return () => clearInterval(id);
  }, [busy]);
  function loadVisibleMessages(manager, sessionId) {
    return manager.listSessionMessages(sessionId).filter((m) => m.visible);
  }
  const refreshSessionsList = useCallback3(() => {
    setSessions(sessionManager.listSessions());
  }, [sessionManager]);
  const refreshSkills = useCallback3(
    async (sessionId) => {
      try {
        const list = await sessionManager.listSkills(sessionId ?? sessionManager.getActiveSessionId() ?? void 0);
        setSkills(list);
      } catch {}
    },
    [sessionManager]
  );
  useEffect5(() => {
    refreshSessionsList();
    void refreshSkills();
  }, [refreshSessionsList, refreshSkills]);
  useLayoutEffect2(() => {
    const settings = resolveCurrentSettings(projectRoot2);
    void sessionManager.initMcpServers(settings.mcpServers);
  }, [projectRoot2, sessionManager]);
  useEffect5(() => {
    return () => {
      sessionManager.dispose();
    };
  }, [sessionManager]);
  writeRef.current = write;
  const handlePrompt = useCallback3(
    async (submission) => {
      if (submission.command === "exit") {
        setIsExiting(true);
        setTimeout(() => {
          const activeSessionId = sessionManager.getActiveSessionId();
          const session = activeSessionId ? sessionManager.getSession(activeSessionId) : null;
          const summary = buildExitSummaryText({ session });
          process.stdout.write("\n");
          process.stdout.write(chalk5.rgb(34, 154, 195)("> /exit "));
          process.stdout.write("\n\n");
          process.stdout.write(summary);
          process.stdout.write("\n\n");
          sessionManager.dispose();
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
      if (submission.command === "continue" && isCurrentSessionEmpty(sessionManager)) {
        setShowWelcome(false);
        refreshSessionsList();
        setView("session-list");
        return;
      }
      if (submission.command === "mcp") {
        setShowWelcome(false);
        setMcpStatuses(sessionManager.getMcpStatus());
        setView("mcp-status");
        return;
      }
      const prompt = {
        text: submission.text,
        imageUrls: submission.imageUrls,
        skills: submission.selectedSkills && submission.selectedSkills.length > 0 ? submission.selectedSkills : void 0,
      };
      const trimmedText = (submission.text ?? "").trim();
      const selectedSkillNames = submission.selectedSkills?.map((skill) => skill.name).filter(Boolean) ?? [];
      const userDisplayContent =
        trimmedText ||
        (selectedSkillNames.length > 0 ? `Use skills: ${selectedSkillNames.join(", ")}` : "") ||
        (submission.imageUrls.length > 0 ? "[Image]" : "");
      if (userDisplayContent && submission.command !== "continue") {
        setMessages((prev) => [...prev, buildSyntheticUserMessage(userDisplayContent, submission.imageUrls.length)]);
      }
      setBusy(true);
      setErrorLine(null);
      setRunningProcesses(null);
      setShowProcessStdout(false);
      processStdoutRef.current.clear();
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
  const handleInterrupt = useCallback3(() => {
    sessionManager.interruptActiveSession();
  }, [sessionManager]);
  const handleToggleProcessStdout = useCallback3(() => {
    setShowProcessStdout(true);
  }, []);
  const handleDismissProcessStdout = useCallback3(() => {
    setShowProcessStdout(false);
  }, []);
  const handleAdjustBashTimeout = useCallback3(
    (deltaMs) => sessionManager.adjustActiveBashTimeout(deltaMs),
    [sessionManager]
  );
  const handleModelConfigChange = useCallback3(
    (selection) => {
      const current = resolveCurrentSettings(projectRoot2);
      const { changed } = writeModelConfigSelection(selection, current, projectRoot2);
      const next = resolveCurrentSettings(projectRoot2);
      setResolvedSettings(next);
      if (!changed) {
        return "Model settings unchanged";
      }
      const activeSessionId = sessionManager.getActiveSessionId();
      const meta = {
        isModelChange: true,
      };
      const content = `/model
\u2514 Set model to ${selection.model} (${selection?.thinkingEnabled ? selection?.reasoningEffort : "no thinking"})`;
      if (activeSessionId) {
        sessionManager.addSessionSystemMessage(activeSessionId, content, true, meta);
      } else {
        const now = /* @__PURE__ */ new Date().toISOString();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sessionId: "local",
            role: "system",
            content,
            contentParams: null,
            messageParams: null,
            compacted: false,
            visible: true,
            createTime: now,
            updateTime: now,
            meta,
          },
        ]);
      }
      return `Model settings updated: ${formatModelConfig(current)} \u2192 ${formatModelConfig(next)}`;
    },
    [projectRoot2, sessionManager]
  );
  const handleSubmit = useCallback3(
    (submission) => {
      void handlePrompt(submission);
    },
    [handlePrompt]
  );
  useEffect5(() => {
    if (initialPromptSubmittedRef.current || !initialPrompt2 || !initialPrompt2.trim()) {
      return;
    }
    initialPromptSubmittedRef.current = true;
    handleSubmit({
      text: initialPrompt2,
      imageUrls: [],
      selectedSkills: void 0,
    });
  }, [handleSubmit, initialPrompt2]);
  const handleSelectSession = useCallback3(
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
  const handleRawModeChange = useCallback3(
    (nextMode) => {
      const activeSessionId = sessionManager.getActiveSessionId();
      setMode(nextMode);
      setShowWelcome(false);
      setMessages([]);
      process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
      setTimeout(() => {
        if (nextMode === "Raw scrollback mode" /* Raw */) {
          const allMessages = activeSessionId ? loadVisibleMessages(sessionManager, activeSessionId) : [];
          for (const msg of allMessages) {
            process.stdout.write("\n");
            process.stdout.write(renderMessageToStdout(msg, nextMode) + "\n\n");
          }
          if (allMessages.length > 0) {
            process.stdout.write("\n\n");
            process.stdout.write(chalk5.dim("Press ESC to exit raw mode"));
          } else {
            process.stdout.write("\n");
            process.stdout.write(chalk5.dim("(No messages in this session yet. Start chatting to see them here.)"));
            process.stdout.write("\n\n");
            process.stdout.write(chalk5.dim("Press ESC to exit raw mode"));
          }
        } else if (activeSessionId) {
          handleSelectSession(activeSessionId);
        } else {
          setWelcomeNonce((n) => n + 1);
          setShowWelcome(true);
        }
      }, 200);
    },
    [handleSelectSession, sessionManager, setMode]
  );
  useEffect5(() => {
    if (!stdout?.isTTY) {
      return;
    }
    if (columns <= 0) {
      return;
    }
    if (lastRenderedColumnsRef.current === null) {
      lastRenderedColumnsRef.current = columns;
      return;
    }
    if (lastRenderedColumnsRef.current === columns) {
      return;
    }
    lastRenderedColumnsRef.current = columns;
    if (mode === "Raw scrollback mode" /* Raw */) {
      process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
      const activeSessionId2 = sessionManager.getActiveSessionId();
      const allMessages = activeSessionId2 ? loadVisibleMessages(sessionManager, activeSessionId2) : [];
      for (const msg of allMessages) {
        process.stdout.write("\n");
        process.stdout.write(renderMessageToStdout(msg, mode) + "\n\n");
      }
      if (allMessages.length > 0) {
        process.stdout.write("\n\n");
        process.stdout.write(chalk5.dim("Press ESC to exit raw mode"));
      } else {
        process.stdout.write("\n");
        process.stdout.write(chalk5.dim("(No messages in this session yet. Start chatting to see them here.)"));
        process.stdout.write("\n\n");
        process.stdout.write(chalk5.dim("Press ESC to exit raw mode"));
      }
      return;
    }
    writeRef.current("\x1B[2J\x1B[H");
    setMessages([]);
    setShowWelcome(false);
    setWelcomeNonce((n) => n + 1);
    const activeSessionId = sessionManager.getActiveSessionId();
    const nextMessages =
      activeSessionId && !busy ? loadVisibleMessages(sessionManager, activeSessionId) : messagesRef.current;
    setTimeout(() => {
      setMessages(nextMessages);
      setShowWelcome(true);
    }, 0);
  }, [busy, mode, sessionManager, columns, stdout]);
  const screenWidth = useMemo8(() => columns ?? stdout?.columns ?? 80, [columns, stdout]);
  const screenHeight = useMemo8(() => rows ?? stdout?.rows ?? 24, [rows, stdout]);
  const promptHistory = useMemo8(() => {
    return messages
      .filter((message) => message.role === "user" && typeof message.content === "string")
      .map((message) => (message.content ?? "").trim())
      .filter((content) => content.length > 0);
  }, [messages]);
  const expandedThinkingId = findExpandedThinkingId(messages);
  const pendingQuestion = useMemo8(() => findPendingAskUserQuestion(messages, activeStatus), [activeStatus, messages]);
  const shouldShowQuestionPrompt = Boolean(pendingQuestion && !dismissedQuestionIds.has(pendingQuestion.messageId));
  const loadingText = useMemo8(
    () => (busy ? buildLoadingText({ progress: streamProgress, processes: runningProcesses, now: Date.now() }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowTick forces periodic recalculation for spinner animation
    [busy, streamProgress, runningProcesses, nowTick]
  );
  const welcomeItem = useMemo8(
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
      updateTime: "",
    }),
    [welcomeNonce]
  );
  const staticItems = useMemo8(() => {
    if (mode === "Raw scrollback mode" /* Raw */) {
      return [];
    }
    if (showWelcome && view === "chat") {
      return [welcomeItem, ...messages];
    }
    return messages;
  }, [mode, showWelcome, view, messages, welcomeItem]);
  const handleQuestionAnswers = useCallback3(
    (answers) => {
      void handlePrompt({
        text: formatAskUserQuestionAnswers(answers),
        imageUrls: [],
      });
    },
    [handlePrompt]
  );
  const handleQuestionCancel = useCallback3(() => {
    if (!pendingQuestion) {
      return;
    }
    setDismissedQuestionIds((prev) => new Set(prev).add(pendingQuestion.messageId));
  }, [pendingQuestion]);
  if (mode === "Raw scrollback mode" /* Raw */) {
    return /* @__PURE__ */ jsx13(RawModeExitPrompt, { onExit: (prev) => handleRawModeChange(prev) });
  }
  return /* @__PURE__ */ jsxs10(Box10, {
    flexDirection: "column",
    width: screenWidth,
    minWidth: 80,
    overflowX: "visible",
    children: [
      /* @__PURE__ */ jsx13(Static, {
        items: staticItems,
        children: (item) => {
          if (item.id.startsWith("__welcome__")) {
            return /* @__PURE__ */ jsx13(
              WelcomeScreen,
              {
                projectRoot: projectRoot2,
                settings: resolvedSettings,
                skills,
                width: screenWidth,
              },
              item.id
            );
          }
          return /* @__PURE__ */ jsx13(
            MessageView,
            {
              message: item,
              collapsed: isCollapsedThinking(item, expandedThinkingId),
              width: screenWidth,
            },
            item.id
          );
        },
      }),
      statusLine
        ? /* @__PURE__ */ jsx13(Box10, {
            children: /* @__PURE__ */ jsx13(Text11, { dimColor: true, children: statusLine }),
          })
        : null,
      errorLine
        ? /* @__PURE__ */ jsx13(Box10, {
            children: /* @__PURE__ */ jsxs10(Text11, { color: "red", children: ["Error: ", errorLine] }),
          })
        : null,
      showProcessStdout
        ? /* @__PURE__ */ jsx13(ProcessStdoutView, {
            processStdoutRef,
            runningProcesses,
            onDismiss: handleDismissProcessStdout,
            onAdjustTimeout: handleAdjustBashTimeout,
            screenWidth,
            screenHeight,
          })
        : view === "session-list"
          ? /* @__PURE__ */ jsx13(SessionList, {
              sessions,
              onSelect: (id) => void handleSelectSession(id),
              onCancel: () => setView("chat"),
            })
          : view === "mcp-status"
            ? /* @__PURE__ */ jsx13(McpStatusList, { statuses: mcpStatuses, onCancel: () => setView("chat") })
            : shouldShowQuestionPrompt && pendingQuestion && !busy
              ? /* @__PURE__ */ jsx13(AskUserQuestionPrompt, {
                  questions: pendingQuestion.questions,
                  onSubmit: handleQuestionAnswers,
                  onCancel: handleQuestionCancel,
                })
              : isExiting
                ? null
                : /* @__PURE__ */ jsx13(PromptInput, {
                    projectRoot: projectRoot2,
                    screenWidth,
                    skills,
                    modelConfig: resolvedSettings,
                    promptHistory,
                    busy,
                    loadingText,
                    runningProcesses,
                    onSubmit: handleSubmit,
                    onModelConfigChange: handleModelConfigChange,
                    onRawModeChange: handleRawModeChange,
                    onInterrupt: handleInterrupt,
                    onToggleProcessStdout: handleToggleProcessStdout,
                    placeholder: "Type your message...",
                  }),
    ],
  });
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
  const now = /* @__PURE__ */ new Date().toISOString();
  return {
    id: `local-${Math.random().toString(36).slice(2)}`,
    sessionId: "local",
    role: "user",
    content,
    contentParams:
      imageCount > 0
        ? Array.from({ length: imageCount }, () => ({
            type: "image_url",
            image_url: { url: "" },
          }))
        : null,
    messageParams: null,
    compacted: false,
    visible: true,
    createTime: now,
    updateTime: now,
  };
}
function isCurrentSessionEmpty(sessionManager) {
  const activeSessionId = sessionManager.getActiveSessionId();
  return !activeSessionId || !sessionManager.getSession(activeSessionId);
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
function readSettings() {
  return readSettingsFile(getUserSettingsPath());
}
function readProjectSettings(projectRoot2 = process.cwd()) {
  return readSettingsFile(getProjectSettingsPath(projectRoot2));
}
function readSettingsFile(settingsPath) {
  try {
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
  const settingsPath = getUserSettingsPath();
  writeSettingsFile(settingsPath, settings);
}
function writeProjectSettings(settings, projectRoot2 = process.cwd()) {
  const settingsPath = getProjectSettingsPath(projectRoot2);
  writeSettingsFile(settingsPath, settings);
}
function writeSettingsFile(settingsPath, settings) {
  fs12.mkdirSync(path13.dirname(settingsPath), { recursive: true });
  fs12.writeFileSync(
    settingsPath,
    `${JSON.stringify(settings, null, 2)}
`,
    "utf8"
  );
}
function writeModelConfigSelection(selection, current = resolveCurrentSettings(), projectRoot2 = process.cwd()) {
  const projectSettingsPath = getProjectSettingsPath(projectRoot2);
  const shouldWriteProjectSettings = fs12.existsSync(projectSettingsPath);
  const rawSettings = shouldWriteProjectSettings ? readProjectSettings(projectRoot2) : readSettings();
  const result = applyModelConfigSelection(rawSettings, current, selection);
  if (result.changed) {
    if (shouldWriteProjectSettings) {
      writeProjectSettings(result.settings, projectRoot2);
    } else {
      writeSettings(result.settings);
    }
  }
  return result;
}
function resolveCurrentSettings(projectRoot2 = process.cwd()) {
  return resolveSettingsSources(
    readSettings(),
    readProjectSettings(projectRoot2),
    {
      model: DEFAULT_MODEL,
      baseURL: DEFAULT_BASE_URL,
    },
    process.env
  );
}
function createOpenAIClient(projectRoot2 = process.cwd()) {
  const settings = resolveCurrentSettings(projectRoot2);
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
      env: settings.env,
      machineId: getMachineId(),
    };
  }
  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL || void 0,
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
    env: settings.env,
    machineId: getMachineId(),
  };
}
function getMachineId() {
  try {
    const idPath = path13.join(os9.homedir(), ".deepcode", "machine-id");
    if (fs12.existsSync(idPath)) {
      const raw = fs12.readFileSync(idPath, "utf8").trim();
      if (raw) {
        return raw;
      }
    }
    const generated = `${os9.hostname()}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    fs12.mkdirSync(path13.dirname(idPath), { recursive: true });
    fs12.writeFileSync(idPath, generated, "utf8");
    return generated;
  } catch {
    return void 0;
  }
}
function getUserSettingsPath() {
  return path13.join(os9.homedir(), ".deepcode", "settings.json");
}
function getProjectSettingsPath(projectRoot2) {
  return path13.join(projectRoot2, ".deepcode", "settings.json");
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

// src/ui/AppContainer.tsx
import { jsx as jsx14 } from "react/jsx-runtime";
var AppContainer = ({ version, projectRoot: projectRoot2, initialPrompt: initialPrompt2, onRestart }) => {
  return /* @__PURE__ */ jsx14(AppContext.Provider, {
    value: { version },
    children: /* @__PURE__ */ jsx14(RawModeProvider, {
      children: /* @__PURE__ */ jsx14(App, { initialPrompt: initialPrompt2, projectRoot: projectRoot2, onRestart }),
    }),
  });
};
var AppContainer_default = AppContainer;

// src/ui/UpdatePrompt.tsx
import { useState as useState10 } from "react";
import { Box as Box11, Text as Text12, useApp as useApp3, useInput as useInput5 } from "ink";
import { jsx as jsx15, jsxs as jsxs11 } from "react/jsx-runtime";
function UpdatePrompt({ currentVersion, latestVersion, installCommand, onSelect }) {
  const { exit } = useApp3();
  const [selectedIndex, setSelectedIndex] = useState10(0);
  const options = [
    {
      value: "install",
      label: `Install the latest version with \`${installCommand}\``,
    },
    {
      value: "ignore-once",
      label: "Ignore once",
    },
    {
      value: "ignore-version",
      label: `Ignore this version (${latestVersion})`,
    },
  ];
  useInput5((input, key) => {
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
    if (key.escape || (key.ctrl && (input === "c" || input === "C"))) {
      onSelect("ignore-once");
      exit();
      return;
    }
    if (/^[1-3]$/.test(input)) {
      onSelect(options[Number(input) - 1]?.value ?? "ignore-once");
      exit();
    }
  });
  return /* @__PURE__ */ jsxs11(Box11, {
    flexDirection: "column",
    marginY: 1,
    children: [
      /* @__PURE__ */ jsxs11(Text12, {
        bold: true,
        children: ["Deep Code latest version has been released: ", currentVersion, " -> ", latestVersion],
      }),
      /* @__PURE__ */ jsx15(Box11, {
        flexDirection: "column",
        marginTop: 1,
        children: options.map((option, index) => {
          const selected = index === selectedIndex;
          return /* @__PURE__ */ jsxs11(
            Text12,
            { color: selected ? "green" : void 0, children: [selected ? "> " : "  ", index + 1, ". ", option.label] },
            option.value
          );
        }),
      }),
      /* @__PURE__ */ jsx15(Box11, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx15(Text12, {
          dimColor: true,
          children: "Use Up/Down to choose, Enter to confirm, Esc to ignore once.",
        }),
      }),
    ],
  });
}

// src/updateCheck.ts
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
    installCommand,
  });
  if (choice === "install") {
    const ok = await runNpmInstallGlobal(installSpec);
    if (ok) {
      writeUpdateState({ ...state, pending: null });
      process.stdout.write(
        `
${chalk6.red("Deep Code has been updated. Please restart the CLI to use the new version.")}

`
      );
    }
    return { installed: ok };
  }
  if (choice === "ignore-version") {
    const ignoredVersions = Array.from(
      /* @__PURE__ */ new Set([...(state.ignoredVersions ?? []), pending.latestVersion])
    );
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
        checkedAt: /* @__PURE__ */ new Date().toISOString(),
      },
    });
  } catch {}
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
  return path14.join(os10.homedir(), ".deepcode", UPDATE_STATE_FILE);
}
async function promptUpdateChoice({ currentVersion, latestVersion, installCommand }) {
  return new Promise((resolve8) => {
    let selected = false;
    let instance = null;
    const handleSelect = (choice) => {
      if (selected) {
        return;
      }
      selected = true;
      resolve8(choice);
      instance?.unmount();
    };
    instance = render(
      React13.createElement(UpdatePrompt, {
        currentVersion,
        latestVersion,
        installCommand,
        onSelect: handleSelect,
      }),
      { exitOnCtrlC: false }
    );
  });
}
async function runNpmInstallGlobal(installSpec) {
  return new Promise((resolve8) => {
    const child = spawnNpm(["install", "-g", installSpec], {
      stdio: "inherit",
    });
    child.on("error", (error) => {
      process.stderr.write(`Failed to start npm install: ${error.message}
`);
      resolve8(false);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve8(true);
        return;
      }
      process.stderr.write(`npm install exited with code ${code ?? "unknown"}.
`);
      resolve8(false);
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
  return new Promise((resolve8) => {
    const args2 = ["view", packageName, "dist-tags.latest", "--json"];
    if (registry) {
      args2.push("--registry", registry);
    }
    const child = spawnNpm(args2, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve8(result);
    };
    const timer = setTimeout(() => {
      if (typeof child.pid === "number") {
        killProcessTree(child.pid, "SIGTERM", { killGroupOnNonWindows: false });
      } else {
        child.kill();
      }
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
function spawnNpm(args2, options) {
  if (process.platform === "win32") {
    return spawn5(["npm", ...args2.map(quoteCmdArg)].join(" "), [], {
      ...options,
      shell: true,
    });
  }
  return spawn5("npm", args2, {
    ...options,
    shell: false,
  });
}
function quoteCmdArg(arg) {
  return `"${String(arg).replace(/"/g, '\\"')}"`;
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
      ignoredVersions: Array.isArray(parsed.ignoredVersions)
        ? parsed.ignoredVersions.filter((value) => typeof value === "string" && value.trim().length > 0)
        : [],
    };
  } catch {
    return {};
  }
}
function writeUpdateState(state) {
  const statePath = getUpdateStatePath();
  fs13.mkdirSync(path14.dirname(statePath), { recursive: true });
  fs13.writeFileSync(
    statePath,
    `${JSON.stringify(state, null, 2)}
`,
    "utf8"
  );
}
function clearPendingUpdate(state = readUpdateState()) {
  if (!state.pending) {
    return;
  }
  writeUpdateState({ ...state, pending: null });
}
function parseVersion(value) {
  return value
    .split("-", 1)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

// src/headless.ts
import * as fs14 from "fs";
import * as path15 from "path";
import * as readline from "readline";
function jsonReplacer(_key, value) {
  if (value instanceof Map) {
    const obj = {};
    for (const [k, v] of value) obj[k] = v;
    return obj;
  }
  return value;
}
async function runHeadlessWithOptions(options, packageVersion) {
  const projectRoot2 =
    options.projectRoot && options.projectRoot.trim().length > 0 ? options.projectRoot : process.cwd();
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const createClient = options.createOpenAIClient ?? createOpenAIClient;
  const exitOnClose = options.exitOnClose ?? true;
  function emit(event) {
    output.write(`${JSON.stringify(event, jsonReplacer)}
`);
  }
  function getResolvedSettings() {
    return resolveCurrentSettings(projectRoot2);
  }
  let sessionId = null;
  const sessionManager = new SessionManager({
    projectRoot: projectRoot2,
    createOpenAIClient: () => createClient(projectRoot2),
    getResolvedSettings,
    renderMarkdown: (text) => text,
    onAssistantMessage: (message, _shouldConnect) => {
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
    onSessionEntryUpdated: (entry) => {
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
    onMcpStatusChanged: () => {},
    onProcessStdout: (_pid, _chunk) => {},
  });
  await sessionManager.initMcpServers(getResolvedSettings().mcpServers);
  emit({
    type: "ready",
    version: packageVersion,
    machineId: null,
    projectRoot: projectRoot2,
  });
  const rl = readline.createInterface({ input, terminal: false });
  let closing = false;
  function handleClose() {
    if (closing) return;
    closing = true;
    sessionManager.dispose();
    if (exitOnClose) {
      process.exit(0);
    }
  }
  rl.on("close", handleClose);
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      emit({ type: "error", error: "Invalid JSON" });
      return;
    }
    const type2 = typeof message.type === "string" ? message.type : "";
    const id = typeof message.id === "string" ? message.id : "";
    void handleCommand(type2, id, message).catch((error) => {
      const errMessage = error instanceof Error ? error.message : String(error);
      emit({ type: "error", id, message: errMessage });
    });
  });
  async function handleCommand(type2, id, raw) {
    switch (type2) {
      case "submit": {
        const text = typeof raw.text === "string" ? raw.text : "";
        const imageUrls = Array.isArray(raw.imageUrls) ? raw.imageUrls : void 0;
        const skills = Array.isArray(raw.skills) ? raw.skills : void 0;
        const userPrompt = { text };
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
        emit({ type: "ack", id });
        break;
      }
      case "list_slash_commands": {
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
        try {
          const image = readClipboardImage();
          if (image) {
            emit({
              type: "image_file",
              id,
              dataUrl: image.dataUrl,
              mimeType: image.mimeType,
            });
          } else {
            emit({
              type: "image_file",
              id,
              dataUrl: null,
              error: "No image found in clipboard",
            });
          }
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error);
          emit({ type: "image_file", id, dataUrl: null, error: errMessage });
        }
        break;
      }
      case "read_image_file": {
        const filePath = typeof raw.path === "string" ? raw.path : "";
        if (!filePath) {
          emit({ type: "image_file", id, dataUrl: null, error: "Missing file path" });
          break;
        }
        try {
          const resolvedPath = path15.isAbsolute(filePath) ? filePath : path15.resolve(projectRoot2, filePath);
          if (!fs14.existsSync(resolvedPath)) {
            emit({ type: "image_file", id, dataUrl: null, error: `File not found: ${filePath}` });
            break;
          }
          const buffer = fs14.readFileSync(resolvedPath);
          const ext = path15.extname(resolvedPath).toLowerCase();
          const mimeMap = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
            ".svg": "image/svg+xml",
          };
          const mimeType = mimeMap[ext] || "application/octet-stream";
          if (!mimeType.startsWith("image/")) {
            emit({ type: "image_file", id, dataUrl: null, error: `Unsupported file type: ${ext}` });
            break;
          }
          const base64 = buffer.toString("base64");
          const dataUrl = `data:${mimeType};base64,${base64}`;
          emit({
            type: "image_file",
            id,
            dataUrl,
            mimeType,
            fileName: path15.basename(resolvedPath),
            fileSize: buffer.length,
          });
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error);
          emit({ type: "image_file", id, dataUrl: null, error: errMessage });
        }
        break;
      }
      default:
        emit({ type: "error", id, message: `Unknown command type: ${type2}` });
        break;
    }
  }
}
function parseHeadlessArgs(args2) {
  const opts = {};
  for (let i = 0; i < args2.length; i += 1) {
    const arg = args2[i];
    if (arg === "--project-root" && i + 1 < args2.length) {
      opts.projectRoot = args2[i + 1];
      i += 1;
    }
  }
  return opts;
}
async function runHeadless(args2, packageVersion, overrides = {}) {
  const opts = parseHeadlessArgs(args2);
  return runHeadlessWithOptions(
    {
      ...overrides,
      projectRoot: opts.projectRoot,
    },
    packageVersion
  );
}

// src/cli.tsx
import { jsx as jsx16 } from "react/jsx-runtime";
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
      "  deepcode                              Launch the interactive TUI in the current directory",
      "  deepcode headless                     Run a headless NDJSON server over stdio (for native frontends)",
      "  deepcode -p <prompt>                  Launch with a pre-filled prompt",
      "  deepcode --prompt <prompt>            Same as -p",
      "  deepcode --version                    Print the version",
      "  deepcode --help                       Show this help",
      "",
      "Headless options:",
      "  --project-root <path>                 Use the given directory as the project root (default: cwd)",
      "",
      "Configuration:",
      "  ~/.deepcode/settings.json    User-level API key, model, base URL",
      "  ./.deepcode/settings.json    Project-level settings",
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
      "  /continue        Continue the active conversation, or resume one if empty",
      "  /exit            Quit",
      "  ctrl+d twice     Quit",
    ].join("\n") + "\n"
  );
  process.exit(0);
}
function extractInitialPrompt(args2) {
  const promptIndex = args2.findIndex((arg) => arg === "-p" || arg === "--prompt");
  if (promptIndex !== -1 && promptIndex + 1 < args2.length) {
    return args2[promptIndex + 1];
  }
  return void 0;
}
var initialPrompt = extractInitialPrompt(args);
var projectRoot = process.cwd();
configureWindowsShell();
if (args[0] === "headless") {
  void runHeadless(args.slice(1), packageInfo.version || "unknown").catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`deepcode headless: ${message}
`);
    process.exit(1);
  });
} else {
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
    let restarting = false;
    const appInitialPrompt = initialPrompt;
    initialPrompt = void 0;
    const inkInstance = render2(
      /* @__PURE__ */ jsx16(AppContainer_default, {
        projectRoot,
        version: packageInfo.version,
        initialPrompt: appInitialPrompt,
        onRestart: () => restartRef.current?.(),
      }),
      { exitOnCtrlC: false }
    );
    restartRef.current = () => {
      restarting = true;
      process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
      inkInstance.unmount();
      startApp();
    };
    inkInstance.waitUntilExit().then(() => {
      if (!restarting) {
        restartRef.current = null;
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
    const pkg = require_package();
    return {
      name: typeof pkg.name === "string" ? pkg.name : "@vegamo/deepcode-cli",
      version: typeof pkg.version === "string" ? pkg.version : "",
    };
  } catch {
    return { name: "@vegamo/deepcode-cli", version: "" };
  }
}
