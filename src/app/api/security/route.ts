import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

interface LoginRecord {
  id: number;
  username: string;
  ip: string;
  status: "success" | "failed";
  time: string;
  location: string;
}

interface SecurityStats {
  riskLevel: "low" | "medium" | "high";
  totalRisks: number;
  sshPort: number;
  panelPort: number;
  securityPath: string;
  firewallEnabled: boolean;
  failedLogins: number;
  blockedIps: number;
}

// Parse auth.log for login records
function parseAuthLog(): LoginRecord[] {
  const records: LoginRecord[] = [];
  const authLogPaths = [
    "/var/log/auth.log",
    "/var/log/secure",
  ];

  let logContent = "";
  for (const logPath of authLogPaths) {
    try {
      if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, "utf-8");
        break;
      }
    } catch {
      continue;
    }
  }

  if (!logContent) {
    return records;
  }

  const lines = logContent.split("\n").slice(-500); // Last 500 lines
  let id = 1;

  for (const line of lines) {
    // Parse SSH login attempts
    // Successful: "Accepted password for user from IP"
    // Failed: "Failed password for user from IP"
    const successMatch = line.match(
      /(\w+\s+\d+\s+[\d:]+).*Accepted\s+(?:password|publickey)\s+for\s+(\w+)\s+from\s+([\d.]+)/
    );
    const failedMatch = line.match(
      /(\w+\s+\d+\s+[\d:]+).*Failed\s+password\s+for\s+(?:invalid user\s+)?(\w+)\s+from\s+([\d.]+)/
    );

    if (successMatch) {
      records.push({
        id: id++,
        username: successMatch[2],
        ip: successMatch[3],
        status: "success",
        time: parseLogTime(successMatch[1]),
        location: getIpLocation(successMatch[3]),
      });
    } else if (failedMatch) {
      records.push({
        id: id++,
        username: failedMatch[2],
        ip: failedMatch[3],
        status: "failed",
        time: parseLogTime(failedMatch[1]),
        location: getIpLocation(failedMatch[3]),
      });
    }
  }

  // Return most recent first, limited to 100
  return records.reverse().slice(0, 100);
}

// Parse log time format
function parseLogTime(timeStr: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const parsed = new Date(`${timeStr} ${year}`);
  if (isNaN(parsed.getTime())) {
    return timeStr;
  }
  return parsed.toISOString().replace("T", " ").substring(0, 19);
}

// Simple IP location detection (local vs remote)
function getIpLocation(ip: string): string {
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.") || ip === "127.0.0.1") {
    return "本地网络";
  }
  return "外部网络";
}

// Get SSH port from sshd config
function getSshPort(): number {
  try {
    const sshdConfig = fs.readFileSync("/etc/ssh/sshd_config", "utf-8");
    const portMatch = sshdConfig.match(/^Port\s+(\d+)/m);
    if (portMatch) {
      return parseInt(portMatch[1], 10);
    }
  } catch {
    // Default SSH port
  }
  return 22;
}

// Check if firewall is enabled
function isFirewallEnabled(): boolean {
  try {
    // Check UFW
    const ufwStatus = fs.readFileSync("/etc/ufw/ufw.conf", "utf-8");
    if (ufwStatus.includes("ENABLED=yes")) {
      return true;
    }
  } catch {
    // UFW not available
  }

  try {
    // Check firewalld
    if (fs.existsSync("/var/run/firewalld.pid")) {
      return true;
    }
  } catch {
    // firewalld not available
  }

  return false;
}

// Get security settings from database
function getSecuritySettings() {
  const db = getDatabase();
  try {
    const stmt = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'security_%' OR key IN ('panel_port', 'security_path')");
    const rows = stmt.all() as { key: string; value: string }[];

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  } finally {
    db.close();
  }
}

// Calculate risk level
function calculateRiskLevel(stats: Partial<SecurityStats>): { level: "low" | "medium" | "high"; risks: number } {
  let risks = 0;

  // Check for high number of failed logins
  if ((stats.failedLogins || 0) > 10) risks += 2;
  else if ((stats.failedLogins || 0) > 5) risks += 1;

  // Check SSH port
  if (stats.sshPort === 22) risks += 1;

  // Check firewall
  if (!stats.firewallEnabled) risks += 2;

  const level = risks >= 4 ? "high" : risks >= 2 ? "medium" : "low";
  return { level, risks };
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";

    if (action === "logs" || action === "records") {
      const records = parseAuthLog();
      return NextResponse.json({ records });
    }

    if (action === "stats") {
      const records = parseAuthLog();
      const settings = getSecuritySettings();
      const sshPort = getSshPort();
      const firewallEnabled = isFirewallEnabled();

      const failedLogins = records.filter((r) => r.status === "failed").length;
      const uniqueFailedIps = new Set(records.filter((r) => r.status === "failed").map((r) => r.ip));

      const partialStats: Partial<SecurityStats> = {
        sshPort,
        firewallEnabled,
        failedLogins,
      };

      const { level, risks } = calculateRiskLevel(partialStats);

      const stats: SecurityStats = {
        riskLevel: level,
        totalRisks: risks,
        sshPort,
        panelPort: parseInt(settings.panel_port || "8888", 10),
        securityPath: settings.security_path || "/open_panel",
        firewallEnabled,
        failedLogins,
        blockedIps: uniqueFailedIps.size,
      };

      return NextResponse.json({ stats, recentRecords: records.slice(0, 10) });
    }

    if (action === "settings") {
      const settings = getSecuritySettings();
      const sshPort = getSshPort();
      const firewallEnabled = isFirewallEnabled();

      return NextResponse.json({
        settings: {
          sshPort,
          panelPort: parseInt(settings.panel_port || "8888", 10),
          securityPath: settings.security_path || "/open_panel",
          firewallEnabled,
          ipWhitelist: settings.security_ip_whitelist ? settings.security_ip_whitelist.split(",") : [],
          ipBlacklist: settings.security_ip_blacklist ? settings.security_ip_blacklist.split(",") : [],
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch security data:", error);
    return NextResponse.json(
      { error: `Failed to fetch security data: ${error}` },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, settings } = body;

    if (action === "save_settings") {
      const db = getDatabase();
      try {
        const stmt = db.prepare(
          "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
        );

        if (settings.panelPort) {
          stmt.run("panel_port", String(settings.panelPort));
        }
        if (settings.securityPath) {
          stmt.run("security_path", settings.securityPath);
        }
        if (settings.ipWhitelist) {
          stmt.run("security_ip_whitelist", settings.ipWhitelist.join(","));
        }
        if (settings.ipBlacklist) {
          stmt.run("security_ip_blacklist", settings.ipBlacklist.join(","));
        }

        return NextResponse.json({ success: true, message: "Settings saved" });
      } finally {
        db.close();
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to save security settings:", error);
    return NextResponse.json(
      { error: `Failed to save security settings: ${error}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
