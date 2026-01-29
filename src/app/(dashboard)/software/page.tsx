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
  systemRequired?: boolean;  // 系统必需软件，不可卸载
}

// 软件元数据 (不含状态，状态从 API 获取)
const softwareMeta: Omit<Software, "status">[] = [
  // Web 服务器
  {
    id: "nginx",
    name: "Nginx",
    version: "1.24.0",
    versions: ["1.24.0", "1.22.1", "1.20.2"],
    description: "高性能 HTTP 和反向代理服务器",
    icon: "🌐",
    category: "webserver",
    size: "2.1 MB",
    homepage: "https://nginx.org",
  },
  {
    id: "apache",
    name: "Apache",
    version: "2.4.58",
    versions: ["2.4.58", "2.4.57"],
    description: "流行的开源 Web 服务器",
    icon: "🪶",
    category: "webserver",
    size: "5 MB",
    homepage: "https://httpd.apache.org",
  },
  {
    id: "openresty",
    name: "OpenResty",
    version: "1.25.3",
    versions: ["1.25.3", "1.21.4"],
    description: "基于 Nginx 的高性能 Web 平台（支持 Lua）",
    icon: "🚀",
    category: "webserver",
    size: "15 MB",
    homepage: "https://openresty.org",
  },
  {
    id: "caddy",
    name: "Caddy",
    version: "2.7.6",
    versions: ["2.7.6", "2.6.4"],
    description: "自动 HTTPS 的现代 Web 服务器",
    icon: "🔒",
    category: "webserver",
    size: "40 MB",
    homepage: "https://caddyserver.com",
  },
  {
    id: "tomcat",
    name: "Tomcat",
    version: "10.1.18",
    versions: ["10.1.18", "9.0.85"],
    description: "Java Servlet 容器",
    icon: "🐱",
    category: "webserver",
    size: "15 MB",
    homepage: "https://tomcat.apache.org",
  },
  // PHP 运行时
  {
    id: "php83",
    name: "PHP-8.3",
    version: "8.3.6",
    versions: ["8.3.6", "8.3.4"],
    description: "PHP 8.3 最新版本",
    icon: "🐘",
    category: "runtime",
    size: "48 MB",
    homepage: "https://php.net",
  },
  {
    id: "php82",
    name: "PHP-8.2",
    version: "8.2.15",
    versions: ["8.2.15", "8.2.14"],
    description: "PHP 8.2 稳定版本",
    icon: "🐘",
    category: "runtime",
    size: "45 MB",
  },
  {
    id: "php81",
    name: "PHP-8.1",
    version: "8.1.27",
    versions: ["8.1.27", "8.1.26"],
    description: "PHP 8.1 长期支持版本",
    icon: "🐘",
    category: "runtime",
    size: "42 MB",
  },
  {
    id: "php74",
    name: "PHP-7.4",
    version: "7.4.33",
    versions: ["7.4.33"],
    description: "PHP 7.4 LTS 长期支持版本",
    icon: "🐘",
    category: "runtime",
    size: "38 MB",
  },
  {
    id: "php56",
    name: "PHP-5.6",
    version: "5.6.40",
    versions: ["5.6.40"],
    description: "PHP 5.6 旧版兼容",
    icon: "🐘",
    category: "runtime",
    size: "32 MB",
  },
  // 数据库
  {
    id: "mysql",
    name: "MySQL",
    version: "8.0.36",
    versions: ["8.0.36", "8.0.35", "5.7.44"],
    description: "开源关系型数据库管理系统",
    icon: "🐬",
    category: "database",
    size: "450 MB",
    homepage: "https://mysql.com",
  },
  {
    id: "mariadb",
    name: "MariaDB",
    version: "10.11",
    versions: ["10.11", "10.6", "10.5"],
    description: "MySQL 的开源分支，完全兼容",
    icon: "🦭",
    category: "database",
    size: "400 MB",
    homepage: "https://mariadb.org",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    version: "16.2",
    versions: ["16.2", "15.6", "14.11"],
    description: "功能强大的开源对象关系型数据库",
    icon: "🐘",
    category: "database",
    size: "120 MB",
    homepage: "https://postgresql.org",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    version: "7.0.5",
    versions: ["7.0.5", "6.0.13"],
    description: "面向文档的 NoSQL 数据库",
    icon: "🍃",
    category: "database",
    size: "180 MB",
    homepage: "https://mongodb.com",
  },
  {
    id: "sqlite",
    name: "SQLite",
    version: "3.45.0",
    description: "轻量级嵌入式数据库（面板必需）",
    icon: "📄",
    category: "database",
    size: "2 MB",
    systemRequired: true,  // 面板数据库使用
  },
  // 缓存
  {
    id: "redis",
    name: "Redis",
    version: "7.2.4",
    versions: ["7.2.4", "7.0.15", "6.2.14"],
    description: "高性能键值存储数据库",
    icon: "🔴",
    category: "cache",
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
    size: "1.5 MB",
  },
  // 运行时
  {
    id: "nodejs",
    name: "Node.js",
    version: "22.0.0",
    versions: ["22.x", "20.x", "18.x"],
    description: "基于 Chrome V8 的 JavaScript 运行时（面板必需）",
    icon: "💚",
    category: "runtime",
    size: "35 MB",
    homepage: "https://nodejs.org",
    systemRequired: true,  // 面板必需，不可卸载
  },
  {
    id: "python",
    name: "Python",
    version: "3.12.1",
    versions: ["3.12.1", "3.11.7", "3.10.13"],
    description: "通用编程语言（系统必需）",
    icon: "🐍",
    category: "runtime",
    size: "85 MB",
    homepage: "https://python.org",
    systemRequired: true,  // 系统工具依赖
  },
  {
    id: "java",
    name: "Java/OpenJDK",
    version: "21.0.2",
    versions: ["21.0.2", "17.0.10", "11.0.22"],
    description: "Java 运行环境",
    icon: "☕",
    category: "runtime",
    size: "200 MB",
    homepage: "https://openjdk.org",
  },
  {
    id: "go",
    name: "Go",
    version: "1.22.0",
    versions: ["1.22.0", "1.21.6"],
    description: "Google 开发的编程语言",
    icon: "🔵",
    category: "runtime",
    size: "150 MB",
    homepage: "https://go.dev",
  },
  {
    id: "rust",
    name: "Rust",
    version: "1.76.0",
    versions: ["1.76.0", "1.75.0"],
    description: "安全高效的系统编程语言",
    icon: "🦀",
    category: "runtime",
    size: "250 MB",
    homepage: "https://rust-lang.org",
  },
  // 消息队列
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    version: "3.13.0",
    versions: ["3.13.0", "3.12.12"],
    description: "开源消息代理",
    icon: "🐰",
    category: "queue",
    size: "50 MB",
    homepage: "https://rabbitmq.com",
  },
  // 搜索
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    version: "8.12.0",
    versions: ["8.12.0", "7.17.18"],
    description: "分布式搜索和分析引擎",
    icon: "🔍",
    category: "search",
    size: "500 MB",
    homepage: "https://elastic.co",
  },
  // 工具
  {
    id: "phpmyadmin",
    name: "phpMyAdmin",
    version: "5.2.1",
    description: "MySQL 数据库 Web 管理工具",
    icon: "📊",
    category: "tools",
    size: "15 MB",
    homepage: "https://phpmyadmin.net",
  },
  {
    id: "adminer",
    name: "Adminer",
    version: "4.8.1",
    description: "轻量级数据库管理工具",
    icon: "📋",
    category: "tools",
    size: "500 KB",
  },
  {
    id: "pureftpd",
    name: "Pure-FTPd",
    version: "1.0.51",
    description: "安全高效的 FTP 服务器",
    icon: "📁",
    category: "tools",
    size: "3 MB",
  },
  {
    id: "vsftpd",
    name: "vsftpd",
    version: "3.0.5",
    description: "非常安全的 FTP 服务器",
    icon: "📂",
    category: "tools",
    size: "200 KB",
  },
  {
    id: "composer",
    name: "Composer",
    version: "2.7.0",
    description: "PHP 依赖管理工具",
    icon: "🎼",
    category: "tools",
    size: "2 MB",
    homepage: "https://getcomposer.org",
  },
  {
    id: "supervisor",
    name: "Supervisor",
    version: "4.2.5",
    description: "进程管理工具",
    icon: "👀",
    category: "tools",
    size: "5 MB",
  },
  // 安全
  {
    id: "fail2ban",
    name: "Fail2ban",
    version: "1.0.2",
    description: "防止暴力破解的安全工具",
    icon: "🛡️",
    category: "security",
    size: "5 MB",
  },
  {
    id: "certbot",
    name: "Certbot",
    version: "2.9.0",
    description: "Let's Encrypt SSL 证书工具",
    icon: "🔐",
    category: "security",
    size: "10 MB",
    homepage: "https://certbot.eff.org",
  },
  {
    id: "clamav",
    name: "ClamAV",
    version: "1.2.1",
    description: "开源杀毒软件",
    icon: "🦠",
    category: "security",
    size: "200 MB",
  },
  // 容器
  {
    id: "docker",
    name: "Docker",
    version: "25.0.2",
    description: "应用容器引擎",
    icon: "🐳",
    category: "container",
    size: "200 MB",
    homepage: "https://docker.com",
  },
  {
    id: "docker-compose",
    name: "Docker Compose",
    version: "2.24.5",
    description: "Docker 容器编排工具",
    icon: "🐳",
    category: "container",
    size: "50 MB",
  },
  // 监控
  {
    id: "prometheus",
    name: "Prometheus",
    version: "2.50.0",
    description: "监控和告警系统",
    icon: "🔥",
    category: "monitor",
    size: "100 MB",
    homepage: "https://prometheus.io",
  },
  {
    id: "grafana",
    name: "Grafana",
    version: "10.3.1",
    description: "数据可视化平台",
    icon: "📈",
    category: "monitor",
    size: "300 MB",
    homepage: "https://grafana.com",
  },
];

// 初始化时所有软件状态为 not_installed，等待 API 更新
const defaultSoftware: Software[] = softwareMeta.map(s => ({ ...s, status: "not_installed" as const }));

export default function SoftwarePage() {
  const [software, setSoftware] = useState<Software[]>(defaultSoftware);
  const [loading, setLoading] = useState(true);
  const [installOpen, setInstallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);

  // ID 映射表：前端ID -> 后端服务名
  const idMapping: Record<string, string> = {
    // Web 服务器
    "nginx": "nginx",
    "apache": "apache",
    "openresty": "openresty",
    "caddy": "caddy",
    "tomcat": "tomcat",
    // PHP
    "php83": "php83",
    "php82": "php82",
    "php81": "php81",
    "php74": "php74",
    "php56": "php56",
    // 数据库
    "mysql": "mysql",
    "postgresql": "postgresql",
    "mongodb": "mongodb",
    "sqlite": "sqlite",
    // 缓存
    "redis": "redis",
    "memcached": "memcached",
    // 运行时
    "nodejs": "nodejs",
    "python": "python",
    "java": "java",
    "go": "go",
    "rust": "rust",
    // 消息队列
    "rabbitmq": "rabbitmq",
    // 搜索
    "elasticsearch": "elasticsearch",
    // 工具
    "phpmyadmin": "phpmyadmin",
    "adminer": "adminer",
    "pureftpd": "pureftpd",
    "vsftpd": "vsftpd",
    "composer": "composer",
    "supervisor": "supervisor",
    // 安全
    "fail2ban": "fail2ban",
    "certbot": "certbot",
    "clamav": "clamav",
    // 容器
    "docker": "docker",
    "docker-compose": "docker-compose",
    // 监控
    "prometheus": "prometheus",
    "grafana": "grafana",
  };

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
              const backendId = idMapping[def.id] || def.id;
              const real = data.software.find((s: any) =>
                s.id === def.id ||
                s.id === backendId ||
                s.serviceName === def.id ||
                s.serviceName === backendId
              );
              if (real) {
                return {
                  ...def,
                  version: real.version || def.version,
                  status: real.status === "active" ? "running" as const
                    : real.status === "inactive" ? "stopped" as const
                    : real.status === "installed" ? "installed" as const
                    : real.status === "not_installed" ? "not_installed" as const
                    : def.status,
                };
              }
              // 默认为未安装
              return { ...def, status: "not_installed" as const };
            });
            setSoftware(updatedSoftware);
          }
        }
      } catch (error) {
        console.error("Failed to fetch software status:", error);
        // API 失败时也标记为未安装
        setSoftware(defaultSoftware.map(s => ({ ...s, status: "not_installed" as const })));
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

  const confirmUninstall = async () => {
    if (!selectedSoftware) return;

    try {
      const res = await fetch(`/api/software/${selectedSoftware.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "uninstall" }),
      });

      const data = await res.json();

      if (data.success) {
        setSoftware((prev) =>
          prev.map((s) =>
            s.id === selectedSoftware.id ? { ...s, status: "not_installed" } : s
          )
        );
      } else {
        alert("卸载失败: " + (data.error || data.message || "未知错误"));
      }
    } catch (error) {
      console.error("Failed to uninstall:", error);
      alert("卸载失败，请检查控制台");
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
