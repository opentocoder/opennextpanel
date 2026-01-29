"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye, Users, Globe, TrendingUp, Calendar } from "lucide-react";

interface SiteStats {
  siteId: number;
  siteName: string;
  domain: string;
  pv: number;
  uv: number;
  ip: number;
  bandwidth: number;
}

interface DailyStats {
  date: string;
  pv: number;
  uv: number;
  ip: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totals, setTotals] = useState({ pv: 0, uv: 0, ip: 0, bandwidth: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reports?period=" + period);
        const data = await res.json();
        if (data.siteStats) setSiteStats(data.siteStats);
        if (data.dailyStats) setDailyStats(data.dailyStats);
        if (data.totals) setTotals(data.totals);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
        setSiteStats([]);
        setDailyStats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const getRankColor = (index: number) => {
    if (index === 0) return "bg-yellow-100 text-yellow-700";
    if (index === 1) return "bg-gray-100 text-gray-700";
    if (index === 2) return "bg-orange-100 text-orange-700";
    return "bg-gray-50 text-gray-500";
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold">网站报表</h1>
        </div>
        <div className="flex gap-2">
          <Button variant={period === "today" ? "default" : "outline"} size="sm" onClick={() => setPeriod("today")}>今日</Button>
          <Button variant={period === "week" ? "default" : "outline"} size="sm" onClick={() => setPeriod("week")}>本周</Button>
          <Button variant={period === "month" ? "default" : "outline"} size="sm" onClick={() => setPeriod("month")}>本月</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">页面浏览量 (PV)</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pv.toLocaleString()}</div>
            <p className="text-xs text-green-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+12.5%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">独立访客 (UV)</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.uv.toLocaleString()}</div>
            <p className="text-xs text-green-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+8.3%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">独立IP</CardTitle>
            <Globe className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.ip.toLocaleString()}</div>
            <p className="text-xs text-green-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+5.2%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">流量消耗</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totals.bandwidth / 1024).toFixed(1)} GB</div>
            <p className="text-xs text-gray-500">本期累计</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>访问趋势</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400">
              {dailyStats.length > 0 ? (
                <div className="w-full space-y-2">
                  {dailyStats.slice(0, 7).map((day) => {
                    const maxPv = Math.max(...dailyStats.map(d => d.pv), 1);
                    const width = Math.min(100, (day.pv / maxPv * 100));
                    return (
                      <div key={day.date} className="flex items-center gap-2">
                        <span className="w-20 text-sm text-gray-500">{day.date.slice(5)}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4">
                          <div className="bg-blue-500 h-4 rounded-full" style={{ width: width + "%" }}></div>
                        </div>
                        <span className="w-16 text-sm text-right">{day.pv}</span>
                      </div>
                    );
                  })}
                </div>
              ) : "暂无数据"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>网站排行</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {siteStats.length > 0 ? siteStats.slice(0, 5).map((site, index) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankColor(index)}`}>{index + 1}</span>
                    <div>
                      <p className="font-medium">{site.siteName}</p>
                      <p className="text-xs text-gray-500">{site.domain}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{site.pv.toLocaleString()} PV</p>
                    <p className="text-xs text-gray-500">{site.uv.toLocaleString()} UV</p>
                  </div>
                </div>
              )) : (<div className="text-center text-gray-400 py-8">暂无网站数据</div>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
