"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: { name: string; path: string }[];
  currentPath: string;
  onCompress: (files: string[], filename: string, format: string) => void;
  onExtract?: (file: string, targetPath: string) => void;
  mode: "compress" | "extract";
}

export function CompressDialog({
  open,
  onOpenChange,
  files,
  currentPath,
  onCompress,
  onExtract,
  mode,
}: CompressDialogProps) {
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState("zip");
  const [targetPath, setTargetPath] = useState(currentPath);

  const handleSubmit = () => {
    if (mode === "compress") {
      const archiveName = filename || `archive_${Date.now()}`;
      onCompress(
        files.map((f) => f.path),
        archiveName,
        format
      );
    } else if (mode === "extract" && onExtract && files.length === 1) {
      onExtract(files[0].path, targetPath);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "compress" ? "压缩文件" : "解压文件"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "compress" ? (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  选中的文件 ({files.length}个)
                </label>
                <div className="max-h-32 overflow-auto p-2 bg-gray-50 rounded text-sm">
                  {files.map((f) => (
                    <div key={f.path} className="truncate">
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  压缩文件名
                </label>
                <Input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="archive"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  压缩格式
                </label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP (.zip)</SelectItem>
                    <SelectItem value="tar.gz">TAR.GZ (.tar.gz)</SelectItem>
                    <SelectItem value="tar">TAR (.tar)</SelectItem>
                    <SelectItem value="7z">7Z (.7z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  压缩文件
                </label>
                <div className="p-2 bg-gray-50 rounded text-sm">
                  {files[0]?.name}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  解压到目录
                </label>
                <div className="flex gap-2">
                  <Input
                    value={targetPath}
                    onChange={(e) => setTargetPath(e.target.value)}
                  />
                  <Button variant="outline">选择</Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
            {mode === "compress" ? "压缩" : "解压"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
