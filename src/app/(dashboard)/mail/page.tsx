"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Plus, Trash2, Edit, RefreshCw, Send, Inbox, Users } from "lucide-react";

interface MailDomain {
  id: number;
  domain: string;
  accounts: number;
  status: "active" | "inactive";
  createdAt: string;
}

interface MailAccount {
  id: number;
  email: string;
  domain: string;
  quota: number;
  quotaUsed: number;
  status: "active" | "inactive";
}

export default function MailPage() {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"domain" | "account">("domain");
  const [formData, setFormData] = useState({ domain: "", email: "", password: "", quota: 1024 });
  const [stats, setStats] = useState({ totalDomains: 0, totalAccounts: 0, totalSent: 0, totalReceived: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/mail");
        const data = await res.json();
        if (data.domains) setDomains(data.domains);
        if (data.accounts) setAccounts(data.accounts);
        if (data.stats) setStats(data.stats);
      } catch (error) {
        console.error("Failed to fetch mail data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openDomainDialog = () => {
    setDialogType("domain");
    setFormData({ domain: "", email: "", password: "", quota: 1024 });
    setDialogOpen(true);
  };

  const openAccountDialog = () => {
    setDialogType("account");
    setFormData({ domain: domains[0]?.domain || "", email: "", password: "", quota: 1024 });
    setDialogOpen(true);
  };

  const saveItem = async () => {
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: dialogType === "domain" ? "add_domain" : "add_account", ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        window.location.reload();
      } else {
        alert(data.error || "操作失败");
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const deleteItem = async (type: "domain" | "account", id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type === "domain" ? "delete_domain" : "delete_account", id }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold">邮局管理</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openDomainDialog}><Plus className="w-4 h-4 mr-2" />添加域名</Button>
          <Button onClick={openAccountDialog}><Plus className="w-4 h-4 mr-2" />添加邮箱</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邮件域名</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalDomains}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邮箱账户</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalAccounts}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日发送</CardTitle>
            <Send className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalSent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日接收</CardTitle>
            <Inbox className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalReceived}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>邮件域名</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>域名</TableHead>
                  <TableHead>邮箱数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.domain}</TableCell>
                    <TableCell>{d.accounts}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${d.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {d.status === "active" ? "正常" : "停用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem("domain", d.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {domains.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">暂无邮件域名</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>邮箱账户</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>配额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.email}</TableCell>
                    <TableCell>{a.quotaUsed} / {a.quota} MB</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${a.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {a.status === "active" ? "正常" : "停用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem("account", a.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {accounts.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">暂无邮箱账户</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogType === "domain" ? "添加邮件域名" : "添加邮箱账户"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {dialogType === "domain" ? (
              <div>
                <label className="text-sm font-medium">域名</label>
                <Input placeholder="example.com" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="mt-1" />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">邮箱地址</label>
                  <div className="flex gap-2 mt-1">
                    <Input placeholder="user" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    <span className="flex items-center">@</span>
                    <select value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="border rounded-md p-2">
                      {domains.map((d) => (<option key={d.id} value={d.domain}>{d.domain}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">密码</label>
                  <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">配额 (MB)</label>
                  <Input type="number" value={formData.quota} onChange={(e) => setFormData({ ...formData, quota: parseInt(e.target.value) || 1024 })} className="mt-1" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={saveItem}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
