"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface CronTask {
  id?: number;
  name: string;
  type: string;
  cronExpression: string;
  script: string;
}

interface CronEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CronTask) => void;
  task?: CronTask | null;
}

const defaultFormData: CronTask = {
  name: "",
  type: "shell",
  cronExpression: "0 0 * * *",
  script: "",
};

export function CronEditor({
  open,
  onOpenChange,
  onSubmit,
  task,
}: CronEditorProps) {
  const [formData, setFormData] = useState<CronTask>(defaultFormData);
  const [cronMode, setCronMode] = useState<"simple" | "advanced">("simple");
  const [simpleConfig, setSimpleConfig] = useState({
    minute: "0",
    hour: "0",
    dayOfMonth: "*",
    month: "*",
    dayOfWeek: "*",
  });

  // Reset form when dialog opens or task changes
  useEffect(() => {
    if (open) {
      if (task) {
        setFormData(task);
        // Parse cron expression for simple mode
        const parts = task.cronExpression.split(" ");
        if (parts.length === 5) {
          setSimpleConfig({
            minute: parts[0],
            hour: parts[1],
            dayOfMonth: parts[2],
            month: parts[3],
            dayOfWeek: parts[4],
          });
        }
      } else {
        setFormData(defaultFormData);
        setSimpleConfig({
          minute: "0",
          hour: "0",
          dayOfMonth: "*",
          month: "*",
          dayOfWeek: "*",
        });
      }
    }
  }, [open, task]);

  const handleSimpleChange = (field: string, value: string) => {
    const newConfig = { ...simpleConfig, [field]: value };
    setSimpleConfig(newConfig);
    const cron = `${newConfig.minute} ${newConfig.hour} ${newConfig.dayOfMonth} ${newConfig.month} ${newConfig.dayOfWeek}`;
    setFormData({ ...formData, cronExpression: cron });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      alert("请输入任务名称");
      return;
    }
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "编辑任务" : "添加任务"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">任务名称</label>
            <Input
              placeholder="请输入任务名称"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">任务类型</label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shell">Shell脚本</SelectItem>
                <SelectItem value="backup_site">备份网站</SelectItem>
                <SelectItem value="backup_db">备份数据库</SelectItem>
                <SelectItem value="backup_path">备份目录</SelectItem>
                <SelectItem value="curl">访问URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">执行周期</label>
            <Tabs value={cronMode} onValueChange={(v) => setCronMode(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="simple">简单模式</TabsTrigger>
                <TabsTrigger value="advanced">高级模式</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">分钟</label>
                    <Select
                      value={simpleConfig.minute}
                      onValueChange={(v) => handleSimpleChange("minute", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">每分钟</SelectItem>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="45">45</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">小时</label>
                    <Select
                      value={simpleConfig.hour}
                      onValueChange={(v) => handleSimpleChange("hour", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">每小时</SelectItem>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">日</label>
                    <Select
                      value={simpleConfig.dayOfMonth}
                      onValueChange={(v) => handleSimpleChange("dayOfMonth", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">每天</SelectItem>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">月</label>
                    <Select
                      value={simpleConfig.month}
                      onValueChange={(v) => handleSimpleChange("month", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">每月</SelectItem>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">星期</label>
                    <Select
                      value={simpleConfig.dayOfWeek}
                      onValueChange={(v) => handleSimpleChange("dayOfWeek", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">每天</SelectItem>
                        <SelectItem value="0">周日</SelectItem>
                        <SelectItem value="1">周一</SelectItem>
                        <SelectItem value="2">周二</SelectItem>
                        <SelectItem value="3">周三</SelectItem>
                        <SelectItem value="4">周四</SelectItem>
                        <SelectItem value="5">周五</SelectItem>
                        <SelectItem value="6">周六</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced">
                <Input
                  placeholder="0 0 * * * (分 时 日 月 周)"
                  value={formData.cronExpression}
                  onChange={(e) =>
                    setFormData({ ...formData, cronExpression: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  格式: 分钟 小时 日 月 星期
                </p>
              </TabsContent>
            </Tabs>

            <p className="text-sm text-gray-600 mt-2">
              当前表达式: <code className="bg-gray-100 px-2 py-1 rounded">{formData.cronExpression}</code>
            </p>
          </div>

          {formData.type === "shell" && (
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                脚本内容
              </label>
              <textarea
                className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                placeholder="#!/bin/bash&#10;echo 'Hello World'"
                value={formData.script}
                onChange={(e) =>
                  setFormData({ ...formData, script: e.target.value })
                }
              />
            </div>
          )}

          {formData.type === "curl" && (
            <div>
              <label className="text-sm text-gray-600 block mb-2">URL地址</label>
              <Input
                placeholder="https://example.com/api/cron"
                value={formData.script}
                onChange={(e) =>
                  setFormData({ ...formData, script: e.target.value })
                }
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
