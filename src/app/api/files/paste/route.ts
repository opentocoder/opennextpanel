import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAuth } from "@/lib/auth/middleware";

function copyRecursive(src: string, dest: string) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths, target, action } = body;

    if (!paths || paths.length === 0) {
      return NextResponse.json({ error: "No files specified" }, { status: 400 });
    }

    if (!target) {
      return NextResponse.json({ error: "No target specified" }, { status: 400 });
    }

    for (const srcPath of paths) {
      const basename = path.basename(srcPath);
      let destPath = path.join(target, basename);

      // Handle name collision
      if (fs.existsSync(destPath) && srcPath !== destPath) {
        const ext = path.extname(basename);
        const name = path.basename(basename, ext);
        let counter = 1;
        while (fs.existsSync(destPath)) {
          destPath = path.join(target, `${name}_${counter}${ext}`);
          counter++;
        }
      }

      if (action === "copy") {
        copyRecursive(srcPath, destPath);
      } else if (action === "cut") {
        fs.renameSync(srcPath, destPath);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to paste:", error);
    return NextResponse.json({ error: "Failed to paste" }, { status: 500 });
  }
}

export const POST = withAuth(handlePOST);
