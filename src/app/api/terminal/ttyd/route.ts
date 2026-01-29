import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ttyd 会话管理
interface TtydSession {
  port: number;
  pid: number;
  createdAt: Date;
}

// 使用内存存储会话（生产环境应该用持久化存储）
const sessions = new Map<number, TtydSession>();

const TTYD_BASE_PORT = 7681;
const TTYD_MAX_PORT = 7690;

/**
 * 检查 ttyd 是否安装
 */
async function isTtydInstalled(): Promise<boolean> {
  try {
    await execAsync("which ttyd");
    return true;
  } catch {
    return false;
  }
}

/**
 * 查找可用端口
 */
async function findAvailablePort(): Promise<number | null> {
  for (let port = TTYD_BASE_PORT; port <= TTYD_MAX_PORT; port++) {
    if (!sessions.has(port)) {
      // 检查端口是否被其他进程占用
      try {
        await execAsync(`ss -tlnp | grep ":${port} " || true`);
        const { stdout } = await execAsync(`ss -tlnp | grep ":${port} " || echo "free"`);
        if (stdout.trim() === "free" || stdout.trim() === "") {
          return port;
        }
      } catch {
        return port;
      }
    }
  }
  return null;
}

/**
 * 启动 ttyd 进程
 */
async function startTtyd(port: number): Promise<TtydSession | null> {
  return new Promise((resolve) => {
    try {
      // 启动 ttyd
      // -W: 允许写入 (用户可以输入)
      // -t: 终端选项
      // -p: 端口
      const ttydProcess = spawn("ttyd", [
        "-W",
        "-p", String(port),
        "-t", "fontSize=14",
        "-t", "fontFamily=Monaco,Consolas,monospace",
        "-t", "theme={\"background\":\"#1a1b26\",\"foreground\":\"#a9b1d6\"}",
        "/bin/bash"
      ], {
        detached: true,
        stdio: "ignore",
      });

      ttydProcess.unref();

      const session: TtydSession = {
        port,
        pid: ttydProcess.pid!,
        createdAt: new Date(),
      };

      sessions.set(port, session);

      // 等待一小段时间让 ttyd 启动
      setTimeout(() => resolve(session), 500);
    } catch (error) {
      console.error("Failed to start ttyd:", error);
      resolve(null);
    }
  });
}

/**
 * 停止 ttyd 进程
 */
async function stopTtyd(port: number): Promise<boolean> {
  const session = sessions.get(port);
  if (!session) {
    // 尝试通过端口查找并杀死进程
    try {
      await execAsync(`fuser -k ${port}/tcp 2>/dev/null || true`);
      return true;
    } catch {
      return false;
    }
  }

  try {
    process.kill(session.pid, "SIGTERM");
    sessions.delete(port);
    return true;
  } catch {
    // 进程可能已经退出
    sessions.delete(port);
    return true;
  }
}

/**
 * 获取运行中的 ttyd 会话
 */
async function getActiveSessions(): Promise<TtydSession[]> {
  const activeSessions: TtydSession[] = [];

  // 检查内存中的会话是否仍在运行
  for (const [port, session] of sessions) {
    try {
      process.kill(session.pid, 0); // 检查进程是否存在
      activeSessions.push(session);
    } catch {
      // 进程已不存在，从列表中移除
      sessions.delete(port);
    }
  }

  // 也检查可能在面板重启前启动的 ttyd 进程
  try {
    const { stdout } = await execAsync("pgrep -a ttyd || true");
    if (stdout.trim()) {
      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        const match = line.match(/^(\d+).*-p\s+(\d+)/);
        if (match) {
          const pid = parseInt(match[1]);
          const port = parseInt(match[2]);
          if (!sessions.has(port)) {
            const session: TtydSession = {
              port,
              pid,
              createdAt: new Date(),
            };
            sessions.set(port, session);
            activeSessions.push(session);
          }
        }
      }
    }
  } catch {
    // 忽略错误
  }

  return activeSessions;
}

// GET: 获取状态
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "status") {
    const installed = await isTtydInstalled();
    const activeSessions = installed ? await getActiveSessions() : [];

    return NextResponse.json({
      installed,
      sessions: activeSessions.map((s) => ({
        port: s.port,
        pid: s.pid,
        createdAt: s.createdAt,
      })),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST: 创建新终端
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const installed = await isTtydInstalled();
      if (!installed) {
        return NextResponse.json(
          { error: "ttyd 未安装" },
          { status: 400 }
        );
      }

      const port = await findAvailablePort();
      if (!port) {
        return NextResponse.json(
          { error: "没有可用端口" },
          { status: 500 }
        );
      }

      const session = await startTtyd(port);
      if (!session) {
        return NextResponse.json(
          { error: "启动终端失败" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        port: session.port,
        pid: session.pid,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 关闭终端
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { port } = body;

    if (!port) {
      return NextResponse.json(
        { error: "Missing port" },
        { status: 400 }
      );
    }

    const success = await stopTtyd(port);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
