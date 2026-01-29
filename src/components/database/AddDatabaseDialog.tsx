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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface AddDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

export function AddDatabaseDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddDatabaseDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    dbType: "mysql",
    charset: "utf8mb4",
    accessPermission: "localhost",
    customPermission: "",
  });

  const [sameAsDbName, setSameAsDbName] = useState(true);

  const handleSubmit = () => {
    if (formData.password !== formData.confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }
    onSubmit({
      ...formData,
      username: sameAsDbName ? formData.name : formData.username,
    });
    onOpenChange(false);
    setFormData({
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      dbType: "mysql",
      charset: "utf8mb4",
      accessPermission: "localhost",
      customPermission: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加数据库</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">数据库名</label>
            <Input
              placeholder="请输入数据库名"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">用户名与数据库名相同</span>
            <Switch checked={sameAsDbName} onCheckedChange={setSameAsDbName} />
          </div>

          {!sameAsDbName && (
            <div>
              <label className="text-sm text-gray-600 block mb-2">用户名</label>
              <Input
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>
          )}

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
            <label className="text-sm text-gray-600 block mb-2">数据库类型</label>
            <Select
              value={formData.dbType}
              onValueChange={(v) => setFormData({ ...formData, dbType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="mariadb">MariaDB</SelectItem>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">字符集</label>
            <Select
              value={formData.charset}
              onValueChange={(v) => setFormData({ ...formData, charset: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utf8mb4">utf8mb4</SelectItem>
                <SelectItem value="utf8">utf8</SelectItem>
                <SelectItem value="gbk">gbk</SelectItem>
                <SelectItem value="latin1">latin1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">访问权限</label>
            <Select
              value={formData.accessPermission}
              onValueChange={(v) =>
                setFormData({ ...formData, accessPermission: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="localhost">本地服务器</SelectItem>
                <SelectItem value="%">所有人</SelectItem>
                <SelectItem value="custom">指定IP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.accessPermission === "custom" && (
            <div>
              <label className="text-sm text-gray-600 block mb-2">指定IP</label>
              <Input
                placeholder="如: 192.168.1.%"
                value={formData.customPermission}
                onChange={(e) =>
                  setFormData({ ...formData, customPermission: e.target.value })
                }
              />
            </div>
          )}
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
