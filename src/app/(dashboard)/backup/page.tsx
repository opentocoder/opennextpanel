"use client";

import { useState, useEffect } from "react";
import { BackupList } from "@/components/backup";
import { ConfirmDialog } from "@/components/common";

interface Backup {
  id: number;
  name: string;
  type: "site" | "database" | "path";
  targetName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error("Failed to fetch backups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupSite = async () => {
    // TODO: Show site selection dialog
    alert("请选择要备份的网站");
  };

  const handleBackupDatabase = async () => {
    // TODO: Show database selection dialog
    alert("请选择要备份的数据库");
  };

  const handleBackupPath = async () => {
    // TODO: Show path selection dialog
    alert("请选择要备份的目录");
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    try {
      const res = await fetch(`/api/backup?id=${selectedBackup.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchBackups();
      }
    } catch (error) {
      console.error("Failed to delete backup:", error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
    }
  };

  const handleDownload = (backup: Backup) => {
    // TODO: Implement download
    alert(`下载备份: ${backup.name}`);
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    // TODO: Implement restore
    alert(`恢复备份: ${selectedBackup.name}`);
    setRestoreDialogOpen(false);
    setSelectedBackup(null);
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
      <h1 className="text-2xl font-bold mb-6">备份管理</h1>

      <BackupList
        backups={backups}
        onBackupSite={handleBackupSite}
        onBackupDatabase={handleBackupDatabase}
        onBackupPath={handleBackupPath}
        onDelete={(backup) => {
          setSelectedBackup(backup);
          setDeleteDialogOpen(true);
        }}
        onDownload={handleDownload}
        onRestore={(backup) => {
          setSelectedBackup(backup);
          setRestoreDialogOpen(true);
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除备份"
        description={`确定要删除备份 "${selectedBackup?.name}" 吗？此操作不可恢复。`}
        onConfirm={handleDelete}
        confirmText="删除"
        variant="destructive"
      />

      <ConfirmDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title="恢复备份"
        description={`确定要恢复备份 "${selectedBackup?.name}" 吗？这将覆盖当前数据。`}
        onConfirm={handleRestore}
        confirmText="恢复"
      />
    </div>
  );
}
