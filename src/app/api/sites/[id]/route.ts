import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import { deleteSiteConfig, reloadNginx } from "@/lib/system/nginx";

async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const site = db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM backups WHERE site_id = s.id) as backupCount
      FROM sites s
      WHERE s.id = ?
    `).get(id);

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json({ site });
  } catch (error) {
    console.error("Failed to fetch site:", error);
    return NextResponse.json({ error: "Failed to fetch site" }, { status: 500 });
  }
}

async function handlePUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.domain !== undefined) {
      updates.push("domain = ?");
      values.push(body.domain);
    }
    if (body.rootPath !== undefined) {
      updates.push("root_path = ?");
      values.push(body.rootPath);
    }
    if (body.phpVersion !== undefined) {
      updates.push("php_version = ?");
      values.push(body.phpVersion);
    }
    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(body.status);
    }
    if (body.remark !== undefined) {
      updates.push("remark = ?");
      values.push(body.remark);
    }
    if (body.sslStatus !== undefined) {
      updates.push("ssl_status = ?");
      values.push(body.sslStatus);
    }
    if (body.sslExpireDays !== undefined) {
      updates.push("ssl_expire_days = ?");
      values.push(body.sslExpireDays);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    db.prepare(`
      UPDATE sites
      SET ${updates.join(", ")}
      WHERE id = ?
    `).run(...values);

    return NextResponse.json({ success: true, message: "Site updated successfully" });
  } catch (error) {
    console.error("Failed to update site:", error);
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}

async function handleDELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    // 先获取站点信息（需要域名来删除 Nginx 配置）
    const site = db.prepare("SELECT name, domain FROM sites WHERE id = ?").get(id) as { name: string; domain: string } | undefined;

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // 删除 Nginx 配置文件
    try {
      await deleteSiteConfig(site.name);
      await reloadNginx();
    } catch (e) {
      console.log("Nginx config deletion skipped:", e);
      // 继续删除数据库记录，即使 Nginx 配置删除失败
    }

    // Delete associated backups
    try {
      db.prepare("DELETE FROM backups WHERE target_id = ? AND type = 'site'").run(id);
    } catch (e) {
      // Ignore if table structure is different
    }

    // Delete the site from database
    const result = db.prepare("DELETE FROM sites WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Site deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete site:", error);
    return NextResponse.json({ error: `Failed to delete site: ${error.message}` }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const PUT = withAuth(handlePUT);
export const DELETE = withAuth(handleDELETE);
