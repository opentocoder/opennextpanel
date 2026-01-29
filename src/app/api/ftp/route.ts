import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import {
  createFTPUser,
  deleteFTPUser,
  changeFTPPassword,
  setFTPUserEnabled,
  listFTPUsers,
  getFTPStatus,
} from "@/lib/system/ftp";

async function handleGET() {
  try {
    const db = getDb();
    const accounts = db
      .prepare(
        `
      SELECT * FROM ftps ORDER BY created_at DESC
    `
      )
      .all();

    // 获取真实的 FTP 用户列表
    let realUsers: { username: string; homeDir: string; enabled: boolean }[] = [];
    try {
      realUsers = await listFTPUsers();
    } catch {
      // FTP 服务不可用
    }

    const formattedAccounts = accounts.map((account: any) => {
      // 查找真实用户信息
      const realUser = realUsers.find((u) => u.username === account.username);

      return {
        id: account.id,
        username: account.username,
        password: account.password || "",
        path: account.path,
        status: account.status === 1 ? "active" : "disabled",
        createdAt: account.created_at,
        exists: !!realUser, // 用户是否真实存在
        systemEnabled: realUser?.enabled,
      };
    });

    // 获取 FTP 服务状态
    let ftpStatus = { running: false, version: "unknown", connections: 0 };
    try {
      ftpStatus = await getFTPStatus();
    } catch {
      // FTP 服务不可用
    }

    return NextResponse.json({
      accounts: formattedAccounts,
      ftpStatus,
    });
  } catch (error) {
    console.error("Failed to fetch FTP accounts:", error);
    return NextResponse.json({ error: "Failed to fetch FTP accounts" }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, path } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // 验证用户名格式
    if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Invalid username. Must be 3-32 characters, start with letter, and contain only lowercase letters, numbers, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if username already exists
    const existing = db.prepare("SELECT id FROM ftps WHERE username = ?").get(username);
    if (existing) {
      return NextResponse.json({ error: "FTP username already exists" }, { status: 400 });
    }

    const ftpPath = path || "/var/www/";
    let systemCreated = false;
    let systemError = null;

    // 尝试创建真实的系统 FTP 用户
    try {
      const result = await createFTPUser(username, password, ftpPath);
      if (result.success) {
        systemCreated = true;
      } else {
        systemError = result.message;
      }
    } catch (err: any) {
      console.log("FTP user creation failed:", err.message);
      systemError = err.message;
    }

    // 保存到 SQLite
    const result = db
      .prepare(
        `
      INSERT INTO ftps (username, password, path, status)
      VALUES (?, ?, ?, 1)
    `
      )
      .run(username, password, ftpPath);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      systemCreated,
      systemError,
      message: systemCreated
        ? "FTP account created successfully"
        : "FTP record created (system user creation failed)",
    });
  } catch (error) {
    console.error("Failed to create FTP account:", error);
    return NextResponse.json({ error: "Failed to create FTP account" }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const removeHome = searchParams.get("removeHome") === "true";

    if (!id) {
      return NextResponse.json({ error: "FTP account ID is required" }, { status: 400 });
    }

    const db = getDb();

    // 获取用户信息
    const account = db.prepare("SELECT username FROM ftps WHERE id = ?").get(id) as {
      username: string;
    } | null;

    if (!account) {
      return NextResponse.json({ error: "FTP account not found" }, { status: 404 });
    }

    let systemDeleted = false;
    let systemError = null;

    // 尝试删除系统用户
    try {
      const result = await deleteFTPUser(account.username, removeHome);
      if (result.success) {
        systemDeleted = true;
      } else {
        systemError = result.message;
      }
    } catch (err: any) {
      console.log("FTP user deletion failed:", err.message);
      systemError = err.message;
    }

    // 从 SQLite 删除
    db.prepare("DELETE FROM ftps WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      systemDeleted,
      systemError,
      message: systemDeleted
        ? "FTP account deleted successfully"
        : "FTP record deleted (system user deletion failed)",
    });
  } catch (error) {
    console.error("Failed to delete FTP account:", error);
    return NextResponse.json({ error: "Failed to delete FTP account" }, { status: 500 });
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, status } = body;

    if (!id) {
      return NextResponse.json({ error: "FTP account ID is required" }, { status: 400 });
    }

    const db = getDb();

    // 获取用户信息
    const account = db.prepare("SELECT username FROM ftps WHERE id = ?").get(id) as {
      username: string;
    } | null;

    if (!account) {
      return NextResponse.json({ error: "FTP account not found" }, { status: 404 });
    }

    let systemUpdated = false;

    if (password) {
      // 尝试更新系统密码
      try {
        const result = await changeFTPPassword(account.username, password);
        if (result.success) {
          systemUpdated = true;
        }
      } catch (err: any) {
        console.log("FTP password change failed:", err.message);
      }

      db.prepare("UPDATE ftps SET password = ? WHERE id = ?").run(password, id);
    }

    if (status !== undefined) {
      const enabled = status === "active";

      // 尝试启用/禁用系统用户
      try {
        const result = await setFTPUserEnabled(account.username, enabled);
        if (result.success) {
          systemUpdated = true;
        }
      } catch (err: any) {
        console.log("FTP user enable/disable failed:", err.message);
      }

      db.prepare("UPDATE ftps SET status = ? WHERE id = ?").run(enabled ? 1 : 0, id);
    }

    return NextResponse.json({
      success: true,
      systemUpdated,
      message: "FTP account updated successfully",
    });
  } catch (error) {
    console.error("Failed to update FTP account:", error);
    return NextResponse.json({ error: "Failed to update FTP account" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const DELETE = withAuth(handleDELETE);
export const PUT = withAuth(handlePUT);
