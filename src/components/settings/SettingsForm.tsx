"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface SettingsFormProps {
  settings: {
    panelName: string;
    panelPort: number;
    securityPath: string;
    username: string;
    sessionTimeout: number;
    autoBackup: boolean;
    backupRetention: number;
  };
  onSave: (settings: any) => void;
  onChangePassword: () => void;
}

export function SettingsForm({
  settings,
  onSave,
  onChangePassword,
}: SettingsFormProps) {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>基本设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                面板名称
              </label>
              <Input
                value={formData.panelName}
                onChange={(e) =>
                  setFormData({ ...formData, panelName: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-2">
                面板端口
              </label>
              <Input
                type="number"
                value={formData.panelPort}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    panelPort: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                修改后需要重启面板生效
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">安全入口</label>
            <Input
              value={formData.securityPath}
              onChange={(e) =>
                setFormData({ ...formData, securityPath: e.target.value })
              }
              placeholder="/open_xxxxx"
            />
            <p className="text-xs text-gray-500 mt-1">
              访问面板时必须带上此路径，留空则关闭
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">
              会话超时时间 (分钟)
            </label>
            <Input
              type="number"
              value={formData.sessionTimeout}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sessionTimeout: parseInt(e.target.value),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>账户设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-2">用户名</label>
            <Input
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">密码</label>
            <Button variant="outline" onClick={onChangePassword}>
              修改密码
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>备份设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自动备份</p>
              <p className="text-sm text-gray-500">每天自动备份面板配置</p>
            </div>
            <Switch
              checked={formData.autoBackup}
              onCheckedChange={(v) =>
                setFormData({ ...formData, autoBackup: v })
              }
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-2">
              备份保留天数
            </label>
            <Input
              type="number"
              value={formData.backupRetention}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  backupRetention: parseInt(e.target.value),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={handleSubmit}
        >
          保存设置
        </Button>
      </div>
    </div>
  );
}
