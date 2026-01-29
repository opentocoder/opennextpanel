"use client";

import Link from "next/link";
import { Globe, Database, Server, AlertTriangle, FileText } from "lucide-react";

interface OverviewCardsProps {
  sites: number;
  databases: number;
  ftps: number;
  risks: number;
  memo?: string;
  onMemoChange?: (memo: string) => void;
}

export function OverviewCards({
  sites,
  databases,
  ftps,
  risks,
  memo = "",
  onMemoChange,
}: OverviewCardsProps) {
  const cards = [
    { icon: Globe, label: "网站", value: sites, href: "/sites", color: "text-blue-600" },
    { icon: Database, label: "数据库", value: databases, href: "/database", color: "text-green-600" },
    { icon: Server, label: "FTP", value: ftps, href: "/ftp", color: "text-purple-600" },
    { icon: AlertTriangle, label: "安全风险", value: risks, href: "/security", color: risks > 0 ? "text-orange-600" : "text-gray-400" },
  ];

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">概览</h3>
      <div className="grid grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <card.icon className={`${card.color}`} size={24} />
            <div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </Link>
        ))}
        <div className="p-3 rounded-lg border border-dashed">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">备忘录</span>
          </div>
          <textarea
            value={memo}
            onChange={(e) => onMemoChange?.(e.target.value)}
            placeholder="点击编辑..."
            className="w-full text-xs text-gray-600 bg-transparent resize-none outline-none h-12"
          />
        </div>
      </div>
    </div>
  );
}
