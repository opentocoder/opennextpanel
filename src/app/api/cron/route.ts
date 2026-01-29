import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import {
  addCronJob,
  deleteCronJob,
  toggleCronJob,
  getAllCronJobs,
  validateCronExpression,
  type CronSchedule,
} from "@/lib/system/cron";

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    // Handle logs request
    if (action === "logs" && id) {
      const db = getDb();
      const task = db.prepare("SELECT * FROM crons WHERE id = ?").get(id) as any;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Get logs from cron_logs table or return task execution history
      const logs = db.prepare(`
        SELECT * FROM cron_logs WHERE cron_id = ? ORDER BY executed_at DESC LIMIT 100
      `).all(id) as any[];

      let logText = "";
      if (logs.length > 0) {
        logText = logs.map((log: any) => {
          return `[${log.executed_at}] ${log.status === 1 ? "✓" : "✗"} 执行${log.status === 1 ? "成功" : "失败"}\n${log.output || ""}`;
        }).join("\n---\n");
      } else {
        logText = `任务: ${task.name}\nCron表达式: ${task.cron_expression}\n脚本: ${task.script || "无"}\n\n暂无执行日志`;
      }

      return NextResponse.json({ logs: logText });
    }

    const db = getDb();
    const tasks = db
      .prepare(
        `
      SELECT * FROM crons ORDER BY created_at DESC
    `
      )
      .all();

    // 获取真实的系统 crontab
    let systemJobs: any[] = [];
    try {
      systemJobs = await getAllCronJobs();
    } catch {
      // crontab 不可用时使用数据库记录
    }

    const formattedTasks = tasks.map((task: any) => {
      // 检查任务是否在系统 crontab 中存在
      const systemJob = systemJobs.find(j => j.command.includes(task.script) || task.script?.includes(j.command));

      return {
        id: task.id,
        name: task.name,
        type: task.type,
        cronExpression: task.cron_expression,
        script: task.script || "",
        status: task.status === 1 ? "active" : "disabled",
        lastRun: task.last_run,
        nextRun: task.next_run,
        runCount: task.run_count || 0,
        createdAt: task.created_at,
        existsInSystem: !!systemJob,
      };
    });

    return NextResponse.json({ tasks: formattedTasks, systemJobs });
  } catch (error) {
    console.error("Failed to fetch cron tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch cron tasks" },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, name, type, cronExpression, script } = body;

    // Handle run now action
    if (action === "run" && id) {
      const db = getDb();
      const task = db.prepare("SELECT * FROM crons WHERE id = ?").get(id) as any;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      let output = "";
      let success = true;

      try {
        if (task.type === "shell" && task.script) {
          const { exec } = require("child_process");
          const { promisify } = require("util");
          const execAsync = promisify(exec);
          const result = await execAsync(task.script, { timeout: 60000 });
          output = result.stdout || result.stderr || "执行完成";
        } else if (task.type === "curl" && task.script) {
          const response = await fetch(task.script);
          output = `HTTP ${response.status}: ${await response.text().catch(() => "OK")}`;
        } else {
          output = "不支持的任务类型或脚本为空";
          success = false;
        }
      } catch (err: any) {
        output = err.message || "执行失败";
        success = false;
      }

      // Update run count and last run time
      db.prepare(`
        UPDATE crons SET run_count = run_count + 1, last_run = datetime('now') WHERE id = ?
      `).run(id);

      // Log execution
      db.prepare(`
        INSERT INTO cron_logs (cron_id, status, output, executed_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(id, success ? 1 : 0, output);

      return NextResponse.json({ success, output });
    }

    if (!name || !cronExpression) {
      return NextResponse.json(
        { error: "Name and cron expression are required" },
        { status: 400 }
      );
    }

    // 验证 cron 表达式
    const validation = validateCronExpression(cronExpression);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid cron expression" },
        { status: 400 }
      );
    }

    const db = getDb();
    let systemCreated = false;
    let systemError = null;

    // 尝试添加到系统 crontab
    if (script) {
      try {
        const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(/\s+/);
        const schedule: CronSchedule = { minute, hour, dayOfMonth, month, dayOfWeek };

        const result = await addCronJob(schedule, script, "root", name);
        if (result.success) {
          systemCreated = true;
        } else {
          systemError = result.message;
        }
      } catch (err: any) {
        console.log("System crontab creation failed:", err.message);
        systemError = err.message;
      }
    }

    // 保存到 SQLite
    const result = db
      .prepare(
        `
      INSERT INTO crons (name, type, cron_expression, script, status)
      VALUES (?, ?, ?, ?, 1)
    `
      )
      .run(name, type || "shell", cronExpression, script || "");

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      systemCreated,
      systemError,
      message: systemCreated
        ? "Cron task created successfully"
        : "Cron record created (system crontab failed)",
    });
  } catch (error) {
    console.error("Failed to create cron task:", error);
    return NextResponse.json(
      { error: "Failed to create cron task" },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, cronExpression, script, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    let systemUpdated = false;

    // 获取现有任务信息
    const existing = db.prepare("SELECT * FROM crons WHERE id = ?").get(id) as any;

    if (status !== undefined) {
      // 尝试在系统 crontab 中启用/禁用
      if (existing?.script) {
        try {
          // 使用脚本生成的 ID 进行切换
          const jobId = Buffer.from(`root:${existing.script}`).toString("base64").substring(0, 16);
          const result = await toggleCronJob(jobId, status === "active");
          if (result.success) {
            systemUpdated = true;
          }
        } catch (err: any) {
          console.log("System crontab toggle failed:", err.message);
        }
      }

      db.prepare("UPDATE crons SET status = ? WHERE id = ?").run(
        status === "active" ? 1 : 0,
        id
      );
    } else {
      db.prepare(
        `
        UPDATE crons SET name = ?, type = ?, cron_expression = ?, script = ?
        WHERE id = ?
      `
      ).run(name, type, cronExpression, script, id);
    }

    return NextResponse.json({
      success: true,
      systemUpdated,
      message: "Cron task updated successfully",
    });
  } catch (error) {
    console.error("Failed to update cron task:", error);
    return NextResponse.json(
      { error: "Failed to update cron task" },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    let systemDeleted = false;

    // 获取任务信息
    const task = db.prepare("SELECT script FROM crons WHERE id = ?").get(id) as { script: string } | undefined;

    // 尝试从系统 crontab 删除
    if (task?.script) {
      try {
        const jobId = Buffer.from(`root:${task.script}`).toString("base64").substring(0, 16);
        const result = await deleteCronJob(jobId);
        if (result.success) {
          systemDeleted = true;
        }
      } catch (err: any) {
        console.log("System crontab deletion failed:", err.message);
      }
    }

    // 从 SQLite 删除
    db.prepare("DELETE FROM crons WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      systemDeleted,
      message: "Cron task deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete cron task:", error);
    return NextResponse.json(
      { error: "Failed to delete cron task" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const PUT = withAuth(handlePUT);
export const DELETE = withAuth(handleDELETE);
