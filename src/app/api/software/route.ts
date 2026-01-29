import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";
import {
  getServiceStatus,
  startService,
  stopService,
  restartService,
  enableService,
  disableService,
} from "@/lib/system/process";
import { executeCommand, isCommandAvailable } from "@/lib/system/executor";

// 支持的软件服务列表
const SUPPORTED_SERVICES = [
  {
    id: "nginx",
    name: "Nginx",
    serviceName: "nginx",
    versionCmd: ["nginx", "-v"],
    category: "webserver",
    icon: "nginx",
    description: "高性能 Web 服务器和反向代理",
  },
  {
    id: "php-fpm",
    name: "PHP-FPM",
    serviceName: "php-fpm",
    altServiceNames: ["php8.2-fpm", "php8.1-fpm", "php8.0-fpm", "php7.4-fpm"],
    versionCmd: ["php", "-v"],
    category: "runtime",
    icon: "php",
    description: "PHP FastCGI 进程管理器",
  },
  {
    id: "mysql",
    name: "MySQL/MariaDB",
    serviceName: "mysql",
    altServiceNames: ["mariadb", "mysqld"],
    versionCmd: ["mysql", "--version"],
    category: "database",
    icon: "mysql",
    description: "关系型数据库管理系统",
  },
  {
    id: "redis",
    name: "Redis",
    serviceName: "redis",
    altServiceNames: ["redis-server"],
    versionCmd: ["redis-server", "--version"],
    category: "cache",
    icon: "redis",
    description: "内存数据结构存储",
  },
  {
    id: "docker",
    name: "Docker",
    serviceName: "docker",
    versionCmd: ["docker", "--version"],
    category: "container",
    icon: "docker",
    description: "容器化平台",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    serviceName: "postgresql",
    versionCmd: ["psql", "--version"],
    category: "database",
    icon: "postgresql",
    description: "高级开源关系数据库",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    serviceName: "mongod",
    versionCmd: ["mongod", "--version"],
    category: "database",
    icon: "mongodb",
    description: "NoSQL 文档数据库",
  },
  {
    id: "memcached",
    name: "Memcached",
    serviceName: "memcached",
    versionCmd: ["memcached", "-V"],
    category: "cache",
    icon: "memcached",
    description: "分布式内存缓存系统",
  },
];

// 获取服务版本
async function getServiceVersion(versionCmd: string[]): Promise<string> {
  try {
    const result = await executeCommand(versionCmd[0], versionCmd.slice(1), {
      useSudo: false,
      timeout: 5000,
    });
    // 提取版本号
    const output = result.stdout || result.stderr;
    const versionMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/);
    return versionMatch ? versionMatch[1] : "unknown";
  } catch {
    return "unknown";
  }
}

// 检查服务是否安装
async function checkServiceInstalled(serviceDef: (typeof SUPPORTED_SERVICES)[0]): Promise<boolean> {
  // 首先检查命令是否可用
  const cmdName = serviceDef.versionCmd[0];
  const cmdAvailable = await isCommandAvailable(cmdName);
  if (cmdAvailable) return true;

  // 检查 systemctl 中是否有该服务
  const serviceNames = [serviceDef.serviceName, ...(serviceDef.altServiceNames || [])];
  for (const name of serviceNames) {
    const result = await executeCommand("systemctl", ["list-unit-files", `${name}.service`], {
      useSudo: false,
    });
    if (result.code === 0 && result.stdout.includes(name)) {
      return true;
    }
  }

  return false;
}

// 获取真实服务状态
async function getRealServiceStatus(serviceDef: (typeof SUPPORTED_SERVICES)[0]) {
  const serviceNames = [serviceDef.serviceName, ...(serviceDef.altServiceNames || [])];

  for (const name of serviceNames) {
    const status = await getServiceStatus(name);
    if (status && status.status !== "unknown") {
      return { ...status, actualServiceName: name };
    }
  }

  return null;
}

async function handleGET() {
  try {
    const software = [];

    // 检查每个支持的服务
    for (const serviceDef of SUPPORTED_SERVICES) {
      const installed = await checkServiceInstalled(serviceDef);

      if (!installed) {
        // 服务未安装
        software.push({
          id: serviceDef.id,
          name: serviceDef.name,
          version: null,
          status: "not_installed",
          enabled: false,
          description: serviceDef.description,
          category: serviceDef.category,
          icon: serviceDef.icon,
          serviceName: serviceDef.serviceName,
        });
        continue;
      }

      // 获取服务状态
      const status = await getRealServiceStatus(serviceDef);
      const version = await getServiceVersion(serviceDef.versionCmd);

      software.push({
        id: serviceDef.id,
        name: serviceDef.name,
        version,
        status: status?.status || "inactive",
        enabled: status?.enabled || false,
        description: status?.description || serviceDef.description,
        category: serviceDef.category,
        icon: serviceDef.icon,
        serviceName: status?.actualServiceName || serviceDef.serviceName,
      });
    }

    // 同时从数据库获取自定义软件（如果有）
    try {
      const db = getDb();
      const dbSoftware = db.prepare("SELECT * FROM software ORDER BY name").all();
      // 合并数据库中的软件（避免重复）
      for (const sw of dbSoftware as any[]) {
        if (!software.find((s) => s.id === sw.id)) {
          software.push({
            id: sw.id,
            name: sw.name,
            version: sw.version,
            status: sw.status,
            enabled: sw.status === "running",
            description: sw.description || "",
            category: sw.category || "other",
            icon: sw.icon || "package",
            serviceName: sw.service_name,
          });
        }
      }
    } catch {
      // 数据库错误时忽略
    }

    return NextResponse.json({ software });
  } catch (error) {
    console.error("Failed to fetch software:", error);
    return NextResponse.json({ error: "Failed to fetch software" }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, softwareId, serviceName } = body;

    // 获取真实的服务名
    const service =
      SUPPORTED_SERVICES.find((s) => s.id === softwareId) ||
      SUPPORTED_SERVICES.find((s) => s.serviceName === serviceName);

    const actualServiceName = serviceName || service?.serviceName || softwareId;

    let result: { success: boolean; message: string };

    switch (action) {
      case "start":
        result = await startService(actualServiceName);
        break;

      case "stop":
        result = await stopService(actualServiceName);
        break;

      case "restart":
        result = await restartService(actualServiceName);
        break;

      case "enable":
        result = await enableService(actualServiceName);
        break;

      case "disable":
        result = await disableService(actualServiceName);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // 同步更新数据库状态
    try {
      const db = getDb();
      const newStatus =
        action === "start" || action === "restart"
          ? "running"
          : action === "stop"
            ? "stopped"
            : undefined;
      if (newStatus) {
        db.prepare("UPDATE software SET status = ? WHERE id = ?").run(newStatus, softwareId);
      }
    } catch {
      // 数据库更新失败不影响主流程
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Failed to update software:", error);
    return NextResponse.json({ error: "Failed to update software" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
