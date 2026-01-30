/**
 * Docker Service - Real Docker API Integration
 * Uses dockerode to interact with Docker daemon
 */

import Docker from "dockerode";

// Initialize Docker client
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// OpenNextPanel shared network name
const OPENPANEL_NETWORK = "opennextpanel-network";

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "exited" | "paused" | "restarting";
  ports: string;
  created: string;
  cpuUsage: number;
  memoryUsage: number;
}

export interface ImageInfo {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: string;
}

export interface DockerStats {
  containersRunning: number;
  containersStopped: number;
  imagesCount: number;
  totalMemory: number;
}

/**
 * List all containers
 */
export async function listContainers(): Promise<ContainerInfo[]> {
  try {
    const containers = await docker.listContainers({ all: true });
    const result: ContainerInfo[] = [];

    for (const container of containers) {
      // Map Docker status to our simplified status
      let status: ContainerInfo["status"] = "stopped";
      const state = container.State?.toLowerCase() || "";
      if (state === "running") status = "running";
      else if (state === "exited") status = "exited";
      else if (state === "paused") status = "paused";
      else if (state === "restarting") status = "restarting";

      // Format ports
      const ports = container.Ports?.map((p) => {
        if (p.PublicPort && p.PrivatePort) {
          return `${p.PublicPort}:${p.PrivatePort}`;
        }
        return `${p.PrivatePort}`;
      }).join(", ") || "";

      // Get CPU and memory usage for running containers
      let cpuUsage = 0;
      let memoryUsage = 0;

      if (status === "running") {
        try {
          const containerObj = docker.getContainer(container.Id);
          const stats = await containerObj.stats({ stream: false });

          // Calculate CPU percentage
          const cpuDelta =
            stats.cpu_stats.cpu_usage.total_usage -
            stats.precpu_stats.cpu_usage.total_usage;
          const systemDelta =
            stats.cpu_stats.system_cpu_usage -
            stats.precpu_stats.system_cpu_usage;
          const cpuCount = stats.cpu_stats.online_cpus || 1;

          if (systemDelta > 0) {
            cpuUsage = (cpuDelta / systemDelta) * cpuCount * 100;
          }

          // Memory usage in MB
          memoryUsage = Math.round(stats.memory_stats.usage / (1024 * 1024));
        } catch {
          // Stats not available, use defaults
        }
      }

      result.push({
        id: container.Id.substring(0, 12),
        name: container.Names?.[0]?.replace(/^\//, "") || "unknown",
        image: container.Image,
        status,
        ports,
        created: new Date(container.Created * 1000).toISOString().replace("T", " ").substring(0, 19),
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsage,
      });
    }

    return result;
  } catch (error) {
    console.error("Failed to list containers:", error);
    throw new Error(`Failed to list containers: ${error}`);
  }
}

/**
 * List all images
 */
export async function listImages(): Promise<ImageInfo[]> {
  try {
    const images = await docker.listImages();
    return images.map((image) => {
      const repoTag = image.RepoTags?.[0] || "<none>:<none>";
      const [repository, tag] = repoTag.split(":");

      return {
        id: image.Id.substring(0, 19),
        repository: repository || "<none>",
        tag: tag || "<none>",
        size: image.Size,
        created: new Date(image.Created * 1000).toISOString().split("T")[0],
      };
    });
  } catch (error) {
    console.error("Failed to list images:", error);
    throw new Error(`Failed to list images: ${error}`);
  }
}

/**
 * Get Docker system stats
 */
export async function getDockerStats(): Promise<DockerStats> {
  try {
    const info = await docker.info();
    return {
      containersRunning: info.ContainersRunning || 0,
      containersStopped: info.ContainersStopped || 0,
      imagesCount: info.Images || 0,
      totalMemory: info.MemTotal || 0,
    };
  } catch (error) {
    console.error("Failed to get Docker stats:", error);
    throw new Error(`Failed to get Docker stats: ${error}`);
  }
}

/**
 * Start a container
 */
export async function startContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.start();
  } catch (error) {
    console.error(`Failed to start container ${containerId}:`, error);
    throw new Error(`Failed to start container: ${error}`);
  }
}

/**
 * Stop a container
 */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
  } catch (error) {
    console.error(`Failed to stop container ${containerId}:`, error);
    throw new Error(`Failed to stop container: ${error}`);
  }
}

/**
 * Restart a container
 */
export async function restartContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.restart();
  } catch (error) {
    console.error(`Failed to restart container ${containerId}:`, error);
    throw new Error(`Failed to restart container: ${error}`);
  }
}

/**
 * Remove a container
 */
export async function removeContainer(containerId: string, force = false): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.remove({ force });
  } catch (error) {
    console.error(`Failed to remove container ${containerId}:`, error);
    throw new Error(`Failed to remove container: ${error}`);
  }
}

/**
 * Get container logs
 */
export async function getContainerLogs(
  containerId: string,
  tail = 100
): Promise<string> {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    return logs.toString();
  } catch (error) {
    console.error(`Failed to get container logs ${containerId}:`, error);
    throw new Error(`Failed to get container logs: ${error}`);
  }
}

/**
 * Pull an image
 */
export async function pullImage(imageName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) {
        reject(new Error(`Failed to pull image: ${err.message}`));
        return;
      }

      docker.modem.followProgress(
        stream,
        (err: Error | null) => {
          if (err) {
            reject(new Error(`Failed to pull image: ${err.message}`));
          } else {
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Remove an image
 */
export async function removeImage(imageId: string, force = false): Promise<void> {
  try {
    const image = docker.getImage(imageId);
    await image.remove({ force });
  } catch (error) {
    console.error(`Failed to remove image ${imageId}:`, error);
    throw new Error(`Failed to remove image: ${error}`);
  }
}

/**
 * Configure Docker daemon with DNS settings
 * This ensures containers can resolve external domains
 */
export async function configureDockerDNS(): Promise<{ success: boolean; message: string }> {
  try {
    const fs = require("fs").promises;
    const { execFile } = require("child_process");
    const { promisify } = require("util");
    const execFileAsync = promisify(execFile);
    const path = "/etc/docker/daemon.json";

    let config: any = {};

    // Read existing config if exists
    try {
      const existing = await fs.readFile(path, "utf-8");
      config = JSON.parse(existing);
    } catch {
      // File doesn't exist, start with empty config
    }

    // Add DNS configuration if not already set
    if (!config.dns || !Array.isArray(config.dns) || config.dns.length === 0) {
      config.dns = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

      await fs.writeFile(path, JSON.stringify(config, null, 2));

      // Restart Docker to apply changes using execFile (safer than exec)
      await execFileAsync("systemctl", ["restart", "docker"], { timeout: 30000 });

      return { success: true, message: "Docker DNS configured and service restarted" };
    }

    return { success: true, message: "Docker DNS already configured" };
  } catch (error) {
    console.error("Failed to configure Docker DNS:", error);
    return { success: false, message: `Failed to configure Docker DNS: ${error}` };
  }
}

/**
 * Ensure the OpenNextPanel shared network exists
 */
export async function ensureNetwork(): Promise<string> {
  try {
    // Check if network already exists
    const networks = await docker.listNetworks({
      filters: { name: [OPENPANEL_NETWORK] }
    });

    const existingNetwork = networks.find(n => n.Name === OPENPANEL_NETWORK);
    if (existingNetwork) {
      return existingNetwork.Id!;
    }

    // Create the network with DNS options
    const network = await docker.createNetwork({
      Name: OPENPANEL_NETWORK,
      Driver: "bridge",
      CheckDuplicate: true,
      Options: {
        "com.docker.network.bridge.enable_ip_masquerade": "true",
      },
    });

    console.log(`Created Docker network: ${OPENPANEL_NETWORK}`);
    return network.id;
  } catch (error) {
    console.error("Failed to ensure network:", error);
    throw new Error(`Failed to ensure network: ${error}`);
  }
}

/**
 * Create and run a container (automatically joins opennextpanel-network)
 */
export async function createContainer(
  imageName: string,
  name: string,
  ports?: { [key: string]: string },
  env?: string[],
  volumes?: { [hostPath: string]: string }  // hostPath -> containerPath
): Promise<string> {
  try {
    // Ensure shared network exists
    await ensureNetwork();

    // Build port bindings
    const exposedPorts: { [key: string]: {} } = {};
    const portBindings: { [key: string]: { HostPort: string }[] } = {};

    if (ports) {
      for (const [containerPort, hostPort] of Object.entries(ports)) {
        const portKey = `${containerPort}/tcp`;
        exposedPorts[portKey] = {};
        portBindings[portKey] = [{ HostPort: hostPort }];
      }
    }

    // Build volume bindings
    const binds: string[] = [];
    if (volumes) {
      for (const [hostPath, containerPath] of Object.entries(volumes)) {
        // 确保主机目录存在
        const fs = require("fs");
        if (!fs.existsSync(hostPath)) {
          fs.mkdirSync(hostPath, { recursive: true });
        }
        binds.push(`${hostPath}:${containerPath}`);
      }
    }

    const container = await docker.createContainer({
      Image: imageName,
      name,
      ExposedPorts: exposedPorts,
      Env: env,
      HostConfig: {
        PortBindings: portBindings,
        Binds: binds.length > 0 ? binds : undefined,
        RestartPolicy: { Name: "unless-stopped" },
        NetworkMode: OPENPANEL_NETWORK,  // Auto-join shared network
      },
    });

    await container.start();
    return container.id;
  } catch (error) {
    console.error(`Failed to create container:`, error);
    throw new Error(`Failed to create container: ${error}`);
  }
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

export default {
  listContainers,
  listImages,
  getDockerStats,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerLogs,
  pullImage,
  removeImage,
  createContainer,
  isDockerAvailable,
  ensureNetwork,
  configureDockerDNS,
  OPENPANEL_NETWORK,
};
