"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

interface FileTreeProps {
  data: TreeNode[];
  onSelect: (path: string) => void;
  selectedPath: string;
}

export function FileTree({ data, onSelect, selectedPath }: FileTreeProps) {
  return (
    <div className="text-sm">
      {data.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          onSelect={onSelect}
          selectedPath={selectedPath}
          level={0}
        />
      ))}
    </div>
  );
}

interface TreeItemProps {
  node: TreeNode;
  onSelect: (path: string) => void;
  selectedPath: string;
  level: number;
}

function TreeItem({ node, onSelect, selectedPath, level }: TreeItemProps) {
  const [expanded, setExpanded] = useState(level < 2);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.isDir) {
      setExpanded(!expanded);
      onSelect(node.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded hover:bg-gray-100 ${
          isSelected ? "bg-green-50 text-green-700" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDir && hasChildren ? (
          expanded ? (
            <ChevronDown size={14} className="text-gray-400" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        {node.isDir ? (
          expanded ? (
            <FolderOpen size={16} className="text-yellow-500" />
          ) : (
            <Folder size={16} className="text-yellow-500" />
          )
        ) : null}
        <span className="truncate">{node.name}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
