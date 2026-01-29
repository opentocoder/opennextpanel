"use client";

import { useState, useEffect, useCallback } from "react";
import { SettingsForm, ApiSettings } from "@/components/settings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BasicSettingsData {
  panelName: string;
  panelPort: number;
  securityPath: string;
  username: string;
  sessionTimeout: number;
  autoBackup: boolean;
  backupRetention: number;
}

interface ApiSettingsData {
  apiEnabled: boolean;
  apiKey: string;
  apiWhitelist: string[];
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [basicSettings, setBasicSettings] = useState<BasicSettingsData>({
    panelName: "OpenPanel",
    panelPort: 8888,
    securityPath: "/open_panel",
    username: "admin",
    sessionTimeout: 120,
    autoBackup: true,
    backupRetention: 7,
  });

  const [apiSettings, setApiSettings] = useState<ApiSettingsData>({
    apiEnabled: false,
    apiKey: "",
    apiWhitelist: [],
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/settings?type=all");
      const data = await response.json();

      if (data.basicSettings) {
        setBasicSettings(data.basicSettings);
      }
      if (data.apiSettings) {
        setApiSettings(data.apiSettings);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveBasic = async (settings: BasicSettingsData) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_basic", settings }),
      });

      const data = await response.json();
      if (data.success) {
        setBasicSettings(settings);
        alert("基本设置已保存");
      } else {
        alert("保存失败: " + data.message);
      }
    } catch (error) {
      console.error("Failed to save basic settings:", error);
      alert("保存失败");
    }
  };

  const handleSaveApi = async (settings: ApiSettingsData) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_api", settings }),
      });

      const data = await response.json();
      if (data.success) {
        setApiSettings(settings);
        alert("API设置已保存");
      } else {
        alert("保存失败: " + data.message);
      }
    } catch (error) {
      console.error("Failed to save API settings:", error);
      alert("保存失败");
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      alert("两次输入的密码不一致");
      return;
    }
    if (passwords.new.length < 8) {
      alert("密码长度至少8位");
      return;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("密码修改成功");
        setPasswordDialogOpen(false);
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        alert("密码修改失败: " + data.message);
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      alert("密码修改失败");
    }
  };

  const handleRegenerateKey = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate_key" }),
      });

      const data = await response.json();
      if (data.success) {
        setApiSettings({ ...apiSettings, apiKey: data.apiKey });
        alert("API密钥已重新生成");
      } else {
        alert("生成失败: " + data.message);
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
      alert("生成失败");
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
      <h1 className="text-2xl font-bold mb-6">面板设置</h1>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">基本设置</TabsTrigger>
          <TabsTrigger value="api">API管理</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <SettingsForm
            settings={basicSettings}
            onSave={handleSaveBasic}
            onChangePassword={() => setPasswordDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="api">
          <ApiSettings
            settings={apiSettings}
            onSave={handleSaveApi}
            onRegenerateKey={handleRegenerateKey}
          />
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                当前密码
              </label>
              <Input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-2">新密码</label>
              <Input
                type="password"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                确认新密码
              </label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
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
