"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Globe,
  Clock,
  AlertTriangle,
  Ban,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// 类型定义
interface WAFStats {
  enabled: boolean;
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  todayBlocked: number;
  ccAttacks: number;
  sqlInjections: number;
  xssAttacks: number;
  ruleCount: number;
  lastUpdate: string;
}

interface WAFRule {
  id: number;
  name: string;
  type: "cc" | "sql" | "xss" | "path" | "ua" | "ip" | "custom";
  pattern: string;
  action: "block" | "log" | "challenge";
  enabled: boolean;
  hits: number;
  createdAt: string;
}

interface AttackLog {
  id: number;
  time: string;
  ip: string;
  method: string;
  path: string;
  type: string;
  action: string;
  ruleId: number;
  country: string;
}

interface CCConfig {
  enabled: boolean;
  requestLimit: number;
  timeWindow: number;
  blockDuration: number;
  whitelistIps: string[];
}

export default function WAFPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WAFStats>({
    enabled: true,
    totalRequests: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    todayBlocked: 0,
    ccAttacks: 0,
    sqlInjections: 0,
    xssAttacks: 0,
    ruleCount: 0,
    lastUpdate: "",
  });
  const [rules, setRules] = useState<WAFRule[]>([]);
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [ccConfig, setCCConfig] = useState<CCConfig>({
    enabled: true,
    requestLimit: 60,
    timeWindow: 60,
    blockDuration: 3600,
    whitelistIps: [],
  });
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WAFRule | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    type: "custom" as WAFRule["type"],
    pattern: "",
    action: "block" as WAFRule["action"],
    enabled: true,
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, rulesRes, logsRes, ccRes] = await Promise.all([
        fetch("/api/waf?action=stats"),
        fetch("/api/waf?action=rules"),
        fetch("/api/waf?action=logs"),
        fetch("/api/waf?action=cc_config"),
      ]);

      const statsData = await statsRes.json();
      const rulesData = await rulesRes.json();
      const logsData = await logsRes.json();
      const ccData = await ccRes.json();

      if (statsData.stats) setStats(statsData.stats);
      if (rulesData.rules) setRules(rulesData.rules);
      if (logsData.logs) setLogs(logsData.logs);
      if (ccData.config) setCCConfig(ccData.config);
    } catch (error) {
      console.error("Failed to fetch WAF data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleWAF = async () => {
    try {
      const res = await fetch("/api/waf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", enabled: !stats.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setStats((prev) => ({ ...prev, enabled: !prev.enabled }));
      }
    } catch (error) {
      console.error("Failed to toggle WAF:", error);
    }
  };

  const saveRule = async () => {
    try {
      const ruleData = editingRule || newRule;
      const res = await fetch("/api/waf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingRule ? "update_rule" : "add_rule",
          rule: ruleData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setRuleDialogOpen(false);
        setEditingRule(null);
        setNewRule({
          name: "",
          type: "custom",
          pattern: "",
          action: "block",
          enabled: true,
        });
      }
    } catch (error) {
      console.error("Failed to save rule:", error);
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm("确定要删除此规则吗？")) return;
    try {
      const res = await fetch("/api/waf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_rule", ruleId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  const toggleRule = async (rule: WAFRule) => {
    try {
      const res = await fetch("/api/waf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_rule",
          rule: { ...rule, enabled: !rule.enabled },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
        );
      }
    } catch (error) {
      console.error("Failed to toggle rule:", error);
    }
  };

  const saveCCConfig = async () => {
    try {
      const res = await fetch("/api/waf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_cc_config", config: ccConfig }),
      });
      const data = await res.json();
      if (data.success) {
        alert("CC防护配置已保存");
      }
    } catch (error) {
      console.error("Failed to save CC config:", error);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cc: "CC攻击",
      sql: "SQL注入",
      xss: "XSS攻击",
      path: "路径遍历",
      ua: "恶意UA",
      ip: "IP黑名单",
      custom: "自定义",
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      block: "拦截",
      log: "记录",
      challenge: "验证",
    };
    return labels[action] || action;
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-orange-500" />
          <h1 className="text-2xl font-bold">WAF 防火墙</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {stats.enabled ? "防护已开启" : "防护已关闭"}
          </span>
          <Switch checked={stats.enabled} onCheckedChange={toggleWAF} />
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="rules">规则管理</TabsTrigger>
          <TabsTrigger value="cc">CC防护</TabsTrigger>
          <TabsTrigger value="logs">攻击日志</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日拦截</CardTitle>
                <Ban className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.todayBlocked}</div>
                <p className="text-xs text-gray-500">较昨日 +15%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CC攻击</CardTitle>
                <Activity className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.ccAttacks}</div>
                <p className="text-xs text-gray-500">今日检测</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SQL注入</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.sqlInjections}</div>
                <p className="text-xs text-gray-500">今日检测</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">XSS攻击</CardTitle>
                <ShieldAlert className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.xssAttacks}</div>
                <p className="text-xs text-gray-500">今日检测</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  防护状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">WAF状态</span>
                    <span className={`font-medium ${stats.enabled ? "text-green-600" : "text-red-600"}`}>
                      {stats.enabled ? "运行中" : "已停止"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">规则数量</span>
                    <span className="font-medium">{stats.ruleCount} 条</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">总请求数</span>
                    <span className="font-medium">{stats.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">拦截率</span>
                    <span className="font-medium text-green-600">
                      {stats.totalRequests > 0
                        ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">最后更新</span>
                    <span className="text-sm text-gray-500">{stats.lastUpdate || "-"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  最近攻击
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">{log.ip}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-600 truncate max-w-[150px]">{log.path}</span>
                      </div>
                      <span className="text-xs text-gray-400">{log.time}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center text-gray-400 py-4">暂无攻击记录</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 规则管理 */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>防护规则</CardTitle>
              <Button
                onClick={() => {
                  setEditingRule(null);
                  setRuleDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加规则
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>匹配规则</TableHead>
                    <TableHead>动作</TableHead>
                    <TableHead>命中次数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          {getTypeLabel(rule.type)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {rule.pattern}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            rule.action === "block"
                              ? "bg-red-100 text-red-700"
                              : rule.action === "challenge"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {getActionLabel(rule.action)}
                        </span>
                      </TableCell>
                      <TableCell>{rule.hits.toLocaleString()}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRule(rule);
                              setRuleDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        暂无规则，点击上方按钮添加
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CC防护 */}
        <TabsContent value="cc">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                CC防护配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用CC防护</p>
                  <p className="text-sm text-gray-500">检测并阻止CC攻击</p>
                </div>
                <Switch
                  checked={ccConfig.enabled}
                  onCheckedChange={(checked) =>
                    setCCConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">请求限制 (次)</label>
                  <Input
                    type="number"
                    value={ccConfig.requestLimit}
                    onChange={(e) =>
                      setCCConfig((prev) => ({
                        ...prev,
                        requestLimit: parseInt(e.target.value) || 60,
                      }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">单IP在时间窗口内的最大请求数</p>
                </div>

                <div>
                  <label className="text-sm font-medium">时间窗口 (秒)</label>
                  <Input
                    type="number"
                    value={ccConfig.timeWindow}
                    onChange={(e) =>
                      setCCConfig((prev) => ({
                        ...prev,
                        timeWindow: parseInt(e.target.value) || 60,
                      }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">统计请求的时间范围</p>
                </div>

                <div>
                  <label className="text-sm font-medium">封锁时长 (秒)</label>
                  <Input
                    type="number"
                    value={ccConfig.blockDuration}
                    onChange={(e) =>
                      setCCConfig((prev) => ({
                        ...prev,
                        blockDuration: parseInt(e.target.value) || 3600,
                      }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">触发限制后的封锁时间</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">IP白名单</label>
                <Input
                  placeholder="输入IP地址，用逗号分隔"
                  value={ccConfig.whitelistIps.join(", ")}
                  onChange={(e) =>
                    setCCConfig((prev) => ({
                      ...prev,
                      whitelistIps: e.target.value
                        .split(",")
                        .map((ip) => ip.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  白名单中的IP不受CC防护限制
                </p>
              </div>

              <Button onClick={saveCCConfig}>保存配置</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 攻击日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>攻击日志</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="搜索IP或路径..." className="w-64" />
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>IP地址</TableHead>
                    <TableHead>请求方法</TableHead>
                    <TableHead>请求路径</TableHead>
                    <TableHead>攻击类型</TableHead>
                    <TableHead>处理动作</TableHead>
                    <TableHead>来源国家</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{log.time}</TableCell>
                      <TableCell className="font-mono text-red-600">{log.ip}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            log.method === "POST"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.method}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {log.path}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                          {getTypeLabel(log.type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            log.action === "blocked"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {log.action === "blocked" ? "已拦截" : "已记录"}
                        </span>
                      </TableCell>
                      <TableCell>{log.country || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        暂无攻击日志
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 规则编辑对话框 */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "编辑规则" : "添加规则"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">规则名称</label>
              <Input
                value={editingRule?.name || newRule.name}
                onChange={(e) =>
                  editingRule
                    ? setEditingRule({ ...editingRule, name: e.target.value })
                    : setNewRule({ ...newRule, name: e.target.value })
                }
                placeholder="输入规则名称"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">规则类型</label>
              <select
                value={editingRule?.type || newRule.type}
                onChange={(e) =>
                  editingRule
                    ? setEditingRule({
                        ...editingRule,
                        type: e.target.value as WAFRule["type"],
                      })
                    : setNewRule({
                        ...newRule,
                        type: e.target.value as WAFRule["type"],
                      })
                }
                className="mt-1 w-full border rounded-md p-2"
              >
                <option value="custom">自定义</option>
                <option value="sql">SQL注入</option>
                <option value="xss">XSS攻击</option>
                <option value="cc">CC攻击</option>
                <option value="path">路径遍历</option>
                <option value="ua">恶意UA</option>
                <option value="ip">IP黑名单</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">匹配规则 (正则表达式)</label>
              <Input
                value={editingRule?.pattern || newRule.pattern}
                onChange={(e) =>
                  editingRule
                    ? setEditingRule({ ...editingRule, pattern: e.target.value })
                    : setNewRule({ ...newRule, pattern: e.target.value })
                }
                placeholder="例如: (?i)(select|union|insert)"
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">处理动作</label>
              <select
                value={editingRule?.action || newRule.action}
                onChange={(e) =>
                  editingRule
                    ? setEditingRule({
                        ...editingRule,
                        action: e.target.value as WAFRule["action"],
                      })
                    : setNewRule({
                        ...newRule,
                        action: e.target.value as WAFRule["action"],
                      })
                }
                className="mt-1 w-full border rounded-md p-2"
              >
                <option value="block">拦截</option>
                <option value="log">仅记录</option>
                <option value="challenge">验证码验证</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveRule}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
