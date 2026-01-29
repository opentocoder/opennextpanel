import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";

function initReportsTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER,
      date TEXT NOT NULL,
      pv INTEGER DEFAULT 0,
      uv INTEGER DEFAULT 0,
      ip INTEGER DEFAULT 0,
      bandwidth INTEGER DEFAULT 0,
      UNIQUE(site_id, date)
    )
  `);
}

async function handleGET(request: NextRequest) {
  const db = getDatabase();
  try {
    initReportsTables(db);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    
    let dateCondition = "date = date('now')";
    if (period === "week") dateCondition = "date >= date('now', '-7 days')";
    if (period === "month") dateCondition = "date >= date('now', '-30 days')";

    const dailyStats = db.prepare(`
      SELECT date, SUM(pv) as pv, SUM(uv) as uv, SUM(ip) as ip
      FROM site_stats WHERE ${dateCondition}
      GROUP BY date ORDER BY date DESC LIMIT 30
    `).all();

    const siteStats = db.prepare(`
      SELECT s.id as siteId, s.name as siteName, s.domain,
        COALESCE(SUM(st.pv), 0) as pv, COALESCE(SUM(st.uv), 0) as uv,
        COALESCE(SUM(st.ip), 0) as ip, COALESCE(SUM(st.bandwidth), 0) as bandwidth
      FROM sites s LEFT JOIN site_stats st ON s.id = st.site_id AND ${dateCondition}
      GROUP BY s.id ORDER BY pv DESC
    `).all();

    const totals = db.prepare(`
      SELECT COALESCE(SUM(pv), 0) as pv, COALESCE(SUM(uv), 0) as uv,
        COALESCE(SUM(ip), 0) as ip, COALESCE(SUM(bandwidth), 0) as bandwidth
      FROM site_stats WHERE ${dateCondition}
    `).get() || { pv: 0, uv: 0, ip: 0, bandwidth: 0 };

    return NextResponse.json({ dailyStats, siteStats, totals });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

export const GET = withAuth(handleGET);
