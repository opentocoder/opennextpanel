"use client";

import { DataTable, Column } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Key, Trash2, FolderOpen } from "lucide-react";

interface FtpAccount {
  id: number;
  username: string;
  password: string;
  path: string;
  status: "active" | "disabled";
  createdAt: string;
}

interface FtpListProps {
  accounts: FtpAccount[];
  onAdd: () => void;
  onDelete: (account: FtpAccount) => void;
  onChangePassword: (account: FtpAccount) => void;
  onToggleStatus: (account: FtpAccount) => void;
}

export function FtpList({
  accounts,
  onAdd,
  onDelete,
  onChangePassword,
  onToggleStatus,
}: FtpListProps) {
  const columns: Column<FtpAccount>[] = [
    {
      key: "username",
      header: "用户名",
      sortable: true,
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    {
      key: "path",
      header: "根目录",
      render: (value) => (
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-yellow-500" />
          <span className="font-mono text-sm text-gray-600">{value}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value === "active"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {value === "active" ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "创建时间",
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
            <DropdownMenuItem onClick={() => onChangePassword(row)}>
              <Key size={14} className="mr-2" />
              修改密码
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(row)}>
              {row.status === "active" ? "禁用" : "启用"}
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
      data={accounts}
      searchKey="username"
      searchPlaceholder="搜索FTP用户名..."
      toolbar={
        <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700">
          <Plus size={16} className="mr-1" />
          添加FTP
        </Button>
      }
    />
  );
}
