"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalViewProps {
  id: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export function TerminalView({ id, onData, onResize }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let term: any;
    let fitAddon: any;

    const initTerminal = async () => {
      if (!terminalRef.current || initialized) return;

      // Dynamic imports for xterm
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { WebLinksAddon } = await import("xterm-addon-web-links");

      // Import CSS - handled via link tag
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css";
      document.head.appendChild(link);

      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Cascadia Code", "Fira Code", Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#d4d4d4",
          cursorAccent: "#1e1e1e",
          selectionBackground: "#264f78",
          black: "#000000",
          red: "#cd3131",
          green: "#0dbc79",
          yellow: "#e5e510",
          blue: "#2472c8",
          magenta: "#bc3fbc",
          cyan: "#11a8cd",
          white: "#e5e5e5",
          brightBlack: "#666666",
          brightRed: "#f14c4c",
          brightGreen: "#23d18b",
          brightYellow: "#f5f543",
          brightBlue: "#3b8eea",
          brightMagenta: "#d670d6",
          brightCyan: "#29b8db",
          brightWhite: "#ffffff",
        },
        allowTransparency: true,
        scrollback: 10000,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle input
      term.onData((data: string) => {
        onData?.(data);
      });

      // Handle resize
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        onResize?.(cols, rows);
      });

      // Initial welcome message
      term.writeln("\x1b[32m欢迎使用 OpenPanel 终端\x1b[0m");
      term.writeln("连接中...");
      term.write("\r\n$ ");

      setInitialized(true);
    };

    initTerminal();

    // Resize handler
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [id, initialized, onData, onResize]);

  // Method to write data to terminal (exposed via ref or callback)
  const write = (data: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(data);
    }
  };

  return (
    <div
      ref={terminalRef}
      className="w-full h-full bg-[#1e1e1e]"
      style={{ padding: "4px" }}
    />
  );
}

// Export write function for external use
export function useTerminalWrite(terminalRef: React.RefObject<HTMLDivElement>) {
  return (data: string) => {
    // Implementation would need terminal instance access
  };
}
