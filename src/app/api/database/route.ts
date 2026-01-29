import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import {
  createDatabase as createMySQLDatabase,
  dropDatabase as dropMySQLDatabase,
  createUser as createMySQLUser,
  dropUser as dropMySQLUser,
  grantPrivileges,
  changePassword as changeMySQLPassword,
  listDatabases,
  getMySQLStatus,
} from "@/lib/system/mysql";

async function handleGET() {
  try {
    const db = getDb();
    const databases = db
      .prepare(
        `
      SELECT
        d.*,
        (SELECT COUNT(*) FROM backups WHERE target_id = d.id AND type = 'database') as backupCount
      FROM databases d
      ORDER BY d.created_at DESC
    `
      )
      .all();

    // 尝试获取真实的数据库大小
    let realDatabases: { name: string; size: number; tables: number }[] = [];
    try {
      realDatabases = await listDatabases();
    } catch {
      // MySQL 不可用时使用数据库记录
    }

    const formattedDatabases = databases.map((dbRecord: any) => {
      // 查找真实数据库信息
      const realDb = realDatabases.find((r) => r.name === dbRecord.name);

      return {
        id: dbRecord.id,
        name: dbRecord.name,
        username: dbRecord.username,
        password: dbRecord.password || "",
        dbType: dbRecord.db_type || "mysql",
        host: dbRecord.host || "localhost",
        port: dbRecord.port || 3306,
        charset: dbRecord.charset || "utf8mb4",
        accessPermission: dbRecord.access_permission || "localhost",
        backupCount: dbRecord.backupCount || 0,
        size: realDb?.size || dbRecord.size || 0,
        tables: realDb?.tables || 0,
        createdAt: dbRecord.created_at,
        exists: !!realDb, // 数据库是否真实存在
      };
    });

    // 获取 MySQL 状态
    let mysqlStatus = { running: false, version: "unknown" };
    try {
      mysqlStatus = await getMySQLStatus();
    } catch {
      // MySQL 不可用
    }

    return NextResponse.json({
      databases: formattedDatabases,
      mysqlStatus,
    });
  } catch (error) {
    console.error("Failed to fetch databases:", error);
    return NextResponse.json({ error: "Failed to fetch databases" }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, password, dbType, charset, accessPermission } = body;

    if (!name || !password) {
      return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
    }

    // 验证数据库名
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name)) {
      return NextResponse.json(
        { error: "Invalid database name. Use letters, numbers and underscore only." },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if database name already exists
    const existing = db.prepare("SELECT id FROM databases WHERE name = ?").get(name);
    if (existing) {
      return NextResponse.json({ error: "Database name already exists" }, { status: 400 });
    }

    const dbUser = username || name;
    const dbHost = accessPermission || "localhost";
    let mysqlCreated = false;
    let mysqlError = null;

    // 尝试在 MySQL 中创建真实数据库
    try {
      await createMySQLDatabase(name, charset || "utf8mb4");
      await createMySQLUser(dbUser, password, dbHost);
      await grantPrivileges(dbUser, name, ["ALL"], dbHost);
      mysqlCreated = true;
    } catch (err: any) {
      console.log("MySQL database creation failed:", err.message);
      mysqlError = err.message;
    }

    // 保存到 SQLite
    const result = db
      .prepare(
        `
      INSERT INTO databases (name, username, password, db_type, charset, access_permission, host)
      VALUES (?, ?, ?, ?, ?, ?, 'localhost')
    `
      )
      .run(name, dbUser, password, dbType || "mysql", charset || "utf8mb4", dbHost);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      mysqlCreated,
      mysqlError,
      message: mysqlCreated
        ? "Database created successfully"
        : "Database record created (MySQL creation failed)",
    });
  } catch (error) {
    console.error("Failed to create database:", error);
    return NextResponse.json({ error: "Failed to create database" }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
    }

    const db = getDb();

    // 获取数据库信息
    const dbRecord = db.prepare("SELECT name, username FROM databases WHERE id = ?").get(id) as {
      name: string;
      username: string;
    } | null;

    if (!dbRecord) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }

    let mysqlDeleted = false;
    let mysqlError = null;

    // 尝试删除真实的 MySQL 数据库
    try {
      await dropMySQLDatabase(dbRecord.name);
      await dropMySQLUser(dbRecord.username);
      mysqlDeleted = true;
    } catch (err: any) {
      console.log("MySQL database deletion failed:", err.message);
      mysqlError = err.message;
    }

    // 从 SQLite 删除记录
    db.prepare("DELETE FROM databases WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      mysqlDeleted,
      mysqlError,
      message: mysqlDeleted
        ? "Database deleted successfully"
        : "Database record deleted (MySQL deletion failed)",
    });
  } catch (error) {
    console.error("Failed to delete database:", error);
    return NextResponse.json({ error: "Failed to delete database" }, { status: 500 });
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, accessPermission } = body;

    if (!id) {
      return NextResponse.json({ error: "Database ID is required" }, { status: 400 });
    }

    const db = getDb();

    // 获取数据库信息
    const dbRecord = db.prepare("SELECT username FROM databases WHERE id = ?").get(id) as {
      username: string;
    } | null;

    if (!dbRecord) {
      return NextResponse.json({ error: "Database not found" }, { status: 404 });
    }

    let mysqlUpdated = false;

    if (password) {
      // 尝试更新 MySQL 密码
      try {
        await changeMySQLPassword(dbRecord.username, password);
        mysqlUpdated = true;
      } catch (err: any) {
        console.log("MySQL password change failed:", err.message);
      }

      db.prepare("UPDATE databases SET password = ? WHERE id = ?").run(password, id);
    }

    if (accessPermission) {
      db.prepare("UPDATE databases SET access_permission = ? WHERE id = ?").run(
        accessPermission,
        id
      );
    }

    return NextResponse.json({
      success: true,
      mysqlUpdated,
      message: "Database updated successfully",
    });
  } catch (error) {
    console.error("Failed to update database:", error);
    return NextResponse.json({ error: "Failed to update database" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const DELETE = withAuth(handleDELETE);
export const PUT = withAuth(handlePUT);
