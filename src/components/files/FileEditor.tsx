"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface FileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    name: string;
    path: string;
    content?: string;
  } | null;
  onSave: (path: string, content: string) => void;
}

export function FileEditor({ open, onOpenChange, file, onSave }: FileEditorProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file?.content !== undefined) {
      setContent(file.content);
    }
  }, [file]);

  const handleSave = async () => {
    if (!file) return;
    setLoading(true);
    try {
      await onSave(file.path, content);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      php: "php",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      xml: "xml",
      yml: "yaml",
      yaml: "yaml",
      md: "markdown",
      sql: "sql",
      sh: "shell",
      bash: "shell",
      conf: "nginx",
      nginx: "nginx",
    };
    return langMap[ext || ""] || "plaintext";
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>编辑文件: {file.name}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save size={16} className="mr-1" />
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                <X size={16} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden border rounded-lg">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full min-h-[500px] p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex-shrink-0 flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>语言: {getLanguage(file.name)}</span>
          <span>路径: {file.path}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
