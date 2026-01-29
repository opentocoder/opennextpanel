"use client";

import { useState, useEffect } from "react";
import { ContainerList, ImageList, DockerStore } from "@/components/docker";
import { ConfirmDialog } from "@/components/common";
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
import { Loader2, Terminal, FileText, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "exited";
  ports: string;
  created: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: string;
}

interface DockerApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  image: string;
  ports: string[];
  installed: boolean;
}

export default function DockerPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [dockerError, setDockerError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] =
    useState<DockerContainer | null>(null);
  const [selectedImage, setSelectedImage] = useState<DockerImage | null>(null);
  const [selectedApp, setSelectedApp] = useState<DockerApp | null>(null);
  const [pullImageName, setPullImageName] = useState("");
  const [containerLogs, setContainerLogs] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [runContainerName, setRunContainerName] = useState("");
  const [runPorts, setRunPorts] = useState("");
  const [installPorts, setInstallPorts] = useState("");
  const [installContainerName, setInstallContainerName] = useState("");
  const [installVolumePath, setInstallVolumePath] = useState("");
  const [deleteDataDir, setDeleteDataDir] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // 应用商店定义（不含 installed 状态，动态计算）
  const dockerAppsBase = [
    // Web 服务器
    {
      id: "1",
      name: "Nginx",
      description: "高性能 HTTP 和反向代理服务器",
      icon: "🌐",
      category: "web",
      image: "nginx:latest",
      ports: ["80", "443"],
    },
    {
      id: "2",
      name: "Apache",
      description: "流行的开源 Web 服务器",
      icon: "🪶",
      category: "web",
      image: "httpd:latest",
      ports: ["80", "443"],
    },
    {
      id: "3",
      name: "Caddy",
      description: "自动 HTTPS 的现代 Web 服务器",
      icon: "🔒",
      category: "web",
      image: "caddy:latest",
      ports: ["80", "443"],
    },
    {
      id: "4",
      name: "Traefik",
      description: "云原生边缘路由器和负载均衡",
      icon: "🔀",
      category: "web",
      image: "traefik:latest",
      ports: ["80", "443", "8080"],
    },
    // 数据库
    {
      id: "10",
      name: "MySQL",
      description: "流行的关系型数据库管理系统",
      icon: "🗄️",
      category: "database",
      image: "mysql:8.0",
      ports: ["3306"],
    },
    {
      id: "11",
      name: "MariaDB",
      description: "MySQL 的开源分支",
      icon: "🗄️",
      category: "database",
      image: "mariadb:latest",
      ports: ["3306"],
    },
    {
      id: "12",
      name: "PostgreSQL",
      description: "强大的开源关系型数据库",
      icon: "🐘",
      category: "database",
      image: "postgres:16",
      ports: ["5432"],
    },
    {
      id: "13",
      name: "MongoDB",
      description: "流行的 NoSQL 文档数据库",
      icon: "🍃",
      category: "database",
      image: "mongo:latest",
      ports: ["27017"],
    },
    {
      id: "14",
      name: "ClickHouse",
      description: "高性能列式数据库",
      icon: "📊",
      category: "database",
      image: "clickhouse/clickhouse-server",
      ports: ["8123", "9000"],
    },
    // 缓存
    {
      id: "20",
      name: "Redis",
      description: "高性能键值存储数据库",
      icon: "🔴",
      category: "cache",
      image: "redis:alpine",
      ports: ["6379"],
    },
    {
      id: "21",
      name: "Memcached",
      description: "分布式内存缓存系统",
      icon: "💾",
      category: "cache",
      image: "memcached:alpine",
      ports: ["11211"],
    },
    // 消息队列
    {
      id: "30",
      name: "RabbitMQ",
      description: "开源消息代理",
      icon: "🐰",
      category: "queue",
      image: "rabbitmq:management",
      ports: ["5672", "15672"],
    },
    {
      id: "31",
      name: "Kafka",
      description: "分布式流处理平台",
      icon: "📨",
      category: "queue",
      image: "bitnami/kafka:latest",
      ports: ["9092"],
    },
    // 搜索
    {
      id: "40",
      name: "Elasticsearch",
      description: "分布式搜索和分析引擎",
      icon: "🔍",
      category: "search",
      image: "elasticsearch:8.11.0",
      ports: ["9200", "9300"],
    },
    {
      id: "41",
      name: "Meilisearch",
      description: "轻量级全文搜索引擎",
      icon: "🔎",
      category: "search",
      image: "getmeili/meilisearch:latest",
      ports: ["7700"],
    },
    // CMS / 博客
    {
      id: "50",
      name: "WordPress",
      description: "流行的内容管理系统",
      icon: "📝",
      category: "cms",
      image: "wordpress:latest",
      ports: ["80"],
    },
    {
      id: "51",
      name: "Ghost",
      description: "专业博客发布平台",
      icon: "👻",
      category: "cms",
      image: "ghost:latest",
      ports: ["2368"],
    },
    {
      id: "52",
      name: "Strapi",
      description: "开源 Headless CMS",
      icon: "🚀",
      category: "cms",
      image: "strapi/strapi:latest",
      ports: ["1337"],
    },
    // 云存储
    {
      id: "60",
      name: "Nextcloud",
      description: "私有云存储和协作平台",
      icon: "☁️",
      category: "storage",
      image: "nextcloud:latest",
      ports: ["80"],
    },
    {
      id: "61",
      name: "MinIO",
      description: "S3 兼容的对象存储",
      icon: "📦",
      category: "storage",
      image: "minio/minio:latest",
      ports: ["9000", "9001"],
    },
    {
      id: "62",
      name: "Alist",
      description: "多存储聚合的文件列表程序",
      icon: "📂",
      category: "storage",
      image: "xhofe/alist:latest",
      ports: ["5244"],
    },
    // DevOps / CI/CD
    {
      id: "70",
      name: "GitLab",
      description: "完整的 DevOps 平台",
      icon: "🦊",
      category: "devops",
      image: "gitlab/gitlab-ce:latest",
      ports: ["80", "443", "22"],
    },
    {
      id: "71",
      name: "Gitea",
      description: "轻量级 Git 服务",
      icon: "🍵",
      category: "devops",
      image: "gitea/gitea:latest",
      ports: ["3000", "22"],
    },
    {
      id: "72",
      name: "Jenkins",
      description: "持续集成和持续交付服务器",
      icon: "🔧",
      category: "devops",
      image: "jenkins/jenkins:lts",
      ports: ["8080", "50000"],
    },
    {
      id: "73",
      name: "Drone",
      description: "容器原生 CI/CD 平台",
      icon: "🚁",
      category: "devops",
      image: "drone/drone:latest",
      ports: ["80", "443"],
    },
    // 监控
    {
      id: "80",
      name: "Portainer",
      description: "Docker 可视化管理工具",
      icon: "🐳",
      category: "monitor",
      image: "portainer/portainer-ce:latest",
      ports: ["9000", "9443"],
    },
    {
      id: "81",
      name: "Grafana",
      description: "数据可视化和监控平台",
      icon: "📈",
      category: "monitor",
      image: "grafana/grafana:latest",
      ports: ["3000"],
    },
    {
      id: "82",
      name: "Prometheus",
      description: "监控和告警系统",
      icon: "🔥",
      category: "monitor",
      image: "prom/prometheus:latest",
      ports: ["9090"],
    },
    {
      id: "83",
      name: "Uptime Kuma",
      description: "自托管监控工具",
      icon: "📡",
      category: "monitor",
      image: "louislam/uptime-kuma:latest",
      ports: ["3001"],
    },
    // 数据库管理
    {
      id: "90",
      name: "phpMyAdmin",
      description: "MySQL 数据库管理工具",
      icon: "🐬",
      category: "tools",
      image: "phpmyadmin:latest",
      ports: ["80"],
    },
    {
      id: "91",
      name: "Adminer",
      description: "轻量级数据库管理工具",
      icon: "📋",
      category: "tools",
      image: "adminer:latest",
      ports: ["8080"],
    },
    {
      id: "92",
      name: "pgAdmin",
      description: "PostgreSQL 管理工具",
      icon: "🐘",
      category: "tools",
      image: "dpage/pgadmin4:latest",
      ports: ["80"],
    },
    {
      id: "93",
      name: "RedisInsight",
      description: "Redis 可视化管理工具",
      icon: "🔴",
      category: "tools",
      image: "redislabs/redisinsight:latest",
      ports: ["8001"],
    },
    // 自动化 / 工作流
    {
      id: "100",
      name: "n8n",
      description: "工作流自动化平台",
      icon: "⚡",
      category: "automation",
      image: "n8nio/n8n:latest",
      ports: ["5678"],
    },
    {
      id: "101",
      name: "Node-RED",
      description: "流程可视化编程工具",
      icon: "🔗",
      category: "automation",
      image: "nodered/node-red:latest",
      ports: ["1880"],
    },
    // 文档 / 知识库
    {
      id: "110",
      name: "Wiki.js",
      description: "现代化知识库",
      icon: "📚",
      category: "docs",
      image: "ghcr.io/requarks/wiki:2",
      ports: ["3000"],
    },
    {
      id: "111",
      name: "Outline",
      description: "团队知识库",
      icon: "📖",
      category: "docs",
      image: "outlinewiki/outline:latest",
      ports: ["3000"],
    },
    {
      id: "112",
      name: "BookStack",
      description: "简单易用的文档平台",
      icon: "📕",
      category: "docs",
      image: "linuxserver/bookstack:latest",
      ports: ["80"],
    },
    // 媒体
    {
      id: "120",
      name: "Jellyfin",
      description: "免费媒体服务器",
      icon: "🎬",
      category: "media",
      image: "jellyfin/jellyfin:latest",
      ports: ["8096"],
    },
    {
      id: "121",
      name: "Plex",
      description: "流媒体服务器",
      icon: "🎥",
      category: "media",
      image: "plexinc/pms-docker:latest",
      ports: ["32400"],
    },
    {
      id: "122",
      name: "PhotoPrism",
      description: "AI 照片管理",
      icon: "📷",
      category: "media",
      image: "photoprism/photoprism:latest",
      ports: ["2342"],
    },
    // 下载
    {
      id: "130",
      name: "qBittorrent",
      description: "BitTorrent 客户端",
      icon: "⬇️",
      category: "download",
      image: "linuxserver/qbittorrent:latest",
      ports: ["8080", "6881"],
    },
    {
      id: "131",
      name: "Transmission",
      description: "轻量级 BT 客户端",
      icon: "📥",
      category: "download",
      image: "linuxserver/transmission:latest",
      ports: ["9091", "51413"],
    },
    {
      id: "132",
      name: "Aria2",
      description: "多协议下载工具",
      icon: "🚄",
      category: "download",
      image: "p3terx/aria2-pro:latest",
      ports: ["6800", "6888"],
    },
    // 网络
    {
      id: "140",
      name: "Pi-hole",
      description: "网络广告拦截",
      icon: "🕳️",
      category: "network",
      image: "pihole/pihole:latest",
      ports: ["53", "80", "443"],
    },
    {
      id: "141",
      name: "AdGuard Home",
      description: "DNS 广告过滤",
      icon: "🛡️",
      category: "network",
      image: "adguard/adguardhome:latest",
      ports: ["53", "3000"],
    },
    // 智能家居
    {
      id: "150",
      name: "Home Assistant",
      description: "开源智能家居平台",
      icon: "🏠",
      category: "iot",
      image: "homeassistant/home-assistant:latest",
      ports: ["8123"],
    },
    // 代码服务
    {
      id: "160",
      name: "Code Server",
      description: "浏览器中的 VS Code",
      icon: "💻",
      category: "dev",
      image: "codercom/code-server:latest",
      ports: ["8080"],
    },
    {
      id: "161",
      name: "JupyterLab",
      description: "交互式开发环境",
      icon: "🪐",
      category: "dev",
      image: "jupyter/base-notebook:latest",
      ports: ["8888"],
    },
  ];

  // 根据已有镜像动态计算 installed 状态
  const dockerApps = dockerAppsBase.map((app) => ({
    ...app,
    installed: images.some((img) => {
      const fullImage = `${img.repository}:${img.tag}`;
      const appImageBase = app.image.split(":")[0];
      return fullImage.startsWith(appImageBase) || img.repository === appImageBase;
    }),
  }));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [containersRes, imagesRes] = await Promise.all([
        fetch("/api/docker?type=containers"),
        fetch("/api/docker?type=images"),
      ]);

      // Check if Docker is available
      if (containersRes.status === 503 || imagesRes.status === 503) {
        const errorData = await containersRes.json();
        setDockerAvailable(false);
        setDockerError(errorData.error || "Docker 未安装或未运行");
        setContainers([]);
        setImages([]);
        return;
      }

      const containersData = await containersRes.json();
      const imagesData = await imagesRes.json();
      setDockerAvailable(true);
      setDockerError("");
      setContainers(containersData.containers || []);
      setImages(imagesData.images || []);
    } catch (error) {
      console.error("Failed to fetch Docker data:", error);
      setDockerAvailable(false);
      setDockerError("无法连接到 Docker 服务");
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (
    action: string,
    container: DockerContainer
  ) => {
    try {
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, containerId: container.id }),
      });
      fetchData();
    } catch (error) {
      console.error(`Failed to ${action} container:`, error);
    }
  };

  const handleDeleteContainer = async () => {
    if (!selectedContainer) return;
    setDeleting(true);
    try {
      // 删除容器
      await handleContainerAction("delete", selectedContainer);

      // 如果选择删除数据目录
      if (deleteDataDir) {
        const dataPath = `/www/wwwroot/docker/${selectedContainer.name}`;
        try {
          await fetch("/api/files", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: dataPath, recursive: true }),
          });
        } catch (e) {
          console.log("Data directory deletion skipped:", e);
        }
      }
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedContainer(null);
      setDeleteDataDir(true);  // 重置为默认勾选
    }
  };

  const handlePullImage = async () => {
    if (!pullImageName) return;
    try {
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", imageName: pullImageName }),
      });
      fetchData();
      setPullDialogOpen(false);
      setPullImageName("");
    } catch (error) {
      console.error("Failed to pull image:", error);
    }
  };

  const handleDeleteImage = async (image: DockerImage) => {
    try {
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_image", imageId: image.id }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  const handleViewLogs = async (container: DockerContainer) => {
    setSelectedContainer(container);
    setContainerLogs("");
    setLogsDialogOpen(true);
    setLogsLoading(true);
    try {
      const res = await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logs", containerId: container.id }),
      });
      const data = await res.json();
      setContainerLogs(data.logs || "No logs available");
    } catch (error) {
      setContainerLogs("Failed to fetch logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenTerminal = (container: DockerContainer) => {
    window.open(`/terminal?container=${container.id}`, "_blank");
  };

  const handleRunImage = (image: DockerImage) => {
    setSelectedImage(image);
    setRunContainerName(`${image.repository.replace(/[/:]/g, "-")}-container`);
    setRunPorts("");
    setRunDialogOpen(true);
  };

  const handleCreateContainer = async () => {
    if (!selectedImage || !runContainerName) return;
    try {
      const portsArray = runPorts
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const portsMap: Record<string, string> = {};
      portsArray.forEach((p) => {
        const [host, container] = p.includes(":") ? p.split(":") : [p, p];
        portsMap[container] = host;
      });

      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          imageName: `${selectedImage.repository}:${selectedImage.tag}`,
          containerName: runContainerName,
          ports: portsMap,
        }),
      });
      fetchData();
      setRunDialogOpen(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to create container:", error);
    }
  };

  // 建议挂载数据目录的应用（需要持久化数据或用户编辑文件）
  const appsRecommendVolume: string[] = [
    "WordPress", "Ghost", "Nextcloud", "Strapi", "Joomla", "Drupal",
    "Wiki.js", "BookStack", "Outline",  // CMS/文档
    "MySQL", "MariaDB", "PostgreSQL", "MongoDB", "ClickHouse",  // 数据库
    "GitLab", "Gitea",  // 代码仓库
    "Jellyfin", "Plex", "PhotoPrism",  // 媒体
    "Home Assistant", "n8n", "Node-RED",  // 自动化
    "Alist",  // 存储
  ];

  // 不建议挂载的应用（无状态、配置复杂、或暴露内部文件不安全）
  // 例如：缓存、代理、监控工具
  const appsNotRecommendVolume: string[] = [
    "Nginx", "Apache", "Caddy", "Traefik",  // Web 代理
    "Redis", "Memcached",  // 缓存（通常不需要持久化或有专门配置）
    "Portainer", "Grafana", "Prometheus", "Uptime Kuma",  // 监控工具
    "phpMyAdmin", "Adminer", "pgAdmin", "RedisInsight",  // 数据库管理工具（无状态）
    "Pi-hole", "AdGuard Home",  // 网络工具
  ];

  // 常见应用的默认容器内数据路径
  const defaultContainerPaths: Record<string, string> = {
    "WordPress": "/var/www/html",
    "Ghost": "/var/lib/ghost/content",
    "Nextcloud": "/var/www/html",
    "GitLab": "/var/opt/gitlab",
    "Gitea": "/data",
    "Joomla": "/var/www/html",
    "Drupal": "/var/www/html",
    "Wiki.js": "/wiki/data",
    "BookStack": "/config",
    "MySQL": "/var/lib/mysql",
    "MariaDB": "/var/lib/mysql",
    "PostgreSQL": "/var/lib/postgresql/data",
    "MongoDB": "/data/db",
    "Redis": "/data",
    "Nginx": "/usr/share/nginx/html",
    "Apache": "/var/www/html",
    "Node": "/app",
    "Python": "/app",
  };

  // 挂载路径状态
  const [installContainerPath, setInstallContainerPath] = useState("/data");
  const [enableVolume, setEnableVolume] = useState(true);

  const handleInstallApp = (app: DockerApp) => {
    setSelectedApp(app);
    // 生成唯一的容器名（基于应用名 + 时间戳后4位）
    const timestamp = Date.now().toString().slice(-4);
    const baseName = app.name.toLowerCase().replace(/[\s\.]+/g, "-");
    const containerName = `${baseName}-${timestamp}`;
    setInstallContainerName(containerName);
    setInstallPorts(app.ports.map((p) => `${p}:${p}`).join(", "));
    // 根据应用类型决定是否默认启用挂载
    const shouldEnableVolume = appsRecommendVolume.includes(app.name);
    setEnableVolume(shouldEnableVolume);
    // 设置默认挂载路径
    setInstallVolumePath(shouldEnableVolume ? `/www/wwwroot/docker/${containerName}` : "");
    setInstallContainerPath(defaultContainerPaths[app.name] || "/data");
    setInstallDialogOpen(true);
  };

  const handleConfirmInstall = async () => {
    if (!selectedApp) return;
    setInstalling(true);
    try {
      // First pull the image
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", imageName: selectedApp.image }),
      });

      // Then create and start the container
      const portsArray = installPorts
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const portsMap: Record<string, string> = {};
      portsArray.forEach((p) => {
        const [host, container] = p.includes(":") ? p.split(":") : [p, p];
        portsMap[container] = host;
      });

      // 构建挂载卷配置
      const volumes: Record<string, string> = {};
      if (enableVolume && installVolumePath && installContainerPath) {
        volumes[installVolumePath] = installContainerPath;
      }

      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          imageName: selectedApp.image,
          containerName: installContainerName,
          ports: portsMap,
          volumes: Object.keys(volumes).length > 0 ? volumes : undefined,
        }),
      });

      fetchData();
      setInstallDialogOpen(false);
      setSelectedApp(null);
      setInstallContainerName("");
      setInstallVolumePath("");
    } catch (error) {
      console.error("Failed to install app:", error);
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!dockerAvailable) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Docker管理</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">🐳</div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Docker 未安装或未运行</h2>
          <p className="text-yellow-600 mb-4">{dockerError}</p>
          <div className="bg-white rounded p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600 mb-4">
              请前往 <span className="font-semibold text-green-600">软件管理</span> 安装 Docker
            </p>
            <a
              href="/software"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              前往软件管理安装
            </a>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            重新检测
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Docker管理</h1>

      <Tabs defaultValue="containers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="containers">容器</TabsTrigger>
          <TabsTrigger value="images">镜像</TabsTrigger>
          <TabsTrigger value="store">应用商店</TabsTrigger>
        </TabsList>

        <TabsContent value="containers">
          <ContainerList
            containers={containers}
            onStart={(c) => handleContainerAction("start", c)}
            onStop={(c) => handleContainerAction("stop", c)}
            onRestart={(c) => handleContainerAction("restart", c)}
            onDelete={(c) => {
              setSelectedContainer(c);
              setDeleteDataDir(true);  // 默认勾选删除数据目录
              setDeleteDialogOpen(true);
            }}
            onLogs={handleViewLogs}
            onTerminal={handleOpenTerminal}
          />
        </TabsContent>

        <TabsContent value="images">
          <ImageList
            images={images}
            onPull={() => setPullDialogOpen(true)}
            onRun={handleRunImage}
            onDelete={handleDeleteImage}
          />
        </TabsContent>

        <TabsContent value="store">
          <DockerStore apps={dockerApps} onInstall={handleInstallApp} />
        </TabsContent>
      </Tabs>

      {/* Delete Container Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setDeleteDataDir(true);  // 关闭后重置为默认勾选
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              删除容器
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              确定要删除容器 <span className="font-semibold text-gray-900">"{selectedContainer?.name}"</span> 吗？
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="deleteDataDir"
                  checked={deleteDataDir}
                  onCheckedChange={(checked) => setDeleteDataDir(checked === true)}
                />
                <div className="space-y-1">
                  <label htmlFor="deleteDataDir" className="text-sm font-medium cursor-pointer">
                    同时删除数据目录
                  </label>
                  <p className="text-xs text-gray-500">
                    路径: <code className="bg-gray-100 px-1 rounded">/www/wwwroot/docker/{selectedContainer?.name}</code>
                  </p>
                  {deleteDataDir && (
                    <p className="text-xs text-red-600">
                      ⚠️ 此操作将永久删除容器的所有数据，无法恢复！
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteDataDir(true);  // 重置为默认勾选
              }}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContainer}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pullDialogOpen} onOpenChange={setPullDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拉取镜像</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                镜像名称
              </label>
              <Input
                placeholder="例如: nginx:latest"
                value={pullImageName}
                onChange={(e) => setPullImageName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handlePullImage}
            >
              拉取
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              容器日志 - {selectedContainer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] w-full rounded border bg-gray-900 p-4 overflow-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : (
              <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                {containerLogs}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
              关闭
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedContainer && handleViewLogs(selectedContainer)}
            >
              刷新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Image Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建容器</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">镜像</label>
              <Input
                value={selectedImage ? `${selectedImage.repository}:${selectedImage.tag}` : ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">容器名称</label>
              <Input
                placeholder="my-container"
                value={runContainerName}
                onChange={(e) => setRunContainerName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">端口映射 (可选)</label>
              <Input
                placeholder="8080:80, 443:443"
                value={runPorts}
                onChange={(e) => setRunPorts(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                格式: 主机端口:容器端口，多个用逗号分隔
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateContainer}
            >
              创建并启动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install App Dialog */}
      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedApp?.icon}</span>
              安装 {selectedApp?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">{selectedApp?.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">容器名称</label>
              <Input
                placeholder="my-wordpress"
                value={installContainerName}
                onChange={(e) => {
                  setInstallContainerName(e.target.value);
                  // 同步更新挂载路径
                  if (enableVolume) {
                    setInstallVolumePath(`/www/wwwroot/docker/${e.target.value}`);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                唯一标识，用于管理和容器间通信
              </p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">镜像</label>
              <Input value={selectedApp?.image || ""} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">端口映射</label>
              <Input
                placeholder="8080:80, 443:443"
                value={installPorts}
                onChange={(e) => setInstallPorts(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                格式: 主机端口:容器端口，多个用逗号分隔
              </p>
            </div>
            {/* 数据目录挂载 */}
            <div className="border rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">挂载数据目录</label>
                  <p className="text-xs text-gray-500">将容器数据保存到主机，便于编辑和备份</p>
                  {selectedApp && appsRecommendVolume.includes(selectedApp.name) && (
                    <p className="text-xs text-green-600">✓ 推荐：此应用需要持久化数据</p>
                  )}
                  {selectedApp && appsNotRecommendVolume.includes(selectedApp.name) && (
                    <p className="text-xs text-yellow-600">⚠ 此应用通常不需要挂载数据目录</p>
                  )}
                </div>
                <Switch
                  checked={enableVolume}
                  onCheckedChange={(checked) => {
                    setEnableVolume(checked);
                    if (checked && !installVolumePath) {
                      setInstallVolumePath(`/www/wwwroot/docker/${installContainerName}`);
                    }
                  }}
                />
              </div>
              {enableVolume && (
                <div className="space-y-2 pt-2 border-t">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">主机目录</label>
                    <Input
                      value={installVolumePath}
                      onChange={(e) => setInstallVolumePath(e.target.value)}
                      placeholder="/www/wwwroot/docker/app-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">容器内路径</label>
                    <Input
                      value={installContainerPath}
                      onChange={(e) => setInstallContainerPath(e.target.value)}
                      placeholder="/var/www/html 或 /data"
                    />
                  </div>
                  <p className="text-xs text-green-600">
                    ✓ 可在文件管理器中编辑 {installVolumePath}
                  </p>
                </div>
              )}
            </div>
            {/* 数据库连接提示 - 针对需要数据库的应用 */}
            {selectedApp && ['WordPress', 'Ghost', 'Nextcloud', 'GitLab', 'Gitea', 'Joomla', 'Drupal', 'PrestaShop', 'Matomo', 'Wiki.js', 'BookStack', 'Directus', 'Strapi', 'NocoDB', 'n8n'].includes(selectedApp.name) && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded space-y-2">
                <p className="text-sm font-medium text-blue-800">数据库连接提示</p>
                <div className="text-xs space-y-2">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <p className="font-medium text-blue-800">连接宿主机数据库（软件商店安装的 MySQL）</p>
                    <code className="block bg-blue-100 px-2 py-1 rounded mt-1 font-mono text-blue-900">
                      数据库主机: 172.17.0.1
                    </code>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <p className="font-medium text-blue-800">连接 Docker 数据库容器（推荐）</p>
                    <code className="block bg-blue-100 px-2 py-1 rounded mt-1 font-mono text-blue-900">
                      数据库主机: 容器名称（如 mysql 或 mariadb）
                    </code>
                    <p className="text-green-600 mt-1">
                      ✓ 通过面板安装的容器自动加入 openpanel-network，可直接用容器名互联
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  注意：Docker 容器内不能用 127.0.0.1 或 localhost 连接宿主机服务
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setInstallDialogOpen(false)}
              disabled={installing}
            >
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirmInstall}
              disabled={installing}
            >
              {installing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  安装中...
                </>
              ) : (
                "确认安装"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
