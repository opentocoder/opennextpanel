"use client";

import { useState, useEffect } from "react";
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
    createdAt?: string;
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
  { id: "config", label: "配置文件" },
];

export function SiteSettings({ open, onOpenChange, site }: SiteSettingsProps) {
  const [activeTab, setActiveTab] = useState("domain");
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState("");
  const [openBasedir, setOpenBasedir] = useState(true);
  const [accessLog, setAccessLog] = useState(true);
  const [forceHttps, setForceHttps] = useState(false);
  const [phpVersion, setPhpVersion] = useState("static");
  const [rewriteTemplate, setRewriteTemplate] = useState("default");
  const [rewriteRules, setRewriteRules] = useState("");
  const [accessLogs, setAccessLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [logsTab, setLogsTab] = useState<"access" | "error">("access");

  // 访问限制
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [ipBlacklist, setIpBlacklist] = useState("");
  const [userAgentBlacklist, setUserAgentBlacklist] = useState("");

  // 流量限制
  const [limitRate, setLimitRate] = useState("0");
  const [limitConn, setLimitConn] = useState("0");
  const [limitReqRate, setLimitReqRate] = useState("0");

  // 重定向
  const [redirects, setRedirects] = useState<{from: string; to: string; type: string}[]>([]);
  const [newRedirectFrom, setNewRedirectFrom] = useState("");
  const [newRedirectTo, setNewRedirectTo] = useState("");
  const [newRedirectType, setNewRedirectType] = useState("301");

  // 反向代理
  const [proxies, setProxies] = useState<{path: string; target: string}[]>([]);
  const [newProxyPath, setNewProxyPath] = useState("/api");
  const [newProxyTarget, setNewProxyTarget] = useState("http://127.0.0.1:3000");

  // 防盗链
  const [hotlinkEnabled, setHotlinkEnabled] = useState(false);
  const [hotlinkReferers, setHotlinkReferers] = useState("");
  const [hotlinkExtensions, setHotlinkExtensions] = useState("jpg,jpeg,png,gif,webp");

  // SSL证书
  const [sslCert, setSslCert] = useState("");
  const [sslKey, setSslKey] = useState("");
  const [sslEnabled, setSslEnabled] = useState(false);

  // 配置文件
  const [nginxConfig, setNginxConfig] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    if (site && open) {
      // 重置所有状态
      setDomains(site.domain || "");
      setPhpVersion(site.phpVersion || "static");
      setActiveTab("domain");
      setNginxConfig("");
      setConfigPath("");
      fetchSiteConfig();
    }
  }, [site, open]);

  const fetchSiteConfig = async () => {
    if (!site) return;
    try {
      const res = await fetch(`/api/sites/${site.id}?action=config`);
      const data = await res.json();
      if (data.config) {
        setOpenBasedir(data.config.openBasedir !== false);
        setAccessLog(data.config.accessLog !== false);
        setForceHttps(data.config.forceHttps === true);
        setRewriteRules(data.config.rewriteRules || "");
        setIpWhitelist(data.config.ipWhitelist || "");
        setIpBlacklist(data.config.ipBlacklist || "");
        setLimitRate(data.config.limitRate || "0");
        setLimitConn(data.config.limitConn || "0");
        setRedirects(data.config.redirects || []);
        setProxies(data.config.proxies || []);
        setHotlinkEnabled(data.config.hotlinkEnabled === true);
        setHotlinkReferers(data.config.hotlinkReferers || "");
      }
    } catch (error) {
      console.error("Failed to fetch site config:", error);
    }
  };

  const fetchLogs = async (type: "access" | "error") => {
    if (!site) return;
    try {
      const res = await fetch(`/api/sites/${site.id}?action=logs&type=${type}`);
      const data = await res.json();
      if (type === "access") {
        setAccessLogs(data.logs || []);
      } else {
        setErrorLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const fetchNginxConfig = async () => {
    if (!site) return;
    setConfigLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}?action=nginx_config`);
      const data = await res.json();
      if (data.error) {
        setNginxConfig(`# 错误: ${data.error}`);
        setConfigPath(`/etc/nginx/sites-available/${site.name}.conf`);
      } else if (data.config) {
        setNginxConfig(data.config);
        setConfigPath(data.path || `/etc/nginx/sites-available/${site.name}.conf`);
      } else {
        setNginxConfig("# 配置文件为空或不存在");
        setConfigPath(`/etc/nginx/sites-available/${site.name}.conf`);
      }
    } catch (error) {
      console.error("Failed to fetch nginx config:", error);
      setNginxConfig(`# 获取配置失败: ${error}`);
    } finally {
      setConfigLoading(false);
    }
  };

  const saveNginxConfig = async () => {
    if (!site) return;
    setConfigLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_nginx_config", config: nginxConfig }),
      });
      const data = await res.json();
      if (data.success) {
        alert("配置保存成功，Nginx 已重载");
      } else {
        alert("保存失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      console.error("Failed to save nginx config:", error);
      alert("保存失败");
    } finally {
      setConfigLoading(false);
    }
  };

  const saveConfig = async (configKey: string, configValue: any) => {
    if (!site) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_config", config: { [configKey]: configValue } }),
      });
      const data = await res.json();
      if (data.success) {
        alert("保存成功");
      } else {
        alert("保存失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    if (!site || !domains.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_domain", domain: domains.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert("域名添加成功");
      } else {
        alert("添加失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      alert("添加失败");
    } finally {
      setLoading(false);
    }
  };

  const applySsl = async () => {
    if (!site) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_ssl", forceHttps }),
      });
      const data = await res.json();
      if (data.success) {
        alert("SSL证书申请已提交");
      } else {
        alert("申请失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      alert("申请失败");
    } finally {
      setLoading(false);
    }
  };

  const changePhp = async () => {
    if (!site) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_php", phpVersion }),
      });
      const data = await res.json();
      if (data.success) {
        alert("PHP版本切换成功");
      } else {
        alert("切换失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      alert("切换失败");
    } finally {
      setLoading(false);
    }
  };

  const addRedirect = () => {
    if (!newRedirectFrom || !newRedirectTo) return;
    setRedirects([...redirects, { from: newRedirectFrom, to: newRedirectTo, type: newRedirectType }]);
    setNewRedirectFrom("");
    setNewRedirectTo("");
  };

  const removeRedirect = (index: number) => {
    setRedirects(redirects.filter((_, i) => i !== index));
  };

  const addProxy = () => {
    if (!newProxyPath || !newProxyTarget) return;
    setProxies([...proxies, { path: newProxyPath, target: newProxyTarget }]);
    setNewProxyPath("/api");
    setNewProxyTarget("http://127.0.0.1:3000");
  };

  const removeProxy = (index: number) => {
    setProxies(proxies.filter((_, i) => i !== index));
  };

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            站点修改[{site.name}]
            <span className="text-sm font-normal text-gray-500 ml-2">
              -- 添加时间[{site.createdAt || "2024-01-01 00:00:00"}]
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
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "logs") fetchLogs("access");
                    if (tab.id === "config") fetchNginxConfig();
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 pl-4 overflow-y-auto">
            {/* 域名管理 */}
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
                <Button className="bg-green-600 hover:bg-green-700" onClick={addDomain} disabled={loading}>
                  {loading ? "处理中..." : "添加"}
                </Button>
              </div>
            )}

            {/* 网站目录 */}
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
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("directory", { openBasedir, accessLog, rootPath: site.rootPath })} disabled={loading}>保存</Button>
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
                        <SelectItem value="/web">/web</SelectItem>
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

            {/* 访问限制 */}
            {activeTab === "access" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">IP白名单 (每行一个IP)</label>
                  <textarea
                    value={ipWhitelist}
                    onChange={(e) => setIpWhitelist(e.target.value)}
                    className="w-full h-24 p-3 border rounded-lg text-sm font-mono"
                    placeholder="192.168.1.1&#10;10.0.0.0/8"
                  />
                  <p className="text-xs text-gray-500 mt-1">白名单IP可绕过其他限制</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">IP黑名单 (每行一个IP)</label>
                  <textarea
                    value={ipBlacklist}
                    onChange={(e) => setIpBlacklist(e.target.value)}
                    className="w-full h-24 p-3 border rounded-lg text-sm font-mono"
                    placeholder="1.2.3.4&#10;5.6.7.0/24"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">User-Agent黑名单 (每行一个)</label>
                  <textarea
                    value={userAgentBlacklist}
                    onChange={(e) => setUserAgentBlacklist(e.target.value)}
                    className="w-full h-24 p-3 border rounded-lg text-sm font-mono"
                    placeholder="curl&#10;wget&#10;python-requests"
                  />
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("access", { ipWhitelist, ipBlacklist, userAgentBlacklist })} disabled={loading}>保存</Button>
              </div>
            )}

            {/* 流量限制 */}
            {activeTab === "traffic" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">限速 (KB/s, 0=不限制)</label>
                  <Input type="number" value={limitRate} onChange={(e) => setLimitRate(e.target.value)} className="w-48" />
                  <p className="text-xs text-gray-500 mt-1">限制单个连接的下载速度</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">并发连接数限制 (0=不限制)</label>
                  <Input type="number" value={limitConn} onChange={(e) => setLimitConn(e.target.value)} className="w-48" />
                  <p className="text-xs text-gray-500 mt-1">单IP最大同时连接数</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">请求频率限制 (次/秒, 0=不限制)</label>
                  <Input type="number" value={limitReqRate} onChange={(e) => setLimitReqRate(e.target.value)} className="w-48" />
                  <p className="text-xs text-gray-500 mt-1">单IP每秒最大请求数</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("traffic", { limitRate, limitConn, limitReqRate })} disabled={loading}>保存</Button>
              </div>
            )}

            {/* 伪静态 */}
            {activeTab === "rewrite" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">模板</label>
                  <Select value={rewriteTemplate} onValueChange={(v) => {
                    setRewriteTemplate(v);
                    const templates: Record<string, string> = {
                      default: "",
                      wordpress: "location / {\n  try_files $uri $uri/ /index.php?$args;\n}",
                      thinkphp: "location / {\n  if (!-e $request_filename){\n    rewrite ^(.*)$ /index.php?s=$1 last; break;\n  }\n}",
                      laravel: "location / {\n  try_files $uri $uri/ /index.php?$query_string;\n}",
                    };
                    setRewriteRules(templates[v] || "");
                  }}>
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
                    value={rewriteRules}
                    onChange={(e) => setRewriteRules(e.target.value)}
                    placeholder="location / {&#10;  try_files $uri $uri/ /index.php?$query_string;&#10;}"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("rewrite", rewriteRules)} disabled={loading}>保存</Button>
                  <Button variant="outline">另存为模板</Button>
                </div>
              </div>
            )}

            {/* SSL */}
            {activeTab === "ssl" && (
              <div className="space-y-4">
                <Tabs defaultValue="letsencrypt">
                  <TabsList>
                    <TabsTrigger value="commercial">商用证书</TabsTrigger>
                    <TabsTrigger value="letsencrypt">Let's Encrypt</TabsTrigger>
                    <TabsTrigger value="other">其他证书</TabsTrigger>
                    <TabsTrigger value="close">关闭</TabsTrigger>
                  </TabsList>
                  <TabsContent value="commercial" className="space-y-4 pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">商用SSL证书</h4>
                      <p className="text-sm text-blue-700 mb-4">商用证书需要从证书颁发机构(CA)购买，提供更高的信任度和保障。</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-600 block mb-2">证书(PEM格式)</label>
                          <textarea
                            className="w-full h-32 p-3 border rounded-lg text-sm font-mono"
                            placeholder="-----BEGIN CERTIFICATE-----"
                            value={sslCert}
                            onChange={(e) => setSslCert(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600 block mb-2">私钥(KEY格式)</label>
                          <textarea
                            className="w-full h-32 p-3 border rounded-lg text-sm font-mono"
                            placeholder="-----BEGIN RSA PRIVATE KEY-----"
                            value={sslKey}
                            onChange={(e) => setSslKey(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">强制HTTPS</span>
                          <Switch checked={forceHttps} onCheckedChange={setForceHttps} />
                        </div>
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => saveConfig("ssl", { cert: sslCert, key: sslKey, forceHttps })}
                          disabled={loading || !sslCert || !sslKey}
                        >
                          {loading ? "保存中..." : "保存证书"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="letsencrypt" className="space-y-4 pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">Let's Encrypt 免费证书</h4>
                      <p className="text-sm text-green-700 mb-4">自动申请和续期的免费SSL证书，需要确保域名已解析到本服务器。</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">强制HTTPS</span>
                      <Switch checked={forceHttps} onCheckedChange={setForceHttps} />
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={applySsl} disabled={loading}>
                      {loading ? "申请中..." : "申请证书"}
                    </Button>
                    <p className="text-xs text-gray-500">申请前请确保域名已解析到本服务器，且80端口可访问</p>
                  </TabsContent>
                  <TabsContent value="other" className="space-y-4 pt-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">自定义证书</h4>
                      <p className="text-sm text-gray-600 mb-4">上传您自己的SSL证书和私钥。</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-2">证书(PEM格式)</label>
                      <textarea
                        className="w-full h-32 p-3 border rounded-lg text-sm font-mono"
                        placeholder="-----BEGIN CERTIFICATE-----"
                        value={sslCert}
                        onChange={(e) => setSslCert(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-2">私钥(KEY格式)</label>
                      <textarea
                        className="w-full h-32 p-3 border rounded-lg text-sm font-mono"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                        value={sslKey}
                        onChange={(e) => setSslKey(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">强制HTTPS</span>
                      <Switch checked={forceHttps} onCheckedChange={setForceHttps} />
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => saveConfig("ssl", { cert: sslCert, key: sslKey, forceHttps })}
                      disabled={loading || !sslCert || !sslKey}
                    >
                      {loading ? "保存中..." : "保存证书"}
                    </Button>
                  </TabsContent>
                  <TabsContent value="close" className="space-y-4 pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">关闭SSL</h4>
                      <p className="text-sm text-yellow-700 mb-4">关闭SSL后，网站将只能通过HTTP访问。这可能会影响网站安全性和SEO排名。</p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => saveConfig("ssl", { enabled: false })}
                      disabled={loading}
                    >
                      {loading ? "关闭中..." : "关闭SSL"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* PHP版本 */}
            {activeTab === "php" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">PHP版本</label>
                  <div className="flex gap-2">
                    <Select value={phpVersion} onValueChange={setPhpVersion}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">纯静态</SelectItem>
                        <SelectItem value="7.4">PHP-7.4</SelectItem>
                        <SelectItem value="8.0">PHP-8.0</SelectItem>
                        <SelectItem value="8.1">PHP-8.1</SelectItem>
                        <SelectItem value="8.2">PHP-8.2</SelectItem>
                        <SelectItem value="8.3">PHP-8.3</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={changePhp} disabled={loading}>
                      {loading ? "切换中..." : "切换"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 重定向 */}
            {activeTab === "redirect" && (
              <div className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 block mb-1">来源路径</label>
                    <Input value={newRedirectFrom} onChange={(e) => setNewRedirectFrom(e.target.value)} placeholder="/old-path" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 block mb-1">目标URL</label>
                    <Input value={newRedirectTo} onChange={(e) => setNewRedirectTo(e.target.value)} placeholder="https://example.com/new-path" />
                  </div>
                  <Select value={newRedirectType} onValueChange={setNewRedirectType}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="301">301</SelectItem>
                      <SelectItem value="302">302</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addRedirect}>添加</Button>
                </div>
                <div className="space-y-2">
                  {redirects.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 font-mono text-sm">{r.from}</span>
                      <span className="text-gray-400">→</span>
                      <span className="flex-1 font-mono text-sm truncate">{r.to}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{r.type}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeRedirect(i)}>删除</Button>
                    </div>
                  ))}
                  {redirects.length === 0 && <p className="text-gray-400 text-sm">暂无重定向规则</p>}
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("redirects", redirects)} disabled={loading}>保存</Button>
              </div>
            )}

            {/* 反向代理 */}
            {activeTab === "proxy" && (
              <div className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 block mb-1">代理路径</label>
                    <Input value={newProxyPath} onChange={(e) => setNewProxyPath(e.target.value)} placeholder="/api" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 block mb-1">目标地址</label>
                    <Input value={newProxyTarget} onChange={(e) => setNewProxyTarget(e.target.value)} placeholder="http://127.0.0.1:3000" />
                  </div>
                  <Button onClick={addProxy}>添加</Button>
                </div>
                <div className="space-y-2">
                  {proxies.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="font-mono text-sm">{p.path}</span>
                      <span className="text-gray-400">→</span>
                      <span className="flex-1 font-mono text-sm">{p.target}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeProxy(i)}>删除</Button>
                    </div>
                  ))}
                  {proxies.length === 0 && <p className="text-gray-400 text-sm">暂无反向代理规则</p>}
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("proxies", proxies)} disabled={loading}>保存</Button>
              </div>
            )}

            {/* 防盗链 */}
            {activeTab === "hotlink" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">启用防盗链</span>
                  <Switch checked={hotlinkEnabled} onCheckedChange={setHotlinkEnabled} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">允许的来源域名 (每行一个)</label>
                  <textarea
                    value={hotlinkReferers}
                    onChange={(e) => setHotlinkReferers(e.target.value)}
                    className="w-full h-24 p-3 border rounded-lg text-sm font-mono"
                    placeholder="example.com&#10;*.example.com"
                    disabled={!hotlinkEnabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">留空表示只允许本站访问</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">保护的文件扩展名 (逗号分隔)</label>
                  <Input
                    value={hotlinkExtensions}
                    onChange={(e) => setHotlinkExtensions(e.target.value)}
                    placeholder="jpg,jpeg,png,gif,webp,mp4"
                    disabled={!hotlinkEnabled}
                  />
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => saveConfig("hotlink", { enabled: hotlinkEnabled, referers: hotlinkReferers, extensions: hotlinkExtensions })} disabled={loading}>保存</Button>
              </div>
            )}

            {/* 网站日志 */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <Tabs value={logsTab} onValueChange={(v) => setLogsTab(v as "access" | "error")}>
                  <TabsList>
                    <TabsTrigger value="access" onClick={() => fetchLogs("access")}>响应日志</TabsTrigger>
                    <TabsTrigger value="error" onClick={() => fetchLogs("error")}>错误日志</TabsTrigger>
                  </TabsList>
                  <TabsContent value="access">
                    <div className="h-64 bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-auto">
                      {accessLogs.length > 0 ? accessLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                      )) : "当前没有日志。"}
                    </div>
                  </TabsContent>
                  <TabsContent value="error">
                    <div className="h-64 bg-gray-900 rounded-lg p-4 font-mono text-xs text-red-400 overflow-auto">
                      {errorLogs.length > 0 ? errorLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                      )) : "当前没有日志。"}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => fetchLogs(logsTab)}>刷新</Button>
                  <Button variant="outline">下载日志</Button>
                  <Button variant="destructive">清空日志</Button>
                </div>
              </div>
            )}

            {/* 配置文件 */}
            {activeTab === "config" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Nginx 配置文件</h3>
                    <p className="text-xs text-gray-500 font-mono">{configPath}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchNginxConfig} disabled={configLoading}>
                    刷新
                  </Button>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">
                    <strong>注意：</strong>直接编辑配置文件可能导致网站无法访问。修改前请确保语法正确。
                  </p>
                </div>
                <textarea
                  className="w-full h-80 p-3 border rounded-lg text-sm font-mono bg-gray-900 text-green-400"
                  value={nginxConfig}
                  onChange={(e) => setNginxConfig(e.target.value)}
                  placeholder={configLoading ? "加载中..." : "# Nginx 配置文件内容"}
                  spellCheck={false}
                />
                <div className="flex gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={saveNginxConfig}
                    disabled={configLoading}
                  >
                    {configLoading ? "保存中..." : "保存配置"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("确定要重置配置吗？未保存的修改将丢失。")) {
                        fetchNginxConfig();
                      }
                    }}
                  >
                    重置
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
