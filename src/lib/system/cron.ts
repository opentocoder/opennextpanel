import { executeCommand } from "./executor";

export interface CronJob {
  id: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  command: string;
  user: string;
  enabled: boolean;
  description?: string;
}

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

/**
 * 解析 crontab 行
 */
function parseCronLine(line: string, user: string): CronJob | null {
  const trimmed = line.trim();

  // 跳过空行和纯注释行
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  // 检查是否是禁用的任务（#DISABLED#）
  const isDisabled = trimmed.startsWith("#DISABLED#");
  const actualLine = isDisabled ? trimmed.replace("#DISABLED#", "").trim() : trimmed;

  // 解析 cron 表达式
  const parts = actualLine.split(/\s+/);
  if (parts.length < 6) {
    return null;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek, ...commandParts] = parts;
  const command = commandParts.join(" ");

  // 生成唯一ID
  const id = Buffer.from(`${user}:${command}`).toString("base64").substring(0, 16);

  return {
    id,
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek,
    command,
    user,
    enabled: !isDisabled,
  };
}

/**
 * 格式化 cron 任务为 crontab 行
 */
function formatCronLine(job: CronJob): string {
  const schedule = `${job.minute} ${job.hour} ${job.dayOfMonth} ${job.month} ${job.dayOfWeek}`;
  const prefix = job.enabled ? "" : "#DISABLED#";
  return `${prefix}${schedule} ${job.command}`;
}

/**
 * 获取用户的 crontab
 */
export async function getUserCrontab(user: string = "root"): Promise<CronJob[]> {
  const result = await executeCommand("crontab", ["-l", "-u", user]);

  // crontab -l 如果没有任务会返回错误
  if (result.code !== 0) {
    return [];
  }

  const lines = result.stdout.split("\n");
  const jobs: CronJob[] = [];

  for (const line of lines) {
    const job = parseCronLine(line, user);
    if (job) {
      jobs.push(job);
    }
  }

  return jobs;
}

/**
 * 设置用户的 crontab
 */
async function setUserCrontab(user: string, jobs: CronJob[]): Promise<{ success: boolean; message: string }> {
  const content = jobs.map(formatCronLine).join("\n") + "\n";

  // 使用临时文件
  const fs = require("fs/promises");
  const os = require("os");
  const path = require("path");

  const tmpFile = path.join(os.tmpdir(), `crontab_${user}_${Date.now()}`);

  try {
    await fs.writeFile(tmpFile, content, "utf-8");

    const result = await executeCommand("crontab", ["-u", user, tmpFile]);

    await fs.unlink(tmpFile).catch(() => {});

    if (result.code !== 0) {
      return { success: false, message: result.stderr };
    }

    return { success: true, message: "Crontab updated successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 添加 cron 任务
 */
export async function addCronJob(
  schedule: CronSchedule,
  command: string,
  user: string = "root",
  description?: string
): Promise<{ success: boolean; message: string; job?: CronJob }> {
  // 验证 schedule
  const scheduleRegex = /^[\d*,/-]+$/;
  if (
    !scheduleRegex.test(schedule.minute) ||
    !scheduleRegex.test(schedule.hour) ||
    !scheduleRegex.test(schedule.dayOfMonth) ||
    !scheduleRegex.test(schedule.month) ||
    !scheduleRegex.test(schedule.dayOfWeek)
  ) {
    return { success: false, message: "Invalid schedule format" };
  }

  const jobs = await getUserCrontab(user);

  const newJob: CronJob = {
    id: Buffer.from(`${user}:${command}`).toString("base64").substring(0, 16),
    ...schedule,
    command,
    user,
    enabled: true,
    description,
  };

  // 检查是否已存在相同命令
  const exists = jobs.some((j) => j.command === command);
  if (exists) {
    return { success: false, message: "A job with this command already exists" };
  }

  jobs.push(newJob);

  const result = await setUserCrontab(user, jobs);
  if (!result.success) {
    return result;
  }

  return { success: true, message: "Cron job added successfully", job: newJob };
}

/**
 * 更新 cron 任务
 */
export async function updateCronJob(
  jobId: string,
  updates: Partial<CronJob>,
  user: string = "root"
): Promise<{ success: boolean; message: string }> {
  const jobs = await getUserCrontab(user);
  const index = jobs.findIndex((j) => j.id === jobId);

  if (index === -1) {
    return { success: false, message: "Job not found" };
  }

  // 更新任务
  jobs[index] = { ...jobs[index], ...updates };

  return setUserCrontab(user, jobs);
}

/**
 * 删除 cron 任务
 */
export async function deleteCronJob(
  jobId: string,
  user: string = "root"
): Promise<{ success: boolean; message: string }> {
  const jobs = await getUserCrontab(user);
  const index = jobs.findIndex((j) => j.id === jobId);

  if (index === -1) {
    return { success: false, message: "Job not found" };
  }

  jobs.splice(index, 1);

  return setUserCrontab(user, jobs);
}

/**
 * 启用/禁用 cron 任务
 */
export async function toggleCronJob(
  jobId: string,
  enabled: boolean,
  user: string = "root"
): Promise<{ success: boolean; message: string }> {
  return updateCronJob(jobId, { enabled }, user);
}

/**
 * 获取所有用户的 cron 任务
 */
export async function getAllCronJobs(): Promise<CronJob[]> {
  const result = await executeCommand("ls", ["/var/spool/cron/crontabs"], { useSudo: true });

  if (result.code !== 0) {
    // 尝试获取 root 的任务
    return getUserCrontab("root");
  }

  const users = result.stdout.split("\n").filter(Boolean);
  const allJobs: CronJob[] = [];

  for (const user of users) {
    const jobs = await getUserCrontab(user);
    allJobs.push(...jobs);
  }

  return allJobs;
}

/**
 * 解析 cron 表达式为人类可读的描述
 */
export function describeCronSchedule(schedule: CronSchedule): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = schedule;

  // 简单的描述生成
  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every minute";
  }

  if (minute === "0" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every hour";
  }

  if (minute === "0" && hour === "0" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every day at midnight";
  }

  if (dayOfWeek !== "*" && dayOfMonth === "*") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayNum = parseInt(dayOfWeek);
    if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
      return `Every ${days[dayNum]} at ${hour}:${minute.padStart(2, "0")}`;
    }
  }

  if (dayOfMonth !== "*" && month === "*") {
    return `On day ${dayOfMonth} of every month at ${hour}:${minute.padStart(2, "0")}`;
  }

  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

/**
 * 常用 schedule 预设
 */
export const SCHEDULE_PRESETS: Record<string, CronSchedule> = {
  everyMinute: { minute: "*", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  everyHour: { minute: "0", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  everyDay: { minute: "0", hour: "0", dayOfMonth: "*", month: "*", dayOfWeek: "*" },
  everyWeek: { minute: "0", hour: "0", dayOfMonth: "*", month: "*", dayOfWeek: "0" },
  everyMonth: { minute: "0", hour: "0", dayOfMonth: "1", month: "*", dayOfWeek: "*" },
  weekdays: { minute: "0", hour: "9", dayOfMonth: "*", month: "*", dayOfWeek: "1-5" },
  weekends: { minute: "0", hour: "10", dayOfMonth: "*", month: "*", dayOfWeek: "0,6" },
};

/**
 * 验证 cron 表达式
 */
export function validateCronExpression(expression: string): { valid: boolean; error?: string } {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    return { valid: false, error: "Expression must have exactly 5 fields" };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const ranges: [string, number, number][] = [
    [minute, 0, 59],
    [hour, 0, 23],
    [dayOfMonth, 1, 31],
    [month, 1, 12],
    [dayOfWeek, 0, 7],
  ];

  for (const [value, min, max] of ranges) {
    if (!validateCronField(value, min, max)) {
      return { valid: false, error: `Invalid field: ${value}` };
    }
  }

  return { valid: true };
}

/**
 * 验证单个 cron 字段
 */
function validateCronField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;

  // 处理步长 */n
  if (field.startsWith("*/")) {
    const step = parseInt(field.substring(2));
    return !isNaN(step) && step > 0 && step <= max;
  }

  // 处理范围 a-b
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }

  // 处理列表 a,b,c
  if (field.includes(",")) {
    return field.split(",").every((v) => {
      const num = parseInt(v);
      return !isNaN(num) && num >= min && num <= max;
    });
  }

  // 单个数字
  const num = parseInt(field);
  return !isNaN(num) && num >= min && num <= max;
}
