"use client";

import { useState, useEffect } from "react";
import { CronList, CronEditor } from "@/components/cron";
import { ConfirmDialog } from "@/components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

export default function CronPage() {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CronTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/cron");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch cron tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const method = data.id ? "PUT" : "POST";
      const res = await fetch("/api/cron", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchTasks();
        setEditorOpen(false);
        setSelectedTask(null);
      }
    } catch (error) {
      console.error("Failed to save cron task:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`/api/cron?id=${selectedTask.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to delete cron task:", error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTask(null);
    }
  };

  const handleToggleStatus = async (task: CronTask) => {
    try {
      const newStatus = task.status === "active" ? "disabled" : "active";
      const res = await fetch("/api/cron", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const handleRunNow = async (task: CronTask) => {
    setRunning(true);
    setSelectedTask(task);
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", id: task.id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to run task:", error);
    } finally {
      setRunning(false);
      setSelectedTask(null);
    }
  };

  const handleViewLog = async (task: CronTask) => {
    setSelectedTask(task);
    setLogDialogOpen(true);
    setLogsLoading(true);
    setTaskLogs("");
    try {
      const res = await fetch(`/api/cron?action=logs&id=${task.id}`);
      const data = await res.json();
      setTaskLogs(data.logs || "暂无日志");
    } catch (error) {
      setTaskLogs("获取日志失败");
    } finally {
      setLogsLoading(false);
    }
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
      <h1 className="text-2xl font-bold mb-6">计划任务</h1>

      <CronList
        tasks={tasks}
        onAdd={() => {
          setSelectedTask(null);
          setEditorOpen(true);
        }}
        onEdit={(task) => {
          setSelectedTask(task);
          setEditorOpen(true);
        }}
        onDelete={(task) => {
          setSelectedTask(task);
          setDeleteDialogOpen(true);
        }}
        onToggleStatus={handleToggleStatus}
        onRunNow={handleRunNow}
        onViewLog={handleViewLog}
      />

      <CronEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSubmit={handleSubmit}
        task={selectedTask}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除任务"
        description={`确定要删除任务 "${selectedTask?.name}" 吗？此操作不可恢复。`}
        onConfirm={handleDelete}
        confirmText="删除"
        variant="destructive"
      />

      {/* Log Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>任务日志 - {selectedTask?.name}</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] bg-gray-900 rounded-lg p-4 overflow-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : (
              <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                {taskLogs}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>
              关闭
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedTask && handleViewLog(selectedTask)}
            >
              刷新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Running indicator */}
      {running && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span>正在执行任务: {selectedTask?.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
