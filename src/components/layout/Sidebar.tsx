"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Globe,
  Database,
  Container,
  Activity,
  Shield,
  ShieldAlert,
  FolderOpen,
  FileText,
  Terminal,
  Server,
  Clock,
  Package,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  HardDrive,
  Mail,
  Layers,
  FileCheck,
} from "lucide-react";

const menuItems = [
  { icon: Home, label: "首页", href: "/" },
  { icon: Globe, label: "网站", href: "/sites" },
  { icon: Database, label: "数据库", href: "/database" },
  { icon: Container, label: "Docker", href: "/docker" },
  { icon: Activity, label: "监控", href: "/monitor" },
  { icon: BarChart3, label: "网站报表", href: "/reports" },
  { icon: Shield, label: "安全", href: "/security" },
  { icon: ShieldAlert, label: "WAF", href: "/waf" },
  { icon: FileCheck, label: "防篡改", href: "/tamper" },
  { icon: Users, label: "用户管理", href: "/users" },
  { icon: FolderOpen, label: "文件", href: "/files" },
  { icon: HardDrive, label: "磁盘", href: "/disk" },
  { icon: FileText, label: "日志", href: "/logs" },
  { icon: Terminal, label: "终端", href: "/terminal" },
  { icon: Mail, label: "邮局", href: "/mail" },
  { icon: Layers, label: "WordPress", href: "/wordpress" },
  { icon: Server, label: "节点管理", href: "/nodes" },
  { icon: Clock, label: "计划任务", href: "/cron" },
  { icon: Package, label: "软件商店", href: "/software" },
  { icon: Settings, label: "设置", href: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // 即使失败也跳转到登录页
      router.push("/login");
    }
  };

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <span className="text-lg font-bold text-green-600">OpenPanel</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-green-50 text-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon size={20} />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">退出</span>}
        </button>
      </div>
    </aside>
  );
}
