import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";

function initMailTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      domain_id INTEGER,
      password TEXT,
      quota INTEGER DEFAULT 1024,
      quota_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (domain_id) REFERENCES mail_domains(id)
    )
  `);
}

async function handleGET(request: NextRequest) {
  const db = getDatabase();
  try {
    initMailTables(db);
    const domains = db.prepare(`
      SELECT d.*, (SELECT COUNT(*) FROM mail_accounts WHERE domain_id = d.id) as accounts
      FROM mail_domains d ORDER BY created_at DESC
    `).all().map((d: any) => ({
      id: d.id, domain: d.domain, accounts: d.accounts, status: d.status, createdAt: d.created_at
    }));
    const accounts = db.prepare(`
      SELECT a.*, d.domain FROM mail_accounts a
      LEFT JOIN mail_domains d ON a.domain_id = d.id ORDER BY a.created_at DESC
    `).all().map((a: any) => ({
      id: a.id, email: a.email, domain: a.domain, quota: a.quota, quotaUsed: a.quota_used, status: a.status
    }));
    const stats = { totalDomains: domains.length, totalAccounts: accounts.length, totalSent: 0, totalReceived: 0 };
    return NextResponse.json({ domains, accounts, stats });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

async function handlePOST(request: NextRequest) {
  const db = getDatabase();
  try {
    initMailTables(db);
    const body = await request.json();
    const { action } = body;

    if (action === "add_domain") {
      db.prepare("INSERT INTO mail_domains (domain) VALUES (?)").run(body.domain);
      return NextResponse.json({ success: true });
    }
    if (action === "add_account") {
      const domain = db.prepare("SELECT id FROM mail_domains WHERE domain = ?").get(body.domain) as any;
      if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 400 });
      db.prepare("INSERT INTO mail_accounts (email, domain_id, password, quota) VALUES (?, ?, ?, ?)").run(
        body.email + "@" + body.domain, domain.id, body.password, body.quota || 1024
      );
      return NextResponse.json({ success: true });
    }
    if (action === "delete_domain") {
      db.prepare("DELETE FROM mail_accounts WHERE domain_id = ?").run(body.id);
      db.prepare("DELETE FROM mail_domains WHERE id = ?").run(body.id);
      return NextResponse.json({ success: true });
    }
    if (action === "delete_account") {
      db.prepare("DELETE FROM mail_accounts WHERE id = ?").run(body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
