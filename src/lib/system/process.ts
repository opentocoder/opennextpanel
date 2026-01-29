import { executeCommand } from "./executor";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  user: string;
  command: string;
  startTime: string;
}

export interface PM2Process {
  name: string;
  id: number;
  pid: number;
  status: "online" | "stopped" | "errored" | "launching";
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  instances: number;
}

export interface ServiceInfo {
  name: string;
  status: "active" | "inactive" | "failed" | "unknown";
  enabled: boolean;
  description: string;
}

/**
 * 获取系统进程列表
 */
export async function getProcessList(): Promise<ProcessInfo[]> {
  const result = await executeCommand(
    "ps",
    ["aux", "--sort=-pcpu"],
    { useSudo: false }
  );

  if (result.code !== 0) {
    return [];
  }

  const lines = result.stdout.split("\n").slice(1); // 跳过标题行
  const processes: ProcessInfo[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 11) {
      processes.push({
        user: parts[0],
        pid: parseInt(parts[1]),
        cpu: parseFloat(parts[2]),
        memory: parseFloat(parts[3]),
        status: parts[7],
        startTime: parts[8],
        name: parts[10],
        command: parts.slice(10).join(" "),
      });
    }
  }

  return processes.slice(0, 100); // 限制返回数量
}

/**
 * 终止进程
 */
export async function killProcess(
  pid: number,
  signal: number = 15
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("kill", [`-${signal}`, pid.toString()]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: `Process ${pid} killed` };
}

/**
 * 获取 PM2 进程列表
 */
export async function getPM2List(): Promise<PM2Process[]> {
  const result = await executeCommand("pm2", ["jlist"], { useSudo: false });

  if (result.code !== 0) {
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    return data.map((p: any) => ({
      name: p.name,
      id: p.pm_id,
      pid: p.pid,
      status: p.pm2_env?.status || "unknown",
      cpu: p.monit?.cpu || 0,
      memory: p.monit?.memory || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      restarts: p.pm2_env?.restart_time || 0,
      instances: p.pm2_env?.instances || 1,
    }));
  } catch {
    return [];
  }
}

/**
 * 启动 PM2 应用
 */
export async function pm2Start(
  script: string,
  name?: string,
  options: {
    instances?: number;
    maxMemory?: string;
    cwd?: string;
    env?: Record<string, string>;
  } = {}
): Promise<{ success: boolean; message: string }> {
  const args = ["start", script];

  if (name) {
    args.push("--name", name);
  }
  if (options.instances) {
    args.push("-i", options.instances.toString());
  }
  if (options.maxMemory) {
    args.push("--max-memory-restart", options.maxMemory);
  }
  if (options.cwd) {
    args.push("--cwd", options.cwd);
  }

  const result = await executeCommand("pm2", args, {
    useSudo: false,
    env: options.env as NodeJS.ProcessEnv,
  });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Application started" };
}

/**
 * 停止 PM2 应用
 */
export async function pm2Stop(
  nameOrId: string | number
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("pm2", ["stop", nameOrId.toString()], {
    useSudo: false,
  });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Application stopped" };
}

/**
 * 重启 PM2 应用
 */
export async function pm2Restart(
  nameOrId: string | number
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("pm2", ["restart", nameOrId.toString()], {
    useSudo: false,
  });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Application restarted" };
}

/**
 * 删除 PM2 应用
 */
export async function pm2Delete(
  nameOrId: string | number
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("pm2", ["delete", nameOrId.toString()], {
    useSudo: false,
  });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Application deleted" };
}

/**
 * 获取 PM2 应用日志
 */
export async function pm2Logs(
  nameOrId: string | number,
  lines: number = 100
): Promise<string> {
  const result = await executeCommand(
    "pm2",
    ["logs", nameOrId.toString(), "--lines", lines.toString(), "--nostream"],
    { useSudo: false }
  );

  return result.stdout || result.stderr;
}

/**
 * 保存 PM2 进程列表
 */
export async function pm2Save(): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("pm2", ["save"], { useSudo: false });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "PM2 process list saved" };
}

/**
 * 获取系统服务列表
 */
export async function getServiceList(): Promise<ServiceInfo[]> {
  const result = await executeCommand(
    "systemctl",
    ["list-units", "--type=service", "--all", "--no-pager", "--plain"],
    { useSudo: false }
  );

  if (result.code !== 0) {
    return [];
  }

  const lines = result.stdout.split("\n").slice(1);
  const services: ServiceInfo[] = [];

  for (const line of lines) {
    const match = line.match(/^(\S+\.service)\s+(\w+)\s+(\w+)\s+(\w+)\s+(.*)$/);
    if (match) {
      const [, fullName, , , sub, description] = match;
      const name = fullName.replace(".service", "");

      services.push({
        name,
        status: sub as ServiceInfo["status"],
        enabled: true, // 需要额外查询
        description: description.trim(),
      });
    }
  }

  return services;
}

/**
 * 获取服务状态
 */
export async function getServiceStatus(name: string): Promise<ServiceInfo | null> {
  const statusResult = await executeCommand(
    "systemctl",
    ["is-active", `${name}.service`],
    { useSudo: false }
  );

  const enabledResult = await executeCommand(
    "systemctl",
    ["is-enabled", `${name}.service`],
    { useSudo: false }
  );

  const showResult = await executeCommand(
    "systemctl",
    ["show", `${name}.service`, "--property=Description"],
    { useSudo: false }
  );

  const status = statusResult.stdout.trim();
  const enabled = enabledResult.stdout.trim() === "enabled";
  const descMatch = showResult.stdout.match(/Description=(.+)/);

  return {
    name,
    status: status === "active" ? "active" : status === "failed" ? "failed" : "inactive",
    enabled,
    description: descMatch?.[1] || "",
  };
}

/**
 * 启动服务
 */
export async function startService(
  name: string
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("systemctl", ["start", `${name}.service`]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: `Service ${name} started` };
}

/**
 * 停止服务
 */
export async function stopService(
  name: string
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("systemctl", ["stop", `${name}.service`]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: `Service ${name} stopped` };
}

/**
 * 重启服务
 */
export async function restartService(
  name: string
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("systemctl", ["restart", `${name}.service`]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: `Service ${name} restarted` };
}

/**
 * 启用服务（开机自启）
 */
export async function enableService(
  name: string
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("systemctl", ["enable", `${name}.service`]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: `Service ${name} enabled` };
}

/**
 * 禁用服务
 */
export async function disableService(
  name: string
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("systemctl", ["disable", `${name}.service`]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: `Service ${name} disabled` };
}

/**
 * 获取服务日志
 */
export async function getServiceLogs(
  name: string,
  lines: number = 100
): Promise<string> {
  const result = await executeCommand(
    "journalctl",
    ["-u", `${name}.service`, "-n", lines.toString(), "--no-pager"],
    { useSudo: false }
  );

  return result.stdout || result.stderr;
}
