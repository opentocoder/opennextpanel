"use client";

import { useState, useEffect, useCallback } from "react";
import { LogViewer } from "@/components/logs";

interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
}

interface SiteLog {
  name: string;
  path: string;
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [panelLogs, setPanelLogs] = useState<LogEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [siteLogs, setSiteLogs] = useState<SiteLog[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/logs?type=all");
      const data = await response.json();

      if (data.panelLogs) {
        setPanelLogs(data.panelLogs);
      }
      if (data.systemLogs) {
        setSystemLogs(data.systemLogs);
      }
      if (data.siteLogs) {
        setSiteLogs(data.siteLogs);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const handleClear = async (type: string) => {
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", type }),
      });

      const data = await response.json();
      if (data.success) {
        alert("日志已清空");
        fetchData();
      } else {
        alert(data.message || "清空失败");
      }
    } catch (error) {
      console.error("Failed to clear logs:", error);
      alert("清空失败");
    }
  };

  const handleDownload = async (type: string) => {
    try {
      let logType = "panel";
      if (type === "系统") logType = "system";

      const response = await fetch(`/api/logs?type=${logType}&limit=1000`);
      const data = await response.json();

      if (data.logs) {
        const content = data.logs
          .map((log: LogEntry) => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`)
          .join("\n");

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${logType}_logs_${new Date().toISOString().split("T")[0]}.log`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download logs:", error);
      alert("下载失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">日志管理</h1>

      <LogViewer
        panelLogs={panelLogs}
        systemLogs={systemLogs}
        siteLogs={siteLogs}
        onRefresh={handleRefresh}
        onClear={handleClear}
        onDownload={handleDownload}
      />
    </div>
  );
}
