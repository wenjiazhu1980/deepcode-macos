import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PassThrough, Readable } from "stream";
import { runHeadlessWithOptions } from "../headless";
import type { CreateOpenAIClient } from "../tools/executor";

const originalHome = process.env.HOME;
const tempDirs: string[] = [];

afterEach(() => {
  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-headless-"));
  tempDirs.push(dir);
  process.env.HOME = dir;
  return dir;
}

function collectOutput(stream: PassThrough): { lines: () => string[] } {
  let buffer = "";
  stream.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
  });
  return {
    lines: () => buffer.split(/\r?\n/).filter((line) => line.length > 0)
  };
}

function makeStreams(): {
  input: Readable;
  output: PassThrough;
  push: (line: string) => void;
  end: () => void;
} {
  const input = new Readable({ read() {} });
  const output = new PassThrough();
  return {
    input,
    output,
    push: (line: string) => {
      input.push(`${line}\n`);
    },
    end: () => {
      input.push(null);
    }
  };
}

const NULL_CLIENT: ReturnType<CreateOpenAIClient> = {
  client: null,
  model: "test-model",
  thinkingEnabled: false
};

test("runHeadless emits ready on startup with project root", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "9.9.9"
  );

  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const ready = events.find((event) => event.type === "ready");
  assert.ok(ready, "ready event missing");
  assert.equal(ready.version, "9.9.9");
  assert.equal(ready.projectRoot, projectRoot);
});

test("list_sessions returns empty list initially and ack on new_session", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "list_sessions", id: "q1" }));
  push(JSON.stringify({ type: "new_session", id: "q2" }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const list = events.find((event) => event.type === "sessions_list");
  assert.ok(list, "sessions_list event missing");
  assert.equal(list.id, "q1");
  assert.deepEqual(list.sessions, []);

  const ack = events.find((event) => event.type === "ack" && event.id === "q2");
  assert.ok(ack, "ack for new_session missing");
});

test("invalid JSON line emits an error event without crashing", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push("{not valid json");
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const error = events.find((event) => event.type === "error");
  assert.ok(error, "error event missing");
  assert.match(error.error, /Invalid JSON/);
});

test("submit without API key emits failed done and a system message", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "submit", id: "u1", text: "hello" }));
  // Give SessionManager time to drain its async work before closing stdin.
  await new Promise((resolve) => setTimeout(resolve, 50));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const done = events.find((event) => event.type === "done" && event.id === "u1");
  assert.ok(done, "done event missing");
  assert.equal(done.status, "failed");

  const apiKeyMessage = events.find(
    (event) =>
      event.type === "message" &&
      typeof event.message?.content === "string" &&
      event.message.content.includes("OpenAI API key not found")
  );
  assert.ok(apiKeyMessage, "expected an API-key-missing assistant message");
});

test("interrupt with no active session is a no-op and emits ack", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "interrupt", id: "i1" }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const ack = events.find((event) => event.type === "ack" && event.id === "i1");
  assert.ok(ack, "ack event for interrupt missing");
});

test("change_project_root emits project_root_changed with skills", async () => {
  createTempHome();
  const oldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(oldRoot);
  const newRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj2-"));
  tempDirs.push(newRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot: oldRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "change_project_root", id: "c1", path: newRoot }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const changed = events.find((event) => event.type === "project_root_changed");
  assert.ok(changed, "project_root_changed event missing");
  assert.equal(changed.id, "c1");
  assert.equal(changed.path, newRoot);
  assert.ok(Array.isArray(changed.skills), "skills should be an array");
});

test("change_project_root with empty path emits error", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "change_project_root", id: "c2", path: "   " }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const error = events.find((event) => event.type === "error" && event.id === "c2");
  assert.ok(error, "error event for empty path missing");
  assert.match(error.error, /non-empty/);
});

test("list_slash_commands returns commands array", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "list_slash_commands", id: "l1" }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const cmd = events.find((event) => event.type === "slash_commands");
  assert.ok(cmd, "slash_commands event missing");
  assert.equal(cmd.id, "l1");
  assert.ok(Array.isArray(cmd.commands), "commands should be an array");
  // Built-in commands should always be present
  const builtins = cmd.commands.filter((c: { kind: string }) => c.kind !== "skill");
  assert.ok(builtins.length >= 4, "expected at least 4 built-in commands");
});

test("read_clipboard_image emits clipboard_image response", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "read_clipboard_image", id: "r1" }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const img = events.find((event) => event.type === "clipboard_image");
  assert.ok(img, "clipboard_image event missing");
  assert.equal(img.id, "r1");
  // Either dataUrl or error must be present
  assert.ok(
    typeof img.dataUrl === "string" || typeof img.error === "string",
    "expected dataUrl or error in clipboard_image response"
  );
});

test("submit with imageUrls passes through to SessionManager", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({
    type: "submit",
    id: "u99",
    text: "describe this image",
    imageUrls: ["data:image/png;base64,abc123"]
  }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const done = events.find((event) => event.type === "done" && event.id === "u99");
  assert.ok(done, "done event missing for submit with imageUrls");
});

test("unknown inbound type emits error", async () => {
  createTempHome();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-proj-"));
  tempDirs.push(projectRoot);

  const { input, output, push, end } = makeStreams();
  const collector = collectOutput(output);

  const promise = runHeadlessWithOptions(
    {
      projectRoot,
      input,
      output,
      createOpenAIClient: () => NULL_CLIENT,
      exitOnClose: false
    },
    "test"
  );

  push(JSON.stringify({ type: "nonexistent_command", id: "x1" }));
  end();
  await promise;

  const events = collector.lines().map((line) => JSON.parse(line));
  const error = events.find((event) => event.type === "error" && event.error?.includes("Unknown inbound"));
  assert.ok(error, "unknown inbound type should emit error");
});
