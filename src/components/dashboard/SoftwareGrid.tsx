"use client";

import { Play, Settings } from "lucide-react";

interface Software {
  id: number;
  name: string;
  title: string;
  version?: string;
  status: "running" | "stopped" | "not_installed";
  icon?: string;
}

interface SoftwareGridProps {
  software: Software[];
}

export function SoftwareGrid({ software }: SoftwareGridProps) {
  const getStatusColor = (status: Software["status"]) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-600";
      case "stopped":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">软件</h3>
      <div className="grid grid-cols-4 gap-3">
        {software.slice(0, 8).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:border-green-300 hover:bg-green-50 transition cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(item.status)}`}>
              <span className="text-lg font-bold">{item.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">{item.title}</div>
              <div className="text-xs text-gray-500">{item.version || "-"}</div>
            </div>
            {item.status === "running" && (
              <Play size={14} className="text-green-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
