import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getServiceStatus,
  startService,
  stopService,
  restartService,
  enableService,
  disableService,
  getServiceLogs,
} from "@/lib/system/process";
import { executeCommand } from "@/lib/system/executor";
import {
  installSoftware,
  uninstallSoftware,
  getAvailableVersions,
  isSoftwareInstalled,
} from "@/lib/system/installer";

// 服务名映射
const SERVICE_MAP: Record<string, string[]> = {
  nginx: ["nginx"],
  apache: ["apache2", "httpd"],  // Ubuntu 用 apache2, CentOS 用 httpd
  "php-fpm": ["php-fpm", "php8.3-fpm", "php8.2-fpm", "php8.1-fpm", "php8.0-fpm", "php7.4-fpm"],
  php83: ["php8.3-fpm"],
  php82: ["php8.2-fpm"],
  php81: ["php8.1-fpm"],
  php74: ["php7.4-fpm"],
  mysql: ["mysqld"],  // 真正的 MySQL 服务
  mariadb: ["mariadb"],  // MariaDB 服务
  redis: ["redis", "redis-server"],
  docker: ["docker"],
  postgresql: ["postgresql"],
  mongodb: ["mongod"],
  memcached: ["memcached"],
  fail2ban: ["fail2ban"],
  supervisor: ["supervisor", "supervisord"],
};

// 获取实际运行的服务名
async function findActiveServiceName(serviceName: string): Promise<string | null> {
  const candidates = SERVICE_MAP[serviceName] || [serviceName];

  for (const name of candidates) {
    const status = await getServiceStatus(name);
    if (status && status.status !== "unknown") {
      return name;
    }
  }

  // 如果都找不到，返回第一个候选
  return candidates[0];
}

// GET: 获取单个服务的详细状态
async function handleGET(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    const actualName = await findActiveServiceName(name);

    if (!actualName) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const status = await getServiceStatus(actualName);

    if (!status) {
      return NextResponse.json(
        {
          name,
          serviceName: actualName,
          status: "not_installed",
          enabled: false,
          description: "Service not installed",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      name,
      serviceName: actualName,
      status: status.status,
      enabled: status.enabled,
      description: status.description,
    });
  } catch (error) {
    console.error("Failed to get service status:", error);
    return NextResponse.json({ error: "Failed to get service status" }, { status: 500 });
  }
}

// POST: 启动服务
async function handlePOST(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    const actualName = await findActiveServiceName(name);

    if (!actualName) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const result = await startService(actualName);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      serviceName: actualName,
    });
  } catch (error) {
    console.error("Failed to start service:", error);
    return NextResponse.json({ error: "Failed to start service" }, { status: 500 });
  }
}

// DELETE: 停止服务
async function handleDELETE(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    const actualName = await findActiveServiceName(name);

    if (!actualName) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const result = await stopService(actualName);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      serviceName: actualName,
    });
  } catch (error) {
    console.error("Failed to stop service:", error);
    return NextResponse.json({ error: "Failed to stop service" }, { status: 500 });
  }
}

// PUT: 重启服务、安装、卸载等操作
async function handlePUT(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    const body = await request.json();
    const { action, version } = body;

    // 安装操作不需要服务已存在
    if (action === "install") {
      console.log(`Installing software: ${name}, version: ${version || "latest"}`);
      const installResult = await installSoftware(name, { version });
      return NextResponse.json({
        success: installResult.success,
        message: installResult.message,
        logs: installResult.logs,
      }, { status: installResult.success ? 200 : 500 });
    }

    // 卸载操作
    if (action === "uninstall") {
      console.log(`Uninstalling software: ${name}`);
      const uninstallResult = await uninstallSoftware(name);
      return NextResponse.json({
        success: uninstallResult.success,
        message: uninstallResult.message,
        logs: uninstallResult.logs,
      }, { status: uninstallResult.success ? 200 : 500 });
    }

    // 获取可用版本
    if (action === "versions") {
      const versions = await getAvailableVersions(name);
      return NextResponse.json({ success: true, versions });
    }

    // 其他操作需要服务存在
    const actualName = await findActiveServiceName(name);

    if (!actualName) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    let result: { success: boolean; message: string };

    switch (action) {
      case "restart":
        result = await restartService(actualName);
        break;
      case "enable":
        result = await enableService(actualName);
        break;
      case "disable":
        result = await disableService(actualName);
        break;
      case "logs":
        const lines = body.lines || 100;
        const logs = await getServiceLogs(actualName, lines);
        return NextResponse.json({ success: true, logs });
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      serviceName: actualName,
    });
  } catch (error) {
    console.error("Failed to update service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const DELETE = withAuth(handleDELETE);
export const PUT = withAuth(handlePUT);
