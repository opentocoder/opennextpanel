"use client";

import { useState } from "react";
import { LineChart } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrafficChartProps {
  data: {
    time: string[];
    upload: number[];
    download: number[];
  };
  totalSent: number;
  totalReceived: number;
  currentUpload: number;
  currentDownload: number;
}

export function TrafficChart({
  data,
  totalSent,
  totalReceived,
  currentUpload,
  currentDownload,
}: TrafficChartProps) {
  const [tab, setTab] = useState<"traffic" | "disk">("traffic");

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <button
            className={`text-sm font-medium pb-1 border-b-2 ${
              tab === "traffic"
                ? "text-green-600 border-green-600"
                : "text-gray-500 border-transparent"
            }`}
            onClick={() => setTab("traffic")}
          >
            流量
          </button>
          <button
            className={`text-sm font-medium pb-1 border-b-2 ${
              tab === "disk"
                ? "text-green-600 border-green-600"
                : "text-gray-500 border-transparent"
            }`}
            onClick={() => setTab("disk")}
          >
            磁盘IO
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">网卡</span>
          <Select defaultValue="all">
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有</SelectItem>
              <SelectItem value="eth0">eth0</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-gray-600">上行</span>
          <span className="font-medium">{(currentUpload ?? 0).toFixed(2)} KB</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span className="text-gray-600">下行</span>
          <span className="font-medium">{(currentDownload ?? 0).toFixed(2)} KB</span>
        </div>
        <div className="text-gray-500">
          已发送 <span className="text-gray-700">{((totalSent ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div className="text-gray-500">
          已接收 <span className="text-gray-700">{((totalReceived ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>

      <LineChart
        data={{
          time: data?.time ?? [],
          series: [
            { name: "上行", data: data?.upload ?? [], color: "#22c55e" },
            { name: "下行", data: data?.download ?? [], color: "#f97316" },
          ],
        }}
        yAxisUnit=" KB/s"
        height={180}
      />
    </div>
  );
}
