import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import {
  getCPUInfo,
  getMemoryInfo,
  getDiskInfo,
  getNetworkInfo,
  getSystemInfo,
  getProcessCount,
  getConnectionStats,
} from "@/lib/system/info";

async function handleGET() {
  try {
    // 并行获取所有系统信息
    const [cpuInfo, memoryInfo, diskInfo, networkInfo, systemInfo, processes, connections] =
      await Promise.all([
        getCPUInfo(),
        getMemoryInfo(),
        getDiskInfo(),
        getNetworkInfo(),
        getSystemInfo(),
        getProcessCount(),
        getConnectionStats(),
      ]);

    // 计算主磁盘信息（根分区或最大的分区）
    const mainDisk = diskInfo.find((d) => d.mountPoint === "/") || diskInfo[0];

    // 计算网络总流量
    const totalRx = networkInfo.reduce((acc, iface) => acc + iface.rxBytes, 0);
    const totalTx = networkInfo.reduce((acc, iface) => acc + iface.txBytes, 0);

    const data = {
      cpu: {
        cores: cpuInfo.cores,
        usage: cpuInfo.usage,
        model: cpuInfo.model,
        speed: cpuInfo.speed,
        loadAverage: cpuInfo.loadAverage,
      },
      memory: {
        total: memoryInfo.total,
        used: memoryInfo.used,
        free: memoryInfo.free,
        available: memoryInfo.available,
        buffers: memoryInfo.buffers,
        cached: memoryInfo.cached,
        percent: memoryInfo.usagePercent,
        swap: {
          total: memoryInfo.swapTotal,
          used: memoryInfo.swapUsed,
          free: memoryInfo.swapFree,
        },
      },
      load: {
        value: Math.round((cpuInfo.loadAverage[0] / cpuInfo.cores) * 100),
        avg1: cpuInfo.loadAverage[0].toFixed(2),
        avg5: cpuInfo.loadAverage[1].toFixed(2),
        avg15: cpuInfo.loadAverage[2].toFixed(2),
      },
      system: {
        platform: systemInfo.platform,
        release: systemInfo.kernel,
        hostname: systemInfo.hostname,
        uptime: systemInfo.uptime,
        arch: systemInfo.arch,
        distro: systemInfo.distro,
        bootTime: systemInfo.bootTime,
      },
      disk: mainDisk
        ? {
            total: mainDisk.total,
            used: mainDisk.used,
            available: mainDisk.available,
            percent: mainDisk.usagePercent,
            filesystem: mainDisk.filesystem,
            mountPoint: mainDisk.mountPoint,
          }
        : {
            total: 0,
            used: 0,
            available: 0,
            percent: 0,
            filesystem: "unknown",
            mountPoint: "/",
          },
      disks: diskInfo,
      network: {
        interfaces: networkInfo,
        totalSent: totalTx,
        totalReceived: totalRx,
      },
      processes,
      connections,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("System info error:", error);
    return NextResponse.json({ error: "获取系统信息失败" }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
