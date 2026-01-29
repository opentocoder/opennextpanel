import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";

// WAF 统计数据
interface WAFStats {
  enabled: boolean;
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  todayBlocked: number;
  ccAttacks: number;
  sqlInjections: number;
  xssAttacks: number;
  ruleCount: number;
  lastUpdate: string;
}

// 初始化WAF表
function initWAFTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS waf_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'custom',
      pattern TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'block',
      enabled INTEGER DEFAULT 1,
      hits INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS waf_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      rule_id INTEGER,
      country TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS waf_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_requests INTEGER DEFAULT 0,
      blocked_requests INTEGER DEFAULT 0,
      cc_attacks INTEGER DEFAULT 0,
      sql_injections INTEGER DEFAULT 0,
      xss_attacks INTEGER DEFAULT 0
    )
  `);

  const ruleCount = db.prepare("SELECT COUNT(*) as count FROM waf_rules").get();
  if (ruleCount.count === 0) {
    const defaultRules = [
      { name: "SQL注入检测", type: "sql", pattern: "(?i)(select|union|insert|update|delete|drop)\\\\s", action: "block" },
      { name: "XSS攻击检测", type: "xss", pattern: "(?i)(<script|javascript:|on\\\\w+=)", action: "block" },
      { name: "路径遍历检测", type: "path", pattern: "(\\\\.\\\\./|\\\\.\\\\.\\\\.)", action: "block" },
      { name: "恶意UA检测", type: "ua", pattern: "(?i)(sqlmap|nikto|nmap|masscan)", action: "block" },
    ];
    const stmt = db.prepare("INSERT INTO waf_rules (name, type, pattern, action, enabled) VALUES (?, ?, ?, ?, 1)");
    for (const rule of defaultRules) {
      stmt.run(rule.name, rule.type, rule.pattern, rule.action);
    }
  }
}

function getWAFStats(db: any): WAFStats {
  const today = new Date().toISOString().split("T")[0];
  db.prepare("INSERT OR IGNORE INTO waf_stats (date) VALUES (?)").run(today);
  const todayStats = db.prepare("SELECT * FROM waf_stats WHERE date = ?").get(today) || {};
  const ruleCount = db.prepare("SELECT COUNT(*) as count FROM waf_rules WHERE enabled = 1").get();
  const wafEnabled = db.prepare("SELECT value FROM settings WHERE key = 'waf_enabled'").get();

  return {
    enabled: wafEnabled?.value !== "false",
    totalRequests: todayStats.total_requests || 0,
    blockedRequests: todayStats.blocked_requests || 0,
    allowedRequests: (todayStats.total_requests || 0) - (todayStats.blocked_requests || 0),
    todayBlocked: todayStats.blocked_requests || 0,
    ccAttacks: todayStats.cc_attacks || 0,
    sqlInjections: todayStats.sql_injections || 0,
    xssAttacks: todayStats.xss_attacks || 0,
    ruleCount: ruleCount?.count || 0,
    lastUpdate: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
}

function getWAFRules(db: any) {
  return db.prepare("SELECT * FROM waf_rules ORDER BY created_at DESC").all().map((r: any) => ({
    id: r.id, name: r.name, type: r.type, pattern: r.pattern, action: r.action,
    enabled: r.enabled === 1, hits: r.hits || 0, createdAt: r.created_at,
  }));
}

function getAttackLogs(db: any, limit: number = 100) {
  return db.prepare("SELECT * FROM waf_logs ORDER BY created_at DESC LIMIT ?").all(limit).map((l: any) => ({
    id: l.id, time: l.created_at, ip: l.ip, method: l.method, path: l.path,
    type: l.type, action: l.action, ruleId: l.rule_id, country: l.country || "",
  }));
}

function getCCConfig(db: any) {
  const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'waf_cc_%'").all();
  const config: Record<string, string> = {};
  for (const s of settings as any[]) { config[s.key] = s.value; }
  return {
    enabled: config.waf_cc_enabled !== "false",
    requestLimit: parseInt(config.waf_cc_request_limit || "60", 10),
    timeWindow: parseInt(config.waf_cc_time_window || "60", 10),
    blockDuration: parseInt(config.waf_cc_block_duration || "3600", 10),
    whitelistIps: config.waf_cc_whitelist ? config.waf_cc_whitelist.split(",") : [],
  };
}

async function handleGET(request: NextRequest) {
  const db = getDatabase();
  try {
    initWAFTables(db);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";

    switch (action) {
      case "stats": return NextResponse.json({ stats: getWAFStats(db) });
      case "rules": return NextResponse.json({ rules: getWAFRules(db) });
      case "logs": return NextResponse.json({ logs: getAttackLogs(db, parseInt(searchParams.get("limit") || "100", 10)) });
      case "cc_config": return NextResponse.json({ config: getCCConfig(db) });
      default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("WAF GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

async function handlePOST(request: NextRequest) {
  const db = getDatabase();
  try {
    initWAFTables(db);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "toggle": {
        db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('waf_enabled', ?, CURRENT_TIMESTAMP)").run(body.enabled ? "true" : "false");
        return NextResponse.json({ success: true });
      }
      case "add_rule": {
        const { rule } = body;
        const result = db.prepare("INSERT INTO waf_rules (name, type, pattern, action, enabled) VALUES (?, ?, ?, ?, ?)").run(rule.name, rule.type, rule.pattern, rule.action, rule.enabled ? 1 : 0);
        return NextResponse.json({ success: true, id: result.lastInsertRowid });
      }
      case "update_rule": {
        const { rule } = body;
        db.prepare("UPDATE waf_rules SET name = ?, type = ?, pattern = ?, action = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(rule.name, rule.type, rule.pattern, rule.action, rule.enabled ? 1 : 0, rule.id);
        return NextResponse.json({ success: true });
      }
      case "delete_rule": {
        db.prepare("DELETE FROM waf_rules WHERE id = ?").run(body.ruleId);
        return NextResponse.json({ success: true });
      }
      case "save_cc_config": {
        const { config } = body;
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
        stmt.run("waf_cc_enabled", config.enabled ? "true" : "false");
        stmt.run("waf_cc_request_limit", String(config.requestLimit));
        stmt.run("waf_cc_time_window", String(config.timeWindow));
        stmt.run("waf_cc_block_duration", String(config.blockDuration));
        stmt.run("waf_cc_whitelist", (config.whitelistIps || []).join(","));
        return NextResponse.json({ success: true });
      }
      default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("WAF POST error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
