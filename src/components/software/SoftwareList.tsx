"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SoftwareCard } from "./SoftwareCard";

interface Software {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  status: "installed" | "running" | "stopped" | "not_installed";
  size?: string;
  homepage?: string;
  systemRequired?: boolean;
}

interface SoftwareListProps {
  software: Software[];
  onInstall: (software: Software) => void;
  onUninstall: (software: Software) => void;
  onStart: (software: Software) => void;
  onStop: (software: Software) => void;
  onSettings: (software: Software) => void;
}

const categories = [
  { id: "all", label: "全部" },
  { id: "installed", label: "已安装" },
  { id: "runtime", label: "运行环境" },
  { id: "webserver", label: "Web服务" },
  { id: "database", label: "数据库" },
  { id: "tools", label: "系统工具" },
  { id: "security", label: "安全防护" },
  { id: "cache", label: "缓存队列" },
];

export function SoftwareList({
  software,
  onInstall,
  onUninstall,
  onStart,
  onStop,
  onSettings,
}: SoftwareListProps) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredSoftware = software.filter((s) => {
    // Category filter
    if (category === "installed") {
      if (s.status === "not_installed") return false;
    } else if (category !== "all") {
      if (s.category !== category) return false;
    }

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const installedCount = software.filter((s) => s.status !== "not_installed").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.label}
                {cat.id === "installed" && (
                  <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 rounded-full">
                    {installedCount}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="搜索软件..."
            className="pl-9 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSoftware.map((s) => (
          <SoftwareCard
            key={s.id}
            software={s}
            onInstall={onInstall}
            onUninstall={onUninstall}
            onStart={onStart}
            onStop={onStop}
            onSettings={onSettings}
          />
        ))}
      </div>

      {filteredSoftware.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          没有找到匹配的软件
        </div>
      )}
    </div>
  );
}
