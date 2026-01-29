"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HardDrive, RefreshCw, Database, Trash2, Plus } from "lucide-react";

interface DiskInfo {
  device: string;
  mountPoint: string;
  fsType: string;
  size: number;
  used: number;
  available: number;
  usePercent: number;
}

interface Partition {
  device: string;
  size: number;
  type: string;
  mounted: boolean;
  mountPoint: string;
}

export default function DiskPage() {
  const [loading, setLoading] = useState(true);
  const [disks, setDisks] = useState<DiskInfo[]>([]);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/disk");
        const data = await res.json();
        if (data.disks) {
          setDisks(data.disks);
          const total = data.disks.reduce((sum: number, d: DiskInfo) => sum + d.size, 0);
          const used = data.disks.reduce((sum: number, d: DiskInfo) => sum + d.used, 0);
          setTotalSize(total);
          setTotalUsed(used);
        }
        if (data.partitions) setPartitions(data.partitions);
      } catch (error) {
        console.error("Failed to fetch disk data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(1) + " TB";
    if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB";
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-purple-500" />
          <h1 className="text-2xl font-bold">磁盘管理</h1>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4 mr-2" />刷新</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总容量</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatSize(totalSize)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已使用</CardTitle>
            <Database className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{formatSize(totalUsed)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">使用率</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSize > 0 ? ((totalUsed / totalSize) * 100).toFixed(1) : 0}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className={`h-2 rounded-full ${getUsageColor(totalSize > 0 ? (totalUsed / totalSize) * 100 : 0)}`} style={{ width: (totalSize > 0 ? (totalUsed / totalSize) * 100 : 0) + "%" }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>挂载点</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备</TableHead>
                <TableHead>挂载点</TableHead>
                <TableHead>文件系统</TableHead>
                <TableHead>容量</TableHead>
                <TableHead>已用</TableHead>
                <TableHead>可用</TableHead>
                <TableHead>使用率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disks.map((disk, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono">{disk.device}</TableCell>
                  <TableCell className="font-mono">{disk.mountPoint}</TableCell>
                  <TableCell>{disk.fsType}</TableCell>
                  <TableCell>{formatSize(disk.size)}</TableCell>
                  <TableCell>{formatSize(disk.used)}</TableCell>
                  <TableCell>{formatSize(disk.available)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${getUsageColor(disk.usePercent)}`} style={{ width: disk.usePercent + "%" }}></div>
                      </div>
                      <span className="text-sm">{disk.usePercent}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {disks.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">无法获取磁盘信息</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>分区管理</CardTitle>
          <Button size="sm" disabled><Plus className="w-4 h-4 mr-2" />添加分区</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>设备</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partitions.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono">{p.device}</TableCell>
                  <TableCell>{formatSize(p.size)}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${p.mounted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {p.mounted ? "已挂载" : "未挂载"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" disabled>{p.mounted ? "卸载" : "挂载"}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {partitions.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">无分区信息</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
