"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PhpVersion {
  id: string;
  version: string;
  installed: boolean;
}

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

export function AddSiteDialog({ open, onOpenChange, onSubmit }: AddSiteDialogProps) {
  const [siteType, setSiteType] = useState<"static" | "php" | "proxy">("static");
  const [formData, setFormData] = useState({
    domain: "",
    remark: "",
    rootPath: "/www/wwwroot/",
    createFtp: false,
    createDb: false,
    phpVersion: "8.3",
    // 反向代理相关
    proxyUrl: "",
    proxyWebsocket: true,
  });
  const [phpVersions, setPhpVersions] = useState<PhpVersion[]>([]);
  const [error, setError] = useState("");

  // 获取已安装的 PHP 版本
  useEffect(() => {
    if (open) {
      fetchPhpVersions();
      setError("");
    }
  }, [open]);

  const fetchPhpVersions = async () => {
    try {
      const res = await fetch("/api/software");
      const data = await res.json();
      const phpSoftware = (data.software || [])
        .filter((s: any) => s.id.startsWith("php") && s.id !== "phpmyadmin")
        .map((s: any) => ({
          id: s.id,
          version: s.id.replace("php", "").replace(/(\d)(\d)/, "$1.$2"),
          installed: s.status !== "not_installed",
        }));
      setPhpVersions(phpSoftware);
    } catch (error) {
      console.error("Failed to fetch PHP versions:", error);
    }
  };

  const handleSubmit = async () => {
    setError("");

    // 验证
    if (!formData.domain.trim()) {
      setError("请输入域名");
      return;
    }

    if (siteType === "proxy" && !formData.proxyUrl.trim()) {
      setError("请输入代理目标地址");
      return;
    }

    try {
      const submitData = {
        ...formData,
        siteType,
        phpVersion: siteType === "php" ? formData.phpVersion : (siteType === "static" ? "static" : "proxy"),
      };

      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "创建失败");
        return;
      }
      onSubmit(submitData);
      onOpenChange(false);
      // 重置表单
      setFormData({
        domain: "",
        remark: "",
        rootPath: "/www/wwwroot/",
        createFtp: false,
        createDb: false,
        phpVersion: "8.3",
        proxyUrl: "",
        proxyWebsocket: true,
      });
      setSiteType("static");
    } catch (err: any) {
      setError(err.message || "创建失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加站点</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">域名</label>
            <Input
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">备注</label>
            <Input
              placeholder="网站备注"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">站点类型</label>
            <Tabs value={siteType} onValueChange={(v) => setSiteType(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="static">纯静态</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
                <TabsTrigger value="proxy">反向代理</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 静态/PHP 站点配置 */}
          {(siteType === "static" || siteType === "php") && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-2">根目录</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.rootPath}
                    onChange={(e) => setFormData({ ...formData, rootPath: e.target.value })}
                  />
                  <Button variant="outline" type="button">选择</Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">创建FTP</span>
                <Switch
                  checked={formData.createFtp}
                  onCheckedChange={(v) => setFormData({ ...formData, createFtp: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">创建数据库</span>
                <Switch
                  checked={formData.createDb}
                  onCheckedChange={(v) => setFormData({ ...formData, createDb: v })}
                />
              </div>
            </>
          )}

          {/* PHP 版本选择 */}
          {siteType === "php" && (
            <div>
              <label className="text-sm text-gray-600 block mb-2">PHP版本</label>
              <Select
                value={formData.phpVersion}
                onValueChange={(v) => setFormData({ ...formData, phpVersion: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phpVersions.map((php) => (
                    <SelectItem
                      key={php.id}
                      value={php.version}
                      disabled={!php.installed}
                    >
                      PHP-{php.version} {!php.installed && "(未安装)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 反向代理配置 */}
          {siteType === "proxy" && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-2">代理目标地址</label>
                <Input
                  placeholder="http://127.0.0.1:8081"
                  value={formData.proxyUrl}
                  onChange={(e) => setFormData({ ...formData, proxyUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持 Docker 容器地址，如 http://127.0.0.1:8081
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm">WebSocket 支持</span>
                  <p className="text-xs text-gray-500">启用 WebSocket 代理</p>
                </div>
                <Switch
                  checked={formData.proxyWebsocket}
                  onCheckedChange={(v) => setFormData({ ...formData, proxyWebsocket: v })}
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
