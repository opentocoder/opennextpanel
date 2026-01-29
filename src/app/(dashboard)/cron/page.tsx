"use client";

import { useState, useEffect } from "react";
import { CronList, CronEditor } from "@/components/cron";
import { ConfirmDialog } from "@/components/common";

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
  const [selectedTask, setSelectedTask] = useState<CronTask | null>(null);

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

  const handleRunNow = (task: CronTask) => {
    alert(`立即执行任务: ${task.name}`);
  };

  const handleViewLog = (task: CronTask) => {
    alert(`查看日志: ${task.name}`);
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
    </div>
  );
}
