"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddFtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

export function AddFtpDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddFtpDialogProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    path: "/www/wwwroot/",
  });

  const handleSubmit = () => {
    if (!formData.username || !formData.password) {
      alert("用户名和密码不能为空");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }
    onSubmit(formData);
    onOpenChange(false);
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      path: "/www/wwwroot/",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加FTP账户</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">用户名</label>
            <Input
              placeholder="请输入FTP用户名"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">密码</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">确认密码</label>
            <Input
              type="password"
              placeholder="请再次输入密码"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">根目录</label>
            <div className="flex gap-2">
              <Input
                value={formData.path}
                onChange={(e) =>
                  setFormData({ ...formData, path: e.target.value })
                }
              />
              <Button variant="outline">选择</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
          >
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
