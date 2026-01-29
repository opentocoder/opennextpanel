"use client";

import { useEffect, useState, useCallback } from "react";
import { SystemStatus, OverviewCards, TrafficChart, SoftwareGrid } from "@/components/dashboard";

interface SystemData {
  cpu: { cores: number; usage: number };
  memory: { total: number; used: number; percent: number };
  load: { value: number };
  disk: { total: number; used: number; percent: number };
  network: { upload: number; download: number; totalSent: number; totalReceived: number };
}

interface OverviewData {
  sites: number;
  databases: number;
  ftps: number;
  risks: number;
}

interface SoftwareItem {
  id: number;
  name: string;
  title: string;
  version: string;
  status: "running" | "stopped" | "not_installed";
}

export default function HomePage() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [overview, setOverview] = useState<OverviewData>({ sites: 0, databases: 0, ftps: 0, risks: 0 });
  const [software, setSoftware] = useState<SoftwareItem[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<{
    time: string[];
    upload: number[];
    download: number[];
  }>({
    time: [],
    upload: [],
    download: [],
  });

  const fetchOverview = useCallback(async () => {
    try {
      const [sitesRes, dbRes, ftpRes, secRes, swRes] = await Promise.all([
        fetch("/api/sites"),
        fetch("/api/database"),
        fetch("/api/ftp"),
        fetch("/api/security?action=stats"),
        fetch("/api/software"),
      ]);
      const sitesData = await sitesRes.json();
      const dbData = await dbRes.json();
      const ftpData = await ftpRes.json();
      const secData = await secRes.json();
      const swData = await swRes.json();

      setOverview({
        sites: sitesData.sites?.length || 0,
        databases: dbData.databases?.length || 0,
        ftps: ftpData.accounts?.length || 0,
        risks: secData.stats?.totalRisks || 0,
      });

      if (swData.software) {
        const swList = swData.software
          .filter((s: any) => s.status === "active" || s.status === "inactive" || s.status === "installed")
          .slice(0, 6)
          .map((s: any, i: number) => ({
            id: i + 1,
            name: s.id,
            title: s.name,
            version: s.version || "",
            status: s.status === "active" ? "running" : s.status === "inactive" ? "stopped" : "stopped",
          }));
        setSoftware(swList);
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const res = await fetch("/api/system");
        const data = await res.json();
        setSystemData(data);

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
        sites={overview.sites}
        databases={overview.databases}
        ftps={overview.ftps}
        risks={overview.risks}
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
        <SoftwareGrid software={software.length > 0 ? software : [
          { id: 1, name: "nginx", title: "Nginx", version: "-", status: "stopped" },
          { id: 2, name: "mysql", title: "MySQL", version: "-", status: "stopped" },
          { id: 3, name: "php", title: "PHP", version: "-", status: "stopped" },
        ]} />
      </div>
    </div>
  );
}
