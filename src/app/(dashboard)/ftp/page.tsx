"use client";

import { useState, useEffect } from "react";
import { FtpList, AddFtpDialog } from "@/components/ftp";
import { ConfirmDialog } from "@/components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FtpAccount {
  id: number;
  username: string;
  password: string;
  path: string;
  status: "active" | "disabled";
  createdAt: string;
}

export default function FtpPage() {
  const [accounts, setAccounts] = useState<FtpAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FtpAccount | null>(
    null
  );
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/ftp");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Failed to fetch FTP accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    try {
      const res = await fetch("/api/ftp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchAccounts();
        setAddDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to add FTP account:", error);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    try {
      const res = await fetch(`/api/ftp?id=${selectedAccount.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error("Failed to delete FTP account:", error);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedAccount || !newPassword) return;
    try {
      const res = await fetch("/api/ftp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedAccount.id, password: newPassword }),
      });
      if (res.ok) {
        fetchAccounts();
        setPasswordDialogOpen(false);
        setNewPassword("");
      }
    } catch (error) {
      console.error("Failed to change password:", error);
    }
  };

  const handleToggleStatus = async (account: FtpAccount) => {
    try {
      const newStatus = account.status === "active" ? "disabled" : "active";
      const res = await fetch("/api/ftp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, status: newStatus }),
      });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">FTP管理</h1>

      <FtpList
        accounts={accounts}
        onAdd={() => setAddDialogOpen(true)}
        onDelete={(account) => {
          setSelectedAccount(account);
          setDeleteDialogOpen(true);
        }}
        onChangePassword={(account) => {
          setSelectedAccount(account);
          setPasswordDialogOpen(true);
        }}
        onToggleStatus={handleToggleStatus}
      />

      <AddFtpDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAdd}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除FTP账户"
        description={`确定要删除FTP账户 "${selectedAccount?.username}" 吗？此操作不可恢复。`}
        onConfirm={handleDelete}
        confirmText="删除"
        variant="destructive"
      />

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码 - {selectedAccount?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">新密码</label>
              <Input
                type="password"
                placeholder="请输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleChangePassword}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
