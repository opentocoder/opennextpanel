"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu, HardDrive, MemoryStick, Network } from "lucide-react";

interface ResourceHistoryProps {
  onTimeRangeChange: (range: string) => void;
  currentRange: string;
  stats: {
    cpuAvg: number;
    cpuMax: number;
    memoryAvg: number;
    memoryMax: number;
    diskReadAvg: number;
    diskWriteAvg: number;
    netInTotal: number;
    netOutTotal: number;
  };
}

export function ResourceHistory({
  onTimeRangeChange,
  currentRange,
  stats,
}: ResourceHistoryProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">资源统计</h2>
        <Select value={currentRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">最近1小时</SelectItem>
            <SelectItem value="6h">最近6小时</SelectItem>
            <SelectItem value="24h">最近24小时</SelectItem>
            <SelectItem value="7d">最近7天</SelectItem>
            <SelectItem value="30d">最近30天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cpuAvg.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">
              平均使用率 | 峰值: {stats.cpuMax.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">内存</CardTitle>
            <MemoryStick className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.memoryAvg.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              平均使用率 | 峰值: {stats.memoryMax.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">磁盘IO</CardTitle>
            <HardDrive className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.diskReadAvg.toFixed(1)} MB/s
            </div>
            <p className="text-xs text-gray-500">
              读取 | 写入: {stats.diskWriteAvg.toFixed(1)} MB/s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">网络流量</CardTitle>
            <Network className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.netInTotal)}
            </div>
            <p className="text-xs text-gray-500">
              入站 | 出站: {formatBytes(stats.netOutTotal)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
