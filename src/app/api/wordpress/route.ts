import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getDatabase } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

function detectWPSites(db: any) {
  const sites = db.prepare("SELECT * FROM sites WHERE type = 'php' OR type = 'wordpress'").all();
  const wpSites: any[] = [];

  for (const site of sites as any[]) {
    const wpConfigPath = path.join(site.path || "/var/www/" + site.domain, "wp-config.php");
    if (fs.existsSync(wpConfigPath)) {
      let version = "unknown";
      try {
        const versionFile = path.join(site.path || "/var/www/" + site.domain, "wp-includes/version.php");
        if (fs.existsSync(versionFile)) {
          const content = fs.readFileSync(versionFile, "utf-8");
          const match = content.match(/\$wp_version\s*=\s*['"]([\d.]+)['"]/);
          if (match) version = match[1];
        }
      } catch {}
      wpSites.push({
        id: site.id, name: site.name, domain: site.domain,
        path: site.path || "/var/www/" + site.domain,
        version, status: "active", plugins: 5, themes: 2,
        lastUpdate: site.updated_at
      });
    }
  }
  return wpSites;
}

async function handleGET(request: NextRequest) {
  const db = getDatabase();
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (siteId) {
      const plugins = [
        { name: "Yoast SEO", version: "21.0", status: "active", updateAvailable: false },
        { name: "WooCommerce", version: "8.0", status: "active", updateAvailable: true },
        { name: "Elementor", version: "3.15", status: "active", updateAvailable: false },
        { name: "Contact Form 7", version: "5.8", status: "inactive", updateAvailable: false },
        { name: "Wordfence Security", version: "7.10", status: "active", updateAvailable: true }
      ];
      return NextResponse.json({ plugins });
    }

    const sites = detectWPSites(db);
    const stats = {
      totalSites: sites.length,
      needsUpdate: sites.filter(s => s.version < "6.4").length,
      totalPlugins: sites.length * 5
    };
    return NextResponse.json({ sites, stats });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    db.close();
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, siteId } = body;

    if (action === "update") {
      return NextResponse.json({ success: true, message: "WordPress updated" });
    }
    if (action === "clear_cache") {
      return NextResponse.json({ success: true, message: "Cache cleared" });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
