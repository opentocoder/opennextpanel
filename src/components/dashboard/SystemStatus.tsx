"use client";

import { GaugeChart } from "@/components/common";

interface SystemStatusProps {
  load: number;
  cpu: number;
  memory: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
}

export function SystemStatus({ load, cpu, memory, disk }: SystemStatusProps) {
  const getStatusText = (value: number) => {
    if (value < 30) return "运行流畅";
    if (value < 70) return "正常运行";
    return "负载较高";
  };

  const getColor = (value: number) => {
    if (value < 50) return "#22c55e";
    if (value < 80) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="grid grid-cols-4 gap-4">
        <GaugeChart
          value={load}
          title="负载状态"
          subtitle={getStatusText(load)}
          color={getColor(load)}
        />
        <GaugeChart
          value={cpu}
          title="CPU"
          subtitle="使用率"
          color={getColor(cpu)}
        />
        <GaugeChart
          value={memory.percent}
          title="内存"
          subtitle={`${(memory.used / 1024).toFixed(0)}MB / ${(memory.total / 1024).toFixed(0)}MB`}
          color={getColor(memory.percent)}
        />
        <GaugeChart
          value={disk.percent}
          title="磁盘"
          subtitle={`${(disk.used / 1024 / 1024 / 1024).toFixed(1)}GB / ${(disk.total / 1024 / 1024 / 1024).toFixed(1)}GB`}
          color={getColor(disk.percent)}
        />
      </div>
    </div>
  );
}
