"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface DockerApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  image: string;
  ports: string[];
  installed: boolean;
}

interface DockerStoreProps {
  apps: DockerApp[];
  onInstall: (app: DockerApp) => void;
}

export function DockerStore({ apps, onInstall }: DockerStoreProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = [
    { id: "all", name: "全部" },
    { id: "web", name: "Web服务" },
    { id: "database", name: "数据库" },
    { id: "cache", name: "缓存" },
    { id: "tools", name: "工具" },
  ];

  const filteredApps = apps.filter((app) => {
    const matchSearch =
      !search ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "all" || app.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={category === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.id)}
              className={category === cat.id ? "bg-green-600" : ""}
            >
              {cat.name}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <Input
            placeholder="搜索应用..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredApps.map((app) => (
          <Card key={app.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{app.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {app.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                  {app.image}
                </span>
                {app.installed ? (
                  <Button variant="outline" size="sm" disabled>
                    已安装
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onInstall(app)}
                  >
                    安装
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12 text-gray-500">没有找到匹配的应用</div>
      )}
    </div>
  );
}
