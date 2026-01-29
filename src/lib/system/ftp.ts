import { executeCommand } from "./executor";
import * as fs from "fs/promises";
import * as path from "path";

const VSFTPD_CONF = "/etc/vsftpd.conf";
const VSFTPD_USER_CONF_DIR = "/etc/vsftpd/users";
const FTP_HOME_BASE = "/home/ftp";

export interface FTPUser {
  username: string;
  homeDir: string;
  enabled: boolean;
  quota?: number; // MB
}

export interface FTPConfig {
  anonymousEnable: boolean;
  localEnable: boolean;
  writeEnable: boolean;
  chrootLocalUser: boolean;
  passvMinPort: number;
  passvMaxPort: number;
  maxClients: number;
  maxPerIp: number;
}

/**
 * 创建 FTP 用户
 */
export async function createFTPUser(
  username: string,
  password: string,
  homeDir?: string
): Promise<{ success: boolean; message: string }> {
  // 验证用户名
  if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username)) {
    return {
      success: false,
      message: "Invalid username. Must be 3-32 characters, start with letter, and contain only lowercase letters, numbers, underscores, or hyphens.",
    };
  }

  const userHome = homeDir || path.join(FTP_HOME_BASE, username);

  try {
    // 创建系统用户
    const createUserResult = await executeCommand("useradd", [
      "-m",
      "-d", userHome,
      "-s", "/sbin/nologin",
      "-G", "ftp",
      username,
    ]);

    if (createUserResult.code !== 0 && !createUserResult.stderr.includes("already exists")) {
      return { success: false, message: createUserResult.stderr };
    }

    // 设置密码
    const passwdResult = await executeCommand("chpasswd", [], { useSudo: true });
    // 使用 echo 管道设置密码
    const setPassResult = await executeCommand("bash", [
      "-c",
      `echo "${username}:${password}" | chpasswd`,
    ]);

    if (setPassResult.code !== 0) {
      return { success: false, message: "Failed to set password" };
    }

    // 创建用户主目录
    await executeCommand("mkdir", ["-p", userHome]);
    await executeCommand("chown", [`${username}:${username}`, userHome]);
    await executeCommand("chmod", ["755", userHome]);

    // 创建 vsftpd 用户配置
    await fs.mkdir(VSFTPD_USER_CONF_DIR, { recursive: true }).catch(() => {});
    const userConfPath = path.join(VSFTPD_USER_CONF_DIR, username);
    const userConf = `local_root=${userHome}\nwrite_enable=YES\n`;
    await fs.writeFile(userConfPath, userConf, "utf-8");

    return { success: true, message: "FTP user created successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 删除 FTP 用户
 */
export async function deleteFTPUser(
  username: string,
  removeHome: boolean = false
): Promise<{ success: boolean; message: string }> {
  if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username)) {
    return { success: false, message: "Invalid username" };
  }

  try {
    const args = removeHome ? ["-r", username] : [username];
    const result = await executeCommand("userdel", args);

    if (result.code !== 0 && !result.stderr.includes("does not exist")) {
      return { success: false, message: result.stderr };
    }

    // 删除 vsftpd 用户配置
    const userConfPath = path.join(VSFTPD_USER_CONF_DIR, username);
    await fs.unlink(userConfPath).catch(() => {});

    return { success: true, message: "FTP user deleted successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 修改 FTP 用户密码
 */
export async function changeFTPPassword(
  username: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username)) {
    return { success: false, message: "Invalid username" };
  }

  try {
    const result = await executeCommand("bash", [
      "-c",
      `echo "${username}:${newPassword}" | chpasswd`,
    ]);

    if (result.code !== 0) {
      return { success: false, message: result.stderr };
    }

    return { success: true, message: "Password changed successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 启用/禁用 FTP 用户
 */
export async function setFTPUserEnabled(
  username: string,
  enabled: boolean
): Promise<{ success: boolean; message: string }> {
  if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username)) {
    return { success: false, message: "Invalid username" };
  }

  try {
    const shell = enabled ? "/sbin/nologin" : "/usr/sbin/nologin";
    const result = await executeCommand("usermod", ["-s", shell, username]);

    if (result.code !== 0) {
      return { success: false, message: result.stderr };
    }

    return { success: true, message: `User ${enabled ? "enabled" : "disabled"} successfully` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 列出所有 FTP 用户
 */
export async function listFTPUsers(): Promise<FTPUser[]> {
  try {
    // 获取 ftp 组的用户
    const result = await executeCommand("getent", ["group", "ftp"], { useSudo: false });

    if (result.code !== 0) {
      return [];
    }

    // 解析 group 输出: ftp:x:50:user1,user2,user3
    const parts = result.stdout.trim().split(":");
    if (parts.length < 4 || !parts[3]) {
      return [];
    }

    const usernames = parts[3].split(",").filter(Boolean);
    const users: FTPUser[] = [];

    for (const username of usernames) {
      // 获取用户信息
      const userResult = await executeCommand("getent", ["passwd", username], { useSudo: false });

      if (userResult.code === 0) {
        const userParts = userResult.stdout.trim().split(":");
        users.push({
          username,
          homeDir: userParts[5] || "",
          enabled: userParts[6] !== "/usr/sbin/nologin",
        });
      }
    }

    return users;
  } catch {
    return [];
  }
}

/**
 * 设置用户配额
 */
export async function setFTPQuota(
  username: string,
  quotaMB: number
): Promise<{ success: boolean; message: string }> {
  if (!/^[a-z][a-z0-9_-]{2,31}$/.test(username)) {
    return { success: false, message: "Invalid username" };
  }

  try {
    // 使用 setquota 设置磁盘配额
    const softLimit = quotaMB * 1024; // Convert to KB
    const hardLimit = Math.floor(quotaMB * 1024 * 1.1); // 10% buffer

    const result = await executeCommand("setquota", [
      "-u",
      username,
      softLimit.toString(),
      hardLimit.toString(),
      "0",
      "0",
      FTP_HOME_BASE,
    ]);

    if (result.code !== 0) {
      return { success: false, message: result.stderr || "Quota system may not be enabled" };
    }

    return { success: true, message: "Quota set successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 获取 FTP 服务状态
 */
export async function getFTPStatus(): Promise<{
  running: boolean;
  version: string;
  connections: number;
}> {
  const statusResult = await executeCommand("systemctl", ["is-active", "vsftpd"]);
  const versionResult = await executeCommand("vsftpd", ["-v"], { useSudo: false });

  // 获取当前连接数
  const connResult = await executeCommand("ss", ["-tn", "state", "established", "( sport = :21 )"], { useSudo: false });
  const connections = connResult.stdout.split("\n").filter((l) => l.trim()).length - 1;

  return {
    running: statusResult.stdout.trim() === "active",
    version: versionResult.stderr.trim() || versionResult.stdout.trim(),
    connections: Math.max(0, connections),
  };
}

/**
 * 重启 FTP 服务
 */
export async function restartFTPService(): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand("systemctl", ["restart", "vsftpd"]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "FTP service restarted successfully" };
}

/**
 * 获取 FTP 配置
 */
export async function getFTPConfig(): Promise<FTPConfig> {
  try {
    const content = await fs.readFile(VSFTPD_CONF, "utf-8");
    const lines = content.split("\n");
    const config: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, value] = trimmed.split("=");
        if (key && value !== undefined) {
          config[key.trim()] = value.trim();
        }
      }
    }

    return {
      anonymousEnable: config.anonymous_enable === "YES",
      localEnable: config.local_enable === "YES",
      writeEnable: config.write_enable === "YES",
      chrootLocalUser: config.chroot_local_user === "YES",
      passvMinPort: parseInt(config.pasv_min_port || "40000"),
      passvMaxPort: parseInt(config.pasv_max_port || "50000"),
      maxClients: parseInt(config.max_clients || "200"),
      maxPerIp: parseInt(config.max_per_ip || "4"),
    };
  } catch {
    return {
      anonymousEnable: false,
      localEnable: true,
      writeEnable: true,
      chrootLocalUser: true,
      passvMinPort: 40000,
      passvMaxPort: 50000,
      maxClients: 200,
      maxPerIp: 4,
    };
  }
}

/**
 * 更新 FTP 配置
 */
export async function updateFTPConfig(
  config: Partial<FTPConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    const currentConfig = await getFTPConfig();
    const newConfig = { ...currentConfig, ...config };

    const configContent = `
# vsftpd configuration
listen=YES
listen_ipv6=NO
anonymous_enable=${newConfig.anonymousEnable ? "YES" : "NO"}
local_enable=${newConfig.localEnable ? "YES" : "NO"}
write_enable=${newConfig.writeEnable ? "YES" : "NO"}
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES
chroot_local_user=${newConfig.chrootLocalUser ? "YES" : "NO"}
allow_writeable_chroot=YES
secure_chroot_dir=/var/run/vsftpd/empty
pam_service_name=vsftpd
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
ssl_enable=NO
pasv_enable=YES
pasv_min_port=${newConfig.passvMinPort}
pasv_max_port=${newConfig.passvMaxPort}
max_clients=${newConfig.maxClients}
max_per_ip=${newConfig.maxPerIp}
user_config_dir=${VSFTPD_USER_CONF_DIR}
`;

    await fs.writeFile(VSFTPD_CONF, configContent.trim(), "utf-8");
    await restartFTPService();

    return { success: true, message: "FTP configuration updated successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
