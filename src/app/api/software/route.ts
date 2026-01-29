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
  // Web 服务器
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
    id: "apache",
    name: "Apache",
    serviceName: "apache2",
    altServiceNames: ["httpd"],
    versionCmd: ["apache2", "-v"],
    altVersionCmd: ["httpd", "-v"],
    category: "webserver",
    icon: "apache",
    description: "流行的开源 Web 服务器",
  },
  {
    id: "openresty",
    name: "OpenResty",
    serviceName: "openresty",
    versionCmd: ["openresty", "-v"],
    category: "webserver",
    icon: "openresty",
    description: "基于 Nginx 的高性能 Web 平台（支持 Lua）",
  },
  {
    id: "caddy",
    name: "Caddy",
    serviceName: "caddy",
    versionCmd: ["caddy", "version"],
    category: "webserver",
    icon: "caddy",
    description: "自动 HTTPS 的现代 Web 服务器",
  },
  // PHP 运行时
  {
    id: "php83",
    name: "PHP-8.3",
    serviceName: "php8.3-fpm",
    altServiceNames: ["php-fpm"],
    versionCmd: ["php8.3", "-v"],
    altVersionCmd: ["php", "-v"],
    category: "runtime",
    icon: "php",
    description: "PHP 8.3 FastCGI 进程管理器",
  },
  {
    id: "php82",
    name: "PHP-8.2",
    serviceName: "php8.2-fpm",
    versionCmd: ["php8.2", "-v"],
    altVersionCmd: ["php", "-v"],
    category: "runtime",
    icon: "php",
    description: "PHP 8.2 FastCGI 进程管理器",
  },
  {
    id: "php81",
    name: "PHP-8.1",
    serviceName: "php8.1-fpm",
    versionCmd: ["php8.1", "-v"],
    category: "runtime",
    icon: "php",
    description: "PHP 8.1 FastCGI 进程管理器",
  },
  {
    id: "php74",
    name: "PHP-7.4",
    serviceName: "php7.4-fpm",
    versionCmd: ["php7.4", "-v"],
    category: "runtime",
    icon: "php",
    description: "PHP 7.4 FastCGI 进程管理器（LTS 长期支持）",
  },
  {
    id: "php56",
    name: "PHP-5.6",
    serviceName: "php5.6-fpm",
    versionCmd: ["php5.6", "-v"],
    category: "runtime",
    icon: "php",
    description: "PHP 5.6 FastCGI（旧版兼容）",
  },
  // 数据库
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
    id: "sqlite",
    name: "SQLite",
    serviceName: null,
    versionCmd: ["sqlite3", "--version"],
    category: "database",
    icon: "sqlite",
    description: "轻量级嵌入式数据库",
  },
  // 缓存
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
    id: "memcached",
    name: "Memcached",
    serviceName: "memcached",
    versionCmd: ["memcached", "-V"],
    category: "cache",
    icon: "memcached",
    description: "分布式内存缓存系统",
  },
  // 运行时
  {
    id: "nodejs",
    name: "Node.js",
    serviceName: null,
    versionCmd: ["node", "--version"],
    category: "runtime",
    icon: "nodejs",
    description: "JavaScript 运行时",
  },
  {
    id: "python",
    name: "Python",
    serviceName: null,
    versionCmd: ["python3", "--version"],
    category: "runtime",
    icon: "python",
    description: "Python 编程语言",
  },
  {
    id: "java",
    name: "Java/OpenJDK",
    serviceName: null,
    versionCmd: ["java", "--version"],
    category: "runtime",
    icon: "java",
    description: "Java 运行环境",
  },
  {
    id: "go",
    name: "Go",
    serviceName: null,
    versionCmd: ["go", "version"],
    category: "runtime",
    icon: "go",
    description: "Google 开发的编程语言",
  },
  {
    id: "rust",
    name: "Rust",
    serviceName: null,
    versionCmd: ["rustc", "--version"],
    category: "runtime",
    icon: "rust",
    description: "安全高效的系统编程语言",
  },
  // Java 应用服务器
  {
    id: "tomcat",
    name: "Tomcat",
    serviceName: "tomcat",
    altServiceNames: ["tomcat9", "tomcat10"],
    versionCmd: null,
    checkPath: "/opt/tomcat",
    category: "webserver",
    icon: "tomcat",
    description: "Java Servlet 容器",
  },
  // 消息队列
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    serviceName: "rabbitmq-server",
    versionCmd: ["rabbitmqctl", "version"],
    category: "queue",
    icon: "rabbitmq",
    description: "开源消息代理",
  },
  // 搜索引擎
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    serviceName: "elasticsearch",
    versionCmd: null,
    checkPath: "/usr/share/elasticsearch",
    category: "search",
    icon: "elasticsearch",
    description: "分布式搜索和分析引擎",
  },
  // 工具
  {
    id: "phpmyadmin",
    name: "phpMyAdmin",
    serviceName: null,
    versionCmd: null,
    checkPath: "/usr/share/phpmyadmin",
    category: "tools",
    icon: "phpmyadmin",
    description: "MySQL 数据库 Web 管理工具",
  },
  {
    id: "adminer",
    name: "Adminer",
    serviceName: null,
    versionCmd: null,
    checkPath: "/usr/share/adminer",
    category: "tools",
    icon: "adminer",
    description: "轻量级数据库管理工具",
  },
  {
    id: "pureftpd",
    name: "Pure-FTPd",
    serviceName: "pure-ftpd",
    versionCmd: ["pure-ftpd", "--help"],
    category: "tools",
    icon: "ftp",
    description: "安全高效的 FTP 服务器",
  },
  {
    id: "vsftpd",
    name: "vsftpd",
    serviceName: "vsftpd",
    versionCmd: ["vsftpd", "-v"],
    category: "tools",
    icon: "ftp",
    description: "非常安全的 FTP 服务器",
  },
  {
    id: "composer",
    name: "Composer",
    serviceName: null,
    versionCmd: ["composer", "--version"],
    category: "tools",
    icon: "composer",
    description: "PHP 依赖管理工具",
  },
  {
    id: "supervisor",
    name: "Supervisor",
    serviceName: "supervisor",
    altServiceNames: ["supervisord"],
    versionCmd: ["supervisord", "--version"],
    category: "tools",
    icon: "supervisor",
    description: "进程管理工具",
  },
  {
    id: "certbot",
    name: "Certbot",
    serviceName: null,
    versionCmd: ["certbot", "--version"],
    category: "security",
    icon: "letsencrypt",
    description: "Let's Encrypt SSL 证书工具",
  },
  // 安全
  {
    id: "fail2ban",
    name: "Fail2ban",
    serviceName: "fail2ban",
    versionCmd: ["fail2ban-client", "--version"],
    category: "security",
    icon: "security",
    description: "防止暴力破解的安全工具",
  },
  {
    id: "clamav",
    name: "ClamAV",
    serviceName: "clamav-daemon",
    altServiceNames: ["clamd"],
    versionCmd: ["clamscan", "--version"],
    category: "security",
    icon: "antivirus",
    description: "开源杀毒软件",
  },
  // 容器
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
    id: "docker-compose",
    name: "Docker Compose",
    serviceName: null,
    versionCmd: ["docker-compose", "--version"],
    altVersionCmd: ["docker", "compose", "version"],
    category: "container",
    icon: "docker",
    description: "Docker 容器编排工具",
  },
  // 监控
  {
    id: "prometheus",
    name: "Prometheus",
    serviceName: "prometheus",
    versionCmd: ["prometheus", "--version"],
    category: "monitor",
    icon: "prometheus",
    description: "监控和告警系统",
  },
  {
    id: "grafana",
    name: "Grafana",
    serviceName: "grafana-server",
    versionCmd: ["grafana-server", "-v"],
    category: "monitor",
    icon: "grafana",
    description: "数据可视化平台",
  },
];

// 获取服务版本
async function getServiceVersion(serviceDef: (typeof SUPPORTED_SERVICES)[0]): Promise<string> {
  if (!serviceDef.versionCmd) {
    // 对于 phpMyAdmin 等没有版本命令的软件
    if (serviceDef.id === "phpmyadmin") {
      try {
        const fs = require("fs");
        const configFile = "/usr/share/phpmyadmin/libraries/classes/Version.php";
        if (fs.existsSync(configFile)) {
          const content = fs.readFileSync(configFile, "utf-8");
          const match = content.match(/VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
          return match ? match[1] : "installed";
        }
        return "installed";
      } catch {
        return "installed";
      }
    }
    return "unknown";
  }

  try {
    const result = await executeCommand(serviceDef.versionCmd[0], serviceDef.versionCmd.slice(1), {
      useSudo: false,
      timeout: 5000,
    });
    // 提取版本号
    const output = result.stdout || result.stderr;
    const versionMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (versionMatch) return versionMatch[1];

    // Don't use fallback commands for PHP versions - they would give wrong version
    // Only use altVersionCmd for non-PHP software
    if ((serviceDef as any).altVersionCmd && !serviceDef.id.startsWith("php")) {
      const altResult = await executeCommand(
        (serviceDef as any).altVersionCmd[0],
        (serviceDef as any).altVersionCmd.slice(1),
        { useSudo: false, timeout: 5000 }
      );
      const altOutput = altResult.stdout || altResult.stderr;
      const altMatch = altOutput.match(/(\d+\.\d+(?:\.\d+)?)/);
      if (altMatch) return altMatch[1];
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

// 检查服务是否安装
async function checkServiceInstalled(serviceDef: (typeof SUPPORTED_SERVICES)[0]): Promise<boolean> {
  // 检查路径是否存在（用于 phpMyAdmin 等）
  if ((serviceDef as any).checkPath) {
    try {
      const fs = require("fs");
      return fs.existsSync((serviceDef as any).checkPath);
    } catch {
      return false;
    }
  }

  // For PHP versions, be strict - only check the specific version command
  // Don't fall back to generic 'php' command
  if (serviceDef.id.startsWith("php") && serviceDef.id !== "phpmyadmin") {
    if (serviceDef.versionCmd) {
      const cmdName = serviceDef.versionCmd[0];
      const cmdAvailable = await isCommandAvailable(cmdName);
      if (!cmdAvailable) return false;

      // Also verify the service exists for PHP-FPM
      if (serviceDef.serviceName) {
        const result = await executeCommand("systemctl", ["list-unit-files", `${serviceDef.serviceName}.service`], {
          useSudo: false,
        });
        return result.code === 0 && result.stdout.includes(serviceDef.serviceName);
      }
    }
    return false;
  }

  // 检查命令是否可用
  if (serviceDef.versionCmd) {
    const cmdName = serviceDef.versionCmd[0];
    const cmdAvailable = await isCommandAvailable(cmdName);
    if (cmdAvailable) return true;

    // 尝试备用命令 (but not for PHP - handled above)
    if ((serviceDef as any).altVersionCmd) {
      const altCmd = (serviceDef as any).altVersionCmd[0];
      const altAvailable = await isCommandAvailable(altCmd);
      if (altAvailable) return true;
    }
  }

  // 检查 systemctl 中是否有该服务
  if (serviceDef.serviceName) {
    const serviceNames = [serviceDef.serviceName, ...(serviceDef.altServiceNames || [])];
    for (const name of serviceNames) {
      const result = await executeCommand("systemctl", ["list-unit-files", `${name}.service`], {
        useSudo: false,
      });
      if (result.code === 0 && result.stdout.includes(name)) {
        return true;
      }
    }
  }

  return false;
}

// 获取真实服务状态
async function getRealServiceStatus(serviceDef: (typeof SUPPORTED_SERVICES)[0]) {
  // 非服务型软件（如 phpMyAdmin、Node.js）返回 installed 状态
  if (!serviceDef.serviceName) {
    return { status: "installed", enabled: true, actualServiceName: null, description: serviceDef.description };
  }

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
      const version = await getServiceVersion(serviceDef);

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
