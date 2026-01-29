import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
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

// Validate permissions - only allow octal numbers (e.g., 755, 644)
function validatePermissions(permissions: string): boolean {
  // Must be 3 or 4 digit octal number
  const octalRegex = /^[0-7]{3,4}$/;
  return octalRegex.test(permissions);
}

// Validate owner/group names - only allow safe characters
function validateOwnerGroup(name: string): boolean {
  if (!name) return true; // Empty is allowed
  // Only allow alphanumeric, underscore, hyphen (standard Unix username/group format)
  const safeNameRegex = /^[a-zA-Z_][a-zA-Z0-9_\-]*$/;
  return safeNameRegex.test(name);
}

// Recursively change permissions
async function chmodRecursive(targetPath: string, mode: number): Promise<void> {
  const stat = await fs.stat(targetPath);
  await fs.chmod(targetPath, mode);

  if (stat.isDirectory()) {
    const entries = await fs.readdir(targetPath);
    for (const entry of entries) {
      await chmodRecursive(path.join(targetPath, entry), mode);
    }
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, permissions, owner, group, recursive } = body;

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    // Validate path
    if (!validatePath(filePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Check if path exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "Path does not exist" }, { status: 400 });
    }

    // Change permissions using fs.chmod()
    if (permissions) {
      if (!validatePermissions(permissions)) {
        return NextResponse.json({ error: "Invalid permissions format. Use octal (e.g., 755, 644)" }, { status: 400 });
      }

      const mode = parseInt(permissions, 8);

      if (recursive) {
        await chmodRecursive(filePath, mode);
      } else {
        await fs.chmod(filePath, mode);
      }
    }

    // Change owner/group using execFile with chown (fs.chown requires uid/gid numbers)
    if (owner || group) {
      if (owner && !validateOwnerGroup(owner)) {
        return NextResponse.json({ error: "Invalid owner name" }, { status: 400 });
      }
      if (group && !validateOwnerGroup(group)) {
        return NextResponse.json({ error: "Invalid group name" }, { status: 400 });
      }

      // Build owner:group string
      let ownerGroup = "";
      if (owner && group) {
        ownerGroup = `${owner}:${group}`;
      } else if (owner) {
        ownerGroup = owner;
      } else if (group) {
        ownerGroup = `:${group}`;
      }

      if (ownerGroup) {
        const args = recursive ? ["-R", ownerGroup, filePath] : [ownerGroup, filePath];
        await execFileAsync("chown", args);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update permissions:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}

export const PUT = withAuth(handlePUT);
