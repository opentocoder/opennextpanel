/**
 * 软件安装模块
 * 支持通过包管理器安装/卸载软件
 */

import { executeCommand } from "./executor";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 等待 apt 锁释放
async function waitForAptLock(maxWaitSeconds: number = 60): Promise<void> {
  const lockFiles = [
    "/var/lib/dpkg/lock-frontend",
    "/var/lib/dpkg/lock",
    "/var/lib/apt/lists/lock",
  ];

  const startTime = Date.now();
  while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
    let locked = false;
    for (const lockFile of lockFiles) {
      try {
        await execAsync(`sudo fuser ${lockFile} 2>/dev/null`);
        locked = true;
        break;
      } catch {
        // fuser 返回非零表示没有进程占用
      }
    }

    if (!locked) {
      return; // 锁已释放
    }

    console.log("Waiting for apt lock to be released...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error("Timeout waiting for apt lock");
}

// 包管理器类型
type PackageManager = "apt" | "yum" | "dnf" | "pacman" | "apk";

// 软件包映射 (软件ID -> 各包管理器的包名)
const PACKAGE_MAP: Record<string, Record<PackageManager, string[]>> = {
  nginx: {
    apt: ["nginx"],
    yum: ["nginx"],
    dnf: ["nginx"],
    pacman: ["nginx"],
    apk: ["nginx"],
  },
  mysql: {
    apt: ["mysql-server", "mysql-client"],
    yum: ["mysql-server"],
    dnf: ["mysql-server"],
    pacman: ["mysql"],
    apk: ["mysql", "mysql-client"],
  },
  mariadb: {
    apt: ["mariadb-server", "mariadb-client"],
    yum: ["mariadb-server"],
    dnf: ["mariadb-server"],
    pacman: ["mariadb"],
    apk: ["mariadb", "mariadb-client"],
  },
  redis: {
    apt: ["redis-server"],
    yum: ["redis"],
    dnf: ["redis"],
    pacman: ["redis"],
    apk: ["redis"],
  },
  postgresql: {
    apt: ["postgresql", "postgresql-contrib"],
    yum: ["postgresql-server", "postgresql"],
    dnf: ["postgresql-server", "postgresql"],
    pacman: ["postgresql"],
    apk: ["postgresql"],
  },
  mongodb: {
    apt: ["mongodb-org"],
    yum: ["mongodb-org"],
    dnf: ["mongodb-org"],
    pacman: ["mongodb"],
    apk: ["mongodb"],
  },
  memcached: {
    apt: ["memcached"],
    yum: ["memcached"],
    dnf: ["memcached"],
    pacman: ["memcached"],
    apk: ["memcached"],
  },
  docker: {
    apt: ["docker.io", "docker-compose"],
    yum: ["docker", "docker-compose"],
    dnf: ["docker", "docker-compose"],
    pacman: ["docker", "docker-compose"],
    apk: ["docker", "docker-compose"],
  },
  nodejs: {
    apt: ["nodejs", "npm"],
    yum: ["nodejs", "npm"],
    dnf: ["nodejs", "npm"],
    pacman: ["nodejs", "npm"],
    apk: ["nodejs", "npm"],
  },
  python: {
    apt: ["python3", "python3-pip"],
    yum: ["python3", "python3-pip"],
    dnf: ["python3", "python3-pip"],
    pacman: ["python", "python-pip"],
    apk: ["python3", "py3-pip"],
  },
  // PHP 版本
  "php83": {
    apt: ["php8.3", "php8.3-fpm", "php8.3-cli", "php8.3-mysql", "php8.3-curl", "php8.3-gd", "php8.3-mbstring", "php8.3-xml", "php8.3-zip"],
    yum: ["php83", "php83-php-fpm", "php83-php-cli", "php83-php-mysqlnd"],
    dnf: ["php83", "php83-php-fpm", "php83-php-cli", "php83-php-mysqlnd"],
    pacman: ["php"],
    apk: ["php83", "php83-fpm"],
  },
  "php82": {
    apt: ["php8.2", "php8.2-fpm", "php8.2-cli", "php8.2-mysql", "php8.2-curl", "php8.2-gd", "php8.2-mbstring", "php8.2-xml", "php8.2-zip"],
    yum: ["php82", "php82-php-fpm", "php82-php-cli", "php82-php-mysqlnd"],
    dnf: ["php82", "php82-php-fpm", "php82-php-cli", "php82-php-mysqlnd"],
    pacman: ["php"],
    apk: ["php82", "php82-fpm"],
  },
  "php81": {
    apt: ["php8.1", "php8.1-fpm", "php8.1-cli", "php8.1-mysql", "php8.1-curl", "php8.1-gd", "php8.1-mbstring", "php8.1-xml", "php8.1-zip"],
    yum: ["php81", "php81-php-fpm", "php81-php-cli", "php81-php-mysqlnd"],
    dnf: ["php81", "php81-php-fpm", "php81-php-cli", "php81-php-mysqlnd"],
    pacman: ["php"],
    apk: ["php81", "php81-fpm"],
  },
  phpmyadmin: {
    apt: ["phpmyadmin"],
    yum: ["phpMyAdmin"],
    dnf: ["phpMyAdmin"],
    pacman: ["phpmyadmin"],
    apk: ["phpmyadmin"],
  },
  fail2ban: {
    apt: ["fail2ban"],
    yum: ["fail2ban"],
    dnf: ["fail2ban"],
    pacman: ["fail2ban"],
    apk: ["fail2ban"],
  },
  pureftpd: {
    apt: ["pure-ftpd"],
    yum: ["pure-ftpd"],
    dnf: ["pure-ftpd"],
    pacman: ["pure-ftpd"],
    apk: ["pure-ftpd"],
  },
};

// 检测系统的包管理器
export async function detectPackageManager(): Promise<PackageManager | null> {
  const checks: [string, PackageManager][] = [
    ["apt-get", "apt"],
    ["dnf", "dnf"],
    ["yum", "yum"],
    ["pacman", "pacman"],
    ["apk", "apk"],
  ];

  for (const [cmd, pm] of checks) {
    try {
      await execAsync(`which ${cmd}`);
      return pm;
    } catch {
      continue;
    }
  }

  return null;
}

// 检测系统类型
export async function detectOS(): Promise<{ os: string; version: string }> {
  try {
    const { stdout } = await execAsync("cat /etc/os-release");
    const lines = stdout.split("\n");
    let os = "unknown";
    let version = "";

    for (const line of lines) {
      if (line.startsWith("ID=")) {
        os = line.replace("ID=", "").replace(/"/g, "");
      }
      if (line.startsWith("VERSION_ID=")) {
        version = line.replace("VERSION_ID=", "").replace(/"/g, "");
      }
    }

    return { os, version };
  } catch {
    return { os: "unknown", version: "" };
  }
}

// 更新包管理器缓存
export async function updatePackageCache(pm: PackageManager): Promise<{ success: boolean; message: string }> {
  const commands: Record<PackageManager, string> = {
    apt: "apt-get update",
    yum: "yum makecache",
    dnf: "dnf makecache",
    pacman: "pacman -Sy",
    apk: "apk update",
  };

  const result = await executeCommand("sudo", commands[pm].split(" ").slice(1), {
    timeout: 120000,
  });

  return {
    success: result.code === 0,
    message: result.code === 0 ? "Package cache updated" : result.stderr,
  };
}

// 添加 PHP PPA (用于 Ubuntu/Debian)
async function addPhpPPA(): Promise<{ success: boolean; message: string }> {
  try {
    // 检查是否已添加
    const { stdout } = await execAsync("ls /etc/apt/sources.list.d/ 2>/dev/null || true");
    if (stdout.includes("ondrej") || stdout.includes("php")) {
      return { success: true, message: "PHP PPA already added" };
    }

    // 添加 ondrej/php PPA
    console.log("Adding ondrej/php PPA...");
    await execAsync("sudo apt-get install -y software-properties-common");
    await execAsync("sudo add-apt-repository -y ppa:ondrej/php");
    await execAsync("sudo apt-get update");
    return { success: true, message: "PHP PPA added successfully" };
  } catch (error: any) {
    console.log("Failed to add PHP PPA:", error.message);
    return { success: false, message: error.message };
  }
}

// 安装软件
export async function installSoftware(
  softwareId: string,
  options?: { version?: string }
): Promise<{ success: boolean; message: string; logs: string }> {
  const pm = await detectPackageManager();
  if (!pm) {
    return { success: false, message: "No supported package manager found", logs: "" };
  }

  // 获取包名列表
  const packages = PACKAGE_MAP[softwareId]?.[pm];
  if (!packages || packages.length === 0) {
    return { success: false, message: `Software ${softwareId} not supported on this system`, logs: "" };
  }

  let logs = "";

  // 等待 apt 锁释放 (apt/dpkg)
  if (pm === "apt") {
    try {
      await waitForAptLock();
    } catch (e: any) {
      return { success: false, message: "apt 锁被占用，请稍后重试", logs: e.message };
    }
  }

  // PHP 需要先添加 PPA (Ubuntu/Debian)
  if (softwareId.startsWith("php") && pm === "apt") {
    const ppaResult = await addPhpPPA();
    logs += `PPA: ${ppaResult.message}\n`;
  }

  // 构建安装命令
  const installCmd: Record<PackageManager, string> = {
    apt: `DEBIAN_FRONTEND=noninteractive apt-get install -y ${packages.join(" ")}`,
    yum: `yum install -y ${packages.join(" ")}`,
    dnf: `dnf install -y ${packages.join(" ")}`,
    pacman: `pacman -S --noconfirm ${packages.join(" ")}`,
    apk: `apk add ${packages.join(" ")}`,
  };

  console.log(`Installing ${softwareId} with: sudo ${installCmd[pm]}`);

  try {
    const { stdout, stderr } = await execAsync(`sudo ${installCmd[pm]}`, {
      timeout: 300000, // 5分钟超时
    });

    const logs = stdout + "\n" + stderr;

    // 安装后启动服务
    const serviceMap: Record<string, string> = {
      nginx: "nginx",
      mysql: "mysql",
      mariadb: "mariadb",
      redis: "redis-server",
      postgresql: "postgresql",
      docker: "docker",
      "php83": "php8.3-fpm",
      "php82": "php8.2-fpm",
      "php81": "php8.1-fpm",
      "php74": "php7.4-fpm",
      fail2ban: "fail2ban",
      memcached: "memcached",
    };

    const serviceName = serviceMap[softwareId];
    if (serviceName) {
      try {
        await execAsync(`sudo systemctl enable ${serviceName}`);
        await execAsync(`sudo systemctl start ${serviceName}`);
      } catch (e) {
        console.log(`Note: Could not start service ${serviceName}:`, e);
      }
    }

    return {
      success: true,
      message: `Successfully installed ${softwareId}`,
      logs,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Installation failed",
      logs: error.stdout || "" + error.stderr || "",
    };
  }
}

// 卸载软件
export async function uninstallSoftware(
  softwareId: string
): Promise<{ success: boolean; message: string; logs: string }> {
  const pm = await detectPackageManager();
  if (!pm) {
    return { success: false, message: "No supported package manager found", logs: "" };
  }

  const packages = PACKAGE_MAP[softwareId]?.[pm];
  if (!packages || packages.length === 0) {
    return { success: false, message: `Software ${softwareId} not supported`, logs: "" };
  }

  // 先停止服务
  const serviceMap: Record<string, string> = {
    nginx: "nginx",
    mysql: "mysql",
    mariadb: "mariadb",
    redis: "redis-server",
    postgresql: "postgresql",
    docker: "docker",
    "php83": "php8.3-fpm",
    "php82": "php8.2-fpm",
    "php81": "php8.1-fpm",
    "php74": "php7.4-fpm",
    fail2ban: "fail2ban",
    memcached: "memcached",
  };

  const serviceName = serviceMap[softwareId];
  if (serviceName) {
    try {
      await execAsync(`sudo systemctl stop ${serviceName}`);
      await execAsync(`sudo systemctl disable ${serviceName}`);
    } catch (e) {
      console.log(`Note: Could not stop service ${serviceName}:`, e);
    }
  }

  // 等待 apt 锁释放
  if (pm === "apt") {
    try {
      await waitForAptLock();
    } catch (e: any) {
      return { success: false, message: "apt 锁被占用，请稍后重试", logs: e.message };
    }
  }

  // 构建卸载命令
  const uninstallCmd: Record<PackageManager, string> = {
    apt: `apt-get remove -y ${packages.join(" ")}`,
    yum: `yum remove -y ${packages.join(" ")}`,
    dnf: `dnf remove -y ${packages.join(" ")}`,
    pacman: `pacman -Rs --noconfirm ${packages.join(" ")}`,
    apk: `apk del ${packages.join(" ")}`,
  };

  try {
    const { stdout, stderr } = await execAsync(`sudo ${uninstallCmd[pm]}`, {
      timeout: 120000,
    });

    return {
      success: true,
      message: `Successfully uninstalled ${softwareId}`,
      logs: stdout + "\n" + stderr,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Uninstallation failed",
      logs: error.stdout || "" + error.stderr || "",
    };
  }
}

// 检查软件是否已安装
export async function isSoftwareInstalled(softwareId: string): Promise<boolean> {
  const pm = await detectPackageManager();
  if (!pm) return false;

  const packages = PACKAGE_MAP[softwareId]?.[pm];
  if (!packages || packages.length === 0) return false;

  const checkCmd: Record<PackageManager, (pkg: string) => string> = {
    apt: (pkg) => `dpkg -l ${pkg} 2>/dev/null | grep -q "^ii"`,
    yum: (pkg) => `rpm -q ${pkg} >/dev/null 2>&1`,
    dnf: (pkg) => `rpm -q ${pkg} >/dev/null 2>&1`,
    pacman: (pkg) => `pacman -Q ${pkg} >/dev/null 2>&1`,
    apk: (pkg) => `apk info -e ${pkg} >/dev/null 2>&1`,
  };

  // 检查第一个包是否安装
  try {
    await execAsync(checkCmd[pm](packages[0]));
    return true;
  } catch {
    return false;
  }
}

// 获取可安装的软件版本列表
export async function getAvailableVersions(softwareId: string): Promise<string[]> {
  // PHP 多版本
  if (softwareId.startsWith("php")) {
    return ["8.2", "8.1", "8.0", "7.4"];
  }

  // MySQL 版本
  if (softwareId === "mysql" || softwareId === "mariadb") {
    return ["8.0", "5.7"];
  }

  // Node.js 版本
  if (softwareId === "nodejs") {
    return ["20", "18", "16"];
  }

  // Redis 版本
  if (softwareId === "redis") {
    return ["7.2", "7.0", "6.2"];
  }

  return [];
}
