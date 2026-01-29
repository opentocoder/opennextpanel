"use client";

import { DataTable, Column } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Trash2, Download, Layers } from "lucide-react";

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: string;
}

interface ImageListProps {
  images: DockerImage[];
  onPull: () => void;
  onRun: (image: DockerImage) => void;
  onDelete: (image: DockerImage) => void;
}

export function ImageList({ images, onPull, onRun, onDelete }: ImageListProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const columns: Column<DockerImage>[] = [
    {
      key: "repository",
      header: "镜像名称",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-purple-500" />
          <span className="font-medium">{row.repository}</span>
        </div>
      ),
    },
    {
      key: "tag",
      header: "标签",
      render: (value) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
          {value}
        </span>
      ),
    },
    {
      key: "id",
      header: "镜像ID",
      render: (value) => (
        <span className="font-mono text-sm text-gray-500">
          {value.substring(0, 12)}
        </span>
      ),
    },
    {
      key: "size",
      header: "大小",
      sortable: true,
      render: (value) => <span className="text-sm">{formatSize(value)}</span>,
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
            <DropdownMenuItem onClick={() => onRun(row)}>
              <Play size={14} className="mr-2" />
              创建容器
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
      data={images}
      searchKey="repository"
      searchPlaceholder="搜索镜像..."
      toolbar={
        <Button onClick={onPull} className="bg-green-600 hover:bg-green-700">
          <Download size={16} className="mr-1" />
          拉取镜像
        </Button>
      }
    />
  );
}
