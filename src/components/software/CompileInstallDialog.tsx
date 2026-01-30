"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NginxModule {
  id: string;
  name: string;
  description: string;
  category: string;
  flag: string;
  repo?: string;
  dependencies?: string[];
  requires?: string[];
  conflicts?: string[];
  default?: boolean;
  warning?: string;
  compileTime?: "fast" | "medium" | "slow";
}

interface NginxVersion {
  version: string;
  type: "stable" | "mainline" | "legacy";
  releaseDate: string;
  recommended?: boolean;
}

interface NginxPreset {
  name: string;
  description: string;
  modules: string[];
}

interface CompileTask {
  id: string;
  software: string;
  version: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  currentStep: string;
  logs: string[];
  startTime: number;
  endTime?: number;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  software: string;
  onComplete?: () => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  core: "核心模块",
  performance: "性能优化",
  security: "安全防护",
  compression: "压缩算法",
  cache: "缓存管理",
  headers: "头部/内容处理",
  lua: "Lua 脚本",
  monitoring: "监控统计",
  upstream: "负载均衡",
  media: "流媒体",
  webdav: "WebDAV",
  misc: "功能扩展",
};

export function CompileInstallDialog({
  open,
  onClose,
  software,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<NginxModule[]>([]);
  const [versions, setVersions] = useState<NginxVersion[]>([]);
  const [presets, setPresets] = useState<Record<string, NginxPreset>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});

  const [selectedVersion, setSelectedVersion] = useState("");
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set()
  );
  const [customModules, setCustomModules] = useState("");
  const [installPath, setInstallPath] = useState("/www/server/nginx");
  const [selectedPreset, setSelectedPreset] = useState("standard");

  const [compiling, setCompiling] = useState(false);
  const [task, setTask] = useState<CompileTask | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 加载模块数据
  useEffect(() => {
    if (open && software === "nginx") {
      fetchModules();
    }
  }, [open, software]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/software/compile?action=modules&software=${software}`
      );

      // 检查认证状态
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      setModules(data.modules || []);
      setVersions(data.versions || []);
      setPresets(data.presets || {});
      setCategories(data.categories || {});

      // 设置默认版本
      const recommended = data.versions?.find(
        (v: NginxVersion) => v.recommended
      );
      if (recommended) {
        setSelectedVersion(recommended.version);
      } else if (data.versions?.length > 0) {
        setSelectedVersion(data.versions[0].version);
      }

      // 应用默认预设
      if (data.presets?.standard) {
        setSelectedModules(new Set(data.presets.standard.modules));
      }
    } catch (error) {
      console.error("Failed to fetch modules:", error);
    } finally {
      setLoading(false);
    }
  };

  // 按分类分组模块
  const modulesByCategory = useMemo(() => {
    const grouped: Record<string, NginxModule[]> = {};
    for (const mod of modules) {
      if (!grouped[mod.category]) {
        grouped[mod.category] = [];
      }
      grouped[mod.category].push(mod);
    }
    return grouped;
  }, [modules]);

  // 应用预设
  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = presets[presetKey];
    if (preset) {
      setSelectedModules(new Set(preset.modules));
    }
  };

  // 切换模块选择
  const toggleModule = (moduleId: string) => {
    const newSelected = new Set(selectedModules);
    const module = modules.find((m) => m.id === moduleId);

    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);

      // 自动添加依赖
      if (module?.requires) {
        for (const req of module.requires) {
          newSelected.add(req);
        }
      }
    }

    setSelectedModules(newSelected);
    setSelectedPreset("custom");
    validateSelection(newSelected);
  };

  // 验证选择
  const validateSelection = async (selected: Set<string>) => {
    try {
      const response = await fetch(
        `/api/software/compile?action=validate&modules=${Array.from(selected).join(",")}`
      );
      const data = await response.json();
      setValidationErrors(data.errors || []);
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  // 估算编译时间
  const estimatedTime = useMemo(() => {
    let time = 3;
    for (const modId of selectedModules) {
      const mod = modules.find((m) => m.id === modId);
      if (mod) {
        switch (mod.compileTime) {
          case "fast":
            time += 0.2;
            break;
          case "medium":
            time += 1;
            break;
          case "slow":
            time += 5;
            break;
        }
      }
    }
    return Math.ceil(time);
  }, [selectedModules, modules]);

  // 生成脚本预览
  const handlePreviewScript = async () => {
    try {
      const response = await fetch("/api/software/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_script",
          software,
          options: {
            version: selectedVersion,
            modules: Array.from(selectedModules),
            customModules: customModules
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            installPath,
            optimizationLevel: "O2",
            withDebug: false,
            parallelJobs: 0,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedScript(data.script);
        setShowScript(true);
      } else {
        alert("生成脚本失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      console.error("Failed to generate script:", error);
      alert("生成脚本失败");
    }
  };

  // 开始编译
  const handleStartCompile = async () => {
    if (validationErrors.length > 0) {
      alert("请先修复配置错误:\n" + validationErrors.join("\n"));
      return;
    }

    setCompiling(true);

    try {
      const response = await fetch("/api/software/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compile",
          software,
          options: {
            version: selectedVersion,
            modules: Array.from(selectedModules),
            customModules: customModules
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            installPath,
            optimizationLevel: "O2",
            withDebug: false,
            parallelJobs: 0,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 开始轮询任务状态
        pollTaskStatus(data.taskId);
      } else {
        alert("启动编译失败: " + (data.error || "未知错误"));
        setCompiling(false);
      }
    } catch (error) {
      console.error("Failed to start compile:", error);
      alert("启动编译失败");
      setCompiling(false);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/software/compile?action=status&taskId=${taskId}`
        );
        const data = await response.json();

        if (data.task) {
          setTask(data.task);

          if (
            data.task.status === "running" ||
            data.task.status === "pending"
          ) {
            setTimeout(poll, 1000);
          } else {
            setCompiling(false);
            if (data.task.status === "completed") {
              onComplete?.();
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll status:", error);
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  // 取消编译
  const handleCancel = async () => {
    if (task) {
      try {
        await fetch("/api/software/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel",
            taskId: task.id,
          }),
        });
      } catch (error) {
        console.error("Failed to cancel:", error);
      }
    }
    setCompiling(false);
    setTask(null);
  };

  if (software !== "nginx") {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>暂不支持</DialogTitle>
          </DialogHeader>
          <p>目前仅支持 Nginx 自定义编译安装</p>
          <DialogFooter>
            <Button onClick={onClose}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 编译进度视图
  if (compiling || task) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {task?.status === "completed"
                ? "✅ 编译完成"
                : task?.status === "failed"
                  ? "❌ 编译失败"
                  : `🔄 正在编译 Nginx ${selectedVersion}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{task?.currentStep || "准备中..."}</span>
                <span>{task?.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    task?.status === "failed"
                      ? "bg-red-500"
                      : task?.status === "completed"
                        ? "bg-green-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${task?.progress || 0}%` }}
                />
              </div>
            </div>

            {/* 错误信息 */}
            {task?.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
                {task.error}
              </div>
            )}

            {/* 日志输出 */}
            <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto font-mono text-sm text-green-400">
              {task?.logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>

            {/* 时间信息 */}
            {task && (
              <div className="text-sm text-gray-500">
                开始时间: {new Date(task.startTime).toLocaleTimeString()}
                {task.endTime && (
                  <span className="ml-4">
                    耗时:{" "}
                    {Math.round((task.endTime - task.startTime) / 1000 / 60)} 分钟
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {task?.status === "running" || task?.status === "pending" ? (
              <Button variant="destructive" onClick={handleCancel}>
                取消编译
              </Button>
            ) : (
              <Button onClick={onClose}>关闭</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 脚本预览视图
  if (showScript) {
    return (
      <Dialog open={open} onOpenChange={() => setShowScript(false)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>编译脚本预览</DialogTitle>
          </DialogHeader>

          <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto font-mono text-sm text-gray-300">
            <pre>{generatedScript}</pre>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowScript(false)}>
              返回
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(generatedScript);
                alert("已复制到剪贴板");
              }}
            >
              复制脚本
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowScript(false);
                handleStartCompile();
              }}
            >
              开始编译
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 配置视图
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nginx 自定义编译安装</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* 版本和预设选择 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  Nginx 版本
                </label>
                <Select
                  value={selectedVersion}
                  onValueChange={setSelectedVersion}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.version} value={v.version}>
                        {v.version} ({v.type})
                        {v.recommended && " ⭐"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  配置预设
                </label>
                <Select value={selectedPreset} onValueChange={applyPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(presets).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        {preset.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  安装路径
                </label>
                <Input
                  value={installPath}
                  onChange={(e) => setInstallPath(e.target.value)}
                />
              </div>
            </div>

            {/* 预设说明 */}
            {selectedPreset !== "custom" && presets[selectedPreset] && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                {presets[selectedPreset].description}
              </div>
            )}

            {/* 验证错误 */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                {validationErrors.map((err, i) => (
                  <div key={i}>⚠️ {err}</div>
                ))}
              </div>
            )}

            {/* 模块选择 */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Tabs defaultValue="core" className="h-full flex flex-col">
                <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0 bg-gray-100 rounded-none border-b">
                  {Object.keys(modulesByCategory).map((cat) => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      className="text-xs px-3"
                    >
                      {CATEGORY_NAMES[cat] || cat}
                      <span className="ml-1 text-gray-400">
                        (
                        {
                          modulesByCategory[cat].filter((m) =>
                            selectedModules.has(m.id)
                          ).length
                        }
                        /{modulesByCategory[cat].length})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(modulesByCategory).map(([cat, mods]) => (
                  <TabsContent
                    key={cat}
                    value={cat}
                    className="flex-1 overflow-auto p-2 m-0"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {mods.map((mod) => (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                            selectedModules.has(mod.id)
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedModules.has(mod.id)}
                            onChange={() => toggleModule(mod.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {mod.name}
                              </span>
                              {mod.compileTime === "slow" && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">
                                  慢
                                </span>
                              )}
                              {mod.repo && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                  第三方
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono truncate">
                              {mod.repo
                                ? mod.repo.split('/').pop()?.replace('.git', '')
                                : `--with-${mod.id}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {mod.description}
                            </div>
                            {mod.warning && selectedModules.has(mod.id) && (
                              <div className="text-xs text-orange-600 mt-1">
                                ⚠️ {mod.warning}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* 自定义模块 */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                自定义模块 (Git URL，逗号分隔)
              </label>
              <Input
                placeholder="https://github.com/user/module1.git, https://github.com/user/module2.git"
                value={customModules}
                onChange={(e) => setCustomModules(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                添加预设列表中没有的第三方模块，支持任意 Git 仓库
              </p>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center justify-between bg-gray-50 rounded p-3 text-sm">
              <div>
                已选择 <strong>{selectedModules.size}</strong> 个模块
                {customModules.split(",").filter((s) => s.trim()).length > 0 && (
                  <span>
                    {" "}
                    +{" "}
                    {customModules.split(",").filter((s) => s.trim()).length}{" "}
                    个自定义模块
                  </span>
                )}
              </div>
              <div className="text-gray-500">
                预计编译时间: <strong>~{estimatedTime} 分钟</strong>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="outline" onClick={handlePreviewScript}>
            预览脚本
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleStartCompile}
            disabled={validationErrors.length > 0}
          >
            开始编译安装
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
