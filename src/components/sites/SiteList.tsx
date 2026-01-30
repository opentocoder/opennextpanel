"use client";

import { useState } from "react";
import { DataTable, Column } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Settings,
  Trash2,
  Shield,
  Play,
  Square,
  MoreVertical,
} from "lucide-react";

interface Site {
  id: number;
  name: string;
  domain: string;
  status: "running" | "stopped";
  backupCount: number;
  rootPath: string;
  proxyUrl?: string | null;
  diskUsage: number;
  diskLimit: number;
  expireDate: string;
  remark: string;
  phpVersion: string;
  sslStatus: "deployed" | "not_deployed" | "expired";
  sslExpireDays?: number;
  createdAt?: string;
}

interface SiteListProps {
  sites: Site[];
  onAddSite: () => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (site: Site) => void;
}

export function SiteList({ sites, onAddSite, onEditSite, onDeleteSite }: SiteListProps) {
  const [projectType, setProjectType] = useState("php");

  const columns: Column<Site>[] = [
    {
      key: "name",
      header: "网站名",
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">{row.domain}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (value) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            value === "running"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {value === "running" ? <Play size={12} /> : <Square size={12} />}
          {value === "running" ? "运行中" : "已停止"}
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
      key: "rootPath",
      header: "路径/代理",
      render: (value, row) => (
        row.phpVersion === "proxy" && row.proxyUrl ? (
          <div>
            <span className="text-xs text-purple-600 font-mono">→ {row.proxyUrl}</span>
            <span className="text-xs text-gray-400 ml-1">(反代)</span>
          </div>
        ) : (
          <span className="text-xs text-gray-600 font-mono">{value}</span>
        )
      ),
    },
    {
      key: "diskUsage",
      header: "容量",
      render: (_, row) => {
        const percent = row.diskLimit > 0 ? (row.diskUsage / row.diskLimit) * 100 : 0;
        return (
          <div className="w-24">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${percent > 80 ? "bg-red-500" : "bg-green-500"}`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(row.diskUsage / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>
        );
      },
    },
    {
      key: "expireDate",
      header: "到期时间",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value === "永久" ? "永久" : value}
        </span>
      ),
    },
    { key: "remark", header: "备注" },
    {
      key: "phpVersion",
      header: "PHP",
      render: (value) => (
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
          {value || "静态"}
        </span>
      ),
    },
    {
      key: "sslStatus",
      header: "SSL证书",
      render: (_, row) => {
        if (row.sslStatus === "deployed") {
          return (
            <span className="text-green-600 text-xs">
              剩余{row.sslExpireDays}天
            </span>
          );
        }
        return <span className="text-gray-400 text-xs">未部署</span>;
      },
    },
    {
      key: "actions",
      header: "操作",
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="text-blue-600 hover:text-blue-800 text-xs">
            防火墙
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEditSite(row);
            }}
          >
            设置
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            className="text-red-600 hover:text-red-800 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSite(row);
            }}
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 项目类型标签 */}
      <Tabs value={projectType} onValueChange={setProjectType}>
        <TabsList>
          <TabsTrigger value="php">PHP项目</TabsTrigger>
          <TabsTrigger value="java">Java项目</TabsTrigger>
          <TabsTrigger value="node">Node项目</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 表格 */}
      <DataTable
        columns={columns}
        data={sites}
        searchKey="name"
        searchPlaceholder="请输入域名或备注"
        toolbar={
          <div className="flex items-center gap-2">
            <Button onClick={onAddSite} className="bg-green-600 hover:bg-green-700">
              <Plus size={16} className="mr-1" />
              添加站点
            </Button>
            <Button variant="outline" size="sm">修改默认页</Button>
            <Button variant="outline" size="sm">默认站点</Button>
            <Button variant="outline" size="sm">PHP命令行版本</Button>
          </div>
        }
      />
    </div>
  );
}
