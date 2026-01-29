"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, X, Terminal, AlertCircle, Settings } from "lucide-react";

interface TerminalTab {
  id: string;
  title: string;
  port: number;
  active: boolean;
}

const TTYD_BASE_PORT = 7681;
const MAX_TERMINALS = 5;

export default function TerminalPage() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ttydInstalled, setTtydInstalled] = useState<boolean | null>(null);

  const activeTab = tabs.find((t) => t.active);

  // 检查 ttyd 状态
  const checkTtydStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/terminal/ttyd?action=status");
      const data = await res.json();
      setTtydInstalled(data.installed);

      if (data.installed && data.sessions) {
        // 同步现有会话
        const existingTabs: TerminalTab[] = data.sessions.map((session: any, index: number) => ({
          id: `term-${session.port}`,
          title: `终端 ${index + 1}`,
          port: session.port,
          active: index === 0,
        }));

        if (existingTabs.length === 0) {
          // 创建默认终端
          await createNewTerminal();
        } else {
          setTabs(existingTabs);
        }
      }
      setError(null);
    } catch (err) {
      setError("无法连接到终端服务");
      console.error("Terminal status error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建新终端
  const createNewTerminal = async () => {
    if (tabs.length >= MAX_TERMINALS) {
      setError(`最多只能打开 ${MAX_TERMINALS} 个终端`);
      return;
    }

    try {
      const res = await fetch("/api/terminal/ttyd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();

      if (data.success && data.port) {
        const newTab: TerminalTab = {
          id: `term-${data.port}`,
          title: `终端 ${tabs.length + 1}`,
          port: data.port,
          active: true,
        };
        setTabs((prev) => [
          ...prev.map((t) => ({ ...t, active: false })),
          newTab,
        ]);
        setError(null);
      } else {
        setError(data.error || "创建终端失败");
      }
    } catch (err) {
      setError("创建终端失败");
      console.error("Create terminal error:", err);
    }
  };

  // 关闭终端
  const closeTerminal = async (tab: TerminalTab) => {
    try {
      await fetch("/api/terminal/ttyd", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: tab.port }),
      });

      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tab.id);
        if (filtered.length > 0 && tab.active) {
          filtered[filtered.length - 1].active = true;
        }
        return filtered;
      });
    } catch (err) {
      console.error("Close terminal error:", err);
    }
  };

  // 选择终端
  const selectTab = (id: string) => {
    setTabs((prev) =>
      prev.map((t) => ({ ...t, active: t.id === id }))
    );
  };

  // 安装 ttyd
  const installTtyd = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/software", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", softwareId: "ttyd" }),
      });
      const data = await res.json();
      if (data.success) {
        await checkTtydStatus();
      } else {
        setError(data.error || "安装 ttyd 失败");
      }
    } catch (err) {
      setError("安装 ttyd 失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTtydStatus();
  }, [checkTtydStatus]);

  // ttyd 未安装
  if (ttydInstalled === false) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center bg-gray-900 rounded-lg">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl text-white mb-2">终端服务未安装</h2>
        <p className="text-gray-400 mb-6">需要安装 ttyd 来提供 Web 终端功能</p>
        <Button
          onClick={installTtyd}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? "安装中..." : "安装 ttyd"}
        </Button>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>正在加载终端...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      {/* 标签栏 */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700 px-2">
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b-2 transition-colors ${
                tab.active
                  ? "border-green-500 text-white bg-gray-900"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <Terminal size={14} />
              <span className="text-sm whitespace-nowrap">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(tab);
                  }}
                  className="ml-1 p-0.5 rounded hover:bg-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={createNewTerminal}
            disabled={tabs.length >= MAX_TERMINALS}
            className="text-gray-400 hover:text-white"
          >
            <Plus size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={checkTtydStatus}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 终端内容 */}
      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <iframe
            key={tab.id}
            src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${tab.port}`}
            className={`absolute inset-0 w-full h-full border-0 ${
              tab.active ? "block" : "hidden"
            }`}
            title={tab.title}
          />
        ))}

        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>没有活动的终端</p>
              <Button
                onClick={createNewTerminal}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Plus size={16} className="mr-1" />
                新建终端
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="bg-gray-800 px-4 py-1 text-xs text-gray-500 flex items-center justify-between border-t border-gray-700">
        <span>
          {activeTab ? (
            <>
              {activeTab.title} | 端口: {activeTab.port} |{" "}
              <span className="text-green-400">已连接</span>
            </>
          ) : (
            "无活动终端"
          )}
        </span>
        <span>终端数: {tabs.length}/{MAX_TERMINALS}</span>
      </div>
    </div>
  );
}
