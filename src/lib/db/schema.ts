import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "panel.db");

export function initDatabase() {
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  
  // 启用外键约束
  db.pragma("foreign_keys = ON");

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      phone TEXT,
      email TEXT,
      status INTEGER DEFAULT 1,
      last_login DATETIME,
      login_ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 网站表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      port INTEGER DEFAULT 80,
      root_path TEXT NOT NULL,
      php_version TEXT DEFAULT 'static',
      proxy_url TEXT,
      status INTEGER DEFAULT 1,
      ssl_enabled INTEGER DEFAULT 0,
      ssl_expire_date DATETIME,
      category_id INTEGER,
      remark TEXT,
      backup_count INTEGER DEFAULT 0,
      disk_usage INTEGER DEFAULT 0,
      disk_limit INTEGER DEFAULT 0,
      expire_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 迁移：添加 proxy_url 列（如果不存在）
  try {
    db.exec(`ALTER TABLE sites ADD COLUMN proxy_url TEXT`);
  } catch (e) {
    // 列已存在，忽略
  }

  // 数据库表
  db.exec(`
    CREATE TABLE IF NOT EXISTS databases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      db_type TEXT DEFAULT 'mysql',
      host TEXT DEFAULT 'localhost',
      port INTEGER DEFAULT 3306,
      charset TEXT DEFAULT 'utf8mb4',
      access_permission TEXT DEFAULT 'localhost',
      site_id INTEGER,
      backup_count INTEGER DEFAULT 0,
      size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id)
    )
  `);

  // FTP 账户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ftps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      path TEXT NOT NULL,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id)
    )
  `);

  // 计划任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS crons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      script TEXT,
      status INTEGER DEFAULT 1,
      last_run DATETIME,
      next_run DATETIME,
      run_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 计划任务执行日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cron_id INTEGER NOT NULL,
      status INTEGER DEFAULT 0,
      output TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cron_id) REFERENCES crons(id) ON DELETE CASCADE
    )
  `);

  // 软件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS software (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      version TEXT,
      category TEXT,
      status INTEGER DEFAULT 0,
      icon TEXT,
      install_path TEXT,
      config_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target TEXT,
      content TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 系统设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 备份表
  db.exec(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_id INTEGER,
      target_name TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 网站分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 监控历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitor_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpu_usage REAL DEFAULT 0,
      memory_usage REAL DEFAULT 0,
      memory_total INTEGER DEFAULT 0,
      memory_used INTEGER DEFAULT 0,
      disk_read INTEGER DEFAULT 0,
      disk_write INTEGER DEFAULT 0,
      net_in INTEGER DEFAULT 0,
      net_out INTEGER DEFAULT 0,
      load_1 REAL DEFAULT 0,
      load_5 REAL DEFAULT 0,
      load_15 REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建监控历史索引以加速时间范围查询
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitor_history_created_at
    ON monitor_history(created_at)
  `);

  // 插入默认管理员 (从环境变量读取密码，否则生成随机密码)
  const bcrypt = require("bcryptjs");
  const crypto = require("crypto");

  // 优先使用环境变量中的密码
  let defaultPassword = process.env.ADMIN_PASSWORD;
  let isRandomPassword = false;

  if (!defaultPassword) {
    // 生成随机密码
    defaultPassword = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").substring(0, 16);
    isRandomPassword = true;
  }

  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, role)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run("admin", hashedPassword, "superadmin");

  if (result.changes > 0) {
    console.log("\n========================================");
    console.log("  默认管理员账户已创建");
    console.log("  用户名: admin");
    if (isRandomPassword) {
      console.log("  密码: " + defaultPassword);
      console.log("  (随机生成，请立即修改！)");
    } else {
      console.log("  密码: (见 .env 文件)");
    }
    console.log("========================================\n");
  }

  // 插入默认设置
  const settingsStmt = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)
  `);
  settingsStmt.run("panel_name", "OpenPanel", "面板名称");
  settingsStmt.run("panel_port", "8888", "面板端口");
  settingsStmt.run("security_path", "/open_" + Math.random().toString(36).substring(7), "安全入口");
  settingsStmt.run("api_enabled", "0", "API开关");
  settingsStmt.run("api_key", "", "API密钥");

  db.close();
  
  console.log("Database initialized at:", DB_PATH);
}

// 确保数据库已初始化的标志
let dbInitialized = false;

export function getDatabase() {
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);

  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // 检查是否需要初始化（检查 sites 表是否存在）
  if (!dbInitialized) {
    try {
      const tableCheck = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sites'"
      ).get();

      if (!tableCheck) {
        // 表不存在，需要初始化
        console.log("Database tables missing, initializing...");
        db.close();
        initDatabase();
        dbInitialized = true;
        return new Database(DB_PATH);
      }
      dbInitialized = true;
    } catch (e) {
      console.error("Database check failed:", e);
    }
  }

  return db;
}
