"use client";

import { useState, useEffect } from "react";
import { SoftwareList, SoftwareSettings, InstallDialog } from "@/components/software";
import { ConfirmDialog } from "@/components/common";

interface Software {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  status: "installed" | "running" | "stopped" | "not_installed";
  size?: string;
  homepage?: string;
  versions?: string[];
}

// Default software list
const defaultSoftware: Software[] = [
  {
    id: "nginx",
    name: "Nginx",
    version: "1.24.0",
    versions: ["1.24.0", "1.22.1", "1.20.2"],
    description: "高性能 HTTP 和反向代理服务器",
    icon: "🌐",
    category: "webserver",
    status: "running",
    size: "2.1 MB",
    homepage: "https://nginx.org",
  },
  {
    id: "php82",
    name: "PHP-8.2",
    version: "8.2.15",
    versions: ["8.2.15", "8.2.14", "8.2.13"],
    description: "流行的服务器端脚本语言",
    icon: "🐘",
    category: "runtime",
    status: "running",
    size: "45 MB",
    homepage: "https://php.net",
  },
  {
    id: "php81",
    name: "PHP-8.1",
    version: "8.1.27",
    versions: ["8.1.27", "8.1.26"],
    description: "流行的服务器端脚本语言",
    icon: "🐘",
    category: "runtime",
    status: "stopped",
    size: "42 MB",
  },
  {
    id: "php74",
    name: "PHP-7.4",
    version: "7.4.33",
    description: "流行的服务器端脚本语言 (旧版本)",
    icon: "🐘",
    category: "runtime",
    status: "not_installed",
    size: "38 MB",
  },
  {
    id: "mysql",
    name: "MySQL",
    version: "8.0.36",
    versions: ["8.0.36", "8.0.35", "5.7.44"],
    description: "开源关系型数据库管理系统",
    icon: "🐬",
    category: "database",
    status: "running",
    size: "450 MB",
    homepage: "https://mysql.com",
  },
  {
    id: "redis",
    name: "Redis",
    version: "7.2.4",
    versions: ["7.2.4", "7.0.15", "6.2.14"],
    description: "高性能键值存储数据库",
    icon: "🔴",
    category: "cache",
    status: "running",
    size: "8 MB",
    homepage: "https://redis.io",
  },
  {
    id: "memcached",
    name: "Memcached",
    version: "1.6.23",
    description: "高性能分布式内存缓存系统",
    icon: "💾",
    category: "cache",
    status: "not_installed",
    size: "1.5 MB",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    version: "7.0.5",
    description: "面向文档的 NoSQL 数据库",
    icon: "🍃",
    category: "database",
    status: "not_installed",
    size: "180 MB",
    homepage: "https://mongodb.com",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    version: "16.2",
    description: "功能强大的开源对象关系型数据库",
    icon: "🐘",
    category: "database",
    status: "not_installed",
    size: "120 MB",
    homepage: "https://postgresql.org",
  },
  {
    id: "nodejs",
    name: "Node.js",
    version: "20.11.0",
    versions: ["20.11.0", "18.19.0", "16.20.2"],
    description: "基于 Chrome V8 的 JavaScript 运行时",
    icon: "💚",
    category: "runtime",
    status: "not_installed",
    size: "35 MB",
    homepage: "https://nodejs.org",
  },
  {
    id: "python",
    name: "Python",
    version: "3.12.1",
    versions: ["3.12.1", "3.11.7", "3.10.13"],
    description: "通用编程语言",
    icon: "🐍",
    category: "runtime",
    status: "installed",
    size: "85 MB",
  },
  {
    id: "phpmyadmin",
    name: "phpMyAdmin",
    version: "5.2.1",
    description: "MySQL 数据库 Web 管理工具",
    icon: "📊",
    category: "tools",
    status: "running",
    size: "15 MB",
  },
  {
    id: "pureftpd",
    name: "Pure-FTPd",
    version: "1.0.51",
    description: "安全高效的 FTP 服务器",
    icon: "📁",
    category: "tools",
    status: "running",
    size: "3 MB",
  },
  {
    id: "fail2ban",
    name: "Fail2ban",
    version: "1.0.2",
    description: "防止暴力破解的安全工具",
    icon: "🛡️",
    category: "security",
    status: "running",
    size: "5 MB",
  },
  {
    id: "docker",
    name: "Docker",
    version: "25.0.2",
    description: "应用容器引擎",
    icon: "🐳",
    category: "tools",
    status: "not_installed",
    size: "200 MB",
    homepage: "https://docker.com",
  },
];

export default function SoftwarePage() {
  const [software, setSoftware] = useState<Software[]>(defaultSoftware);
  const [loading, setLoading] = useState(true);
  const [installOpen, setInstallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);

  // 获取真实软件状态
  useEffect(() => {
    const fetchSoftware = async () => {
      try {
        const res = await fetch("/api/software");
        if (res.ok) {
          const data = await res.json();
          if (data.software && Array.isArray(data.software)) {
            // 合并 API 数据和默认数据
            const updatedSoftware = defaultSoftware.map((def) => {
              const real = data.software.find((s: any) => s.id === def.id || s.serviceName === def.id);
              if (real) {
                return {
                  ...def,
                  version: real.version || def.version,
                  status: real.status === "active" ? "running" as const
                    : real.status === "inactive" ? "stopped" as const
                    : real.status === "not_installed" ? "not_installed" as const
                    : def.status,
                };
              }
              return def;
            });
            setSoftware(updatedSoftware);
          }
        }
      } catch (error) {
        console.error("Failed to fetch software status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSoftware();
    const interval = setInterval(fetchSoftware, 10000); // 每 10 秒刷新
    return () => clearInterval(interval);
  }, []);

  const handleInstall = (sw: Software) => {
    setSelectedSoftware(sw);
    setInstallOpen(true);
  };

  const handleUninstall = (sw: Software) => {
    setSelectedSoftware(sw);
    setUninstallOpen(true);
  };

  const handleStart = async (sw: Software) => {
    try {
      const res = await fetch(`/api/software/${sw.id}`, {
        method: "POST",
      });
      if (res.ok) {
        setSoftware((prev) =>
          prev.map((s) => (s.id === sw.id ? { ...s, status: "running" } : s))
        );
      } else {
        const data = await res.json();
        alert(data.error || "启动失败");
      }
    } catch (error) {
      console.error("Failed to start service:", error);
      alert("启动失败，请检查控制台");
    }
  };

  const handleStop = async (sw: Software) => {
    try {
      const res = await fetch(`/api/software/${sw.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSoftware((prev) =>
          prev.map((s) => (s.id === sw.id ? { ...s, status: "stopped" } : s))
        );
      } else {
        const data = await res.json();
        alert(data.error || "停止失败");
      }
    } catch (error) {
      console.error("Failed to stop service:", error);
      alert("停止失败，请检查控制台");
    }
  };

  const handleSettings = (sw: Software) => {
    setSelectedSoftware(sw);
    setSettingsOpen(true);
  };

  const confirmInstall = (id: string, version: string) => {
    setSoftware((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "running", version } : s
      )
    );
  };

  const confirmUninstall = () => {
    if (selectedSoftware) {
      setSoftware((prev) =>
        prev.map((s) =>
          s.id === selectedSoftware.id ? { ...s, status: "not_installed" } : s
        )
      );
    }
    setUninstallOpen(false);
  };

  return (
    <div className="p-6">
      <SoftwareList
        software={software}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onStart={handleStart}
        onStop={handleStop}
        onSettings={handleSettings}
      />

      <InstallDialog
        open={installOpen}
        onOpenChange={setInstallOpen}
        software={selectedSoftware}
        onConfirm={confirmInstall}
      />

      <SoftwareSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        software={selectedSoftware}
        onRestart={(id) => {
          // Simulate restart
          handleStop(software.find((s) => s.id === id)!);
          setTimeout(() => handleStart(software.find((s) => s.id === id)!), 1000);
        }}
        onSaveConfig={(id, config) => {
          console.log("Save config for", id, config);
        }}
      />

      <ConfirmDialog
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
        title="卸载软件"
        description={`确定要卸载 ${selectedSoftware?.name} 吗？相关配置和数据可能会丢失。`}
        onConfirm={confirmUninstall}
        confirmText="卸载"
        variant="destructive"
      />
    </div>
  );
}
