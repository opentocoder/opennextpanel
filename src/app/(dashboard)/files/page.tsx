"use client";

import { useState, useEffect } from "react";
import {
  FileTree,
  FileList,
  FileToolbar,
  FileEditor,
  PermissionsDialog,
  CompressDialog,
} from "@/components/files";
import { ConfirmDialog } from "@/components/common";
import { ChevronRight, Home } from "lucide-react";

interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mtime: string;
  permissions: string;
  owner: string;
  group: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState("/www/wwwroot");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [clipboard, setClipboard] = useState<{ files: FileItem[]; action: "copy" | "cut" } | null>(null);

  // Dialogs
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<{ name: string; path: string; content?: string } | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionsFile, setPermissionsFile] = useState<FileItem | null>(null);
  const [compressOpen, setCompressOpen] = useState(false);
  const [compressMode, setCompressMode] = useState<"compress" | "extract">("compress");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);

  useEffect(() => {
    fetchFiles(currentPath);
    fetchTree();
  }, [currentPath]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTree = async () => {
    try {
      const res = await fetch("/api/files/tree");
      const data = await res.json();
      setTreeData(data.tree || []);
    } catch (error) {
      console.error("Failed to fetch tree:", error);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles([]);
  };

  const handleEdit = async (file: FileItem) => {
    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      setEditingFile({ name: file.name, path: file.path, content: data.content });
      setEditorOpen(true);
    } catch (error) {
      console.error("Failed to load file:", error);
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    try {
      await fetch("/api/files/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      fetchFiles(currentPath);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: selectedFiles.map((f) => f.path) }),
      });
      setDeleteOpen(false);
      setSelectedFiles([]);
      fetchFiles(currentPath);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleCopy = (files: FileItem[]) => {
    setClipboard({ files, action: "copy" });
  };

  const handleCut = (files: FileItem[]) => {
    setClipboard({ files, action: "cut" });
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      await fetch("/api/files/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: clipboard.files.map((f) => f.path),
          target: currentPath,
          action: clipboard.action,
        }),
      });
      if (clipboard.action === "cut") {
        setClipboard(null);
      }
      fetchFiles(currentPath);
    } catch (error) {
      console.error("Failed to paste:", error);
    }
  };

  const handlePermissions = (file: FileItem) => {
    setPermissionsFile(file);
    setPermissionsOpen(true);
  };

  const handleSavePermissions = async (
    path: string,
    permissions: string,
    owner: string,
    group: string,
    recursive: boolean
  ) => {
    try {
      await fetch("/api/files/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, permissions, owner, group, recursive }),
      });
      fetchFiles(currentPath);
    } catch (error) {
      console.error("Failed to update permissions:", error);
    }
  };

  const handleCompress = async (files: string[], filename: string, format: string) => {
    try {
      await fetch("/api/files/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, filename, format, target: currentPath }),
      });
      fetchFiles(currentPath);
    } catch (error) {
      console.error("Failed to compress:", error);
    }
  };

  const handleExtract = async (file: string, targetPath: string) => {
    try {
      await fetch("/api/files/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, target: targetPath }),
      });
      fetchFiles(currentPath);
    } catch (error) {
      console.error("Failed to extract:", error);
    }
  };

  const handleDownload = (file: FileItem) => {
    window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, "_blank");
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 p-3 bg-gray-50 border-b text-sm">
        <button
          className="flex items-center gap-1 text-blue-600 hover:underline"
          onClick={() => handleNavigate("/")}
        >
          <Home size={14} />
          根目录
        </button>
        {breadcrumbs.map((segment, index) => {
          const path = "/" + breadcrumbs.slice(0, index + 1).join("/");
          return (
            <span key={path} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-gray-400" />
              <button
                className="text-blue-600 hover:underline"
                onClick={() => handleNavigate(path)}
              >
                {segment}
              </button>
            </span>
          );
        })}
      </div>

      {/* Toolbar */}
      <FileToolbar
        currentPath={currentPath}
        onNewFolder={() => setNewFolderOpen(true)}
        onNewFile={() => setNewFileOpen(true)}
        onUpload={() => {}}
        onDownload={() => selectedFiles.length === 1 && handleDownload(selectedFiles[0])}
        onDelete={() => setDeleteOpen(true)}
        onCopy={() => handleCopy(selectedFiles)}
        onCut={() => handleCut(selectedFiles)}
        onPaste={handlePaste}
        onCompress={() => {
          setCompressMode("compress");
          setCompressOpen(true);
        }}
        onRefresh={() => fetchFiles(currentPath)}
        onTerminal={() => {}}
        onSearch={() => {}}
        hasSelection={selectedFiles.length > 0}
        hasClipboard={clipboard !== null}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree */}
        <div className="w-64 border-r overflow-auto bg-white">
          <FileTree
            data={treeData}
            onSelect={handleNavigate}
            selectedPath={currentPath}
          />
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <FileList
              files={files}
              onNavigate={handleNavigate}
              onEdit={handleEdit}
              onDelete={(files) => {
                setSelectedFiles(files);
                setDeleteOpen(true);
              }}
              onCopy={handleCopy}
              onCut={handleCut}
              onDownload={handleDownload}
              onPermissions={handlePermissions}
              selectedFiles={selectedFiles}
              onSelectionChange={setSelectedFiles}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <FileEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        file={editingFile}
        onSave={handleSaveFile}
      />

      <PermissionsDialog
        open={permissionsOpen}
        onOpenChange={setPermissionsOpen}
        file={permissionsFile}
        onSave={handleSavePermissions}
      />

      <CompressDialog
        open={compressOpen}
        onOpenChange={setCompressOpen}
        files={selectedFiles}
        currentPath={currentPath}
        onCompress={handleCompress}
        onExtract={handleExtract}
        mode={compressMode}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除文件"
        description={`确定要删除选中的 ${selectedFiles.length} 个文件/文件夹吗？此操作不可恢复。`}
        onConfirm={handleDelete}
        confirmText="删除"
        variant="destructive"
      />
    </div>
  );
}
