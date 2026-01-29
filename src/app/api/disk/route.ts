import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { execSync } from "child_process";

// Virtual filesystems to exclude - these are not real disk storage
const VIRTUAL_FS = ["tmpfs", "devtmpfs", "squashfs", "overlay", "none", "udev", "cgroup", "proc", "sysfs"];

async function handleGET(request: NextRequest) {
  try {
    let disks: any[] = [];
    let partitions: any[] = [];

    try {
      // Use df with -T to get filesystem type, -k for KB
      const dfOutput = execSync("df -kT 2>/dev/null", { encoding: "utf-8" });
      const lines = dfOutput.trim().split("\n").slice(1);

      for (const line of lines) {
        const parts = line.split(/\s+/);
        // Format: device fstype size used available percent mountpoint
        if (parts.length >= 7) {
          const device = parts[0];
          const fsType = parts[1];
          const mountPoint = parts[6];

          // Only include real block devices (/dev/...), skip virtual filesystems
          if (!device.startsWith("/dev/") || VIRTUAL_FS.includes(fsType)) {
            continue;
          }

          // Skip loop devices (snap packages) and snap mounts
          if (device.includes("loop") || mountPoint.startsWith("/snap")) {
            continue;
          }

          // Parse sizes (df -k returns KB, convert to bytes)
          const sizeKB = parseInt(parts[2]) || 0;
          const usedKB = parseInt(parts[3]) || 0;
          const availKB = parseInt(parts[4]) || 0;
          const usePercent = parseInt(parts[5].replace("%", "")) || 0;

          disks.push({
            device,
            size: sizeKB * 1024,
            used: usedKB * 1024,
            available: availKB * 1024,
            usePercent,
            mountPoint,
            fsType
          });
        }
      }
    } catch (e) {
      // Fallback: try simpler df command without -T
      try {
        const dfOutput = execSync("df -k 2>/dev/null", { encoding: "utf-8" });
        const lines = dfOutput.trim().split("\n").slice(1);

        for (const line of lines) {
          const parts = line.split(/\s+/);
          // Format: device size used available percent mountpoint
          if (parts.length >= 6) {
            const device = parts[0];

            // Only include real block devices
            if (!device.startsWith("/dev/") || device.includes("loop")) {
              continue;
            }

            disks.push({
              device,
              size: (parseInt(parts[1]) || 0) * 1024,
              used: (parseInt(parts[2]) || 0) * 1024,
              available: (parseInt(parts[3]) || 0) * 1024,
              usePercent: parseInt(parts[4].replace("%", "")) || 0,
              mountPoint: parts[5],
              fsType: "unknown"
            });
          }
        }
      } catch {
        // Return empty if both commands fail
      }
    }

    try {
      const lsblkOutput = execSync("lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE 2>/dev/null", { encoding: "utf-8" });
      const lines = lsblkOutput.trim().split("\n").slice(1);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          // Clean device name (remove tree characters)
          const name = parts[0].replace(/[├└─│]/g, "").trim();
          const size = parseInt(parts[1]) || 0;
          const type = parts[2];
          const mountPoint = parts.length > 3 ? parts[3] : "";
          const fsType = parts.length > 4 ? parts[4] : "";

          // Only include disk and partition types, skip loops
          if ((type === "part" || type === "disk") && !name.includes("loop")) {
            if (VIRTUAL_FS.includes(fsType)) continue;

            partitions.push({
              device: name.startsWith("/dev/") ? name : "/dev/" + name,
              size,
              type: type === "disk" ? "disk" : "partition",
              mounted: !!mountPoint && mountPoint !== "",
              mountPoint: mountPoint || "",
              fsType
            });
          }
        }
      }
    } catch (e) {
      partitions = [];
    }

    return NextResponse.json({ disks, partitions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export const GET = withAuth(handleGET);
