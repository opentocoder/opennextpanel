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
  Play,
  Pause,
  Edit,
  Trash2,
  Clock,
  FileText,
} from "lucide-react";

interface CronTask {
  id: number;
  name: string;
  type: string;
  cronExpression: string;
  script: string;
  status: "active" | "disabled";
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
}

interface CronListProps {
  tasks: CronTask[];
  onAdd: () => void;
  onEdit: (task: CronTask) => void;
  onDelete: (task: CronTask) => void;
  onToggleStatus: (task: CronTask) => void;
  onRunNow: (task: CronTask) => void;
  onViewLog: (task: CronTask) => void;
}

export function CronList({
  tasks,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
  onRunNow,
  onViewLog,
}: CronListProps) {
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      shell: "Shell脚本",
      backup_site: "备份网站",
      backup_db: "备份数据库",
      backup_path: "备份目录",
      curl: "访问URL",
      sync: "同步任务",
    };
    return types[type] || type;
  };

  const columns: Column<CronTask>[] = [
    {
      key: "name",
      header: "任务名称",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "type",
      header: "类型",
      render: (value) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
          {getTypeLabel(value)}
        </span>
      ),
    },
    {
      key: "cronExpression",
      header: "执行周期",
      render: (value) => (
        <div className="flex items-center gap-1">
          <Clock size={14} className="text-gray-400" />
          <span className="font-mono text-sm">{value}</span>
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
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {value === "active" ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "lastRun",
      header: "上次执行",
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleString("zh-CN") : "-"}
        </span>
      ),
    },
    {
      key: "nextRun",
      header: "下次执行",
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleString("zh-CN") : "-"}
        </span>
      ),
    },
    {
      key: "runCount",
      header: "执行次数",
      sortable: true,
      render: (value) => <span className="text-sm">{value}</span>,
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
            <DropdownMenuItem onClick={() => onRunNow(row)}>
              <Play size={14} className="mr-2" />
              立即执行
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(row)}>
              {row.status === "active" ? (
                <>
                  <Pause size={14} className="mr-2" />
                  禁用
                </>
              ) : (
                <>
                  <Play size={14} className="mr-2" />
                  启用
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Edit size={14} className="mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewLog(row)}>
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
      data={tasks}
      searchKey="name"
      searchPlaceholder="搜索任务名称..."
      toolbar={
        <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700">
          <Plus size={16} className="mr-1" />
          添加任务
        </Button>
      }
    />
  );
}
