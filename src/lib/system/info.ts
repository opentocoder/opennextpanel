import * as fs from "fs/promises";
import * as os from "os";
import { executeCommand } from "./executor";

export interface CPUInfo {
  model: string;
  cores: number;
  speed: number;
  usage: number;
  loadAverage: [number, number, number];
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  available: number;
  buffers: number;
  cached: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
  usagePercent: number;
}

export interface DiskInfo {
  filesystem: string;
  mountPoint: string;
  total: number;
  used: number;
  available: number;
  usagePercent: number;
}

export interface NetworkInterface {
  name: string;
  ipv4: string;
  ipv6: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  distro: string;
  kernel: string;
  arch: string;
  uptime: number;
  bootTime: Date;
}

/**
 * 读取 /proc/stat 获取 CPU 使用率
 */
async function getCPUUsage(): Promise<number> {
  try {
    const stat1 = await fs.readFile("/proc/stat", "utf-8");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const stat2 = await fs.readFile("/proc/stat", "utf-8");

    const parseCPU = (content: string) => {
      const line = content.split("\n")[0];
      const parts = line.split(/\s+/).slice(1).map(Number);
      const idle = parts[3] + parts[4];
      const total = parts.reduce((a, b) => a + b, 0);
      return { idle, total };
    };

    const cpu1 = parseCPU(stat1);
    const cpu2 = parseCPU(stat2);

    const idleDelta = cpu2.idle - cpu1.idle;
    const totalDelta = cpu2.total - cpu1.total;

    return Math.round((1 - idleDelta / totalDelta) * 100);
  } catch {
    return 0;
  }
}

/**
 * 获取 CPU 信息
 */
export async function getCPUInfo(): Promise<CPUInfo> {
  const cpus = os.cpus();
  const usage = await getCPUUsage();
  const loadAvg = os.loadavg() as [number, number, number];

  return {
    model: cpus[0]?.model || "Unknown",
    cores: cpus.length,
    speed: cpus[0]?.speed || 0,
    usage,
    loadAverage: loadAvg,
  };
}

/**
 * 读取 /proc/meminfo 获取内存信息
 */
export async function getMemoryInfo(): Promise<MemoryInfo> {
  try {
    const content = await fs.readFile("/proc/meminfo", "utf-8");
    const lines = content.split("\n");
    const info: Record<string, number> = {};

    for (const line of lines) {
      const match = line.match(/^(\w+):\s+(\d+)/);
      if (match) {
        info[match[1]] = parseInt(match[2]) * 1024; // 转换为字节
      }
    }

    const total = info.MemTotal || 0;
    const free = info.MemFree || 0;
    const available = info.MemAvailable || free;
    const buffers = info.Buffers || 0;
    const cached = info.Cached || 0;
    const used = total - free - buffers - cached;

    return {
      total,
      used,
      free,
      available,
      buffers,
      cached,
      swapTotal: info.SwapTotal || 0,
      swapUsed: (info.SwapTotal || 0) - (info.SwapFree || 0),
      swapFree: info.SwapFree || 0,
      usagePercent: Math.round((used / total) * 100),
    };
  } catch {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      total: totalMem,
      used: totalMem - freeMem,
      free: freeMem,
      available: freeMem,
      buffers: 0,
      cached: 0,
      swapTotal: 0,
      swapUsed: 0,
      swapFree: 0,
      usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    };
  }
}

/**
 * 获取磁盘信息
 */
export async function getDiskInfo(): Promise<DiskInfo[]> {
  const result = await executeCommand("df", ["-B1", "--output=source,target,size,used,avail,pcent"], {
    useSudo: false,
  });

  if (result.code !== 0) {
    return [];
  }

  const lines = result.stdout.split("\n").slice(1);
  const disks: DiskInfo[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 6 && parts[0].startsWith("/")) {
      disks.push({
        filesystem: parts[0],
        mountPoint: parts[1],
        total: parseInt(parts[2]) || 0,
        used: parseInt(parts[3]) || 0,
        available: parseInt(parts[4]) || 0,
        usagePercent: parseInt(parts[5]) || 0,
      });
    }
  }

  return disks;
}

/**
 * 读取 /proc/net/dev 获取网络信息
 */
export async function getNetworkInfo(): Promise<NetworkInterface[]> {
  const interfaces: NetworkInterface[] = [];
  const netInterfaces = os.networkInterfaces();

  try {
    const netDev = await fs.readFile("/proc/net/dev", "utf-8");
    const lines = netDev.split("\n").slice(2);

    for (const line of lines) {
      const match = line.match(/^\s*(\w+):\s*(\d+)\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)\s+(\d+)/);
      if (match) {
        const name = match[1];
        const ifaceInfo = netInterfaces[name];

        let ipv4 = "";
        let ipv6 = "";
        let mac = "";

        if (ifaceInfo) {
          for (const addr of ifaceInfo) {
            if (addr.family === "IPv4") ipv4 = addr.address;
            if (addr.family === "IPv6" && !ipv6) ipv6 = addr.address;
            if (addr.mac && addr.mac !== "00:00:00:00:00:00") mac = addr.mac;
          }
        }

        interfaces.push({
          name,
          ipv4,
          ipv6,
          mac,
          rxBytes: parseInt(match[2]),
          rxPackets: parseInt(match[3]),
          txBytes: parseInt(match[4]),
          txPackets: parseInt(match[5]),
        });
      }
    }
  } catch {
    // 回退到 os.networkInterfaces()
    for (const [name, addrs] of Object.entries(netInterfaces)) {
      if (!addrs) continue;

      let ipv4 = "";
      let ipv6 = "";
      let mac = "";

      for (const addr of addrs) {
        if (addr.family === "IPv4") ipv4 = addr.address;
        if (addr.family === "IPv6" && !ipv6) ipv6 = addr.address;
        if (addr.mac && addr.mac !== "00:00:00:00:00:00") mac = addr.mac;
      }

      interfaces.push({
        name,
        ipv4,
        ipv6,
        mac,
        rxBytes: 0,
        txBytes: 0,
        rxPackets: 0,
        txPackets: 0,
      });
    }
  }

  return interfaces.filter((i) => i.name !== "lo");
}

/**
 * 获取系统信息
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  let distro = "Unknown";

  try {
    const osRelease = await fs.readFile("/etc/os-release", "utf-8");
    const match = osRelease.match(/PRETTY_NAME="(.+)"/);
    if (match) {
      distro = match[1];
    }
  } catch {
    distro = `${os.type()} ${os.release()}`;
  }

  const uptimeSeconds = os.uptime();
  const bootTime = new Date(Date.now() - uptimeSeconds * 1000);

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    distro,
    kernel: os.release(),
    arch: os.arch(),
    uptime: uptimeSeconds,
    bootTime,
  };
}

/**
 * 获取进程数量
 */
export async function getProcessCount(): Promise<{ total: number; running: number; sleeping: number }> {
  const result = await executeCommand("ps", ["aux", "--no-headers"], { useSudo: false });

  if (result.code !== 0) {
    return { total: 0, running: 0, sleeping: 0 };
  }

  const lines = result.stdout.split("\n").filter(Boolean);
  let running = 0;
  let sleeping = 0;

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 8) {
      const stat = parts[7];
      if (stat.startsWith("R")) running++;
      else if (stat.startsWith("S")) sleeping++;
    }
  }

  return {
    total: lines.length,
    running,
    sleeping,
  };
}

/**
 * 获取网络连接统计
 */
export async function getConnectionStats(): Promise<{
  established: number;
  listening: number;
  timeWait: number;
  closeWait: number;
}> {
  const result = await executeCommand("ss", ["-tan"], { useSudo: false });

  if (result.code !== 0) {
    return { established: 0, listening: 0, timeWait: 0, closeWait: 0 };
  }

  const lines = result.stdout.split("\n");
  let established = 0;
  let listening = 0;
  let timeWait = 0;
  let closeWait = 0;

  for (const line of lines) {
    if (line.includes("ESTAB")) established++;
    else if (line.includes("LISTEN")) listening++;
    else if (line.includes("TIME-WAIT")) timeWait++;
    else if (line.includes("CLOSE-WAIT")) closeWait++;
  }

  return { established, listening, timeWait, closeWait };
}

/**
 * 获取完整的系统状态
 */
export async function getFullSystemStatus(): Promise<{
  system: SystemInfo;
  cpu: CPUInfo;
  memory: MemoryInfo;
  disks: DiskInfo[];
  network: NetworkInterface[];
  processes: { total: number; running: number; sleeping: number };
  connections: { established: number; listening: number; timeWait: number; closeWait: number };
}> {
  const [system, cpu, memory, disks, network, processes, connections] = await Promise.all([
    getSystemInfo(),
    getCPUInfo(),
    getMemoryInfo(),
    getDiskInfo(),
    getNetworkInfo(),
    getProcessCount(),
    getConnectionStats(),
  ]);

  return {
    system,
    cpu,
    memory,
    disks,
    network,
    processes,
    connections,
  };
}

/**
 * 格式化字节为人类可读格式
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 格式化运行时间
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "< 1m";
}
