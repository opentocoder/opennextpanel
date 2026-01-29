import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
}

interface SiteLog {
  name: string;
  path: string;
}

// Log file paths
const LOG_PATHS = {
  syslog: ["/var/log/syslog", "/var/log/messages"],
  nginx_access: ["/var/log/nginx/access.log", "/www/wwwlogs/access.log"],
  nginx_error: ["/var/log/nginx/error.log", "/www/wwwlogs/error.log"],
  auth: ["/var/log/auth.log", "/var/log/secure"],
  mysql: ["/var/log/mysql/error.log", "/var/log/mariadb/mariadb.log"],
  php: ["/var/log/php-fpm/error.log", "/var/log/php-fpm.log"],
};

// Read and parse log file
function readLogFile(logPath: string, limit = 200): string[] {
  try {
    if (!fs.existsSync(logPath)) {
      return [];
    }
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    return lines.slice(-limit).reverse();
  } catch {
    return [];
  }
}

// Find first existing log file from candidates
function findLogFile(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// Parse syslog format
function parseSyslog(lines: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  let id = 1;

  for (const line of lines) {
    // Format: "Jan 29 10:30:00 hostname source[pid]: message"
    const match = line.match(
      /^(\w+\s+\d+\s+[\d:]+)\s+\S+\s+([^:\[]+)(?:\[\d+\])?:\s*(.+)$/
    );

    if (match) {
      const timestamp = parseLogTime(match[1]);
      const source = match[2].trim();
      const message = match[3];

      let level: LogEntry["level"] = "info";
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("error") || lowerMessage.includes("fail")) {
        level = "error";
      } else if (lowerMessage.includes("warn")) {
        level = "warning";
      }

      entries.push({ id: id++, timestamp, level, source, message });
    }
  }

  return entries;
}

// Parse nginx access log format
function parseNginxAccess(lines: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  let id = 1;

  for (const line of lines) {
    // Common log format: IP - - [timestamp] "method path" status size
    const match = line.match(
      /^([\d.]+)\s+-\s+-\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d+)\s+(\d+)/
    );

    if (match) {
      const ip = match[1];
      const timestamp = parseNginxTime(match[2]);
      const request = match[3];
      const status = parseInt(match[4], 10);

      let level: LogEntry["level"] = "info";
      if (status >= 500) level = "error";
      else if (status >= 400) level = "warning";

      entries.push({
        id: id++,
        timestamp,
        level,
        source: ip,
        message: `[${status}] ${request}`,
      });
    }
  }

  return entries;
}

// Parse nginx error log format
function parseNginxError(lines: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  let id = 1;

  for (const line of lines) {
    // Format: "YYYY/MM/DD HH:MM:SS [level] pid#tid: message"
    const match = line.match(
      /^([\d/]+\s+[\d:]+)\s+\[(\w+)\]\s+\d+#\d+:\s*(.+)$/
    );

    if (match) {
      const timestamp = match[1].replace(/\//g, "-");
      const levelStr = match[2].toLowerCase();
      const message = match[3];

      let level: LogEntry["level"] = "info";
      if (levelStr === "error" || levelStr === "crit" || levelStr === "alert" || levelStr === "emerg") {
        level = "error";
      } else if (levelStr === "warn") {
        level = "warning";
      }

      entries.push({ id: id++, timestamp, level, source: "nginx", message });
    }
  }

  return entries;
}

// Parse log time
function parseLogTime(timeStr: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const parsed = new Date(`${timeStr} ${year}`);
  if (isNaN(parsed.getTime())) {
    return timeStr;
  }
  return parsed.toISOString().replace("T", " ").substring(0, 19);
}

// Parse nginx time format
function parseNginxTime(timeStr: string): string {
  // Format: "29/Jan/2026:10:30:00 +0900"
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };

  const match = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+:\d+:\d+)/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = months[match[2]] || "01";
    const year = match[3];
    const time = match[4];
    return `${year}-${month}-${day} ${time}`;
  }
  return timeStr;
}

// Get panel logs from database
function getPanelLogs(limit = 100): LogEntry[] {
  const db = getDatabase();
  try {
    const stmt = db.prepare(`
      SELECT id, action as source, content as message, created_at as timestamp
      FROM logs
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as { id: number; source: string; message: string; timestamp: string }[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      level: "info" as const,
      source: row.source || "System",
      message: row.message || "",
    }));
  } finally {
    db.close();
  }
}

// Get site log files
function getSiteLogs(): SiteLog[] {
  const siteLogs: SiteLog[] = [];
  const logDirs = ["/www/wwwlogs", "/var/log/nginx/sites"];

  for (const dir of logDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".log") && !file.includes("error")) {
            const name = file.replace(/\.log$/, "").replace(/_access$/, "");
            siteLogs.push({
              name,
              path: path.join(dir, file),
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return siteLogs;
}

// Read specific log file content
function readSpecificLog(logPath: string, tail = 100): string {
  try {
    if (!fs.existsSync(logPath)) {
      return "Log file not found";
    }
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    return lines.slice(-tail).join("\n");
  } catch (error) {
    return `Error reading log: ${error}`;
  }
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "panel";
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const logPath = searchParams.get("path");

    // Read specific log file
    if (logPath) {
      const content = readSpecificLog(logPath, limit);
      return NextResponse.json({ content });
    }

    // Get different log types
    switch (type) {
      case "panel": {
        const logs = getPanelLogs(limit);
        return NextResponse.json({ logs });
      }

      case "system": {
        const logFile = findLogFile(LOG_PATHS.syslog);
        if (logFile) {
          const lines = readLogFile(logFile, limit);
          const logs = parseSyslog(lines);
          return NextResponse.json({ logs });
        }
        return NextResponse.json({ logs: [] });
      }

      case "nginx_access": {
        const logFile = findLogFile(LOG_PATHS.nginx_access);
        if (logFile) {
          const lines = readLogFile(logFile, limit);
          const logs = parseNginxAccess(lines);
          return NextResponse.json({ logs });
        }
        return NextResponse.json({ logs: [] });
      }

      case "nginx_error": {
        const logFile = findLogFile(LOG_PATHS.nginx_error);
        if (logFile) {
          const lines = readLogFile(logFile, limit);
          const logs = parseNginxError(lines);
          return NextResponse.json({ logs });
        }
        return NextResponse.json({ logs: [] });
      }

      case "sites": {
        const siteLogs = getSiteLogs();
        return NextResponse.json({ siteLogs });
      }

      case "all": {
        const panelLogs = getPanelLogs(50);

        const syslogFile = findLogFile(LOG_PATHS.syslog);
        const systemLogs = syslogFile
          ? parseSyslog(readLogFile(syslogFile, 50))
          : [];

        const siteLogs = getSiteLogs();

        return NextResponse.json({ panelLogs, systemLogs, siteLogs });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: `Failed to fetch logs: ${error}` },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, logPath, type } = body;

    if (action === "clear") {
      // Clear panel logs from database
      if (type === "panel") {
        const db = getDatabase();
        try {
          db.prepare("DELETE FROM logs").run();
          return NextResponse.json({ success: true, message: "Panel logs cleared" });
        } finally {
          db.close();
        }
      }

      // For system logs, we don't actually clear them (requires root)
      return NextResponse.json({
        success: false,
        message: "System logs cannot be cleared without root privileges",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process logs action:", error);
    return NextResponse.json(
      { error: `Failed to process logs action: ${error}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
