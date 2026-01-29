"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderPlus,
  FilePlus,
  Upload,
  Download,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Archive,
  RefreshCw,
  Terminal,
  Search,
} from "lucide-react";

interface FileToolbarProps {
  currentPath: string;
  onNewFolder: () => void;
  onNewFile: () => void;
  onUpload: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onCompress: () => void;
  onRefresh: () => void;
  onTerminal: () => void;
  onSearch: (query: string) => void;
  hasSelection: boolean;
  hasClipboard: boolean;
}

export function FileToolbar({
  currentPath,
  onNewFolder,
  onNewFile,
  onUpload,
  onDownload,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  onCompress,
  onRefresh,
  onTerminal,
  onSearch,
  hasSelection,
  hasClipboard,
}: FileToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onNewFolder}>
          <FolderPlus size={16} className="mr-1" />
          新建目录
        </Button>
        <Button size="sm" variant="outline" onClick={onNewFile}>
          <FilePlus size={16} className="mr-1" />
          新建文件
        </Button>
        <Button size="sm" variant="outline" onClick={onUpload}>
          <Upload size={16} className="mr-1" />
          上传
        </Button>
      </div>

      <div className="h-6 w-px bg-gray-300" />

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onCopy}
          disabled={!hasSelection}
        >
          <Copy size={16} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCut}
          disabled={!hasSelection}
        >
          <Scissors size={16} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onPaste}
          disabled={!hasClipboard}
        >
          <Clipboard size={16} />
        </Button>
      </div>

      <div className="h-6 w-px bg-gray-300" />

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onDownload}
          disabled={!hasSelection}
        >
          <Download size={16} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCompress}
          disabled={!hasSelection}
        >
          <Archive size={16} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          disabled={!hasSelection}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <div className="h-6 w-px bg-gray-300" />

      <Button size="sm" variant="outline" onClick={onTerminal}>
        <Terminal size={16} className="mr-1" />
        终端
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="搜索文件..."
            className="pl-8 h-8 w-48"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCw size={16} />
        </Button>
      </div>
    </div>
  );
}
