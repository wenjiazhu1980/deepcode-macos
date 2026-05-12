import { useLayoutEffect, useEffect, useRef, useState, useCallback } from "react";
import type { PromptBufferState } from "../promptBuffer";

type CursorPlacement = {
  rowsUp: number;
  column: number;
};

type WriteFn = (
  chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
  callback?: (error?: Error | null) => void
) => boolean;

function cursorUp(rows: number): string {
  return rows > 0 ? `\u001B[${rows}A` : "";
}

function cursorDown(rows: number): string {
  return rows > 0 ? `\u001B[${rows}B` : "";
}

function cursorForward(columns: number): string {
  return columns > 0 ? `\u001B[${columns}C` : "";
}

function showCursor(): string {
  return "\u001B[?25h";
}

function hideCursor(): string {
  return "\u001B[?25l";
}

function enableTerminalFocusReporting(): string {
  return "\u001B[?1004h";
}

function disableTerminalFocusReporting(): string {
  return "\u001B[?1004l";
}

export function getPromptCursorPlacement(
  state: PromptBufferState,
  screenWidth: number,
  prefixWidth: number,
  footerText: string
): CursorPlacement {
  const width = Math.max(1, screenWidth);
  const cursor = Math.max(0, Math.min(state.cursor, state.text.length));
  const beforeCursor = state.text.slice(0, cursor);
  const at = state.text[cursor];
  const displayText = beforeCursor + (typeof at === "undefined" || at === "\n" ? " " : at) +
    (at === "\n" ? "\n" : "") + (typeof at === "undefined" ? "" : state.text.slice(cursor + 1));

  const cursorPosition = measureTextPosition(beforeCursor, width, prefixWidth);
  const promptRows = measureTextRows(displayText, width, prefixWidth);
  const footerRows = 1 + measureTextRows(footerText, width, 0);

  return {
    rowsUp: (promptRows - 1 - cursorPosition.row) + footerRows + 1,
    column: cursorPosition.column
  };
}

function measureTextRows(text: string, width: number, initialColumn: number): number {
  return measureTextPosition(text, width, initialColumn).row + 1;
}

function measureTextPosition(text: string, width: number, initialColumn: number): { row: number; column: number } {
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

function textWidth(value: string): number {
  let width = 0;
  for (const char of Array.from(value.normalize())) {
    width += characterWidth(char);
  }
  return width;
}

function characterWidth(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  if (codePoint === 0 || codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) {
    return 0;
  }
  if (codePoint >= 0x300 && codePoint <= 0x36f) {
    return 0;
  }
  if (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  ) {
    return 2;
  }
  return 1;
}

export function useHiddenTerminalCursor(stdout: NodeJS.WriteStream | undefined, isActive: boolean): void {
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

export function useTerminalFocusReporting(
  stdout: NodeJS.WriteStream | undefined,
  isActive: boolean
): void {
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

/**
 * Hook to manage focus state with timeout handling.
 * Returns focus state and a handler function to be called by useTerminalInput.
 */
export function useFocusState(): { 
  hasFocus: boolean; 
  handleFocusEvent: (focused: boolean) => void;
  resetFocus: () => void;
} {
  const [hasFocus, setHasFocus] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFocusEvent = useCallback((focused: boolean) => {
    setHasFocus(focused);
    
    // Reset timeout when focus changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // If we received a focusOut event, set a timeout to auto-reset focus
    // This handles cases where focusIn event might be missed
    if (!focused) {
      timeoutRef.current = setTimeout(() => {
        // Auto-reset focus after timeout to prevent permanent focus loss
        setHasFocus(true);
        timeoutRef.current = null;
      }, 2000);
    }
  }, []);

  const resetFocus = useCallback(() => {
    setHasFocus(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { hasFocus, handleFocusEvent, resetFocus };
}

/**
 * Unified terminal cursor management hook that combines focus reporting,
 * cursor visibility, and cursor positioning to prevent race conditions.
 */
export function useTerminalCursor(
  stdout: NodeJS.WriteStream | undefined,
  isActive: boolean,
  placement?: CursorPlacement | null
): { hasFocus: boolean; handleFocusEvent: (focused: boolean) => void; resetFocus: () => void } {
  // Enable terminal focus reporting
  useTerminalFocusReporting(stdout, isActive);
  
  // Manage focus state
  const { hasFocus, handleFocusEvent, resetFocus } = useFocusState();
  
  const directWriteRef = useRef<((data: string) => void) | null>(null);
  const activePlacementRef = useRef<CursorPlacement | null>(null);
  const lastPlacementRef = useRef<CursorPlacement | null>(null);
  const unmountingRef = useRef(false);

  // Setup direct write function and patch stdout.write
  useLayoutEffect(() => {
    if (!stdout?.isTTY) {
      return;
    }

    const stream = stdout as NodeJS.WriteStream & { write: WriteFn };
    const originalWrite = stream.write;
    const directWrite = (data: string) => {
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
      // Schedule a deferred re-position in case the layout effect does not
      // re-run (e.g. a dropdown closed without changing the buffer).
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
    
    const patchedWrite: WriteFn = (...args) => {
      restorePromptCursor();
      return originalWrite.apply(stdout, args);
    };

    directWriteRef.current = directWrite;
    stream.write = patchedWrite;

    return () => {
      restorePromptCursor();
      stream.write = originalWrite;
      directWriteRef.current = null;
    };
  }, [stdout]);

  // Manage cursor visibility and positioning
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
      // Show cursor at specific position
      directWrite(showCursor() + cursorUp(placement.rowsUp) + "\r" + cursorForward(placement.column));
      activePlacementRef.current = placement;
      lastPlacementRef.current = placement;
    } else {
      // Hide cursor when no placement provided
      directWrite(hideCursor());
      activePlacementRef.current = null;
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
