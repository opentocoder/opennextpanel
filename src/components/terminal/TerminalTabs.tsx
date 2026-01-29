"use client";

import { Plus, X, Terminal } from "lucide-react";

interface Tab {
  id: string;
  title: string;
  active: boolean;
}

interface TerminalTabsProps {
  tabs: Tab[];
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export function TerminalTabs({
  tabs,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: TerminalTabsProps) {
  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700">
      <div className="flex-1 flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-gray-700 min-w-[120px] max-w-[200px] ${
              tab.active
                ? "bg-[#1e1e1e] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <Terminal size={14} />
            <span className="flex-1 truncate text-sm">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                className="hover:bg-gray-600 rounded p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700"
        onClick={onNewTab}
        title="新建终端"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
