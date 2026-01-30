import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAuth } from "@/lib/auth/middleware";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 允许访问的根目录列表
const ALLOWED_ROOTS = [
  "/var/www",
  "/home",
  "/tmp",
  "/etc/nginx/sites-available",
  "/etc/nginx/sites-enabled",
];

// 禁止访问的敏感路径
const BLOCKED_PATHS = [
  "/etc/shadow",
  "/etc/passwd",
  "/etc/sudoers",
  "/root/.ssh",
  "/home/*/.ssh",
  "/.env",
  "/proc",
  "/sys",
];

/**
 * 验证路径是否安全（在允许的根目录下，且不在禁止列表中）
 */
function isPathAllowed(filePath: string): { allowed: boolean; error?: string } {
  const normalizedPath = path.resolve(filePath);

  // 检查是否在禁止列表中
  for (const blocked of BLOCKED_PATHS) {
    if (blocked.includes("*")) {
      const pattern = new RegExp("^" + blocked.replace("*", "[^/]+"));
      if (pattern.test(normalizedPath)) {
        return { allowed: false, error: "访问被拒绝：敏感文件" };
      }
    } else if (normalizedPath === blocked || normalizedPath.startsWith(blocked + "/")) {
      return { allowed: false, error: "访问被拒绝：敏感文件" };
    }
  }

  // 检查是否在允许的根目录下
  const isUnderAllowedRoot = ALLOWED_ROOTS.some(root =>
    normalizedPath.startsWith(root + "/") || normalizedPath === root
  );

  if (!isUnderAllowedRoot) {
    return { allowed: false, error: `访问被拒绝：路径不在允许范围内` };
  }

  return { allowed: true };
}

async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    const safePath = path.resolve(filePath);

    // 安全检查：验证路径是否允许访问
    const pathCheck = isPathAllowed(safePath);
    if (!pathCheck.allowed) {
      return NextResponse.json({ error: pathCheck.error }, { status: 403 });
    }

    if (!fs.existsSync(safePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stats = fs.statSync(safePath);
    if (stats.isDirectory()) {
      return NextResponse.json({ error: "Cannot read directory" }, { status: 400 });
    }

    if (stats.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const content = fs.readFileSync(safePath, "utf-8");
    return NextResponse.json({ content, size: stats.size });
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    const safePath = path.resolve(filePath);

    // 安全检查：验证路径是否允许访问
    const pathCheck = isPathAllowed(safePath);
    if (!pathCheck.allowed) {
      return NextResponse.json({ error: pathCheck.error }, { status: 403 });
    }

    // Create directory if not exists
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(safePath, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const PUT = withAuth(handlePUT);
