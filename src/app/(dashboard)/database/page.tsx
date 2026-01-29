"use client";

import { useState, useEffect, useRef } from "react";
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
import { Loader2, Upload, Download, Database } from "lucide-react";

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
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backuping, setBackuping] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedDb(db);
    setBackupDialogOpen(true);
  };

  const handleImport = async (db: DatabaseItem) => {
    setSelectedDb(db);
    // 获取该数据库的备份列表
    try {
      const res = await fetch(`/api/database/backup?dbId=${db.id}`);
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (e) {
      setBackups([]);
    }
    setSelectedBackupId("");
    setImportDialogOpen(true);
  };

  const handleConfirmBackup = async () => {
    if (!selectedDb) return;
    setBackuping(true);
    try {
      const res = await fetch("/api/database/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbId: selectedDb.id,
          dbName: selectedDb.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`备份成功！文件大小: ${formatSize(data.size)}`);
        fetchDatabases();
      } else {
        alert(`备份失败: ${data.error}`);
      }
    } catch (error: any) {
      alert(`备份失败: ${error.message}`);
    } finally {
      setBackuping(false);
      setBackupDialogOpen(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedDb || !selectedBackupId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/database/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName: selectedDb.name,
          backupId: selectedBackupId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("数据库恢复成功！");
        fetchDatabases();
      } else {
        alert(`恢复失败: ${data.error}`);
      }
    } catch (error: any) {
      alert(`恢复失败: ${error.message}`);
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              备份数据库
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm">
                数据库: <span className="font-semibold">{selectedDb?.name}</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                备份文件将保存到 /www/backup/database/ 目录
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBackupDialogOpen(false)}
              disabled={backuping}
            >
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirmBackup}
              disabled={backuping}
            >
              {backuping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  备份中...
                </>
              ) : (
                "开始备份"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import/Restore Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              导入/恢复数据库
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm">
                目标数据库: <span className="font-semibold">{selectedDb?.name}</span>
              </p>
              <p className="text-xs text-red-500 mt-2">
                ⚠️ 导入会覆盖现有数据，请谨慎操作
              </p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">选择备份文件</label>
              {backups.length > 0 ? (
                <Select value={selectedBackupId} onValueChange={setSelectedBackupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个备份..." />
                  </SelectTrigger>
                  <SelectContent>
                    {backups.map((backup: any) => (
                      <SelectItem key={backup.id} value={String(backup.id)}>
                        {backup.name} ({formatSize(backup.file_size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-500 p-3 bg-gray-100 rounded">
                  暂无备份文件，请先创建备份
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
            >
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirmImport}
              disabled={importing || !selectedBackupId}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                "开始导入"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
