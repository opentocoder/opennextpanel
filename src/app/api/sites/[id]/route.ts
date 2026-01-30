import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import { deleteSiteConfig, reloadNginx, getSiteConfigPath } from "@/lib/system/nginx";
import { promises as fs } from "fs";

async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const db = getDb();
    const site = db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM backups WHERE target_id = s.id AND type = 'site') as backupCount
      FROM sites s
      WHERE s.id = ?
    `).get(id) as any;

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // 获取 Nginx 配置文件内容
    if (action === "nginx_config") {
      try {
        const configPath = getSiteConfigPath(site.name);
        const config = await fs.readFile(configPath, "utf-8");
        return NextResponse.json({ config, path: configPath });
      } catch (error: any) {
        if (error.code === "ENOENT") {
          return NextResponse.json({
            config: `# 配置文件不存在\n# 路径: ${getSiteConfigPath(site.name)}`,
            path: getSiteConfigPath(site.name),
          });
        }
        throw error;
      }
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

    // 保存 Nginx 配置文件
    if (body.action === "save_nginx_config") {
      const site = db.prepare("SELECT name FROM sites WHERE id = ?").get(id) as { name: string } | undefined;
      if (!site) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      const configPath = getSiteConfigPath(site.name);

      // 备份原配置
      try {
        const backupPath = `${configPath}.bak.${Date.now()}`;
        await fs.copyFile(configPath, backupPath);
      } catch {
        // 原文件可能不存在，忽略
      }

      // 写入新配置
      await fs.writeFile(configPath, body.config, "utf-8");

      // 检查 nginx 配置语法
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);

      try {
        await execAsync("sudo nginx -t");
        // 语法正确，重载 nginx
        await reloadNginx();
        return NextResponse.json({ success: true, message: "配置保存成功" });
      } catch (error: any) {
        // 语法错误，恢复备份
        return NextResponse.json({
          error: `Nginx 配置语法错误: ${error.stderr || error.message}`,
        }, { status: 400 });
      }
    }

    // 申请 Let's Encrypt SSL 证书
    if (body.action === "apply_ssl") {
      const site = db.prepare("SELECT name, domain FROM sites WHERE id = ?").get(id) as { name: string; domain: string } | undefined;
      if (!site) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      try {
        const { requestCertificate, setupAutoRenewal } = await import("@/lib/system/ssl");

        // 申请证书 (使用 webroot 模式，假设站点已配置)
        const webroot = `/var/www/${site.name}`;
        const email = "admin@" + site.domain; // 默认使用域名邮箱

        const result = await requestCertificate(site.domain, email, webroot);

        if (!result.success) {
          return NextResponse.json({ error: result.message }, { status: 400 });
        }

        // 更新 Nginx 配置添加 SSL
        const { generateNginxConfig, createSiteConfig, enableSite, reloadNginx: reload } = await import("@/lib/system/nginx");

        // 获取站点类型
        const siteInfo = db.prepare("SELECT php_version, root_path, proxy_url FROM sites WHERE id = ?").get(id) as any;

        const config = {
          domain: site.domain,
          type: siteInfo.php_version as any,
          rootPath: siteInfo.root_path,
          proxyUrl: siteInfo.proxy_url,
          ssl: true,
          sslCertPath: result.certPath,
          sslKeyPath: result.keyPath,
        };

        await createSiteConfig(config);
        await enableSite(site.domain);
        await reload();

        // 设置自动续期
        await setupAutoRenewal();

        // 更新数据库状态
        db.prepare("UPDATE sites SET ssl_status = 'deployed', ssl_expire_days = 90 WHERE id = ?").run(id);

        return NextResponse.json({
          success: true,
          message: "SSL证书申请成功",
          certPath: result.certPath,
          keyPath: result.keyPath
        });
      } catch (error: any) {
        console.error("SSL申请失败:", error);
        return NextResponse.json({ error: `SSL申请失败: ${error.message}` }, { status: 500 });
      }
    }

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
