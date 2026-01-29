"use client";

import { DataTable, Column } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Download,
  RotateCcw,
  Trash2,
  Database,
  Globe,
  FolderArchive,
} from "lucide-react";

interface Backup {
  id: number;
  name: string;
  type: "site" | "database" | "path";
  targetName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

interface BackupListProps {
  backups: Backup[];
  onBackupSite: () => void;
  onBackupDatabase: () => void;
  onBackupPath: () => void;
  onDelete: (backup: Backup) => void;
  onDownload: (backup: Backup) => void;
  onRestore: (backup: Backup) => void;
}

export function BackupList({
  backups,
  onBackupSite,
  onBackupDatabase,
  onBackupPath,
  onDelete,
  onDownload,
  onRestore,
}: BackupListProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "site":
        return <Globe size={16} className="text-blue-500" />;
      case "database":
        return <Database size={16} className="text-green-500" />;
      default:
        return <FolderArchive size={16} className="text-yellow-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "site":
        return "网站";
      case "database":
        return "数据库";
      default:
        return "目录";
    }
  };

  const columns: Column<Backup>[] = [
    {
      key: "name",
      header: "备份名称",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "type",
      header: "类型",
      render: (value) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(value)}
          <span>{getTypeLabel(value)}</span>
        </div>
      ),
    },
    {
      key: "targetName",
      header: "备份对象",
      render: (value) => (
        <span className="font-mono text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: "fileSize",
      header: "大小",
      sortable: true,
      render: (value) => <span className="text-sm">{formatSize(value)}</span>,
    },
    {
      key: "createdAt",
      header: "备份时间",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleString("zh-CN")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDownload(row)}>
              <Download size={14} className="mr-2" />
              下载
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRestore(row)}>
              <RotateCcw size={14} className="mr-2" />
              恢复
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(row)}
              className="text-red-600"
            >
              <Trash2 size={14} className="mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={backups}
      searchKey="name"
      searchPlaceholder="搜索备份..."
      toolbar={
        <div className="flex items-center gap-2">
          <Button
            onClick={onBackupSite}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus size={16} className="mr-1" />
            备份网站
          </Button>
          <Button onClick={onBackupDatabase} variant="outline">
            <Plus size={16} className="mr-1" />
            备份数据库
          </Button>
          <Button onClick={onBackupPath} variant="outline">
            <Plus size={16} className="mr-1" />
            备份目录
          </Button>
        </div>
      }
    />
  );
}
