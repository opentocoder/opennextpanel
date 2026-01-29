import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";

async function handleGET() {
  try {
    const db = getDb();
    const tasks = db
      .prepare(
        `
      SELECT * FROM crons ORDER BY created_at DESC
    `
      )
      .all();

    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      name: task.name,
      type: task.type,
      cronExpression: task.cron_expression,
      script: task.script || "",
      status: task.status === 1 ? "active" : "disabled",
      lastRun: task.last_run,
      nextRun: task.next_run,
      runCount: task.run_count || 0,
      createdAt: task.created_at,
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error("Failed to fetch cron tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch cron tasks" },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, cronExpression, script } = body;

    if (!name || !cronExpression) {
      return NextResponse.json(
        { error: "Name and cron expression are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const result = db
      .prepare(
        `
      INSERT INTO crons (name, type, cron_expression, script, status)
      VALUES (?, ?, ?, ?, 1)
    `
      )
      .run(name, type || "shell", cronExpression, script || "");

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: "Cron task created successfully",
    });
  } catch (error) {
    console.error("Failed to create cron task:", error);
    return NextResponse.json(
      { error: "Failed to create cron task" },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, cronExpression, script, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    if (status !== undefined) {
      db.prepare("UPDATE crons SET status = ? WHERE id = ?").run(
        status === "active" ? 1 : 0,
        id
      );
    } else {
      db.prepare(
        `
        UPDATE crons SET name = ?, type = ?, cron_expression = ?, script = ?
        WHERE id = ?
      `
      ).run(name, type, cronExpression, script, id);
    }

    return NextResponse.json({
      success: true,
      message: "Cron task updated successfully",
    });
  } catch (error) {
    console.error("Failed to update cron task:", error);
    return NextResponse.json(
      { error: "Failed to update cron task" },
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
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare("DELETE FROM crons WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      message: "Cron task deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete cron task:", error);
    return NextResponse.json(
      { error: "Failed to delete cron task" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const PUT = withAuth(handlePUT);
export const DELETE = withAuth(handleDELETE);
