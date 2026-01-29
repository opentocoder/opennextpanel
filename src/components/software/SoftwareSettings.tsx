"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save, RefreshCw, FileText, Settings, Activity } from "lucide-react";

interface Software {
  id: string;
  name: string;
  version: string;
  status: string;
}

interface SoftwareSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  software: Software | null;
  onRestart: (id: string) => void;
  onSaveConfig: (id: string, config: string) => void;
}

export function SoftwareSettings({
  open,
  onOpenChange,
  software,
  onRestart,
  onSaveConfig,
}: SoftwareSettingsProps) {
  const [config, setConfig] = useState("");
  const [autoStart, setAutoStart] = useState(true);

  if (!software) return null;

  // Mock config content based on software type
  const getDefaultConfig = () => {
    if (software.name.toLowerCase().includes("nginx")) {
      return `# Nginx Configuration
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80;
        server_name localhost;
        root /www/wwwroot/default;
        index index.html index.php;
    }
}`;
    }
    if (software.name.toLowerCase().includes("php")) {
      return `; PHP Configuration
[PHP]
engine = On
memory_limit = 256M
max_execution_time = 300
upload_max_filesize = 50M
post_max_size = 50M
date.timezone = Asia/Shanghai

[opcache]
opcache.enable=1
opcache.memory_consumption=128`;
    }
    if (software.name.toLowerCase().includes("mysql")) {
      return `# MySQL Configuration
[mysqld]
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
user=mysql
max_connections=500
innodb_buffer_pool_size=256M
innodb_log_file_size=64M
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci`;
    }
    return "# Configuration file";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{software.name}</span>
            <span className="text-sm font-normal text-gray-500">
              v{software.version}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                software.status === "running"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {software.status === "running" ? "运行中" : "已停止"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="config">
              <FileText size={14} className="mr-1" />
              配置文件
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings size={14} className="mr-1" />
              服务设置
            </TabsTrigger>
            <TabsTrigger value="status">
              <Activity size={14} className="mr-1" />
              运行状态
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="flex-1 flex flex-col mt-4">
            <textarea
              className="flex-1 w-full p-4 font-mono text-sm bg-gray-900 text-green-400 rounded-lg resize-none"
              value={config || getDefaultConfig()}
              onChange={(e) => setConfig(e.target.value)}
              spellCheck={false}
            />
            <div className="flex items-center gap-2 mt-3">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onSaveConfig(software.id, config)}
              >
                <Save size={14} className="mr-1" />
                保存
              </Button>
              <Button variant="outline" onClick={() => onRestart(software.id)}>
                <RefreshCw size={14} className="mr-1" />
                重启服务
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">开机自启</div>
                <div className="text-sm text-gray-500">
                  系统启动时自动启动此服务
                </div>
              </div>
              <Switch checked={autoStart} onCheckedChange={setAutoStart} />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="font-medium">服务端口</div>
              <div className="flex items-center gap-2">
                <Input defaultValue="80" className="w-24" />
                <Button variant="outline" size="sm">
                  修改
                </Button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="font-medium">安装目录</div>
              <div className="text-sm text-gray-600 font-mono">
                /www/server/{software.name.toLowerCase()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">CPU 使用率</div>
                  <div className="text-2xl font-bold text-gray-900">2.5%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">内存使用</div>
                  <div className="text-2xl font-bold text-gray-900">128 MB</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">运行时间</div>
                  <div className="text-2xl font-bold text-gray-900">5天 12小时</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">连接数</div>
                  <div className="text-2xl font-bold text-gray-900">42</div>
                </div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">进程信息</div>
                <pre className="text-xs text-green-400 font-mono overflow-auto">
{`PID    USER   PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
12345  www    20   0  256000  12800   8960 S   2.5   0.8   0:15.42 ${software.name.toLowerCase()}`}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
