"use client";

import { useEffect, useState } from "react";
import { SystemStatus, OverviewCards, TrafficChart, SoftwareGrid } from "@/components/dashboard";

interface SystemData {
  cpu: { cores: number; usage: number };
  memory: { total: number; used: number; percent: number };
  load: { value: number };
  disk: { total: number; used: number; percent: number };
  network: { upload: number; download: number; totalSent: number; totalReceived: number };
}

export default function HomePage() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<{
    time: string[];
    upload: number[];
    download: number[];
  }>({
    time: [],
    upload: [],
    download: [],
  });

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const res = await fetch("/api/system");
        const data = await res.json();
        setSystemData(data);

        // 更新流量历史
        setTrafficHistory((prev) => {
          const now = new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const newTime = [...prev.time, now].slice(-30);
          const newUpload = [...prev.upload, data.network.upload].slice(-30);
          const newDownload = [...prev.download, data.network.download].slice(-30);
          return { time: newTime, upload: newUpload, download: newDownload };
        });
      } catch (error) {
        console.error("Failed to fetch system info:", error);
      }
    };

    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const mockSoftware = [
    { id: 1, name: "nginx", title: "Nginx", version: "1.24.0", status: "running" as const },
    { id: 2, name: "mysql", title: "MySQL", version: "8.0.35", status: "running" as const },
    { id: 3, name: "php", title: "PHP-8.2", version: "8.2.12", status: "running" as const },
    { id: 4, name: "redis", title: "Redis", version: "7.2.3", status: "stopped" as const },
    { id: 5, name: "docker", title: "Docker", version: "24.0.7", status: "running" as const },
    { id: 6, name: "node", title: "Node.js", version: "20.10.0", status: "running" as const },
  ];

  if (!systemData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统状态 */}
      <SystemStatus
        load={systemData.load.value}
        cpu={systemData.cpu.usage}
        memory={systemData.memory}
        disk={systemData.disk}
      />

      {/* 概览卡片 */}
      <OverviewCards
        sites={12}
        databases={5}
        ftps={2}
        risks={0}
      />

      {/* 流量图表 + 软件网格 */}
      <div className="grid grid-cols-2 gap-6">
        <TrafficChart
          data={trafficHistory}
          totalSent={systemData.network.totalSent}
          totalReceived={systemData.network.totalReceived}
          currentUpload={systemData.network.upload}
          currentDownload={systemData.network.download}
        />
        <SoftwareGrid software={mockSoftware} />
      </div>
    </div>
  );
}
