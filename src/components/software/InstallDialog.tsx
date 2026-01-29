"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, AlertCircle, Wrench, Zap } from "lucide-react";
import { CompileInstallDialog } from "./CompileInstallDialog";

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
type InstallMode = "quick" | "compile";

// 支持编译安装的软件
const COMPILE_SUPPORTED = ["nginx"];

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
  const [installMode, setInstallMode] = useState<InstallMode>("quick");
  const [showCompileDialog, setShowCompileDialog] = useState(false);

  const supportsCompile = software && COMPILE_SUPPORTED.includes(software.id);

  useEffect(() => {
    if (software) {
      setSelectedVersion(software.version);
      setStatus("idle");
      setProgress(0);
      setLog([]);
      setInstallMode("quick");
    }
  }, [software]);

  const handleInstall = async () => {
    if (!software) return;

    setStatus("installing");
    setProgress(10);
    setLog(["开始安装 " + software.name + " " + selectedVersion + "..."]);

    try {
      // 调用真实的安装 API
      const res = await fetch(`/api/software/${software.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", version: selectedVersion }),
      });

      setProgress(50);
      setLog((prev) => [...prev, "正在等待安装完成..."]);

      const data = await res.json();

      if (data.success) {
        setProgress(100);
        setStatus("success");
        // 添加安装日志
        if (data.logs && Array.isArray(data.logs)) {
          setLog((prev) => [...prev, ...data.logs, "安装完成！"]);
        } else {
          setLog((prev) => [...prev, data.message || "安装完成！"]);
        }
        onConfirm(software.id, selectedVersion);
      } else {
        setStatus("error");
        setLog((prev) => [...prev, "安装失败: " + (data.error || data.message || "未知错误")]);
        if (data.logs && Array.isArray(data.logs)) {
          setLog((prev) => [...prev, ...data.logs]);
        }
      }
    } catch (error) {
      setStatus("error");
      setLog((prev) => [...prev, "安装失败: " + (error instanceof Error ? error.message : "网络错误")]);
    }
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
              {/* 安装方式选择 - 仅支持编译安装的软件显示 */}
              {supportsCompile && (
                <div>
                  <label className="text-sm text-gray-600 block mb-2">
                    安装方式
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        installMode === "quick"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="installMode"
                        value="quick"
                        checked={installMode === "quick"}
                        onChange={() => setInstallMode("quick")}
                        className="mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Zap size={16} className="text-yellow-500" />
                          快速安装
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          使用 apt 安装，速度快，标准配置
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        installMode === "compile"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="installMode"
                        value="compile"
                        checked={installMode === "compile"}
                        onChange={() => setInstallMode("compile")}
                        className="mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Wrench size={16} className="text-blue-500" />
                          编译安装
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          自定义模块，性能更优，需要5-15分钟
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 快速安装 - 版本选择 */}
              {installMode === "quick" && (
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
              )}

              {/* 编译安装说明 */}
              {installMode === "compile" && (
                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <strong>编译安装</strong> 可以自定义选择模块：
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Brotli 压缩 - 比 Gzip 更高效</li>
                    <li>• 缓存清理 - 支持手动清除缓存</li>
                    <li>• 流量统计 - VTS 监控模块</li>
                    <li>• WAF 防护 - NAXSI/ModSecurity</li>
                    <li>• 更多第三方模块...</li>
                  </ul>
                </div>
              )}

              {/* 快速安装提示 */}
              {installMode === "quick" && (
                <div className="p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                  <strong>提示:</strong> 安装过程可能需要几分钟，请耐心等待。
                  安装期间请勿关闭此窗口。
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                {installMode === "quick" ? (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleInstall}
                  >
                    开始安装
                  </Button>
                ) : (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowCompileDialog(true)}
                  >
                    配置编译选项
                  </Button>
                )}
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

      {/* 编译安装对话框 */}
      {software && showCompileDialog && (
        <CompileInstallDialog
          open={showCompileDialog}
          onClose={() => setShowCompileDialog(false)}
          software={software.id}
          onComplete={() => {
            setShowCompileDialog(false);
            onOpenChange(false);
            onConfirm(software.id, "compiled");
          }}
        />
      )}
    </Dialog>
  );
}
