"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

interface ApiSettingsProps {
  settings: {
    apiEnabled: boolean;
    apiKey: string;
    apiWhitelist: string[];
  };
  onSave: (settings: any) => void;
  onRegenerateKey: () => void;
}

export function ApiSettings({
  settings,
  onSave,
  onRegenerateKey,
}: ApiSettingsProps) {
  const [formData, setFormData] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  const [newIp, setNewIp] = useState("");

  const handleCopyKey = () => {
    navigator.clipboard.writeText(formData.apiKey);
    alert("API密钥已复制到剪贴板");
  };

  const handleAddIp = () => {
    if (newIp && !formData.apiWhitelist.includes(newIp)) {
      setFormData({
        ...formData,
        apiWhitelist: [...formData.apiWhitelist, newIp],
      });
      setNewIp("");
    }
  };

  const handleRemoveIp = (ip: string) => {
    setFormData({
      ...formData,
      apiWhitelist: formData.apiWhitelist.filter((i) => i !== ip),
    });
  };

  return (
    <div className="space-y-6">
      {/* API Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>API设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">启用API</p>
              <p className="text-sm text-gray-500">
                允许通过API接口管理面板
              </p>
            </div>
            <Switch
              checked={formData.apiEnabled}
              onCheckedChange={(v) =>
                setFormData({ ...formData, apiEnabled: v })
              }
            />
          </div>

          {formData.apiEnabled && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  API密钥
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={formData.apiKey}
                      readOnly
                      className="pr-10 font-mono"
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={handleCopyKey}>
                    <Copy size={14} className="mr-1" />
                    复制
                  </Button>
                  <Button variant="outline" onClick={onRegenerateKey}>
                    <RefreshCw size={14} className="mr-1" />
                    重新生成
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  请妥善保管API密钥，不要泄露给他人
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  IP白名单
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  只有白名单中的IP才能调用API，留空则允许所有IP
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="输入IP地址"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                  />
                  <Button onClick={handleAddIp}>添加</Button>
                </div>
                <div className="space-y-2">
                  {formData.apiWhitelist.map((ip) => (
                    <div
                      key={ip}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="font-mono">{ip}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleRemoveIp(ip)}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      {formData.apiEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>API文档</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">认证方式</h4>
                <p className="text-sm text-gray-600">
                  在请求头中添加 <code className="bg-gray-100 px-1 rounded">Authorization: Bearer {"{API_KEY}"}</code>
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">可用接口</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <code className="text-blue-600">GET /api/system</code>
                    <span className="text-gray-500 ml-2">获取系统信息</span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <code className="text-blue-600">GET /api/sites</code>
                    <span className="text-gray-500 ml-2">获取网站列表</span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <code className="text-green-600">POST /api/sites</code>
                    <span className="text-gray-500 ml-2">创建网站</span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <code className="text-blue-600">GET /api/database</code>
                    <span className="text-gray-500 ml-2">获取数据库列表</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => onSave(formData)}
        >
          保存设置
        </Button>
      </div>
    </div>
  );
}
