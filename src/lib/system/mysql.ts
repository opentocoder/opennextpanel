import mysql from "mysql2/promise";
import { executeCommand } from "./executor";

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface DatabaseInfo {
  name: string;
  size: number;
  tables: number;
}

export interface UserInfo {
  user: string;
  host: string;
  privileges: string[];
}

// 默认配置（从环境变量读取）
const defaultConfig: MySQLConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_ROOT_USER || "root",
  password: process.env.MYSQL_ROOT_PASSWORD || "",
};

/**
 * 创建数据库连接
 */
export async function createConnection(
  config: Partial<MySQLConfig> = {}
): Promise<mysql.Connection> {
  const finalConfig = { ...defaultConfig, ...config };

  return mysql.createConnection({
    host: finalConfig.host,
    port: finalConfig.port,
    user: finalConfig.user,
    password: finalConfig.password,
  });
}

/**
 * 创建数据库
 */
export async function createDatabase(
  dbName: string,
  charset: string = "utf8mb4",
  collation: string = "utf8mb4_unicode_ci"
): Promise<void> {
  // 验证数据库名（防止 SQL 注入）
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid database name");
  }

  const conn = await createConnection();
  try {
    await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET ${charset} COLLATE ${collation}`
    );
  } finally {
    await conn.end();
  }
}

/**
 * 删除数据库
 */
export async function dropDatabase(dbName: string): Promise<void> {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid database name");
  }

  const conn = await createConnection();
  try {
    await conn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
  } finally {
    await conn.end();
  }
}

/**
 * 列出所有数据库
 */
export async function listDatabases(): Promise<DatabaseInfo[]> {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT
        table_schema AS name,
        SUM(data_length + index_length) AS size,
        COUNT(DISTINCT table_name) AS tables
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      GROUP BY table_schema`
    );

    return rows.map((row) => ({
      name: row.name,
      size: Number(row.size) || 0,
      tables: Number(row.tables) || 0,
    }));
  } finally {
    await conn.end();
  }
}

/**
 * 创建用户
 */
export async function createUser(
  username: string,
  password: string,
  host: string = "localhost"
): Promise<void> {
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error("Invalid username");
  }

  const conn = await createConnection();
  try {
    await conn.execute(`CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?`, [username, host, password]);
  } finally {
    await conn.end();
  }
}

/**
 * 删除用户
 */
export async function dropUser(username: string, host: string = "localhost"): Promise<void> {
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error("Invalid username");
  }

  const conn = await createConnection();
  try {
    await conn.execute(`DROP USER IF EXISTS ?@?`, [username, host]);
  } finally {
    await conn.end();
  }
}

/**
 * 授予用户数据库权限
 */
export async function grantPrivileges(
  username: string,
  dbName: string,
  privileges: string[] = ["ALL"],
  host: string = "localhost"
): Promise<void> {
  if (!/^[a-zA-Z0-9_]+$/.test(username) || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid username or database name");
  }

  const conn = await createConnection();
  try {
    const privString = privileges.join(", ");
    await conn.execute(`GRANT ${privString} ON \`${dbName}\`.* TO ?@?`, [username, host]);
    await conn.execute("FLUSH PRIVILEGES");
  } finally {
    await conn.end();
  }
}

/**
 * 撤销用户权限
 */
export async function revokePrivileges(
  username: string,
  dbName: string,
  host: string = "localhost"
): Promise<void> {
  if (!/^[a-zA-Z0-9_]+$/.test(username) || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid username or database name");
  }

  const conn = await createConnection();
  try {
    await conn.execute(`REVOKE ALL PRIVILEGES ON \`${dbName}\`.* FROM ?@?`, [username, host]);
    await conn.execute("FLUSH PRIVILEGES");
  } finally {
    await conn.end();
  }
}

/**
 * 列出所有用户
 */
export async function listUsers(): Promise<UserInfo[]> {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT user, host FROM mysql.user WHERE user != ''`
    );

    const users: UserInfo[] = [];
    for (const row of rows) {
      const [privRows] = await conn.execute<mysql.RowDataPacket[]>(
        `SHOW GRANTS FOR ?@?`,
        [row.user, row.host]
      );

      users.push({
        user: row.user,
        host: row.host,
        privileges: privRows.map((p) => Object.values(p)[0] as string),
      });
    }

    return users;
  } finally {
    await conn.end();
  }
}

/**
 * 修改用户密码
 */
export async function changePassword(
  username: string,
  newPassword: string,
  host: string = "localhost"
): Promise<void> {
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error("Invalid username");
  }

  const conn = await createConnection();
  try {
    await conn.execute(`ALTER USER ?@? IDENTIFIED BY ?`, [username, host, newPassword]);
    await conn.execute("FLUSH PRIVILEGES");
  } finally {
    await conn.end();
  }
}

/**
 * 备份数据库
 */
export async function backupDatabase(
  dbName: string,
  outputPath: string,
  config: Partial<MySQLConfig> = {}
): Promise<{ success: boolean; message: string; size?: number }> {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid database name");
  }

  const finalConfig = { ...defaultConfig, ...config };

  const args = [
    `-h${finalConfig.host}`,
    `-P${finalConfig.port}`,
    `-u${finalConfig.user}`,
    `--single-transaction`,
    `--routines`,
    `--triggers`,
    dbName,
  ];

  if (finalConfig.password) {
    args.splice(3, 0, `-p${finalConfig.password}`);
  }

  // 使用重定向写入文件
  const result = await executeCommand("mysqldump", args, { useSudo: false });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  // 写入文件
  const fs = require("fs/promises");
  await fs.writeFile(outputPath, result.stdout, "utf-8");

  const stats = await fs.stat(outputPath);

  return {
    success: true,
    message: "Backup completed successfully",
    size: stats.size,
  };
}

/**
 * 恢复数据库
 */
export async function restoreDatabase(
  dbName: string,
  inputPath: string,
  config: Partial<MySQLConfig> = {}
): Promise<{ success: boolean; message: string }> {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid database name");
  }

  const finalConfig = { ...defaultConfig, ...config };

  const args = [
    `-h${finalConfig.host}`,
    `-P${finalConfig.port}`,
    `-u${finalConfig.user}`,
    dbName,
    `-e`,
    `source ${inputPath}`,
  ];

  if (finalConfig.password) {
    args.splice(3, 0, `-p${finalConfig.password}`);
  }

  const result = await executeCommand("mysql", args, { useSudo: false });

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Restore completed successfully" };
}

/**
 * 执行 SQL 查询
 */
export async function executeQuery(
  dbName: string,
  query: string
): Promise<{ rows: any[]; fields: any[] }> {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid database name");
  }

  const conn = await createConnection();
  try {
    await conn.changeUser({ database: dbName });
    const [rows, fields] = await conn.execute(query);
    return { rows: rows as any[], fields: fields as any[] };
  } finally {
    await conn.end();
  }
}

/**
 * 获取数据库表信息
 */
export async function getDatabaseTables(dbName: string): Promise<
  {
    name: string;
    engine: string;
    rows: number;
    size: number;
    created: string;
  }[]
> {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid database name");
  }

  const conn = await createConnection();
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT
        table_name AS name,
        engine,
        table_rows AS \`rows\`,
        data_length + index_length AS size,
        create_time AS created
      FROM information_schema.tables
      WHERE table_schema = ?`,
      [dbName]
    );

    return rows.map((row) => ({
      name: row.name,
      engine: row.engine || "InnoDB",
      rows: Number(row.rows) || 0,
      size: Number(row.size) || 0,
      created: row.created ? new Date(row.created).toISOString() : "",
    }));
  } finally {
    await conn.end();
  }
}

/**
 * 检查 MySQL 服务状态
 */
export async function getMySQLStatus(): Promise<{
  running: boolean;
  version: string;
  uptime: number;
  connections: number;
}> {
  try {
    const conn = await createConnection();
    try {
      const [versionRows] = await conn.execute<mysql.RowDataPacket[]>("SELECT VERSION() as version");
      const [statusRows] = await conn.execute<mysql.RowDataPacket[]>("SHOW STATUS WHERE Variable_name IN ('Uptime', 'Threads_connected')");

      const status: Record<string, string> = {};
      for (const row of statusRows) {
        status[row.Variable_name] = row.Value;
      }

      return {
        running: true,
        version: versionRows[0]?.version || "unknown",
        uptime: parseInt(status.Uptime || "0"),
        connections: parseInt(status.Threads_connected || "0"),
      };
    } finally {
      await conn.end();
    }
  } catch {
    return {
      running: false,
      version: "unknown",
      uptime: 0,
      connections: 0,
    };
  }
}
