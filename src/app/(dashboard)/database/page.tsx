"use client";

import { useState, useEffect } from "react";
import { DatabaseList, AddDatabaseDialog } from "@/components/database";
import { ConfirmDialog } from "@/components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatabaseItem {
  id: number;
  name: string;
  username: string;
  password: string;
  dbType: string;
  host: string;
  port: number;
  charset: string;
  accessPermission: string;
  backupCount: number;
  size: number;
  createdAt: string;
}

export default function DatabasePage() {
  const [databases, setDatabases] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<DatabaseItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPermission, setNewPermission] = useState("localhost");

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      const res = await fetch("/api/database");
      const data = await res.json();
      setDatabases(data.databases || []);
    } catch (error) {
      console.error("Failed to fetch databases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchDatabases();
        setAddDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to add database:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedDb) return;
    try {
      const res = await fetch(`/api/database?id=${selectedDb.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDatabases();
      }
    } catch (error) {
      console.error("Failed to delete database:", error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedDb(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedDb || !newPassword) return;
    try {
      const res = await fetch("/api/database", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDb.id, password: newPassword }),
      });
      if (res.ok) {
        fetchDatabases();
        setPasswordDialogOpen(false);
        setNewPassword("");
      }
    } catch (error) {
      console.error("Failed to change password:", error);
    }
  };

  const handleChangePermission = async () => {
    if (!selectedDb) return;
    try {
      const res = await fetch("/api/database", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDb.id,
          accessPermission: newPermission,
        }),
      });
      if (res.ok) {
        fetchDatabases();
        setPermissionDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to change permission:", error);
    }
  };

  const handleBackup = async (db: DatabaseItem) => {
    // TODO: Implement backup functionality
    alert(`备份数据库: ${db.name}`);
  };

  const handleImport = async (db: DatabaseItem) => {
    // TODO: Implement import functionality
    alert(`导入数据库: ${db.name}`);
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
      <h1 className="text-2xl font-bold mb-6">数据库管理</h1>

      <DatabaseList
        databases={databases}
        onAdd={() => setAddDialogOpen(true)}
        onDelete={(db) => {
          setSelectedDb(db);
          setDeleteDialogOpen(true);
        }}
        onChangePassword={(db) => {
          setSelectedDb(db);
          setPasswordDialogOpen(true);
        }}
        onChangePermission={(db) => {
          setSelectedDb(db);
          setNewPermission(db.accessPermission);
          setPermissionDialogOpen(true);
        }}
        onBackup={handleBackup}
        onImport={handleImport}
      />

      <AddDatabaseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAdd}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除数据库"
        description={`确定要删除数据库 "${selectedDb?.name}" 吗？此操作不可恢复。`}
        onConfirm={handleDelete}
        confirmText="删除"
        variant="destructive"
      />

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码 - {selectedDb?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">新密码</label>
              <Input
                type="password"
                placeholder="请输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleChangePassword}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Permission Dialog */}
      <Dialog
        open={permissionDialogOpen}
        onOpenChange={setPermissionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>权限设置 - {selectedDb?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                访问权限
              </label>
              <Select value={newPermission} onValueChange={setNewPermission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="localhost">本地服务器</SelectItem>
                  <SelectItem value="%">所有人</SelectItem>
                  <SelectItem value="192.168.%">内网 (192.168.%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermissionDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleChangePermission}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
