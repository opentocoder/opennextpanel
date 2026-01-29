import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { withAuth } from "@/lib/auth/middleware";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

const ROOT_PATHS = [
  { name: "www", path: "/www" },
  { name: "root", path: "/root" },
  { name: "home", path: "/home" },
  { name: "etc", path: "/etc" },
  { name: "var", path: "/var" },
];

const MAX_DEPTH = 3;

function buildTree(dirPath: string, depth: number = 0): TreeNode[] {
  if (depth > MAX_DEPTH) return [];

  try {
    if (!fs.existsSync(dirPath)) return [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes: TreeNode[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // Skip hidden files

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          isDir: true,
          children: depth < MAX_DEPTH ? buildTree(fullPath, depth + 1) : [],
        });
      }
    }

    nodes.sort((a, b) => a.name.localeCompare(b.name));
    return nodes;
  } catch {
    return [];
  }
}

async function handleGET() {
  try {
    const tree: TreeNode[] = ROOT_PATHS.map((root) => ({
      name: root.name,
      path: root.path,
      isDir: true,
      children: fs.existsSync(root.path) ? buildTree(root.path, 1) : [],
    })).filter((node) => fs.existsSync(node.path));

    return NextResponse.json({ tree });
  } catch (error) {
    console.error("Failed to build tree:", error);
    return NextResponse.json({ error: "Failed to build tree" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
