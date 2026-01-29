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

interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
}

// Calculate risk level and return specific risks
function calculateRiskLevel(stats: Partial<SecurityStats>): { level: "low" | "medium" | "high"; risks: number; riskItems: RiskItem[] } {
  let risks = 0;
  const riskItems: RiskItem[] = [];

  // Check SSH port
  if (stats.sshPort === 22) {
    risks += 1;
    riskItems.push({
      id: "ssh_port",
      title: "SSH 使用默认端口",
      description: "SSH 端口为 22，容易被扫描和攻击",
      severity: "medium",
      suggestion: "建议修改为其他端口（如 2222、10022 等）",
    });
  }

  // Check firewall
  if (!stats.firewallEnabled) {
    risks += 2;
    riskItems.push({
      id: "firewall",
      title: "防火墙未启用",
      description: "系统防火墙（UFW/firewalld）未启用，服务器暴露在网络攻击风险中",
      severity: "high",
      suggestion: "建议启用防火墙并配置规则",
    });
  }

  // Check for failed logins
  if ((stats.failedLogins || 0) > 10) {
    risks += 2;
    riskItems.push({
      id: "failed_logins",
      title: "大量登录失败",
      description: `检测到 ${stats.failedLogins} 次登录失败，可能正在遭受暴力破解攻击`,
      severity: "high",
      suggestion: "建议启用 fail2ban 并检查可疑 IP",
    });
  } else if ((stats.failedLogins || 0) > 5) {
    risks += 1;
    riskItems.push({
      id: "failed_logins",
      title: "多次登录失败",
      description: `检测到 ${stats.failedLogins} 次登录失败`,
      severity: "medium",
      suggestion: "建议关注登录日志，必要时启用 fail2ban",
    });
  }

  const level = risks >= 4 ? "high" : risks >= 2 ? "medium" : "low";
  return { level, risks, riskItems };
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

      const { level, risks, riskItems } = calculateRiskLevel(partialStats);

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

      return NextResponse.json({ stats, riskItems, recentRecords: records.slice(0, 10) });
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

// 修改 SSH 端口 - 使用 execFileSync 避免命令注入
async function changeSSHPort(newPort: number): Promise<{ success: boolean; message: string }> {
  const { execFileSync } = require("child_process");
  const currentPort = getSshPort();

  // 严格验证端口号
  if (!Number.isInteger(newPort) || newPort < 1 || newPort > 65535) {
    return { success: false, message: "端口号必须在 1-65535 之间的整数" };
  }

  if (newPort === currentPort) {
    return { success: true, message: "端口未变化" };
  }

  try {
    // 1. 先在防火墙中允许新端口
    try {
      // 尝试 UFW
      execFileSync("ufw", ["allow", `${newPort}/tcp`], { stdio: "pipe" });
    } catch {
      // 尝试 firewalld
      try {
        execFileSync("firewall-cmd", ["--permanent", `--add-port=${newPort}/tcp`], { stdio: "pipe" });
        execFileSync("firewall-cmd", ["--reload"], { stdio: "pipe" });
      } catch {
        // 没有防火墙或防火墙未启用，继续
      }
    }

    // 2. 修改 SSH 配置
    const sshdConfig = fs.readFileSync("/etc/ssh/sshd_config", "utf-8");
    let newConfig = sshdConfig;

    // 替换或添加 Port 配置
    if (/^Port\s+\d+/m.test(sshdConfig)) {
      newConfig = sshdConfig.replace(/^Port\s+\d+/m, `Port ${newPort}`);
    } else if (/^#Port\s+\d+/m.test(sshdConfig)) {
      newConfig = sshdConfig.replace(/^#Port\s+\d+/m, `Port ${newPort}`);
    } else {
      newConfig = `Port ${newPort}\n` + sshdConfig;
    }

    fs.writeFileSync("/etc/ssh/sshd_config", newConfig, "utf-8");

    // 3. 重启 SSH 服务
    try {
      execFileSync("systemctl", ["restart", "sshd"], { stdio: "pipe" });
    } catch {
      execFileSync("systemctl", ["restart", "ssh"], { stdio: "pipe" });
    }

    return { success: true, message: `SSH 端口已修改为 ${newPort}，请使用新端口连接测试` };
  } catch (error: any) {
    return { success: false, message: `修改失败: ${error.message}` };
  }
}

// 切换防火墙状态
async function toggleFirewall(enable: boolean): Promise<{ success: boolean; message: string }> {
  const { execFileSync } = require("child_process");

  try {
    const sshPort = getSshPort();

    if (enable) {
      // 启用防火墙前，确保 SSH 和面板端口已允许
      try {
        execFileSync("ufw", ["allow", `${sshPort}/tcp`], { stdio: "pipe" });
        execFileSync("ufw", ["allow", "8888/tcp"], { stdio: "pipe" });
        execFileSync("ufw", ["--force", "enable"], { stdio: "pipe" });
        return { success: true, message: "防火墙已启用" };
      } catch {
        // 尝试 firewalld
        execFileSync("firewall-cmd", ["--permanent", `--add-port=${sshPort}/tcp`], { stdio: "pipe" });
        execFileSync("firewall-cmd", ["--permanent", "--add-port=8888/tcp"], { stdio: "pipe" });
        execFileSync("systemctl", ["start", "firewalld"], { stdio: "pipe" });
        execFileSync("firewall-cmd", ["--reload"], { stdio: "pipe" });
        return { success: true, message: "防火墙已启用" };
      }
    } else {
      try {
        execFileSync("ufw", ["disable"], { stdio: "pipe" });
        return { success: true, message: "防火墙已禁用" };
      } catch {
        execFileSync("systemctl", ["stop", "firewalld"], { stdio: "pipe" });
        return { success: true, message: "防火墙已禁用" };
      }
    }
  } catch (error: any) {
    return { success: false, message: `操作失败: ${error.message}` };
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, settings } = body;

    if (action === "save_settings") {
      const db = getDatabase();
      const results: { field: string; success: boolean; message: string }[] = [];

      try {
        const stmt = db.prepare(
          "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)"
        );

        // 修改 SSH 端口
        if (settings.sshPort) {
          const sshResult = await changeSSHPort(parseInt(settings.sshPort, 10));
          results.push({ field: "sshPort", ...sshResult });
        }

        // 修改面板端口（只保存，需要重启生效）
        if (settings.panelPort) {
          stmt.run("panel_port", String(settings.panelPort));
          results.push({ field: "panelPort", success: true, message: "已保存，重启面板后生效" });
        }

        // 修改安全入口
        if (settings.securityPath) {
          stmt.run("security_path", settings.securityPath);
          results.push({ field: "securityPath", success: true, message: "安全入口已更新" });
        }

        // 切换防火墙
        if (settings.firewallEnabled !== undefined) {
          const fwResult = await toggleFirewall(settings.firewallEnabled);
          results.push({ field: "firewall", ...fwResult });
        }

        // IP 白名单/黑名单
        if (settings.ipWhitelist) {
          stmt.run("security_ip_whitelist", settings.ipWhitelist.join(","));
        }
        if (settings.ipBlacklist) {
          stmt.run("security_ip_blacklist", settings.ipBlacklist.join(","));
        }

        const hasError = results.some(r => !r.success);
        return NextResponse.json({
          success: !hasError,
          results,
          message: hasError ? "部分设置保存失败" : "设置已保存"
        });
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
