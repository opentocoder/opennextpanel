"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface SecurityStats {
  riskLevel: "low" | "medium" | "high";
  totalRisks: number;
  sshPort: number;
  panelPort: number;
  securityPath: string;
  firewallEnabled: boolean;
  failedLogins: number;
  blockedIps: number;
}

interface LoginRecord {
  id: number;
  username: string;
  ip: string;
  status: "success" | "failed";
  time: string;
  location: string;
}

interface SecurityOverviewProps {
  stats: SecurityStats;
  loginRecords: LoginRecord[];
}

export function SecurityOverview({ stats, loginRecords }: SecurityOverviewProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low":
        return <ShieldCheck className="h-8 w-8 text-green-600" />;
      case "medium":
        return <Shield className="h-8 w-8 text-yellow-600" />;
      case "high":
        return <ShieldAlert className="h-8 w-8 text-red-600" />;
      default:
        return <Shield className="h-8 w-8 text-gray-600" />;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low":
        return "安全";
      case "medium":
        return "中等风险";
      case "high":
        return "高风险";
      default:
        return "未知";
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">安全状态</p>
                <p className={`text-xl font-bold ${getRiskColor(stats.riskLevel).split(" ")[0]}`}>
                  {getRiskLabel(stats.riskLevel)}
                </p>
              </div>
              {getRiskIcon(stats.riskLevel)}
            </div>
            {stats.totalRisks > 0 && (
              <p className="text-xs text-red-500 mt-2">
                发现 {stats.totalRisks} 个安全风险
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">SSH端口</p>
                <p className="text-xl font-bold">{stats.sshPort}</p>
              </div>
              <Key className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.sshPort === 22 ? "建议修改默认端口" : "已修改默认端口"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">面板端口</p>
                <p className="text-xl font-bold">{stats.panelPort}</p>
              </div>
              <Lock className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2 truncate">
              入口: {stats.securityPath}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">防火墙</p>
                <p className="text-xl font-bold">
                  {stats.firewallEnabled ? "已启用" : "未启用"}
                </p>
              </div>
              {stats.firewallEnabled ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              已拦截 {stats.blockedIps} 个IP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Login Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">登录记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">用户</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">IP地址</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">状态</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">时间</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">位置</th>
                </tr>
              </thead>
              <tbody>
                {loginRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="py-2">{record.username}</td>
                    <td className="py-2 font-mono text-sm">{record.ip}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          record.status === "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {record.status === "success" ? "成功" : "失败"}
                      </span>
                    </td>
                    <td className="py-2 text-sm text-gray-500">{record.time}</td>
                    <td className="py-2 text-sm text-gray-500">{record.location}</td>
                  </tr>
                ))}
                {loginRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      暂无登录记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
