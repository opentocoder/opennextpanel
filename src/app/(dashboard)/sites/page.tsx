"use client";

import { useState, useEffect } from "react";
import { SiteList, SiteSettings, AddSiteDialog } from "@/components/sites";
import { ConfirmDialog } from "@/components/common";

interface Site {
  id: number;
  name: string;
  domain: string;
  status: "running" | "stopped";
  backupCount: number;
  rootPath: string;
  proxyUrl?: string | null;
  diskUsage: number;
  diskLimit: number;
  expireDate: string;
  remark: string;
  phpVersion: string;
  sslStatus: "deployed" | "not_deployed" | "expired";
  sslExpireDays?: number;
  createdAt?: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites");
      const data = await res.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error("Failed to fetch sites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async () => {
    // AddSiteDialog 已经处理了 API 调用，这里只需要刷新列表
    fetchSites();
  };

  const handleEditSite = (site: Site) => {
    setSelectedSite(site);
    setSettingsOpen(true);
  };

  const handleDeleteSite = (site: Site) => {
    setSelectedSite(site);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSite) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${selectedSite.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        fetchSites();
        setDeleteDialogOpen(false);
        setSelectedSite(null);
      } else {
        alert(`删除失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error("Failed to delete site:", error);
      alert("删除失败: 网络错误");
    } finally {
      setDeleting(false);
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
      <SiteList
        sites={sites}
        onAddSite={() => setAddDialogOpen(true)}
        onEditSite={handleEditSite}
        onDeleteSite={handleDeleteSite}
      />

      <AddSiteDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddSite}
      />

      <SiteSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        site={selectedSite}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除站点"
        description={`确定要删除站点 "${selectedSite?.name}" 吗？此操作不可恢复。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
