import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    // Security: prevent directory traversal
    const normalizedPath = join(targetPath, file.name).replace(/\.\./g, "");

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
