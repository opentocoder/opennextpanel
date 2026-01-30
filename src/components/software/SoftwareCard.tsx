"use client";

import { Button } from "@/components/ui/button";
import { Download, Settings, Trash2, Play, Square, ExternalLink, Globe } from "lucide-react";

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
  webUrl?: string;  // Web 访问地址，如 ":8082" 表示当前主机的 8082 端口
}

interface SoftwareCardProps {
  software: Software;
  onInstall: (software: Software) => void;
  onUninstall: (software: Software) => void;
  onStart: (software: Software) => void;
  onStop: (software: Software) => void;
  onSettings: (software: Software) => void;
}

export function SoftwareCard({
  software,
  onInstall,
  onUninstall,
  onStart,
  onStop,
  onSettings,
}: SoftwareCardProps) {
  const isInstalled = software.status !== "not_installed";
  const isRunning = software.status === "running";

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition bg-white">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
          {software.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{software.name}</h3>
            <span className="text-xs text-gray-500">{software.version}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {software.description}
          </p>

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            {isInstalled ? (
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  isRunning
                    ? "bg-green-100 text-green-700"
                    : software.status === "installed"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isRunning ? (
                  <>
                    <Play size={10} /> 运行中
                  </>
                ) : software.status === "installed" ? (
                  "已安装"
                ) : (
                  <>
                    <Square size={10} /> 已停止
                  </>
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-400">未安装</span>
            )}
            {software.size && (
              <span className="text-xs text-gray-400">{software.size}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t">
        <div className="flex items-center gap-1">
          {isInstalled ? (
            <>
              {/* Web 访问按钮 */}
              {software.webUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = software.webUrl!.startsWith(":")
                      ? `${window.location.protocol}//${window.location.hostname}${software.webUrl}`
                      : software.webUrl;
                    window.open(url, "_blank");
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Globe size={14} className="mr-1" />
                  打开
                </Button>
              )}
              {/* 只有服务型软件才显示启动/停止按钮 */}
              {software.status !== "installed" && (
                isRunning ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStop(software)}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <Square size={14} className="mr-1" />
                    停止
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStart(software)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Play size={14} className="mr-1" />
                    启动
                  </Button>
                )
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSettings(software)}
              >
                <Settings size={14} />
              </Button>
              {!software.systemRequired && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUninstall(software)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onInstall(software)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download size={14} className="mr-1" />
              安装
            </Button>
          )}
        </div>

        {software.homepage && (
          <a
            href={software.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
