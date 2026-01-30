"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthCheck } from "@/hooks/useAuthCheck";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // 全局认证检查：每60秒检查一次，切换窗口时也检查
  useAuthCheck(60000);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
