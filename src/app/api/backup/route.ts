import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";

async function handleGET() {
  try {
    const db = getDb();
    const backups = db
      .prepare(
        `
      SELECT * FROM backups ORDER BY created_at DESC
    `
      )
      .all();

    const formattedBackups = backups.map((backup: any) => ({
      id: backup.id,
      name: backup.name,
      type: backup.type,
      targetId: backup.target_id,
      targetName: backup.target_name,
      filePath: backup.file_path,
      fileSize: backup.file_size || 0,
      createdAt: backup.created_at,
    }));

    return NextResponse.json({ backups: formattedBackups });
  } catch (error) {
    console.error("Failed to fetch backups:", error);
    return NextResponse.json(
      { error: "Failed to fetch backups" },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, targetId, targetName } = body;

    if (!type || !targetName) {
      return NextResponse.json(
        { error: "Type and target name are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `${targetName}_${timestamp}`;
    const filePath = `/www/backup/${type}/${backupName}.tar.gz`;

    const result = db
      .prepare(
        `
      INSERT INTO backups (name, type, target_id, target_name, file_path, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(backupName, type, targetId || null, targetName, filePath, 0);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: "Backup created successfully",
    });
  } catch (error) {
    console.error("Failed to create backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Backup ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare("DELETE FROM backups WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      message: "Backup deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete backup:", error);
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const DELETE = withAuth(handleDELETE);
