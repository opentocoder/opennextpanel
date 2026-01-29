"use client";

import { useState, useEffect, useCallback } from "react";
import { MonitorCharts, ResourceHistory } from "@/components/monitor";

interface MonitorData {
  cpuData: number[];
  memoryData: number[];
  diskReadData: number[];
  diskWriteData: number[];
  netInData: number[];
  netOutData: number[];
  timeLabels: string[];
}

interface Stats {
  cpuAvg: number;
  cpuMax: number;
  memoryAvg: number;
  memoryMax: number;
  diskReadAvg: number;
  diskWriteAvg: number;
  netInTotal: number;
  netOutTotal: number;
}

export default function MonitorPage() {
  const [timeRange, setTimeRange] = useState("1h");
  const [loading, setLoading] = useState(true);
  const [monitorData, setMonitorData] = useState<MonitorData>({
    cpuData: [],
    memoryData: [],
    diskReadData: [],
    diskWriteData: [],
    netInData: [],
    netOutData: [],
    timeLabels: [],
  });
  const [stats, setStats] = useState<Stats>({
    cpuAvg: 0,
    cpuMax: 0,
    memoryAvg: 0,
    memoryMax: 0,
    diskReadAvg: 0,
    diskWriteAvg: 0,
    netInTotal: 0,
    netOutTotal: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/monitor?action=history&range=${timeRange}`);
      const data = await response.json();

      if (data.history && data.history.length > 0) {
        const cpuData: number[] = [];
        const memoryData: number[] = [];
        const diskReadData: number[] = [];
        const diskWriteData: number[] = [];
        const netInData: number[] = [];
        const netOutData: number[] = [];
        const timeLabels: string[] = [];

        for (const record of data.history) {
          cpuData.push(record.cpu_usage || 0);
          memoryData.push(record.memory_usage || 0);
          diskReadData.push((record.disk_read || 0) / (1024 * 1024)); // Convert to MB
          diskWriteData.push((record.disk_write || 0) / (1024 * 1024));
          netInData.push((record.net_in || 0) / (1024 * 1024)); // Convert to MB
          netOutData.push((record.net_out || 0) / (1024 * 1024));

          const time = new Date(record.created_at);
          timeLabels.push(
            time.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }

        setMonitorData({
          cpuData,
          memoryData,
          diskReadData,
          diskWriteData,
          netInData,
          netOutData,
          timeLabels,
        });
      }

      if (data.summary) {
        setStats({
          cpuAvg: data.summary.cpuAvg || 0,
          cpuMax: data.summary.cpuMax || 0,
          memoryAvg: data.summary.memoryAvg || 0,
          memoryMax: data.summary.memoryMax || 0,
          diskReadAvg: (data.summary.diskReadAvg || 0) / (1024 * 1024),
          diskWriteAvg: (data.summary.diskWriteAvg || 0) / (1024 * 1024),
          netInTotal: data.summary.netInTotal || 0,
          netOutTotal: data.summary.netOutTotal || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch monitor data:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Record current stats periodically
  const recordStats = useCallback(async () => {
    try {
      await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record" }),
      });
    } catch (error) {
      console.error("Failed to record stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Record stats every minute
    recordStats();
    const recordInterval = setInterval(recordStats, 60000);

    // Refresh data every 30 seconds
    const fetchInterval = setInterval(fetchData, 30000);

    return () => {
      clearInterval(recordInterval);
      clearInterval(fetchInterval);
    };
  }, [fetchData, recordStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">监控中心</h1>

      <ResourceHistory
        currentRange={timeRange}
        onTimeRangeChange={setTimeRange}
        stats={stats}
      />

      <MonitorCharts
        cpuData={monitorData.cpuData}
        memoryData={monitorData.memoryData}
        diskReadData={monitorData.diskReadData}
        diskWriteData={monitorData.diskWriteData}
        netInData={monitorData.netInData}
        netOutData={monitorData.netOutData}
        timeLabels={monitorData.timeLabels}
      />
    </div>
  );
}
