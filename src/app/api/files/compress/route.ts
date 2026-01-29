import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { withAuth } from "@/lib/auth/middleware";

const execFileAsync = promisify(execFile);

// Validate path to prevent path traversal attacks
function validatePath(inputPath: string): boolean {
  // Disallow null bytes
  if (inputPath.includes("\0")) {
    return false;
  }
  // Normalize and check for path traversal
  const normalized = path.normalize(inputPath);
  // Disallow relative paths that go outside
  if (normalized.includes("..")) {
    return false;
  }
  // Must be absolute path
  if (!path.isAbsolute(normalized)) {
    return false;
  }
  return true;
}

// Validate filename to prevent injection
function validateFilename(filename: string): boolean {
  // Disallow null bytes
  if (filename.includes("\0")) {
    return false;
  }
  // Only allow alphanumeric, underscore, hyphen, and dot
  const safeFilenameRegex = /^[a-zA-Z0-9_\-\.]+$/;
  return safeFilenameRegex.test(filename);
}

// Validate format
function validateFormat(format: string): boolean {
  const allowedFormats = ["zip", "tar.gz", "tar", "7z"];
  return allowedFormats.includes(format);
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, filename, format, target } = body;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files specified" }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: "No filename specified" }, { status: 400 });
    }

    if (!format) {
      return NextResponse.json({ error: "No format specified" }, { status: 400 });
    }

    if (!target) {
      return NextResponse.json({ error: "No target specified" }, { status: 400 });
    }

    // Validate format
    if (!validateFormat(format)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    // Validate filename
    if (!validateFilename(filename)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Validate target path
    if (!validatePath(target)) {
      return NextResponse.json({ error: "Invalid target path" }, { status: 400 });
    }

    // Validate all file paths
    for (const f of files) {
      if (!validatePath(f)) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
      }
      // Check if file exists
      try {
        await fs.access(f);
      } catch {
        return NextResponse.json({ error: `File does not exist: ${f}` }, { status: 400 });
      }
    }

    // Check if target directory exists
    try {
      const targetStat = await fs.stat(target);
      if (!targetStat.isDirectory()) {
        return NextResponse.json({ error: "Target is not a directory" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Target directory does not exist" }, { status: 400 });
    }

    const archiveName = `${filename}.${format}`;
    const archivePath = path.join(target, archiveName);

    // Get working directory and relative file names
    const workDir = path.dirname(files[0]);
    const fileNames = files.map((f: string) => path.basename(f));

    // Use execFile with separate arguments to prevent command injection
    switch (format) {
      case "zip":
        await execFileAsync("zip", ["-r", archivePath, ...fileNames], { cwd: workDir });
        break;
      case "tar.gz":
        await execFileAsync("tar", ["-czvf", archivePath, ...fileNames], { cwd: workDir });
        break;
      case "tar":
        await execFileAsync("tar", ["-cvf", archivePath, ...fileNames], { cwd: workDir });
        break;
      case "7z":
        await execFileAsync("7z", ["a", archivePath, ...fileNames], { cwd: workDir });
        break;
      default:
        return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    return NextResponse.json({ success: true, path: archivePath });
  } catch (error) {
    console.error("Failed to compress:", error);
    return NextResponse.json({ error: "Failed to compress" }, { status: 500 });
  }
}

export const POST = withAuth(handlePOST);
