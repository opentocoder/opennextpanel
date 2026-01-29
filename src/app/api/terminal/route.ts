import { NextRequest, NextResponse } from "next/server";
import {
  createTerminalSession,
  getTerminalSession,
  closeTerminalSession,
  writeToTerminal,
  resizeTerminal,
  listSessions,
  getSessionStats,
} from "@/lib/system/terminal";

// GET: 列出会话或获取统计信息
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "stats") {
    return NextResponse.json(getSessionStats());
  }

  return NextResponse.json(listSessions());
}

// POST: 创建新会话或发送命令
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, data, cols, rows, shell, cwd } = body;

    switch (action) {
      case "create": {
        const session = createTerminalSession(
          shell || "/bin/bash",
          cols || 80,
          rows || 24,
          cwd || process.env.HOME
        );
        return NextResponse.json({
          success: true,
          sessionId: session.id,
        });
      }

      case "write": {
        if (!sessionId || data === undefined) {
          return NextResponse.json(
            { error: "Missing sessionId or data" },
            { status: 400 }
          );
        }
        const success = writeToTerminal(sessionId, data);
        if (!success) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      case "resize": {
        if (!sessionId || !cols || !rows) {
          return NextResponse.json(
            { error: "Missing sessionId, cols, or rows" },
            { status: 400 }
          );
        }
        const success = resizeTerminal(sessionId, cols, rows);
        if (!success) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 关闭会话
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const success = closeTerminalSession(sessionId);
  if (!success) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
