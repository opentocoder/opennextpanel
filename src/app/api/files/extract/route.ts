import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { withAuth } from "@/lib/auth/middleware";

const execFileAsync = promisify(execFile);
const writeFileAsync = promisify(fs.writeFile);

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

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, target } = body;

    if (!file) {
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }

    if (!target) {
      return NextResponse.json({ error: "No target specified" }, { status: 400 });
    }

    // Validate paths
    if (!validatePath(file) || !validatePath(target)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Check if source file exists
    if (!fs.existsSync(file)) {
      return NextResponse.json({ error: "Source file does not exist" }, { status: 400 });
    }

    // Check if target directory exists
    if (!fs.existsSync(target)) {
      return NextResponse.json({ error: "Target directory does not exist" }, { status: 400 });
    }

    const targetStat = fs.statSync(target);
    if (!targetStat.isDirectory()) {
      return NextResponse.json({ error: "Target is not a directory" }, { status: 400 });
    }

    const ext = path.extname(file).toLowerCase();
    const filename = path.basename(file);

    // Use execFile with separate arguments to prevent command injection
    if (filename.endsWith(".tar.gz") || filename.endsWith(".tgz")) {
      await execFileAsync("tar", ["-xzvf", file, "-C", target]);
    } else if (filename.endsWith(".tar.bz2")) {
      await execFileAsync("tar", ["-xjvf", file, "-C", target]);
    } else if (filename.endsWith(".tar.xz")) {
      await execFileAsync("tar", ["-xJvf", file, "-C", target]);
    } else {
      switch (ext) {
        case ".zip":
          await execFileAsync("unzip", ["-o", file, "-d", target]);
          break;
        case ".tar":
          await execFileAsync("tar", ["-xvf", file, "-C", target]);
          break;
        case ".gz": {
          // For .gz files, use gunzip and write to target
          const outputFile = path.join(target, path.basename(file, ".gz"));
          const { stdout } = await execFileAsync("gunzip", ["-c", file]);
          await writeFileAsync(outputFile, stdout);
          break;
        }
        case ".bz2": {
          // For .bz2 files, use bunzip2 and write to target
          const outputFile = path.join(target, path.basename(file, ".bz2"));
          const { stdout } = await execFileAsync("bunzip2", ["-c", file]);
          await writeFileAsync(outputFile, stdout);
          break;
        }
        case ".7z":
          await execFileAsync("7z", ["x", file, `-o${target}`]);
          break;
        case ".rar":
          await execFileAsync("unrar", ["x", file, `${target}/`]);
          break;
        default:
          return NextResponse.json({ error: "Unsupported archive format" }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to extract:", error);
    return NextResponse.json({ error: "Failed to extract" }, { status: 500 });
  }
}

export const POST = withAuth(handlePOST);
