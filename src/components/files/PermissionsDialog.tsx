"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    name: string;
    path: string;
    permissions: string;
    owner: string;
    group: string;
  } | null;
  onSave: (path: string, permissions: string, owner: string, group: string, recursive: boolean) => void;
}

interface PermBits {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export function PermissionsDialog({ open, onOpenChange, file, onSave }: PermissionsDialogProps) {
  const [owner, setOwner] = useState("");
  const [group, setGroup] = useState("");
  const [ownerPerms, setOwnerPerms] = useState<PermBits>({ read: false, write: false, execute: false });
  const [groupPerms, setGroupPerms] = useState<PermBits>({ read: false, write: false, execute: false });
  const [otherPerms, setOtherPerms] = useState<PermBits>({ read: false, write: false, execute: false });
  const [recursive, setRecursive] = useState(false);

  useEffect(() => {
    if (file) {
      setOwner(file.owner);
      setGroup(file.group);
      parsePermissions(file.permissions);
    }
  }, [file]);

  const parsePermissions = (perms: string) => {
    // Parse permissions like "rwxr-xr-x" or "755"
    if (perms.length === 9 || perms.length === 10) {
      const p = perms.slice(-9);
      setOwnerPerms({
        read: p[0] === "r",
        write: p[1] === "w",
        execute: p[2] === "x" || p[2] === "s",
      });
      setGroupPerms({
        read: p[3] === "r",
        write: p[4] === "w",
        execute: p[5] === "x" || p[5] === "s",
      });
      setOtherPerms({
        read: p[6] === "r",
        write: p[7] === "w",
        execute: p[8] === "x" || p[8] === "t",
      });
    } else if (/^\d{3,4}$/.test(perms)) {
      const octal = perms.slice(-3);
      const toPerms = (n: number): PermBits => ({
        read: (n & 4) !== 0,
        write: (n & 2) !== 0,
        execute: (n & 1) !== 0,
      });
      setOwnerPerms(toPerms(parseInt(octal[0])));
      setGroupPerms(toPerms(parseInt(octal[1])));
      setOtherPerms(toPerms(parseInt(octal[2])));
    }
  };

  const toOctal = (perms: PermBits): number => {
    return (perms.read ? 4 : 0) + (perms.write ? 2 : 0) + (perms.execute ? 1 : 0);
  };

  const getPermissionsString = (): string => {
    return `${toOctal(ownerPerms)}${toOctal(groupPerms)}${toOctal(otherPerms)}`;
  };

  const handleSave = () => {
    if (!file) return;
    onSave(file.path, getPermissionsString(), owner, group, recursive);
    onOpenChange(false);
  };

  if (!file) return null;

  const PermCheckboxGroup = ({
    label,
    perms,
    onChange,
  }: {
    label: string;
    perms: PermBits;
    onChange: (perms: PermBits) => void;
  }) => (
    <div className="space-y-2">
      <div className="font-medium text-sm">{label}</div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={perms.read}
            onCheckedChange={(v) => onChange({ ...perms, read: !!v })}
          />
          读取
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={perms.write}
            onCheckedChange={(v) => onChange({ ...perms, write: !!v })}
          />
          写入
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={perms.execute}
            onCheckedChange={(v) => onChange({ ...perms, execute: !!v })}
          />
          执行
        </label>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>文件权限: {file.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">所有者</label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">用户组</label>
              <Input value={group} onChange={(e) => setGroup(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <PermCheckboxGroup label="所有者权限" perms={ownerPerms} onChange={setOwnerPerms} />
            <PermCheckboxGroup label="用户组权限" perms={groupPerms} onChange={setGroupPerms} />
            <PermCheckboxGroup label="其他用户权限" perms={otherPerms} onChange={setOtherPerms} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
            <span className="text-sm">权限值</span>
            <code className="font-mono text-lg">{getPermissionsString()}</code>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recursive} onCheckedChange={(v) => setRecursive(!!v)} />
            应用到子目录和文件
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
