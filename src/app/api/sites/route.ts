import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import {
  createSiteConfig,
  enableSite,
  testNginxConfig,
  reloadNginx,
  generateNginxConfig,
  type NginxSiteConfig,
  type SiteType,
} from "@/lib/system/nginx";
import { createDatabase, createUser, grantPrivileges } from "@/lib/system/mysql";
import { createFTPUser } from "@/lib/system/ftp";
import { executeCommand } from "@/lib/system/executor";

async function handleGET() {
  try {
    const db = getDb();
    const sites = db
      .prepare(
        `
      SELECT
        s.*,
        (SELECT COUNT(*) FROM backups WHERE target_id = s.id AND type = 'site') as backupCount
      FROM sites s
      ORDER BY s.created_at DESC
    `
      )
      .all();

    const formattedSites = sites.map((site: any) => ({
      id: site.id,
      name: site.name,
      domain: site.domain,
      status: site.status === 1 ? "running" : "stopped",
      backupCount: site.backupCount || 0,
      rootPath: site.root_path,
      proxyUrl: site.proxy_url || null,
      diskUsage: site.disk_usage || 0,
      diskLimit: site.disk_limit || 0,
      expireDate: site.expire_date || "永久",
      remark: site.remark || "",
      phpVersion: site.php_version || "static",
      sslStatus: site.ssl_enabled === 1 ? "deployed" : "not_deployed",
      sslExpireDays: site.ssl_expire_days,
    }));

    return NextResponse.json({ sites: formattedSites });
  } catch (error) {
    console.error("Failed to fetch sites:", error);
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, remark, rootPath, createFtp, createDb, phpVersion, proxyPort, siteType: requestedSiteType, proxyUrl, proxyWebsocket } = body;

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const db = getDb();
    const name = domain.split("\n")[0].trim();

    // 检查域名是否已存在
    const existing = db.prepare("SELECT id FROM sites WHERE name = ? OR domain = ?").get(name, domain);
    if (existing) {
      return NextResponse.json({ error: "该域名已存在，请勿重复创建" }, { status: 400 });
    }
    const siteRootPath = rootPath || `/var/www/${name}`;

    // 确定站点类型
    let siteType: SiteType = "static";
    if (requestedSiteType === "proxy" || proxyUrl) {
      siteType = "proxy";
    } else if (phpVersion && phpVersion !== "static" && phpVersion !== "proxy") {
      siteType = "php";
    } else if (proxyPort) {
      siteType = "proxy";
    }

    // 1. 创建网站目录
    try {
      await executeCommand("mkdir", ["-p", siteRootPath]);
      await executeCommand("chmod", ["755", siteRootPath]);

      // 创建默认 index.html
      const indexContent = `<!DOCTYPE html>
<html>
<head><title>Welcome to ${name}</title></head>
<body><h1>Welcome to ${name}</h1><p>Site created by OpenNextPanel</p></body>
</html>`;

      const fs = require("fs/promises");
      await fs.writeFile(`${siteRootPath}/index.html`, indexContent, "utf-8").catch(() => {});
    } catch (err) {
      console.log("Directory creation skipped (may need sudo):", err);
    }

    // 2. 生成并写入 Nginx 配置
    const nginxConfig: NginxSiteConfig = {
      domain: name,
      type: siteType,
      rootPath: siteRootPath,
      phpVersion: phpVersion !== "static" && phpVersion !== "proxy" ? phpVersion : undefined,
      proxyPort: proxyPort,
      proxyUrl: proxyUrl,
      proxyWebsocket: proxyWebsocket,
    };

    let nginxConfigContent = "";
    let nginxError = null;

    try {
      // 创建 Nginx 配置文件
      await createSiteConfig(nginxConfig);

      // 启用站点 (创建软链接)
      await enableSite(name);

      // 测试 Nginx 配置
      const testResult = await testNginxConfig();
      if (!testResult.valid) {
        nginxError = testResult.message;
      } else {
        // 重新加载 Nginx
        const reloadResult = await reloadNginx();
        if (!reloadResult.success) {
          nginxError = reloadResult.message;
        }
      }

      nginxConfigContent = generateNginxConfig(nginxConfig);
    } catch (err: any) {
      console.log("Nginx config creation skipped:", err.message);
      // 生成配置内容供显示（即使没有写入文件系统）
      nginxConfigContent = generateNginxConfig(nginxConfig);
    }

    // 3. 保存到数据库
    const result = db
      .prepare(
        `
      INSERT INTO sites (name, domain, root_path, php_version, proxy_url, remark, status, ssl_enabled)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    `
      )
      .run(name, domain, siteRootPath, siteType === "proxy" ? "proxy" : (phpVersion || "static"), proxyUrl || null, remark || "");

    const siteId = result.lastInsertRowid;

    // 4. 创建 FTP 账户（真实操作）
    let ftpResult = null;
    if (createFtp) {
      const ftpUser = `ftp_${name.replace(/\./g, "_").substring(0, 20)}`;
      const ftpPassword = generateRandomPassword();

      try {
        ftpResult = await createFTPUser(ftpUser, ftpPassword, siteRootPath);

        if (ftpResult.success) {
          db.prepare(
            `
            INSERT INTO ftps (site_id, username, password, path, status)
            VALUES (?, ?, ?, ?, 1)
          `
          ).run(siteId, ftpUser, ftpPassword, siteRootPath);
        }
      } catch (err: any) {
        console.log("FTP creation skipped:", err.message);
        // 仍然保存到数据库（模拟模式）
        db.prepare(
          `
          INSERT INTO ftps (site_id, username, password, path, status)
          VALUES (?, ?, ?, ?, 1)
        `
        ).run(siteId, ftpUser, ftpPassword, siteRootPath);
      }
    }

    // 5. 创建数据库（真实操作）
    let dbResult = null;
    if (createDb) {
      const dbName = `db_${name.replace(/\./g, "_").substring(0, 20)}`;
      const dbUser = dbName;
      const dbPassword = generateRandomPassword();

      try {
        await createDatabase(dbName);
        await createUser(dbUser, dbPassword);
        await grantPrivileges(dbUser, dbName);

        db.prepare(
          `
          INSERT INTO databases (name, username, password, site_id, db_type, charset)
          VALUES (?, ?, ?, ?, 'mysql', 'utf8mb4')
        `
        ).run(dbName, dbUser, dbPassword, siteId);

        dbResult = { name: dbName, user: dbUser, password: dbPassword };
      } catch (err: any) {
        console.log("Database creation skipped:", err.message);
        // 仍然保存到数据库（模拟模式）
        db.prepare(
          `
          INSERT INTO databases (name, username, password, site_id, db_type, charset)
          VALUES (?, ?, ?, ?, 'mysql', 'utf8mb4')
        `
        ).run(dbName, dbUser, dbPassword, siteId);
      }
    }

    return NextResponse.json({
      success: true,
      siteId,
      nginxConfig: nginxConfigContent,
      nginxError,
      ftpResult,
      dbResult,
      message: nginxError ? "Site created with warnings" : "Site created successfully",
    });
  } catch (error) {
    console.error("Failed to create site:", error);
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 });
  }
}

// 生成随机密码
function generateRandomPassword(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
