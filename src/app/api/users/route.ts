import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";

function initUsersTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS panel_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      quota_sites INTEGER DEFAULT 10,
      quota_sites_used INTEGER DEFAULT 0,
      quota_databases INTEGER DEFAULT 10,
      quota_databases_used INTEGER DEFAULT 0,
      quota_storage INTEGER DEFAULT 10240,
      quota_storage_used INTEGER DEFAULT 0,
      quota_bandwidth INTEGER DEFAULT 102400,
      quota_bandwidth_used INTEGER DEFAULT 0,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function formatUser(row: any) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status,
    quota: {
      sites: row.quota_sites,
      sitesUsed: row.quota_sites_used,
      databases: row.quota_databases,
      databasesUsed: row.quota_databases_used,
      storage: row.quota_storage,
      storageUsed: row.quota_storage_used,
      bandwidth: row.quota_bandwidth,
      bandwidthUsed: row.quota_bandwidth_used,
    },
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

async function handleGET(request: NextRequest) {
  const db = getDatabase();
  try {
    initUsersTables(db);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const user = db.prepare("SELECT * FROM panel_users WHERE id = ?").get(parseInt(id));
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json({ user: formatUser(user) });
    }
    const users = db.prepare("SELECT * FROM panel_users ORDER BY created_at DESC").all();
    return NextResponse.json({ users: users.map(formatUser) });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

async function handlePOST(request: NextRequest) {
  const db = getDatabase();
  try {
    initUsersTables(db);
    const body = await request.json();
    const { username, email, password, role, quota } = body;
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email and password are required" }, { status: 400 });
    }
    const existing = db.prepare("SELECT id FROM panel_users WHERE username = ? OR email = ?").get(username, email);
    if (existing) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO panel_users (username, email, password, role, quota_sites, quota_databases, quota_storage, quota_bandwidth)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, email, hashedPassword, role || "user", quota?.sites || 10, quota?.databases || 10, quota?.storage || 10240, quota?.bandwidth || 102400);
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

async function handlePUT(request: NextRequest) {
  const db = getDatabase();
  try {
    initUsersTables(db);
    const body = await request.json();
    const { id, username, email, password, role, status, quota } = body;
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    const user = db.prepare("SELECT * FROM panel_users WHERE id = ?").get(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const updates: string[] = [];
    const values: any[] = [];
    if (username) { updates.push("username = ?"); values.push(username); }
    if (email) { updates.push("email = ?"); values.push(email); }
    if (password) { updates.push("password = ?"); values.push(bcrypt.hashSync(password, 10)); }
    if (role) { updates.push("role = ?"); values.push(role); }
    if (status) { updates.push("status = ?"); values.push(status); }
    if (quota) {
      if (quota.sites !== undefined) { updates.push("quota_sites = ?"); values.push(quota.sites); }
      if (quota.databases !== undefined) { updates.push("quota_databases = ?"); values.push(quota.databases); }
      if (quota.storage !== undefined) { updates.push("quota_storage = ?"); values.push(quota.storage); }
      if (quota.bandwidth !== undefined) { updates.push("quota_bandwidth = ?"); values.push(quota.bandwidth); }
    }
    if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    db.prepare("UPDATE panel_users SET " + updates.join(", ") + " WHERE id = ?").run(...values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users PUT error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

async function handleDELETE(request: NextRequest) {
  const db = getDatabase();
  try {
    initUsersTables(db);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    const user = db.prepare("SELECT role FROM panel_users WHERE id = ?").get(parseInt(id)) as any;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role === "admin") return NextResponse.json({ error: "Cannot delete admin user" }, { status: 400 });
    db.prepare("DELETE FROM panel_users WHERE id = ?").run(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const PUT = withAuth(handlePUT);
export const DELETE = withAuth(handleDELETE);
