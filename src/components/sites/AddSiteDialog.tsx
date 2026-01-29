"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

export function AddSiteDialog({ open, onOpenChange, onSubmit }: AddSiteDialogProps) {
  const [formData, setFormData] = useState({
    domain: "",
    remark: "",
    rootPath: "/www/wwwroot/",
    createFtp: false,
    createDb: false,
    phpVersion: "8.2",
  });

  const handleSubmit = () => {
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加站点</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">域名</label>
            <Input
              placeholder="example.com (多个域名用换行分隔)"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">备注</label>
            <Input
              placeholder="网站备注"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">根目录</label>
            <div className="flex gap-2">
              <Input
                value={formData.rootPath}
                onChange={(e) => setFormData({ ...formData, rootPath: e.target.value })}
              />
              <Button variant="outline">选择</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">创建FTP</span>
            <Switch
              checked={formData.createFtp}
              onCheckedChange={(v) => setFormData({ ...formData, createFtp: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">创建数据库</span>
            <Switch
              checked={formData.createDb}
              onCheckedChange={(v) => setFormData({ ...formData, createDb: v })}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">PHP版本</label>
            <Select
              value={formData.phpVersion}
              onValueChange={(v) => setFormData({ ...formData, phpVersion: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">纯静态</SelectItem>
                <SelectItem value="7.4">PHP-7.4</SelectItem>
                <SelectItem value="8.0">PHP-8.0</SelectItem>
                <SelectItem value="8.2">PHP-8.2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
