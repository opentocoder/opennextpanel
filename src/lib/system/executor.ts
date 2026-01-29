import { execFile, spawn, SpawnOptions } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// 允许执行的命令白名单
const ALLOWED_COMMANDS = new Set([
  "nginx",
  "systemctl",
  "mysql",
  "mysqldump",
  "certbot",
  "tar",
  "unzip",
  "zip",
  "chmod",
  "chown",
  "ln",
  "ls",
  "cat",
  "cp",
  "mv",
  "rm",
  "mkdir",
  "df",
  "du",
  "free",
  "top",
  "ps",
  "netstat",
  "ss",
  "pm2",
  "node",
  "npm",
  "docker",
  "docker-compose",
  "useradd",
  "userdel",
  "usermod",
  "passwd",
  "chpasswd",
  "getent",
  "setquota",
  "crontab",
  "service",
  "journalctl",
  "tail",
  "head",
  "grep",
  "find",
  "wc",
  "sort",
  "awk",
  "sed",
  "which",
  "kill",
  "php",
  "redis-server",
  "redis-cli",
  "psql",
  "mongod",
  "memcached",
  "vsftpd",
  "bash",
]);

// 需要 sudo 权限的命令
const SUDO_COMMANDS = new Set([
  "nginx",
  "systemctl",
  "certbot",
  "useradd",
  "userdel",
  "usermod",
  "passwd",
  "service",
  "chmod",
  "chown",
]);

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface ExecOptions {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  useSudo?: boolean;
}

/**
 * 安全执行系统命令
 * 使用 execFile 而不是 exec 来防止命令注入
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  // 验证命令是否在白名单中
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  const { timeout = 30000, cwd, env, useSudo } = options;

  // 确定是否需要 sudo
  const needsSudo = useSudo !== false && SUDO_COMMANDS.has(command);

  let actualCommand = command;
  let actualArgs = args;

  if (needsSudo) {
    actualCommand = "sudo";
    actualArgs = [command, ...args];
  }

  try {
    const { stdout, stderr } = await execFileAsync(actualCommand, actualArgs, {
      timeout,
      cwd,
      env: { ...process.env, ...env },
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return { stdout, stderr, code: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      code: error.code || 1,
    };
  }
}

/**
 * 执行命令并返回流式输出（用于长时间运行的命令）
 */
export function spawnCommand(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): {
  process: ReturnType<typeof spawn>;
  promise: Promise<ExecResult>;
} {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  const { cwd, env, useSudo } = options;
  const needsSudo = useSudo !== false && SUDO_COMMANDS.has(command);

  let actualCommand = command;
  let actualArgs = args;

  if (needsSudo) {
    actualCommand = "sudo";
    actualArgs = [command, ...args];
  }

  const spawnOptions: SpawnOptions = {
    cwd,
    env: { ...process.env, ...env },
  };

  const proc = spawn(actualCommand, actualArgs, spawnOptions);

  const promise = new Promise<ExecResult>((resolve) => {
    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });

    proc.on("error", (error) => {
      resolve({ stdout, stderr: error.message, code: 1 });
    });
  });

  return { process: proc, promise };
}

/**
 * 检查命令是否可用
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const { code } = await executeCommand("which", [command], { useSudo: false });
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * 验证路径安全性（防止路径遍历攻击）
 */
export function validatePath(path: string, basePath: string): boolean {
  const normalizedPath = require("path").resolve(basePath, path);
  return normalizedPath.startsWith(basePath);
}
