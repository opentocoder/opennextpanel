import * as pty from "node-pty";
import { WebSocket } from "ws";

export interface TerminalSession {
  id: string;
  ptyProcess: pty.IPty;
  ws: WebSocket | null;
  createdAt: Date;
  lastActivity: Date;
}

// 存储所有活动的终端会话
const sessions = new Map<string, TerminalSession>();

// 会话超时时间（30分钟）
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * 生成会话ID
 */
function generateSessionId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 创建新的终端会话
 */
export function createTerminalSession(
  shell: string = "/bin/bash",
  cols: number = 80,
  rows: number = 24,
  cwd: string = process.env.HOME || "/root"
): TerminalSession {
  const id = generateSessionId();

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols,
    rows,
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    },
  });

  const session: TerminalSession = {
    id,
    ptyProcess,
    ws: null,
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  sessions.set(id, session);

  // 设置数据事件处理
  ptyProcess.onData((data) => {
    session.lastActivity = new Date();
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(
        JSON.stringify({
          type: "output",
          data,
        })
      );
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(
        JSON.stringify({
          type: "exit",
          code: exitCode,
        })
      );
      session.ws.close();
    }
    sessions.delete(id);
  });

  return session;
}

/**
 * 获取终端会话
 */
export function getTerminalSession(id: string): TerminalSession | undefined {
  return sessions.get(id);
}

/**
 * 关闭终端会话
 */
export function closeTerminalSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session) {
    return false;
  }

  session.ptyProcess.kill();
  if (session.ws) {
    session.ws.close();
  }
  sessions.delete(id);

  return true;
}

/**
 * 向终端发送输入
 */
export function writeToTerminal(id: string, data: string): boolean {
  const session = sessions.get(id);
  if (!session) {
    return false;
  }

  session.lastActivity = new Date();
  session.ptyProcess.write(data);
  return true;
}

/**
 * 调整终端大小
 */
export function resizeTerminal(id: string, cols: number, rows: number): boolean {
  const session = sessions.get(id);
  if (!session) {
    return false;
  }

  session.ptyProcess.resize(cols, rows);
  return true;
}

/**
 * 绑定 WebSocket 到终端会话
 */
export function attachWebSocket(id: string, ws: WebSocket): boolean {
  const session = sessions.get(id);
  if (!session) {
    return false;
  }

  // 断开旧的 WebSocket
  if (session.ws && session.ws.readyState === WebSocket.OPEN) {
    session.ws.close();
  }

  session.ws = ws;

  // 处理来自 WebSocket 的消息
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      session.lastActivity = new Date();

      switch (data.type) {
        case "input":
          session.ptyProcess.write(data.data);
          break;
        case "resize":
          session.ptyProcess.resize(data.cols, data.rows);
          break;
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    } catch {
      // 如果不是 JSON，直接作为输入发送
      session.ptyProcess.write(message.toString());
    }
  });

  ws.on("close", () => {
    // 不要立即关闭 pty，允许重新连接
    session.ws = null;
  });

  ws.on("error", () => {
    session.ws = null;
  });

  // 发送会话信息
  ws.send(
    JSON.stringify({
      type: "connected",
      sessionId: id,
    })
  );

  return true;
}

/**
 * 列出所有活动会话
 */
export function listSessions(): {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  connected: boolean;
}[] {
  return Array.from(sessions.values()).map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    connected: session.ws !== null && session.ws.readyState === WebSocket.OPEN,
  }));
}

/**
 * 清理过期会话
 */
export function cleanupSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    const inactive = now - session.lastActivity.getTime();
    const disconnected = !session.ws || session.ws.readyState !== WebSocket.OPEN;

    // 如果会话断开连接且超过5分钟，或者超过30分钟不活动
    if ((disconnected && inactive > 5 * 60 * 1000) || inactive > SESSION_TIMEOUT) {
      closeTerminalSession(id);
      cleaned++;
    }
  }

  return cleaned;
}

// 定期清理过期会话
setInterval(cleanupSessions, 60 * 1000);

/**
 * 获取会话统计信息
 */
export function getSessionStats(): {
  total: number;
  connected: number;
  disconnected: number;
} {
  let connected = 0;
  let disconnected = 0;

  for (const session of sessions.values()) {
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      connected++;
    } else {
      disconnected++;
    }
  }

  return {
    total: sessions.size,
    connected,
    disconnected,
  };
}
