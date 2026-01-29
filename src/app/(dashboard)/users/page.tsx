"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, Edit, Shield, HardDrive, Globe, RefreshCw } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "user" | "reseller";
  status: "active" | "suspended" | "pending";
  quota: {
    sites: number;
    sitesUsed: number;
    databases: number;
    databasesUsed: number;
    storage: number;
    storageUsed: number;
    bandwidth: number;
    bandwidthUsed: number;
  };
  createdAt: string;
  lastLogin: string;
}

const defaultQuota = {
  sites: 10, sitesUsed: 0,
  databases: 10, databasesUsed: 0,
  storage: 10240, storageUsed: 0,
  bandwidth: 102400, bandwidthUsed: 0,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "", email: "", password: "", role: "user" as User["role"],
    quota: { ...defaultQuota },
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ username: "", email: "", password: "", role: "user", quota: { ...defaultQuota } });
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, email: user.email, password: "", role: user.role, quota: { ...user.quota } });
    setDialogOpen(true);
  };

  const saveUser = async () => {
    try {
      const res = await fetch("/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser ? { ...formData, id: editingUser.id } : formData),
      });
      const data = await res.json();
      if (data.success) { fetchUsers(); setDialogOpen(false); }
      else { alert(data.error || "操作失败"); }
    } catch (error) { console.error("Failed to save user:", error); alert("操作失败"); }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("确定要删除此用户吗？")) return;
    try {
      const res = await fetch("/api/users?id=" + id, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { setUsers(prev => prev.filter(u => u.id !== id)); }
    } catch (error) { console.error("Failed to delete user:", error); }
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u)); }
    } catch (error) { console.error("Failed to toggle status:", error); }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: "管理员", user: "用户", reseller: "代理商" };
    return labels[role] || role;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      suspended: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold">用户管理</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers}><RefreshCw className="w-4 h-4 mr-2" />刷新</Button>
          <Button onClick={openCreateDialog}><UserPlus className="w-4 h-4 mr-2" />添加用户</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{users.filter(u => u.status === "active").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">网站总数</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{users.reduce((sum, u) => sum + (u.quota?.sitesUsed || 0), 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">存储使用</CardTitle>
            <HardDrive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-600">{(users.reduce((sum, u) => sum + (u.quota?.storageUsed || 0), 0) / 1024).toFixed(1)} GB</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>用户列表</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>网站配额</TableHead>
                <TableHead>存储配额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${user.role === "admin" ? "bg-purple-100 text-purple-700" : user.role === "reseller" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </TableCell>
                  <TableCell>{user.quota?.sitesUsed || 0} / {user.quota?.sites || 0}</TableCell>
                  <TableCell>{((user.quota?.storageUsed || 0) / 1024).toFixed(1)} / {((user.quota?.storage || 0) / 1024).toFixed(0)} GB</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}>
                      {user.status === "active" ? "正常" : user.status === "suspended" ? "已停用" : "待激活"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{user.createdAt?.split("T")[0]}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}><Edit className="w-4 h-4" /></Button>
                      <Switch checked={user.status === "active"} onCheckedChange={() => toggleStatus(user)} />
                      {user.role !== "admin" && (<Button variant="ghost" size="sm" onClick={() => deleteUser(user.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">暂无用户</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingUser ? "编辑用户" : "添加用户"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">用户名</label><Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">邮箱</label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">{editingUser ? "新密码 (留空不修改)" : "密码"}</label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">角色</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })} className="mt-1 w-full border rounded-md p-2"><option value="user">用户</option><option value="reseller">代理商</option><option value="admin">管理员</option></select></div>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">配额设置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm">网站数量</label><Input type="number" value={formData.quota.sites} onChange={(e) => setFormData({ ...formData, quota: { ...formData.quota, sites: parseInt(e.target.value) || 0 } })} className="mt-1" /></div>
                <div><label className="text-sm">数据库数量</label><Input type="number" value={formData.quota.databases} onChange={(e) => setFormData({ ...formData, quota: { ...formData.quota, databases: parseInt(e.target.value) || 0 } })} className="mt-1" /></div>
                <div><label className="text-sm">存储空间 (MB)</label><Input type="number" value={formData.quota.storage} onChange={(e) => setFormData({ ...formData, quota: { ...formData.quota, storage: parseInt(e.target.value) || 0 } })} className="mt-1" /></div>
                <div><label className="text-sm">流量限制 (MB)</label><Input type="number" value={formData.quota.bandwidth} onChange={(e) => setFormData({ ...formData, quota: { ...formData.quota, bandwidth: parseInt(e.target.value) || 0 } })} className="mt-1" /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={saveUser}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
