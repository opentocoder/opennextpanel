import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";
import * as os from "os";
import * as fs from "fs";

interface MonitorData {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  memory_used: number;
  disk_read: number;
  disk_write: number;
  net_in: number;
  net_out: number;
  load_1: number;
  load_5: number;
  load_15: number;
  created_at: string;
}

// Get current system stats
async function getCurrentStats(): Promise<Omit<MonitorData, "created_at">> {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Calculate CPU usage
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  const cpuUsage = 100 - (totalIdle / totalTick) * 100;

  // Try to get disk I/O stats from /proc/diskstats (Linux)
  let diskRead = 0;
  let diskWrite = 0;
  try {
    const diskStats = fs.readFileSync("/proc/diskstats", "utf-8");
    const lines = diskStats.split("\n");
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 14 && (parts[2].startsWith("sd") || parts[2].startsWith("nvme"))) {
        diskRead += parseInt(parts[5], 10) * 512; // sectors read * 512 bytes
        diskWrite += parseInt(parts[9], 10) * 512; // sectors written * 512 bytes
      }
    }
  } catch {
    // Not Linux or no access
  }

  // Try to get network stats from /proc/net/dev (Linux)
  let netIn = 0;
  let netOut = 0;
  try {
    const netStats = fs.readFileSync("/proc/net/dev", "utf-8");
    const lines = netStats.split("\n").slice(2);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 10 && !parts[0].startsWith("lo")) {
        netIn += parseInt(parts[1], 10);
        netOut += parseInt(parts[9], 10);
      }
    }
  } catch {
    // Not Linux or no access
  }

  return {
    cpu_usage: Math.round(cpuUsage * 100) / 100,
    memory_usage: Math.round((usedMem / totalMem) * 100 * 100) / 100,
    memory_total: totalMem,
    memory_used: usedMem,
    disk_read: diskRead,
    disk_write: diskWrite,
    net_in: netIn,
    net_out: netOut,
    load_1: loadAvg[0],
    load_5: loadAvg[1],
    load_15: loadAvg[2],
  };
}

// Record current stats to database
function recordStats(stats: Omit<MonitorData, "created_at">) {
  const db = getDatabase();
  try {
    const stmt = db.prepare(`
      INSERT INTO monitor_history
      (cpu_usage, memory_usage, memory_total, memory_used, disk_read, disk_write, net_in, net_out, load_1, load_5, load_15)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      stats.cpu_usage,
      stats.memory_usage,
      stats.memory_total,
      stats.memory_used,
      stats.disk_read,
      stats.disk_write,
      stats.net_in,
      stats.net_out,
      stats.load_1,
      stats.load_5,
      stats.load_15
    );

    // Clean up old data (keep 30 days)
    db.prepare(`
      DELETE FROM monitor_history
      WHERE created_at < datetime('now', '-30 days')
    `).run();
  } finally {
    db.close();
  }
}

// Get history data
function getHistory(range: string): MonitorData[] {
  const db = getDatabase();
  try {
    let interval: string;
    let groupBy: string;

    switch (range) {
      case "1h":
        interval = "-1 hour";
        groupBy = "strftime('%Y-%m-%d %H:%M', created_at)";
        break;
      case "6h":
        interval = "-6 hours";
        groupBy = "strftime('%Y-%m-%d %H:%M', datetime(created_at, '-' || (strftime('%M', created_at) % 5) || ' minutes'))";
        break;
      case "24h":
        interval = "-24 hours";
        groupBy = "strftime('%Y-%m-%d %H:%M', datetime(created_at, '-' || (strftime('%M', created_at) % 15) || ' minutes'))";
        break;
      case "7d":
        interval = "-7 days";
        groupBy = "strftime('%Y-%m-%d %H', created_at)";
        break;
      case "30d":
        interval = "-30 days";
        groupBy = "strftime('%Y-%m-%d %H', created_at)";
        break;
      default:
        interval = "-1 hour";
        groupBy = "strftime('%Y-%m-%d %H:%M', created_at)";
    }

    const stmt = db.prepare(`
      SELECT
        AVG(cpu_usage) as cpu_usage,
        AVG(memory_usage) as memory_usage,
        AVG(memory_total) as memory_total,
        AVG(memory_used) as memory_used,
        AVG(disk_read) as disk_read,
        AVG(disk_write) as disk_write,
        AVG(net_in) as net_in,
        AVG(net_out) as net_out,
        AVG(load_1) as load_1,
        AVG(load_5) as load_5,
        AVG(load_15) as load_15,
        ${groupBy} as created_at
      FROM monitor_history
      WHERE created_at >= datetime('now', ?)
      GROUP BY ${groupBy}
      ORDER BY created_at ASC
    `);

    return stmt.all(interval) as MonitorData[];
  } finally {
    db.close();
  }
}

// Get stats summary
function getStatsSummary(range: string) {
  const db = getDatabase();
  try {
    let interval: string;
    switch (range) {
      case "1h":
        interval = "-1 hour";
        break;
      case "6h":
        interval = "-6 hours";
        break;
      case "24h":
        interval = "-24 hours";
        break;
      case "7d":
        interval = "-7 days";
        break;
      case "30d":
        interval = "-30 days";
        break;
      default:
        interval = "-1 hour";
    }

    const stmt = db.prepare(`
      SELECT
        AVG(cpu_usage) as cpuAvg,
        MAX(cpu_usage) as cpuMax,
        AVG(memory_usage) as memoryAvg,
        MAX(memory_usage) as memoryMax,
        AVG(disk_read) as diskReadAvg,
        AVG(disk_write) as diskWriteAvg,
        SUM(net_in) as netInTotal,
        SUM(net_out) as netOutTotal
      FROM monitor_history
      WHERE created_at >= datetime('now', ?)
    `);

    const result = stmt.get(interval) as Record<string, number> | undefined;
    return result || {
      cpuAvg: 0,
      cpuMax: 0,
      memoryAvg: 0,
      memoryMax: 0,
      diskReadAvg: 0,
      diskWriteAvg: 0,
      netInTotal: 0,
      netOutTotal: 0,
    };
  } finally {
    db.close();
  }
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "history";
    const range = searchParams.get("range") || "1h";

    if (action === "current") {
      const stats = await getCurrentStats();
      return NextResponse.json({ stats });
    }

    if (action === "history") {
      const history = getHistory(range);
      const summary = getStatsSummary(range);
      return NextResponse.json({ history, summary });
    }

    if (action === "summary") {
      const summary = getStatsSummary(range);
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch monitor data:", error);
    return NextResponse.json(
      { error: `Failed to fetch monitor data: ${error}` },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "record") {
      const stats = await getCurrentStats();
      recordStats(stats);
      return NextResponse.json({ success: true, stats });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to record monitor data:", error);
    return NextResponse.json(
      { error: `Failed to record monitor data: ${error}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
