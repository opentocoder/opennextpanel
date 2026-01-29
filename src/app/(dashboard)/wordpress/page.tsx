"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, RefreshCw, Download, Trash2, Shield, Database, Zap, ExternalLink } from "lucide-react";

interface WPSite {
  id: number;
  name: string;
  domain: string;
  path: string;
  version: string;
  status: "active" | "inactive" | "updating";
  plugins: number;
  themes: number;
  lastUpdate: string;
}

interface WPPlugin {
  name: string;
  version: string;
  status: "active" | "inactive";
  updateAvailable: boolean;
}

export default function WordPressPage() {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<WPSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<WPSite | null>(null);
  const [plugins, setPlugins] = useState<WPPlugin[]>([]);
  const [stats, setStats] = useState({ totalSites: 0, needsUpdate: 0, totalPlugins: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/wordpress");
        const data = await res.json();
        if (data.sites) setSites(data.sites);
        if (data.stats) setStats(data.stats);
      } catch (error) {
        console.error("Failed to fetch WordPress data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectSite = async (site: WPSite) => {
    setSelectedSite(site);
    try {
      const res = await fetch("/api/wordpress?siteId=" + site.id);
      const data = await res.json();
      if (data.plugins) setPlugins(data.plugins);
    } catch (error) {
      console.error("Failed to fetch plugins:", error);
    }
  };

  const updateWP = async (siteId: number) => {
    try {
      setSites(prev => prev.map(s => s.id === siteId ? { ...s, status: "updating" } : s));
      const res = await fetch("/api/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", siteId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("更新成功");
        window.location.reload();
      } else {
        alert(data.error || "更新失败");
      }
    } catch (error) {
      console.error("Failed to update:", error);
    }
  };

  const clearCache = async (siteId: number) => {
    try {
      const res = await fetch("/api/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cache", siteId }),
      });
      const data = await res.json();
      alert(data.success ? "缓存已清除" : (data.error || "操作失败"));
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">WordPress 管理</h1>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4 mr-2" />刷新</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WordPress 站点</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalSites}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待更新</CardTitle>
            <Download className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{stats.needsUpdate}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已安装插件</CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalPlugins}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>站点列表</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>站点名称</TableHead>
                  <TableHead>域名</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id} className={selectedSite?.id === site.id ? "bg-blue-50" : ""}>
                    <TableCell className="font-medium cursor-pointer" onClick={() => selectSite(site)}>{site.name}</TableCell>
                    <TableCell>
                      <a href={"https://" + site.domain} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex items-center gap-1">
                        {site.domain}<ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                    <TableCell>{site.version}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${site.status === "active" ? "bg-green-100 text-green-700" : site.status === "updating" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                        {site.status === "active" ? "正常" : site.status === "updating" ? "更新中" : "停用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => updateWP(site.id)} title="更新"><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => clearCache(site.id)} title="清除缓存"><Zap className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sites.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">未检测到 WordPress 站点</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{selectedSite ? selectedSite.name + " - 插件" : "插件列表"}</CardTitle></CardHeader>
          <CardContent>
            {selectedSite ? (
              <div className="space-y-2">
                {plugins.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">v{p.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.updateAvailable && <span className="w-2 h-2 bg-orange-500 rounded-full" title="有更新"></span>}
                      <span className={`px-2 py-0.5 text-xs rounded ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.status === "active" ? "启用" : "禁用"}
                      </span>
                    </div>
                  </div>
                ))}
                {plugins.length === 0 && <p className="text-center text-gray-400 py-4">暂无插件</p>}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">请选择一个站点查看插件</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
