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

// 服务名映射
const SERVICE_MAP: Record<string, string[]> = {
  nginx: ["nginx"],
  "php-fpm": ["php-fpm", "php8.2-fpm", "php8.1-fpm", "php8.0-fpm", "php7.4-fpm"],
  mysql: ["mysql", "mariadb", "mysqld"],
  redis: ["redis", "redis-server"],
  docker: ["docker"],
  postgresql: ["postgresql"],
  mongodb: ["mongod"],
  memcached: ["memcached"],
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

// PUT: 重启服务或更新设置
async function handlePUT(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await context.params;
    const body = await request.json();
    const { action } = body;

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
