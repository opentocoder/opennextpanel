"use client";

import { useState, useEffect } from "react";
import { ContainerList, ImageList, DockerStore } from "@/components/docker";
import { ConfirmDialog } from "@/components/common";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "exited";
  ports: string;
  created: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: string;
}

export default function DockerPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] =
    useState<DockerContainer | null>(null);
  const [selectedImage, setSelectedImage] = useState<DockerImage | null>(null);
  const [pullImageName, setPullImageName] = useState("");

  const dockerApps = [
    {
      id: "1",
      name: "Nginx",
      description: "高性能HTTP和反向代理服务器",
      icon: "🌐",
      category: "web",
      image: "nginx:latest",
      ports: ["80", "443"],
      installed: true,
    },
    {
      id: "2",
      name: "MySQL",
      description: "流行的关系型数据库管理系统",
      icon: "🗄️",
      category: "database",
      image: "mysql:8.0",
      ports: ["3306"],
      installed: true,
    },
    {
      id: "3",
      name: "Redis",
      description: "高性能键值存储数据库",
      icon: "📦",
      category: "cache",
      image: "redis:alpine",
      ports: ["6379"],
      installed: false,
    },
    {
      id: "4",
      name: "PostgreSQL",
      description: "强大的开源关系型数据库",
      icon: "🐘",
      category: "database",
      image: "postgres:15",
      ports: ["5432"],
      installed: false,
    },
    {
      id: "5",
      name: "MongoDB",
      description: "流行的NoSQL文档数据库",
      icon: "🍃",
      category: "database",
      image: "mongo:latest",
      ports: ["27017"],
      installed: false,
    },
    {
      id: "6",
      name: "Portainer",
      description: "Docker可视化管理工具",
      icon: "🐳",
      category: "tools",
      image: "portainer/portainer-ce",
      ports: ["9000"],
      installed: false,
    },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [containersRes, imagesRes] = await Promise.all([
        fetch("/api/docker?type=containers"),
        fetch("/api/docker?type=images"),
      ]);
      const containersData = await containersRes.json();
      const imagesData = await imagesRes.json();
      setContainers(containersData.containers || []);
      setImages(imagesData.images || []);
    } catch (error) {
      console.error("Failed to fetch Docker data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (
    action: string,
    container: DockerContainer
  ) => {
    try {
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, containerId: container.id }),
      });
      fetchData();
    } catch (error) {
      console.error(`Failed to ${action} container:`, error);
    }
  };

  const handleDeleteContainer = async () => {
    if (!selectedContainer) return;
    await handleContainerAction("delete", selectedContainer);
    setDeleteDialogOpen(false);
    setSelectedContainer(null);
  };

  const handlePullImage = async () => {
    if (!pullImageName) return;
    try {
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", imageName: pullImageName }),
      });
      fetchData();
      setPullDialogOpen(false);
      setPullImageName("");
    } catch (error) {
      console.error("Failed to pull image:", error);
    }
  };

  const handleDeleteImage = async (image: DockerImage) => {
    try {
      await fetch("/api/docker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_image", imageId: image.id }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  const handleInstallApp = (app: any) => {
    alert(`安装应用: ${app.name}\n镜像: ${app.image}`);
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
      <h1 className="text-2xl font-bold mb-6">Docker管理</h1>

      <Tabs defaultValue="containers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="containers">容器</TabsTrigger>
          <TabsTrigger value="images">镜像</TabsTrigger>
          <TabsTrigger value="store">应用商店</TabsTrigger>
        </TabsList>

        <TabsContent value="containers">
          <ContainerList
            containers={containers}
            onStart={(c) => handleContainerAction("start", c)}
            onStop={(c) => handleContainerAction("stop", c)}
            onRestart={(c) => handleContainerAction("restart", c)}
            onDelete={(c) => {
              setSelectedContainer(c);
              setDeleteDialogOpen(true);
            }}
            onLogs={(c) => alert(`查看日志: ${c.name}`)}
            onTerminal={(c) => alert(`打开终端: ${c.name}`)}
          />
        </TabsContent>

        <TabsContent value="images">
          <ImageList
            images={images}
            onPull={() => setPullDialogOpen(true)}
            onRun={(i) => alert(`创建容器: ${i.repository}:${i.tag}`)}
            onDelete={handleDeleteImage}
          />
        </TabsContent>

        <TabsContent value="store">
          <DockerStore apps={dockerApps} onInstall={handleInstallApp} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除容器"
        description={`确定要删除容器 "${selectedContainer?.name}" 吗？此操作不可恢复。`}
        onConfirm={handleDeleteContainer}
        confirmText="删除"
        variant="destructive"
      />

      <Dialog open={pullDialogOpen} onOpenChange={setPullDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拉取镜像</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                镜像名称
              </label>
              <Input
                placeholder="例如: nginx:latest"
                value={pullImageName}
                onChange={(e) => setPullImageName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handlePullImage}
            >
              拉取
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
