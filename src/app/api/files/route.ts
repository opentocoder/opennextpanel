import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAuth } from "@/lib/auth/middleware";

async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get("path") || "/";

    // Security: prevent path traversal
    const safePath = path.resolve(dirPath);

    if (!fs.existsSync(safePath)) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    const stats = fs.statSync(safePath);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: "Not a directory" }, { status: 400 });
    }

    const entries = fs.readdirSync(safePath, { withFileTypes: true });
    const files = entries.map((entry) => {
      const fullPath = path.join(safePath, entry.name);
      let fileStats;
      try {
        fileStats = fs.statSync(fullPath);
      } catch {
        fileStats = null;
      }

      return {
        name: entry.name,
        path: fullPath,
        isDir: entry.isDirectory(),
        size: fileStats?.size || 0,
        mtime: fileStats?.mtime.toISOString().split("T")[0] || "",
        permissions: fileStats ? formatPermissions(fileStats.mode) : "---",
        owner: "www",
        group: "www",
      };
    });

    // Sort: directories first, then by name
    files.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ files, path: safePath });
  } catch (error) {
    console.error("Failed to list files:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, path: targetPath, name } = body;

    const fullPath = path.join(targetPath, name);

    if (type === "folder") {
      fs.mkdirSync(fullPath, { recursive: true });
    } else if (type === "file") {
      fs.writeFileSync(fullPath, "");
    }

    return NextResponse.json({ success: true, path: fullPath });
  } catch (error) {
    console.error("Failed to create:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths } = body;

    for (const filePath of paths) {
      const safePath = path.resolve(filePath);
      if (fs.existsSync(safePath)) {
        const stats = fs.statSync(safePath);
        if (stats.isDirectory()) {
          fs.rmSync(safePath, { recursive: true });
        } else {
          fs.unlinkSync(safePath);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

function formatPermissions(mode: number): string {
  const perms = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  const owner = (mode >> 6) & 7;
  const group = (mode >> 3) & 7;
  const other = mode & 7;
  return perms[owner] + perms[group] + perms[other];
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const DELETE = withAuth(handleDELETE);
