"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Eye } from "lucide-react";

interface MonitoredPath {
  id: number;
  path: string;
  recursive: boolean;
  enabled: boolean;
  lastScan: string;
  changesDetected: number;
}

interface ChangeLog {
  id: number;
  path: string;
  type: "modified" | "deleted" | "created";
  time: string;
  oldHash: string;
  newHash: string;
}

export default function TamperPage() {
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<MonitoredPath[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [newPath, setNewPath] = useState("");
  const [stats, setStats] = useState({ totalFiles: 0, changesDetected: 0, lastScan: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/tamper");
        const data = await res.json();
        if (data.paths) setPaths(data.paths);
        if (data.logs) setLogs(data.logs);
        if (data.stats) setStats(data.stats);
      } catch (error) {
        console.error("Failed to fetch tamper data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addPath = async () => {
    if (!newPath.trim()) return;
    try {
      const res = await fetch("/api/tamper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", path: newPath }),
      });
      const data = await res.json();
      if (data.success) {
        setPaths(prev => [...prev, { id: data.id, path: newPath, recursive: true, enabled: true, lastScan: "", changesDetected: 0 }]);
        setNewPath("");
      }
    } catch (error) {
      console.error("Failed to add path:", error);
    }
  };

  const removePath = async (id: number) => {
    try {
      await fetch("/api/tamper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      });
      setPaths(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to remove path:", error);
    }
  };

  const runScan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tamper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error("Failed to run scan:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "modified") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (type === "deleted") return <Trash2 className="w-4 h-4 text-red-500" />;
    return <Plus className="w-4 h-4 text-green-500" />;
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-green-500" />
          <h1 className="text-2xl font-bold">文件防篡改</h1>
        </div>
        <Button onClick={runScan}><RefreshCw className="w-4 h-4 mr-2" />立即扫描</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">监控文件数</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">检测到变更</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.changesDetected}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">上次扫描</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-sm font-medium">{stats.lastScan || "从未"}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>监控目录</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input placeholder="输入要监控的目录路径" value={newPath} onChange={(e) => setNewPath(e.target.value)} />
              <Button onClick={addPath}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {paths.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-mono text-sm">{p.path}</p>
                    <p className="text-xs text-gray-500">变更: {p.changesDetected} | 上次扫描: {p.lastScan || "从未"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.enabled} />
                    <Button variant="ghost" size="sm" onClick={() => removePath(p.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
              {paths.length === 0 && <p className="text-center text-gray-400 py-4">暂未添加监控目录</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>变更记录</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                  {getTypeIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs truncate">{log.path}</p>
                    <p className="text-xs text-gray-500">{log.time}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-center text-gray-400 py-4">暂无变更记录</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
