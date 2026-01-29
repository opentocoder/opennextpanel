"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Software {
  id: string;
  name: string;
  version: string;
  versions?: string[];
}

interface InstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  software: Software | null;
  onConfirm: (id: string, version: string) => void;
}

type InstallStatus = "idle" | "installing" | "success" | "error";

export function InstallDialog({
  open,
  onOpenChange,
  software,
  onConfirm,
}: InstallDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState("");
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (software) {
      setSelectedVersion(software.version);
      setStatus("idle");
      setProgress(0);
      setLog([]);
    }
  }, [software]);

  const handleInstall = () => {
    setStatus("installing");
    setLog(["开始安装 " + software?.name + " " + selectedVersion + "..."]);

    // Simulate installation progress
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setStatus("success");
        setLog((prev) => [...prev, "安装完成！"]);
        onConfirm(software!.id, selectedVersion);
      } else {
        setProgress(p);
        // Add random log messages
        const messages = [
          "正在下载软件包...",
          "正在解压文件...",
          "正在配置环境...",
          "正在安装依赖...",
          "正在编译...",
          "正在配置服务...",
        ];
        if (Math.random() > 0.5) {
          setLog((prev) => [
            ...prev,
            messages[Math.floor(Math.random() * messages.length)],
          ]);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  };

  if (!software) return null;

  const versions = software.versions || [software.version];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>安装 {software.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {status === "idle" && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  选择版本
                </label>
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                <strong>提示:</strong> 安装过程可能需要几分钟，请耐心等待。
                安装期间请勿关闭此窗口。
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleInstall}
                >
                  开始安装
                </Button>
              </div>
            </>
          )}

          {status === "installing" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-green-600" size={24} />
                <div className="flex-1">
                  <div className="text-sm font-medium">正在安装...</div>
                  <div className="text-xs text-gray-500">
                    {progress.toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="h-48 bg-gray-900 rounded-lg p-3 overflow-auto">
                {log.map((line, i) => (
                  <div key={i} className="text-xs text-green-400 font-mono">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto text-green-600 mb-4" size={48} />
              <div className="text-lg font-medium text-gray-900">安装成功</div>
              <div className="text-sm text-gray-500 mt-1">
                {software.name} {selectedVersion} 已成功安装
              </div>
              <Button
                className="mt-4"
                onClick={() => onOpenChange(false)}
              >
                完成
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
              <div className="text-lg font-medium text-gray-900">安装失败</div>
              <div className="text-sm text-gray-500 mt-1">
                请检查日志并重试
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  关闭
                </Button>
                <Button onClick={handleInstall}>重试</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
