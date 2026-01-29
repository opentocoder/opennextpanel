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
  MoreVertical,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Terminal,
  FileText,
  Container,
} from "lucide-react";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "exited";
  ports: string;
  created: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface ContainerListProps {
  containers: DockerContainer[];
  onStart: (container: DockerContainer) => void;
  onStop: (container: DockerContainer) => void;
  onRestart: (container: DockerContainer) => void;
  onDelete: (container: DockerContainer) => void;
  onLogs: (container: DockerContainer) => void;
  onTerminal: (container: DockerContainer) => void;
}

export function ContainerList({
  containers,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onLogs,
  onTerminal,
}: ContainerListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-700";
      case "stopped":
        return "bg-gray-100 text-gray-700";
      case "exited":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "running":
        return "运行中";
      case "stopped":
        return "已停止";
      case "exited":
        return "已退出";
      default:
        return status;
    }
  };

  const columns: Column<DockerContainer>[] = [
    {
      key: "name",
      header: "容器名称",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Container size={16} className="text-blue-500" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "image",
      header: "镜像",
      render: (value) => (
        <span className="font-mono text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(value)}`}>
          {getStatusLabel(value)}
        </span>
      ),
    },
    {
      key: "ports",
      header: "端口映射",
      render: (value) => (
        <span className="font-mono text-sm">{value || "-"}</span>
      ),
    },
    {
      key: "cpuUsage",
      header: "CPU",
      render: (value, row) =>
        row.status === "running" ? (
          <span className="text-sm">{value.toFixed(1)}%</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "memoryUsage",
      header: "内存",
      render: (value, row) =>
        row.status === "running" ? (
          <span className="text-sm">{value.toFixed(0)} MB</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "created",
      header: "创建时间",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">{value}</span>
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
            {row.status === "running" ? (
              <DropdownMenuItem onClick={() => onStop(row)}>
                <Square size={14} className="mr-2" />
                停止
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onStart(row)}>
                <Play size={14} className="mr-2" />
                启动
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRestart(row)}>
              <RotateCcw size={14} className="mr-2" />
              重启
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTerminal(row)}>
              <Terminal size={14} className="mr-2" />
              终端
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLogs(row)}>
              <FileText size={14} className="mr-2" />
              日志
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
      data={containers}
      searchKey="name"
      searchPlaceholder="搜索容器..."
    />
  );
}
