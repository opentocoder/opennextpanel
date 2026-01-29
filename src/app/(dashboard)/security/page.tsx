"use client";

import { useState, useEffect, useCallback } from "react";
import { SecurityOverview, SecuritySettings } from "@/components/security";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface LoginRecord {
  id: number;
  username: string;
  ip: string;
  status: "success" | "failed";
  time: string;
  location: string;
}

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

interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
}

interface SecuritySettingsData {
  sshPort: number;
  panelPort: number;
  securityPath: string;
  firewallEnabled: boolean;
  ipWhitelist: string[];
  ipBlacklist: string[];
}

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SecurityStats>({
    riskLevel: "low",
    totalRisks: 0,
    sshPort: 22,
    panelPort: 8888,
    securityPath: "",
    firewallEnabled: true,
    failedLogins: 0,
    blockedIps: 0,
  });
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [settings, setSettings] = useState<SecuritySettingsData>({
    sshPort: 22,
    panelPort: 8888,
    securityPath: "",
    firewallEnabled: true,
    ipWhitelist: [],
    ipBlacklist: [],
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, recordsRes, settingsRes] = await Promise.all([
        fetch("/api/security?action=stats"),
        fetch("/api/security?action=records"),
        fetch("/api/security?action=settings"),
      ]);

      const statsData = await statsRes.json();
      const recordsData = await recordsRes.json();
      const settingsData = await settingsRes.json();

      if (statsData.stats) {
        setStats(statsData.stats);
      }
      if (statsData.riskItems) {
        setRiskItems(statsData.riskItems);
      }
      if (recordsData.records) {
        setLoginRecords(recordsData.records);
      }
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }
    } catch (error) {
      console.error("Failed to fetch security data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async (newSettings: SecuritySettingsData) => {
    try {
      const response = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", settings: newSettings }),
      });

      const data = await response.json();

      // Show detailed results for each setting
      if (data.results && data.results.length > 0) {
        const messages = data.results.map((r: { field: string; success: boolean; message: string }) =>
          `${r.field}: ${r.success ? "✓" : "✗"} ${r.message}`
        ).join("\n");
        alert(messages);
      } else if (data.success) {
        alert("设置已保存");
      } else {
        alert("保存失败: " + (data.error || data.message || "未知错误"));
      }

      // Refresh data to get updated state
      fetchData();
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("保存失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">安全中心</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">安全概览</TabsTrigger>
          <TabsTrigger value="settings">安全设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SecurityOverview stats={stats} riskItems={riskItems} loginRecords={loginRecords} />
        </TabsContent>

        <TabsContent value="settings">
          <SecuritySettings settings={settings} onSave={handleSaveSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
