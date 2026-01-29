"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SecuritySettingsProps {
  settings: {
    sshPort: number;
    panelPort: number;
    securityPath: string;
    firewallEnabled: boolean;
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
  onSave: (settings: any) => void;
}

export function SecuritySettings({ settings, onSave }: SecuritySettingsProps) {
  const [formData, setFormData] = useState(settings);
  const [newWhitelistIp, setNewWhitelistIp] = useState("");
  const [newBlacklistIp, setNewBlacklistIp] = useState("");

  const handleAddWhitelist = () => {
    if (newWhitelistIp && !formData.ipWhitelist.includes(newWhitelistIp)) {
      setFormData({
        ...formData,
        ipWhitelist: [...formData.ipWhitelist, newWhitelistIp],
      });
      setNewWhitelistIp("");
    }
  };

  const handleRemoveWhitelist = (ip: string) => {
    setFormData({
      ...formData,
      ipWhitelist: formData.ipWhitelist.filter((i) => i !== ip),
    });
  };

  const handleAddBlacklist = () => {
    if (newBlacklistIp && !formData.ipBlacklist.includes(newBlacklistIp)) {
      setFormData({
        ...formData,
        ipBlacklist: [...formData.ipBlacklist, newBlacklistIp],
      });
      setNewBlacklistIp("");
    }
  };

  const handleRemoveBlacklist = (ip: string) => {
    setFormData({
      ...formData,
      ipBlacklist: formData.ipBlacklist.filter((i) => i !== ip),
    });
  };

  return (
    <Tabs defaultValue="basic" className="space-y-4">
      <TabsList>
        <TabsTrigger value="basic">基本设置</TabsTrigger>
        <TabsTrigger value="whitelist">IP白名单</TabsTrigger>
        <TabsTrigger value="blacklist">IP黑名单</TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <Card>
          <CardHeader>
            <CardTitle>基本安全设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  SSH端口
                </label>
                <Input
                  type="number"
                  value={formData.sshPort}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sshPort: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  建议使用非默认端口 (非22)
                </p>
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
                  修改后需要重启面板
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-2">
                安全入口
              </label>
              <Input
                value={formData.securityPath}
                onChange={(e) =>
                  setFormData({ ...formData, securityPath: e.target.value })
                }
                placeholder="/open_xxxxx"
              />
              <p className="text-xs text-gray-500 mt-1">
                访问面板时必须带上此路径
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">系统防火墙</p>
                <p className="text-sm text-gray-500">
                  启用防火墙可有效阻止恶意攻击
                </p>
              </div>
              <Switch
                checked={formData.firewallEnabled}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, firewallEnabled: v })
                }
              />
            </div>

            <div className="pt-4">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onSave(formData)}
              >
                保存设置
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="whitelist">
        <Card>
          <CardHeader>
            <CardTitle>IP白名单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              白名单中的IP可以直接访问面板，无需安全入口
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="输入IP地址"
                value={newWhitelistIp}
                onChange={(e) => setNewWhitelistIp(e.target.value)}
              />
              <Button onClick={handleAddWhitelist}>添加</Button>
            </div>

            <div className="space-y-2">
              {formData.ipWhitelist.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="font-mono">{ip}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleRemoveWhitelist(ip)}
                  >
                    删除
                  </Button>
                </div>
              ))}
              {formData.ipWhitelist.length === 0 && (
                <p className="text-center text-gray-500 py-4">暂无白名单IP</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="blacklist">
        <Card>
          <CardHeader>
            <CardTitle>IP黑名单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              黑名单中的IP将被禁止访问面板和服务器
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="输入IP地址"
                value={newBlacklistIp}
                onChange={(e) => setNewBlacklistIp(e.target.value)}
              />
              <Button onClick={handleAddBlacklist}>添加</Button>
            </div>

            <div className="space-y-2">
              {formData.ipBlacklist.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="font-mono">{ip}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleRemoveBlacklist(ip)}
                  >
                    删除
                  </Button>
                </div>
              ))}
              {formData.ipBlacklist.length === 0 && (
                <p className="text-center text-gray-500 py-4">暂无黑名单IP</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
