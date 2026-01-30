import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  NGINX_MODULES,
  NGINX_VERSIONS,
  NGINX_PRESETS,
  MODULE_CATEGORIES,
  generateCompileScript,
  estimateCompileTime,
  validateModuleSelection,
  getModuleDependencies,
  CompileOptions,
} from "@/lib/system/nginx-compiler";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

const execFileAsync = promisify(execFile);

// 编译任务状态
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
  pid?: number;
}

// 内存中存储编译任务（生产环境应使用数据库）
const compileTasks = new Map<string, CompileTask>();

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "modules";
    const software = searchParams.get("software") || "nginx";

    if (action === "modules") {
      // 返回模块列表
      if (software === "nginx") {
        return NextResponse.json({
          modules: NGINX_MODULES,
          categories: MODULE_CATEGORIES,
          versions: NGINX_VERSIONS,
          presets: NGINX_PRESETS,
        });
      }
      return NextResponse.json({ error: "不支持的软件" }, { status: 400 });
    }

    if (action === "validate") {
      // 验证模块选择
      const modulesParam = searchParams.get("modules") || "";
      const modules = modulesParam.split(",").filter(Boolean);
      const result = validateModuleSelection(modules);
      const estimatedTime = estimateCompileTime(modules);

      return NextResponse.json({
        ...result,
        estimatedTime,
      });
    }

    if (action === "dependencies") {
      // 获取模块依赖
      const moduleId = searchParams.get("module") || "";
      const deps = getModuleDependencies(moduleId);
      return NextResponse.json({ dependencies: deps });
    }

    if (action === "status") {
      // 获取编译任务状态
      const taskId = searchParams.get("taskId");
      if (!taskId) {
        return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
      }

      const task = compileTasks.get(taskId);
      if (!task) {
        return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      }

      return NextResponse.json({ task });
    }

    if (action === "tasks") {
      // 获取所有编译任务
      const tasks = Array.from(compileTasks.values());
      return NextResponse.json({ tasks });
    }

    return NextResponse.json({ error: "无效的 action" }, { status: 400 });
  } catch (error: any) {
    console.error("Compile API error:", error);
    return NextResponse.json(
      { error: error.message || "获取编译信息失败" },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "generate_script") {
      // 生成编译脚本（不执行）
      const { software, options } = body as {
        software: string;
        options: CompileOptions;
      };

      if (software !== "nginx") {
        return NextResponse.json({ error: "暂只支持 Nginx" }, { status: 400 });
      }

      // 验证模块
      const validation = validateModuleSelection(options.modules);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "模块配置无效", details: validation.errors },
          { status: 400 }
        );
      }

      const script = generateCompileScript(options);
      const estimatedTime = estimateCompileTime(options.modules);

      return NextResponse.json({
        success: true,
        script,
        estimatedTime,
      });
    }

    if (action === "compile") {
      // 开始编译
      const { software, options } = body as {
        software: string;
        options: CompileOptions;
      };

      if (software !== "nginx") {
        return NextResponse.json({ error: "暂只支持 Nginx" }, { status: 400 });
      }

      // 验证模块
      const validation = validateModuleSelection(options.modules);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "模块配置无效", details: validation.errors },
          { status: 400 }
        );
      }

      // 生成脚本
      const script = generateCompileScript(options);

      // 创建任务
      const taskId = `compile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const task: CompileTask = {
        id: taskId,
        software,
        version: options.version,
        status: "pending",
        progress: 0,
        currentStep: "准备中...",
        logs: [],
        startTime: Date.now(),
      };
      compileTasks.set(taskId, task);

      // 保存脚本到临时文件
      const scriptPath = `/tmp/opennextpanel_compile_${taskId}.sh`;
      fs.writeFileSync(scriptPath, script, { mode: 0o755 });

      // 异步执行编译
      executeCompile(taskId, scriptPath).catch((error) => {
        const t = compileTasks.get(taskId);
        if (t) {
          t.status = "failed";
          t.error = error.message;
          t.endTime = Date.now();
        }
      });

      return NextResponse.json({
        success: true,
        taskId,
        message: "编译任务已启动",
        estimatedTime: estimateCompileTime(options.modules),
      });
    }

    if (action === "cancel") {
      // 取消编译
      const { taskId } = body;
      const task = compileTasks.get(taskId);

      if (!task) {
        return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      }

      if (task.status === "running" && task.pid) {
        // 使用 execFile 安全终止进程
        try {
          await execFileAsync("kill", ["-TERM", String(task.pid)]);
        } catch {
          // 忽略错误，进程可能已结束
        }
      }

      task.status = "failed";
      task.error = "用户取消";
      task.endTime = Date.now();

      return NextResponse.json({ success: true, message: "任务已取消" });
    }

    return NextResponse.json({ error: "无效的 action" }, { status: 400 });
  } catch (error: any) {
    console.error("Compile API error:", error);
    return NextResponse.json(
      { error: error.message || "编译操作失败" },
      { status: 500 }
    );
  }
}

// 执行编译任务 - 使用 spawn 替代 exec 避免注入风险
async function executeCompile(taskId: string, scriptPath: string) {
  const task = compileTasks.get(taskId);
  if (!task) return;

  task.status = "running";
  task.currentStep = "开始编译...";

  const logPath = `/tmp/opennextpanel_compile_${taskId}.log`;
  const logStream = fs.createWriteStream(logPath, { flags: "a" });

  try {
    // 使用 spawn 而不是 exec，避免 shell 注入
    const process = spawn("bash", [scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    task.pid = process.pid;

    // 收集输出
    process.stdout?.on("data", (data) => {
      const text = data.toString();
      logStream.write(text);

      // 更新日志（保留最后 100 行）
      const lines = text.split("\n").filter(Boolean);
      task.logs.push(...lines);
      if (task.logs.length > 100) {
        task.logs = task.logs.slice(-100);
      }

      // 解析进度
      if (text.includes("[INFO]")) {
        const match = text.match(/\[INFO\]\s*(.+)/);
        if (match) {
          task.currentStep = match[1].trim();
        }
      }

      // 估算进度
      if (text.includes("安装编译依赖")) task.progress = 10;
      else if (text.includes("下载 Nginx")) task.progress = 20;
      else if (text.includes("下载第三方模块")) task.progress = 30;
      else if (text.includes("开始编译")) task.progress = 40;
      else if (text.includes("./configure")) task.progress = 50;
      else if (text.includes("执行 make")) task.progress = 60;
      else if (text.includes("make install")) task.progress = 80;
      else if (text.includes("创建 systemd")) task.progress = 90;
      else if (text.includes("编译安装完成")) task.progress = 100;
    });

    process.stderr?.on("data", (data) => {
      const text = data.toString();
      logStream.write(text);
      task.logs.push(...text.split("\n").filter(Boolean));
      if (task.logs.length > 100) {
        task.logs = task.logs.slice(-100);
      }
    });

    await new Promise<void>((resolve, reject) => {
      process.on("exit", (code) => {
        logStream.end();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`编译失败，退出码: ${code}`));
        }
      });

      process.on("error", (err) => {
        logStream.end();
        reject(err);
      });
    });

    task.status = "completed";
    task.progress = 100;
    task.currentStep = "编译完成";
    task.endTime = Date.now();

    // 清理临时文件
    try {
      fs.unlinkSync(scriptPath);
      fs.unlinkSync(logPath);
    } catch {
      // 忽略
    }
  } catch (error: any) {
    task.status = "failed";
    task.error = error.message;
    task.endTime = Date.now();
    logStream.end();

    // 读取最终日志
    try {
      if (fs.existsSync(logPath)) {
        task.logs = fs.readFileSync(logPath, "utf-8").split("\n").slice(-100);
      }
    } catch {
      // 忽略
    }
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
