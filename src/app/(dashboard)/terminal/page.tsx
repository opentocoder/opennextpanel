"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TerminalView, TerminalTabs } from "@/components/terminal";

interface TerminalTab {
  id: string;
  title: string;
  active: boolean;
  ws?: WebSocket;
}

export default function TerminalPage() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "term-1", title: "终端 1", active: true },
  ]);
  const wsRefs = useRef<Map<string, WebSocket>>(new Map());
  const terminalRefs = useRef<Map<string, any>>(new Map());

  const activeTab = tabs.find((t) => t.active);

  const createNewTab = useCallback(() => {
    const newId = `term-${Date.now()}`;
    const newIndex = tabs.length + 1;
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, active: false })),
      { id: newId, title: `终端 ${newIndex}`, active: true },
    ]);
  }, [tabs.length]);

  const selectTab = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => ({ ...t, active: t.id === id }))
    );
  }, []);

  const closeTab = useCallback((id: string) => {
    // Close WebSocket if exists
    const ws = wsRefs.current.get(id);
    if (ws) {
      ws.close();
      wsRefs.current.delete(id);
    }

    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        return [{ id: "term-1", title: "终端 1", active: true }];
      }
      // If closed tab was active, activate the last one
      const wasActive = prev.find((t) => t.id === id)?.active;
      if (wasActive && filtered.length > 0) {
        filtered[filtered.length - 1].active = true;
      }
      return filtered;
    });
  }, []);

  const handleTerminalData = useCallback((tabId: string, data: string) => {
    // Send data to WebSocket if connected
    const ws = wsRefs.current.get(tabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data }));
    }
  }, []);

  const handleTerminalResize = useCallback((tabId: string, cols: number, rows: number) => {
    const ws = wsRefs.current.get(tabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  // Connect to WebSocket terminal server
  useEffect(() => {
    if (!activeTab) return;

    const tabId = activeTab.id;
    if (wsRefs.current.has(tabId)) return;

    // In production, this would connect to a real WebSocket server
    // For now, we'll simulate a local terminal
    const wsUrl = `ws://${window.location.hostname}:3001/terminal`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`Terminal ${tabId} connected`);
      };

      ws.onmessage = (event) => {
        const terminal = terminalRefs.current.get(tabId);
        if (terminal) {
          terminal.write(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error(`Terminal ${tabId} error:`, error);
      };

      ws.onclose = () => {
        console.log(`Terminal ${tabId} disconnected`);
        wsRefs.current.delete(tabId);
      };

      wsRefs.current.set(tabId, ws);
    } catch (error) {
      console.error("Failed to connect to terminal server:", error);
    }

    return () => {
      // Cleanup handled in closeTab
    };
  }, [activeTab]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <TerminalTabs
        tabs={tabs}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onNewTab={createNewTab}
      />

      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${tab.active ? "block" : "hidden"}`}
          >
            <TerminalView
              id={tab.id}
              onData={(data) => handleTerminalData(tab.id, data)}
              onResize={(cols, rows) => handleTerminalResize(tab.id, cols, rows)}
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-800 px-4 py-1 text-xs text-gray-500 flex items-center justify-between border-t border-gray-700">
        <span>
          {activeTab?.title} | 连接状态:{" "}
          <span className="text-green-400">本地</span>
        </span>
        <span>提示: 使用 Ctrl+Shift+T 新建标签, Ctrl+Shift+W 关闭标签</span>
      </div>
    </div>
  );
}
