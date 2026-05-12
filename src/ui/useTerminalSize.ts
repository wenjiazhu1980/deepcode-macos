import { useEffect, useState } from "react";
import { useStdout } from "ink";

type TerminalSize = {
  columns: number;
  rows: number;
};

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const readSize = (): TerminalSize => ({
    columns: stdout?.columns ?? DEFAULT_COLUMNS,
    rows: stdout?.rows ?? DEFAULT_ROWS
  });

  const [size, setSize] = useState<TerminalSize>(() => readSize());

  useEffect(() => {
    setSize(readSize());

    if (!stdout?.on) {
      return;
    }

    const handleResize = (): void => {
      setSize(readSize());
    };

    stdout.on("resize", handleResize);
    return () => {
      stdout.off?.("resize", handleResize);
    };
  }, [stdout]);

  return size;
}
