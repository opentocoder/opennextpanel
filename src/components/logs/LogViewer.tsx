"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Download, Trash2, RefreshCw, Loader2 } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
}

interface LogViewerProps {
  panelLogs: LogEntry[];
  systemLogs: LogEntry[];
  siteLogs: { name: string; path: string }[];
  onRefresh: () => void;
  onClear: (type: string) => void;
  onDownload: (type: string) => void;
}

export function LogViewer({
  panelLogs,
  systemLogs,
  siteLogs,
  onRefresh,
  onClear,
  onDownload,
}: LogViewerProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedSite, setSelectedSite] = useState("");
  const [siteLogContent, setSiteLogContent] = useState("");
  const [siteLogLoading, setSiteLogLoading] = useState(false);

  // Fetch site log content when site is selected
  const fetchSiteLog = async (siteName: string) => {
    const site = siteLogs.find((s) => s.name === siteName);
    if (!site) return;

    setSiteLogLoading(true);
    try {
      const res = await fetch(`/api/logs?path=${encodeURIComponent(site.path)}&limit=200`);
      const data = await res.json();
      setSiteLogContent(data.content || "暂无日志内容");
    } catch (error) {
      setSiteLogContent("获取日志失败");
    } finally {
      setSiteLogLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSite) {
      fetchSiteLog(selectedSite);
    }
  }, [selectedSite]);

  const handleSiteLogRefresh = () => {
    if (selectedSite) {
      fetchSiteLog(selectedSite);
    }
  };

  const handleSiteLogDownload = () => {
    if (!siteLogContent || !selectedSite) return;
    const blob = new Blob([siteLogContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSite}_${new Date().toISOString().split("T")[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterLogs = (logs: LogEntry[]) => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.message.toLowerCase().includes(search.toLowerCase()) ||
        log.source.toLowerCase().includes(search.toLowerCase());
      const matchLevel = levelFilter === "all" || log.level === levelFilter;
      return matchSearch && matchLevel;
    });
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "info":
        return "bg-blue-100 text-blue-700";
      case "warning":
        return "bg-yellow-100 text-yellow-700";
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const LogTable = ({ logs, type }: { logs: LogEntry[]; type: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="搜索日志..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="级别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw size={14} className="mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownload(type)}>
            <Download size={14} className="mr-1" />
            下载
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600"
            onClick={() => onClear(type)}
          >
            <Trash2 size={14} className="mr-1" />
            清空
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500 w-40">
                  时间
                </th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500 w-24">
                  级别
                </th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500 w-32">
                  来源
                </th>
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">
                  消息
                </th>
              </tr>
            </thead>
            <tbody>
              {filterLogs(logs).map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4 text-sm text-gray-500 font-mono">
                    {log.timestamp}
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${getLevelBadge(
                        log.level
                      )}`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-sm">{log.source}</td>
                  <td className="py-2 px-4 text-sm font-mono">{log.message}</td>
                </tr>
              ))}
              {filterLogs(logs).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    暂无日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <Tabs defaultValue="panel" className="space-y-4">
      <TabsList>
        <TabsTrigger value="panel">面板日志</TabsTrigger>
        <TabsTrigger value="system">系统日志</TabsTrigger>
        <TabsTrigger value="site">网站日志</TabsTrigger>
      </TabsList>

      <TabsContent value="panel">
        <Card>
          <CardHeader>
            <CardTitle>面板日志</CardTitle>
          </CardHeader>
          <CardContent>
            <LogTable logs={panelLogs} type="panel" />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="system">
        <Card>
          <CardHeader>
            <CardTitle>系统日志</CardTitle>
          </CardHeader>
          <CardContent>
            <LogTable logs={systemLogs} type="system" />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="site">
        <Card>
          <CardHeader>
            <CardTitle>网站日志</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="选择网站" />
                  </SelectTrigger>
                  <SelectContent>
                    {siteLogs.length > 0 ? (
                      siteLogs.map((site) => (
                        <SelectItem key={site.name} value={site.name}>
                          {site.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>暂无网站</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedSite && (
                  <span className="text-sm text-gray-500">
                    {siteLogs.find((s) => s.name === selectedSite)?.path || ""}
                  </span>
                )}
              </div>
              {selectedSite && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSiteLogRefresh}>
                    <RefreshCw size={14} className="mr-1" />
                    刷新
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSiteLogDownload}>
                    <Download size={14} className="mr-1" />
                    下载
                  </Button>
                </div>
              )}
            </div>

            {selectedSite ? (
              <div className="border rounded-lg p-4 bg-gray-900 text-gray-100 font-mono text-sm max-h-[500px] overflow-auto">
                {siteLogLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-all">{siteLogContent}</pre>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {siteLogs.length > 0 ? "请选择要查看的网站" : "暂无网站日志文件"}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
