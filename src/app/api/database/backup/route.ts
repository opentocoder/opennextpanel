import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import { backupDatabase, restoreDatabase } from "@/lib/system/mysql";
import * as fs from "fs/promises";
import * as path from "path";

const BACKUP_DIR = "/www/backup/database";

// 确保备份目录存在
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (e) {
    // 目录已存在
  }
}

// GET - 获取数据库的备份列表
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dbId = searchParams.get("dbId");

    const db = getDb();

    let backups;
    if (dbId) {
      backups = db.prepare(`
        SELECT * FROM backups
        WHERE type = 'database' AND target_id = ?
        ORDER BY created_at DESC
      `).all(dbId);
    } else {
      backups = db.prepare(`
        SELECT * FROM backups
        WHERE type = 'database'
        ORDER BY created_at DESC
      `).all();
    }

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("Failed to fetch database backups:", error);
    return NextResponse.json({ error: "Failed to fetch backups" }, { status: 500 });
  }
}

// POST - 创建数据库备份
async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbId, dbName } = body;

    if (!dbName) {
      return NextResponse.json({ error: "Database name is required" }, { status: 400 });
    }

    await ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = `${dbName}_${timestamp}`;
    const filePath = path.join(BACKUP_DIR, `${backupName}.sql`);

    // 执行备份
    const result = await backupDatabase(dbName, filePath);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // 保存备份记录
    const db = getDb();
    const insertResult = db.prepare(`
      INSERT INTO backups (name, type, target_id, target_name, file_path, file_size)
      VALUES (?, 'database', ?, ?, ?, ?)
    `).run(backupName, dbId || null, dbName, filePath, result.size || 0);

    return NextResponse.json({
      success: true,
      id: insertResult.lastInsertRowid,
      filePath,
      size: result.size,
      message: "数据库备份成功",
    });
  } catch (error: any) {
    console.error("Failed to backup database:", error);
    return NextResponse.json({ error: `备份失败: ${error.message}` }, { status: 500 });
  }
}

// PUT - 恢复数据库（从备份文件导入）
async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbName, backupId, filePath } = body;

    if (!dbName) {
      return NextResponse.json({ error: "Database name is required" }, { status: 400 });
    }

    let restoreFilePath = filePath;

    // 如果提供了 backupId，从数据库获取文件路径
    if (backupId && !filePath) {
      const db = getDb();
      const backup = db.prepare("SELECT file_path FROM backups WHERE id = ?").get(backupId) as { file_path: string } | undefined;
      if (!backup) {
        return NextResponse.json({ error: "Backup not found" }, { status: 404 });
      }
      restoreFilePath = backup.file_path;
    }

    if (!restoreFilePath) {
      return NextResponse.json({ error: "No backup file specified" }, { status: 400 });
    }

    // 检查文件是否存在
    try {
      await fs.access(restoreFilePath);
    } catch {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }

    // 执行恢复
    const result = await restoreDatabase(dbName, restoreFilePath);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "数据库恢复成功",
    });
  } catch (error: any) {
    console.error("Failed to restore database:", error);
    return NextResponse.json({ error: `恢复失败: ${error.message}` }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const PUT = withAuth(handlePUT);
