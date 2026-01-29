import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import * as dockerService from "@/lib/system/docker";

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "containers";

    // Check if Docker is available
    const dockerAvailable = await dockerService.isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json(
        {
          error: "Docker is not available",
          containers: [],
          images: [],
          stats: null
        },
        { status: 503 }
      );
    }

    if (type === "containers") {
      const containers = await dockerService.listContainers();
      return NextResponse.json({ containers });
    } else if (type === "images") {
      const images = await dockerService.listImages();
      return NextResponse.json({ images });
    } else if (type === "stats") {
      const stats = await dockerService.getDockerStats();
      return NextResponse.json({ stats });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch Docker data:", error);
    return NextResponse.json(
      { error: `Failed to fetch Docker data: ${error}` },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, containerId, imageId, imageName, containerName, ports, env } = body;

    // Check if Docker is available
    const dockerAvailable = await dockerService.isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json(
        { error: "Docker is not available" },
        { status: 503 }
      );
    }

    switch (action) {
      case "start":
        await dockerService.startContainer(containerId);
        return NextResponse.json({
          success: true,
          message: `Container ${containerId} started`,
        });

      case "stop":
        await dockerService.stopContainer(containerId);
        return NextResponse.json({
          success: true,
          message: `Container ${containerId} stopped`,
        });

      case "restart":
        await dockerService.restartContainer(containerId);
        return NextResponse.json({
          success: true,
          message: `Container ${containerId} restarted`,
        });

      case "delete":
        await dockerService.removeContainer(containerId, true);
        return NextResponse.json({
          success: true,
          message: `Container ${containerId} deleted`,
        });

      case "logs":
        const logs = await dockerService.getContainerLogs(containerId);
        return NextResponse.json({
          success: true,
          logs,
        });

      case "pull":
        await dockerService.pullImage(imageName);
        return NextResponse.json({
          success: true,
          message: `Image ${imageName} pulled successfully`,
        });

      case "delete_image":
        await dockerService.removeImage(imageId, true);
        return NextResponse.json({
          success: true,
          message: `Image ${imageId} deleted`,
        });

      case "create":
        const newContainerId = await dockerService.createContainer(
          imageName,
          containerName,
          ports,
          env
        );
        return NextResponse.json({
          success: true,
          message: `Container ${containerName} created`,
          containerId: newContainerId,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to execute Docker action:", error);
    return NextResponse.json(
      { error: `Failed to execute Docker action: ${error}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
