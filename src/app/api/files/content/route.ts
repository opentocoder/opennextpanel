import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAuth } from "@/lib/auth/middleware";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    const safePath = path.resolve(filePath);

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
