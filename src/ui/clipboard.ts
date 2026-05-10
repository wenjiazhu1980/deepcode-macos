import { spawnSync, execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type ClipboardImage = {
  dataUrl: string;
  mimeType: string;
};

const PNG_MIME = "image/png";
const IMAGE_MIME_BY_EXT = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"]
]);

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function isImageFilePath(value: string): boolean {
  return IMAGE_MIME_BY_EXT.has(path.extname(value.trim()).toLowerCase());
}

function mimeTypeForPath(value: string): string {
  return IMAGE_MIME_BY_EXT.get(path.extname(value.trim()).toLowerCase()) ?? PNG_MIME;
}

function tryRun(command: string, args: string[]): Buffer | null {
  try {
    const result = spawnSync(command, args, { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
      return null;
    }
    return result.stdout;
  } catch {
    return null;
  }
}

function readImageFile(filePath: string): ClipboardImage | null {
  try {
    if (!isImageFilePath(filePath)) {
      return null;
    }
    const buffer = fs.readFileSync(filePath);
    if (buffer.length === 0) {
      return null;
    }
    const mimeType = mimeTypeForPath(filePath);
    return { dataUrl: bufferToDataUrl(buffer, mimeType), mimeType };
  } catch {
    return null;
  }
}

/**
 * Parse hex data output from osascript's «class ...» format.
 * Example: «data PNGf89504E47...» → Buffer of decoded bytes
 */
function parseOsascriptHexData(output: string, format: string): Buffer | null {
  const prefix = `«data ${format}`;
  const idx = output.indexOf(prefix);
  if (idx === -1) return null;
  const hexStart = idx + prefix.length;
  const hexEnd = output.indexOf("»", hexStart);
  if (hexEnd === -1) return null;
  let hexStr = output.slice(hexStart, hexEnd).trim();
  if (hexStr.length === 0) return null;
  // Ensure even-length hex string
  if (hexStr.length % 2 !== 0) {
    hexStr = "0" + hexStr;
  }
  try {
    return Buffer.from(hexStr, "hex");
  } catch {
    return null;
  }
}

/**
 * Read clipboard image from macOS via osascript, with PNG and TIFF fallback.
 * Uses sips (built-in macOS tool) to convert TIFF to PNG when needed.
 */
function readMacClipboardImage(): ClipboardImage | null {
  // Option 1: pngpaste (external tool, rarely installed)
  const pngpaste = tryRun("pngpaste", ["-"]);
  if (pngpaste && pngpaste.length > 0) {
    return { dataUrl: bufferToDataUrl(pngpaste, PNG_MIME), mimeType: PNG_MIME };
  }

  // Option 2: osascript «class PNGf» → parse hex in Node.js
  const pngOutput = tryRun("osascript", ["-e", "the clipboard as «class PNGf»"]);
  if (pngOutput) {
    const pngBuffer = parseOsascriptHexData(pngOutput.toString("utf8"), "PNGf");
    if (pngBuffer && pngBuffer.length > 0) {
      return { dataUrl: bufferToDataUrl(pngBuffer, PNG_MIME), mimeType: PNG_MIME };
    }
  }

  // Option 3: osascript «class TIFF» → parse hex → sips convert to PNG
  const tiffOutput = tryRun("osascript", ["-e", "the clipboard as «class TIFF»"]);
  if (tiffOutput) {
    const tiffBuffer = parseOsascriptHexData(tiffOutput.toString("utf8"), "TIFF");
    if (tiffBuffer && tiffBuffer.length > 0) {
      const pngBuffer = convertTiffToPng(tiffBuffer);
      if (pngBuffer) {
        return { dataUrl: bufferToDataUrl(pngBuffer, PNG_MIME), mimeType: PNG_MIME };
      }
    }
  }

  // Option 4: osascript «class furl» for file references (Finder copy)
  const fileUrl = tryRun("osascript", ["-e", "get POSIX path of (the clipboard as «class furl»)"]);
  const filePath = fileUrl?.toString("utf8").trim();
  if (filePath) {
    return readImageFile(filePath);
  }

  return null;
}

/**
 * Convert TIFF buffer to PNG using macOS built-in sips tool.
 * Writes TIFF to a temp file, converts with sips, reads back PNG.
 */
function convertTiffToPng(tiffBuffer: Buffer): Buffer | null {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "deepcode-tiff-"));
  try {
    const tiffPath = path.join(tempDir, "clipboard.tiff");
    const pngPath = path.join(tempDir, "clipboard.png");
    fs.writeFileSync(tiffPath, tiffBuffer);

    try {
      execSync(`sips -s format png "${tiffPath}" --out "${pngPath}"`, {
        encoding: "buffer",
        stdio: "pipe",
        timeout: 10000
      });
    } catch {
      return null;
    }

    if (!fs.existsSync(pngPath)) {
      return null;
    }
    const pngBuffer = fs.readFileSync(pngPath);
    return pngBuffer.length > 0 ? pngBuffer : null;
  } catch {
    return null;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

export function readClipboardImage(): ClipboardImage | null {
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
      "Add-Type -AssemblyName System.Windows.Forms;" +
      "$img = [System.Windows.Forms.Clipboard]::GetImage();" +
      "if ($img) { $ms = New-Object System.IO.MemoryStream;" +
      "$img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);" +
      "[Console]::OpenStandardOutput().Write($ms.ToArray(), 0, $ms.Length); }";
    const out = tryRun("powershell", ["-NoProfile", "-Command", script]);
    if (out && out.length > 0) {
      return { dataUrl: bufferToDataUrl(out, PNG_MIME), mimeType: PNG_MIME };
    }
    return null;
  }

  return null;
}

export async function readClipboardImageAsync(): Promise<ClipboardImage | null> {
  return new Promise((resolve, reject) => {
    // Use setImmediate to avoid blocking the event loop
    setImmediate(() => {
      try {
        const result = readClipboardImage();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}
