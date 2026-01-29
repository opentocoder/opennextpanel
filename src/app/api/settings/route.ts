import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";

interface BasicSettings {
  panelName: string;
  panelPort: number;
  securityPath: string;
  username: string;
  sessionTimeout: number;
  autoBackup: boolean;
  backupRetention: number;
}

interface ApiSettings {
  apiEnabled: boolean;
  apiKey: string;
  apiWhitelist: string[];
}

// Get all settings from database
function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  try {
    const stmt = db.prepare("SELECT key, value FROM settings");
    const rows = stmt.all() as { key: string; value: string }[];

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  } finally {
    db.close();
  }
}

// Get current user info
function getCurrentUser(): { id: number; username: string } | null {
  const db = getDatabase();
  try {
    const stmt = db.prepare("SELECT id, username FROM users WHERE role = 'superadmin' LIMIT 1");
    const user = stmt.get() as { id: number; username: string } | undefined;
    return user || null;
  } finally {
    db.close();
  }
}

// Save setting to database
function saveSetting(key: string, value: string) {
  const db = getDatabase();
  try {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value, value);
  } finally {
    db.close();
  }
}

// Change user password
function changePassword(userId: number, currentPassword: string, newPassword: string): { success: boolean; message: string } {
  const db = getDatabase();
  try {
    const stmt = db.prepare("SELECT password FROM users WHERE id = ?");
    const user = stmt.get(userId) as { password: string } | undefined;

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Verify current password
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return { success: false, message: "Current password is incorrect" };
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update password
    const updateStmt = db.prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    updateStmt.run(hashedPassword, userId);

    return { success: true, message: "Password changed successfully" };
  } finally {
    db.close();
  }
}

// Generate random API key
function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "sk_live_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    const settings = getAllSettings();
    const user = getCurrentUser();

    if (type === "basic") {
      const basicSettings: BasicSettings = {
        panelName: settings.panel_name || "OpenPanel",
        panelPort: parseInt(settings.panel_port || "8888", 10),
        securityPath: settings.security_path ?? "",
        username: user?.username || "admin",
        sessionTimeout: parseInt(settings.session_timeout || "120", 10),
        autoBackup: settings.auto_backup === "1",
        backupRetention: parseInt(settings.backup_retention || "7", 10),
      };
      return NextResponse.json({ settings: basicSettings });
    }

    if (type === "api") {
      const apiSettings: ApiSettings = {
        apiEnabled: settings.api_enabled === "1",
        apiKey: settings.api_key || "",
        apiWhitelist: settings.api_whitelist ? settings.api_whitelist.split(",").filter(Boolean) : [],
      };
      return NextResponse.json({ settings: apiSettings });
    }

    // Return all settings
    const basicSettings: BasicSettings = {
      panelName: settings.panel_name || "OpenPanel",
      panelPort: parseInt(settings.panel_port || "8888", 10),
      securityPath: settings.security_path ?? "",
      username: user?.username || "admin",
      sessionTimeout: parseInt(settings.session_timeout || "120", 10),
      autoBackup: settings.auto_backup === "1",
      backupRetention: parseInt(settings.backup_retention || "7", 10),
    };

    const apiSettings: ApiSettings = {
      apiEnabled: settings.api_enabled === "1",
      apiKey: settings.api_key || "",
      apiWhitelist: settings.api_whitelist ? settings.api_whitelist.split(",").filter(Boolean) : [],
    };

    return NextResponse.json({ basicSettings, apiSettings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: `Failed to fetch settings: ${error}` },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, settings, currentPassword, newPassword } = body;

    if (action === "save_basic") {
      // 保存所有设置，包括空值
      if (settings.panelName !== undefined) saveSetting("panel_name", settings.panelName || "OpenPanel");
      if (settings.panelPort !== undefined) saveSetting("panel_port", String(settings.panelPort || 8888));
      // 安全入口允许为空（关闭功能）
      if (settings.securityPath !== undefined) saveSetting("security_path", settings.securityPath);
      if (settings.sessionTimeout !== undefined) saveSetting("session_timeout", String(settings.sessionTimeout || 120));
      if (settings.autoBackup !== undefined) saveSetting("auto_backup", settings.autoBackup ? "1" : "0");
      if (settings.backupRetention !== undefined) saveSetting("backup_retention", String(settings.backupRetention || 7));

      return NextResponse.json({ success: true, message: "设置已保存" });
    }

    if (action === "save_api") {
      saveSetting("api_enabled", settings.apiEnabled ? "1" : "0");
      if (settings.apiWhitelist) {
        saveSetting("api_whitelist", settings.apiWhitelist.join(","));
      }

      return NextResponse.json({ success: true, message: "API settings saved" });
    }

    if (action === "regenerate_key") {
      const newKey = generateApiKey();
      saveSetting("api_key", newKey);

      return NextResponse.json({ success: true, apiKey: newKey, message: "API key regenerated" });
    }

    if (action === "change_password") {
      const user = getCurrentUser();
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
      }

      if (!currentPassword || !newPassword) {
        return NextResponse.json({ success: false, message: "Current and new password required" }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
      }

      const result = changePassword(user.id, currentPassword, newPassword);
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: result.message });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: `Failed to save settings: ${error}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
