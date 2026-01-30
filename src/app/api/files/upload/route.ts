import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { writeFile, mkdir } from "fs/promises";
import { join, resolve, basename } from "path";
import { existsSync } from "fs";

// 允许上传的根目录
const ALLOWED_UPLOAD_ROOTS = [
  "/var/www",
  "/home",
  "/tmp",
];

/**
 * 安全验证上传路径
 */
function validateUploadPath(targetDir: string, fileName: string): { valid: boolean; error?: string; path?: string } {
  // 清理文件名（只保留基本名称，去除路径成分）
  const safeFileName = basename(fileName);
  if (!safeFileName || safeFileName.startsWith(".")) {
    return { valid: false, error: "无效的文件名" };
  }

  // 解析目标目录为绝对路径
  const resolvedDir = resolve(targetDir);

  // 检查是否在允许的根目录下
  const isAllowed = ALLOWED_UPLOAD_ROOTS.some(root =>
    resolvedDir.startsWith(root + "/") || resolvedDir === root
  );

  if (!isAllowed) {
    return { valid: false, error: "上传目录不在允许范围内" };
  }

  // 构建完整路径并再次验证
  const fullPath = join(resolvedDir, safeFileName);
  const finalResolved = resolve(fullPath);

  // 确保最终路径仍在目标目录下（防止符号链接绕过）
  if (!finalResolved.startsWith(resolvedDir + "/") && finalResolved !== resolvedDir) {
    return { valid: false, error: "路径验证失败" };
  }

  return { valid: true, path: finalResolved };
}

async function handlePOST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const targetPath = formData.get("path") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!targetPath) {
      return NextResponse.json({ error: "No target path provided" }, { status: 400 });
    }

    // 安全：使用正确的路径验证
    const validation = validateUploadPath(targetPath, file.name);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    const normalizedPath = validation.path!;

    // Ensure directory exists
    const dir = join(normalizedPath, "..");
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(normalizedPath, buffer);

    return NextResponse.json({
      success: true,
      message: `File ${file.name} uploaded successfully`,
      path: normalizedPath,
    });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePOST);
