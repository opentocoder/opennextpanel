"use client";

import { Bell, MessageSquare, RefreshCw, Wrench, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  systemInfo?: {
    os: string;
    version: string;
    hostname: string;
  };
  user?: {
    username: string;
    phone?: string;
  };
}

export function Header({ systemInfo, user }: HeaderProps) {
  const currentTime = new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User size={16} className="text-gray-500" />
          <span className="text-gray-700">{user?.phone || user?.username || "管理员"}</span>
        </div>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-sm text-gray-500">{systemInfo?.os || "Linux"}</span>
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
          企业版
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <MessageSquare size={18} />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <span className="text-sm text-gray-500">{currentTime}</span>
        <span className="text-xs text-gray-400">|</span>
        <span className="text-sm text-gray-700">v1.0.0</span>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <RefreshCw size={14} className="mr-1" />
            更新
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Wrench size={14} className="mr-1" />
            修复
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs text-orange-600 border-orange-300 hover:bg-orange-50">
            <RotateCcw size={14} className="mr-1" />
            重启
          </Button>
        </div>
      </div>
    </header>
  );
}
