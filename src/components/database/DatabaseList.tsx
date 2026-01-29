"use client";

import { useState } from "react";
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
  Key,
  UserPlus,
  Trash2,
  Database,
  Download,
  Upload,
} from "lucide-react";

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

interface DatabaseListProps {
  databases: DatabaseItem[];
  onAdd: () => void;
  onDelete: (db: DatabaseItem) => void;
  onChangePassword: (db: DatabaseItem) => void;
  onChangePermission: (db: DatabaseItem) => void;
  onBackup: (db: DatabaseItem) => void;
  onImport: (db: DatabaseItem) => void;
}

export function DatabaseList({
  databases,
  onAdd,
  onDelete,
  onChangePassword,
  onChangePermission,
  onBackup,
  onImport,
}: DatabaseListProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const columns: Column<DatabaseItem>[] = [
    {
      key: "name",
      header: "数据库名",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-500" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "username",
      header: "用户名",
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: "password",
      header: "密码",
      render: (value) => (
        <span className="font-mono text-sm text-gray-400">{"*".repeat(8)}</span>
      ),
    },
    {
      key: "accessPermission",
      header: "访问权限",
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === "localhost"
            ? "bg-green-100 text-green-700"
            : value === "%"
            ? "bg-red-100 text-red-700"
            : "bg-yellow-100 text-yellow-700"
        }`}>
          {value === "%" ? "所有人" : value === "localhost" ? "本地" : value}
        </span>
      ),
    },
    {
      key: "backupCount",
      header: "备份",
      render: (value) =>
        value > 0 ? (
          <span className="text-blue-600 cursor-pointer hover:underline">
            有备份({value})
          </span>
        ) : (
          <span className="text-gray-400">无备份</span>
        ),
    },
    {
      key: "size",
      header: "大小",
      sortable: true,
      render: (value) => <span className="text-sm">{formatSize(value)}</span>,
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
            <DropdownMenuItem onClick={() => onChangePassword(row)}>
              <Key size={14} className="mr-2" />
              修改密码
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangePermission(row)}>
              <UserPlus size={14} className="mr-2" />
              权限设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBackup(row)}>
              <Download size={14} className="mr-2" />
              备份
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onImport(row)}>
              <Upload size={14} className="mr-2" />
              导入
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
      data={databases}
      searchKey="name"
      searchPlaceholder="搜索数据库名..."
      toolbar={
        <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700">
          <Plus size={16} className="mr-1" />
          添加数据库
        </Button>
      }
    />
  );
}
