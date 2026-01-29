"use client";

import { useState } from "react";
import {
  File,
  Folder,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  Copy,
  Scissors,
  Lock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

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

interface FileListProps {
  files: FileItem[];
  onNavigate: (path: string) => void;
  onEdit: (file: FileItem) => void;
  onDelete: (files: FileItem[]) => void;
  onCopy: (files: FileItem[]) => void;
  onCut: (files: FileItem[]) => void;
  onDownload: (file: FileItem) => void;
  onPermissions: (file: FileItem) => void;
  selectedFiles: FileItem[];
  onSelectionChange: (files: FileItem[]) => void;
}

const getFileIcon = (file: FileItem) => {
  if (file.isDir) return <Folder size={18} className="text-yellow-500" />;

  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "php":
    case "py":
    case "sh":
    case "html":
    case "css":
      return <FileCode size={18} className="text-blue-500" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
    case "webp":
      return <FileImage size={18} className="text-green-500" />;
    case "zip":
    case "tar":
    case "gz":
    case "rar":
    case "7z":
      return <FileArchive size={18} className="text-orange-500" />;
    case "txt":
    case "md":
    case "log":
      return <FileText size={18} className="text-gray-500" />;
    default:
      return <File size={18} className="text-gray-400" />;
  }
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export function FileList({
  files,
  onNavigate,
  onEdit,
  onDelete,
  onCopy,
  onCut,
  onDownload,
  onPermissions,
  selectedFiles,
  onSelectionChange,
}: FileListProps) {
  const allSelected = files.length > 0 && selectedFiles.length === files.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(files);
    }
  };

  const toggleFile = (file: FileItem) => {
    const isSelected = selectedFiles.some((f) => f.path === file.path);
    if (isSelected) {
      onSelectionChange(selectedFiles.filter((f) => f.path !== file.path));
    } else {
      onSelectionChange([...selectedFiles, file]);
    }
  };

  const handleDoubleClick = (file: FileItem) => {
    if (file.isDir) {
      onNavigate(file.path);
    } else {
      onEdit(file);
    }
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr className="border-b">
            <th className="w-10 p-2 text-left">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </th>
            <th className="p-2 text-left font-medium text-gray-600">文件名</th>
            <th className="w-24 p-2 text-left font-medium text-gray-600">大小</th>
            <th className="w-32 p-2 text-left font-medium text-gray-600">修改时间</th>
            <th className="w-24 p-2 text-left font-medium text-gray-600">权限</th>
            <th className="w-24 p-2 text-left font-medium text-gray-600">所有者</th>
            <th className="w-16 p-2 text-center font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isSelected = selectedFiles.some((f) => f.path === file.path);
            return (
              <tr
                key={file.path}
                className={`border-b hover:bg-gray-50 cursor-pointer ${
                  isSelected ? "bg-green-50" : ""
                }`}
                onDoubleClick={() => handleDoubleClick(file)}
              >
                <td className="p-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleFile(file)}
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file)}
                    <span className={file.isDir ? "text-blue-600" : ""}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="p-2 text-gray-500">{formatSize(file.size)}</td>
                <td className="p-2 text-gray-500">{file.mtime}</td>
                <td className="p-2 font-mono text-xs text-gray-500">
                  {file.permissions}
                </td>
                <td className="p-2 text-gray-500">{file.owner}</td>
                <td className="p-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!file.isDir && (
                        <DropdownMenuItem onClick={() => onEdit(file)}>
                          <Edit size={14} className="mr-2" />
                          编辑
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDownload(file)}>
                        <Download size={14} className="mr-2" />
                        下载
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onCopy([file])}>
                        <Copy size={14} className="mr-2" />
                        复制
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCut([file])}>
                        <Scissors size={14} className="mr-2" />
                        剪切
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onPermissions(file)}>
                        <Lock size={14} className="mr-2" />
                        权限
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete([file])}
                        className="text-red-600"
                      >
                        <Trash2 size={14} className="mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {files.length === 0 && (
        <div className="text-center py-12 text-gray-500">空目录</div>
      )}
    </div>
  );
}
