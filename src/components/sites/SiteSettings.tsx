"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SiteSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: {
    id: number;
    name: string;
    domain: string;
    rootPath: string;
    phpVersion: string;
  } | null;
}

const settingTabs = [
  { id: "domain", label: "域名管理" },
  { id: "directory", label: "网站目录" },
  { id: "access", label: "访问限制" },
  { id: "traffic", label: "流量限制" },
  { id: "rewrite", label: "伪静态" },
  { id: "ssl", label: "SSL" },
  { id: "php", label: "PHP版本" },
  { id: "redirect", label: "重定向" },
  { id: "proxy", label: "反向代理" },
  { id: "hotlink", label: "防盗链" },
  { id: "logs", label: "网站日志" },
];

export function SiteSettings({ open, onOpenChange, site }: SiteSettingsProps) {
  const [activeTab, setActiveTab] = useState("domain");
  const [domains, setDomains] = useState(site?.domain || "");
  const [openBasedir, setOpenBasedir] = useState(true);
  const [accessLog, setAccessLog] = useState(true);
  const [forceHttps, setForceHttps] = useState(false);

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            站点修改[{site.name}]
            <span className="text-sm font-normal text-gray-500 ml-2">
              -- 添加时间[2024-01-01 00:00:00]
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧菜单 */}
          <div className="w-40 border-r pr-2 overflow-y-auto">
            <nav className="space-y-1">
              {settingTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${
                    activeTab === tab.id
                      ? "bg-green-50 text-green-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 pl-4 overflow-y-auto">
            {activeTab === "domain" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">
                    域名 <span className="text-gray-400">(每行一个域名)</span>
                  </label>
                  <textarea
                    value={domains}
                    onChange={(e) => setDomains(e.target.value)}
                    className="w-full h-32 p-3 border rounded-lg text-sm"
                    placeholder="example.com&#10;www.example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    泛解析添加方法: *.domain.com | 端口格式: www.domain.com:88
                  </p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700">添加</Button>
              </div>
            )}

            {activeTab === "directory" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">防跨站攻击(open_basedir)</span>
                  <Switch checked={openBasedir} onCheckedChange={setOpenBasedir} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">写访问日志</span>
                  <Switch checked={accessLog} onCheckedChange={setAccessLog} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">网站目录</label>
                  <div className="flex gap-2">
                    <Input value={site.rootPath} readOnly className="flex-1" />
                    <Button variant="outline">选择</Button>
                    <Button className="bg-green-600 hover:bg-green-700">保存</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">运行目录</label>
                  <div className="flex gap-2">
                    <Select defaultValue="/">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/">/</SelectItem>
                        <SelectItem value="/public">/public</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="bg-green-600 hover:bg-green-700">保存</Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    部分程序需要指定二级目录作为运行目录，如ThinkPHP5、Laravel
                  </p>
                </div>
              </div>
            )}

            {activeTab === "ssl" && (
              <div className="space-y-4">
                <Tabs defaultValue="letsencrypt">
                  <TabsList>
                    <TabsTrigger value="commercial">商用证书</TabsTrigger>
                    <TabsTrigger value="letsencrypt">Let\x27s Encrypt</TabsTrigger>
                    <TabsTrigger value="other">其他证书</TabsTrigger>
                    <TabsTrigger value="close">关闭</TabsTrigger>
                  </TabsList>
                  <TabsContent value="letsencrypt" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">强制HTTPS</span>
                      <Switch checked={forceHttps} onCheckedChange={setForceHttps} />
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700">申请证书</Button>
                    <p className="text-xs text-gray-500">
                      申请前请确保域名已解析到本服务器
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeTab === "php" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">PHP版本</label>
                  <div className="flex gap-2">
                    <Select defaultValue={site.phpVersion || "static"}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">纯静态</SelectItem>
                        <SelectItem value="5.6">PHP-5.6</SelectItem>
                        <SelectItem value="7.4">PHP-7.4</SelectItem>
                        <SelectItem value="8.0">PHP-8.0</SelectItem>
                        <SelectItem value="8.2">PHP-8.2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="bg-green-600 hover:bg-green-700">切换</Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rewrite" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">模板</label>
                  <Select defaultValue="default">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">default</SelectItem>
                      <SelectItem value="wordpress">wordpress</SelectItem>
                      <SelectItem value="thinkphp">thinkphp</SelectItem>
                      <SelectItem value="laravel">laravel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">伪静态规则</label>
                  <textarea
                    className="w-full h-48 p-3 border rounded-lg text-sm font-mono bg-gray-900 text-green-400"
                    defaultValue={`location / {
  try_files $uri $uri/ /index.php?$query_string;
}`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="bg-green-600 hover:bg-green-700">保存</Button>
                  <Button variant="outline">另存为模板</Button>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="space-y-4">
                <Tabs defaultValue="access">
                  <TabsList>
                    <TabsTrigger value="access">响应日志</TabsTrigger>
                    <TabsTrigger value="error">错误日志</TabsTrigger>
                  </TabsList>
                  <TabsContent value="access">
                    <div className="h-64 bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-auto">
                      当前没有日志。
                    </div>
                  </TabsContent>
                  <TabsContent value="error">
                    <div className="h-64 bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-auto">
                      当前没有日志。
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
