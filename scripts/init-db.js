#!/usr/bin/env node
/**
 * OpenPanel 数据库初始化脚本
 * 用法: node scripts/init-db.js [--password <password>]
 *
 * 此脚本用于初始化 SQLite 数据库表结构和默认管理员账户
 * 不执行任何外部命令，只进行数据库操作
 */

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// 解析命令行参数
const args = process.argv.slice(2);
let customPassword = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--password" && args[i + 1]) {
    customPassword = args[i + 1];
    break;
  }
}

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "panel.db");

console.log("Initializing database at:", DB_PATH);

// 确保目录存在
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
    backup_count INTEGER DEFAULT 0,
    size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// FTP 账户表
db.exec(`
  CREATE TABLE IF NOT EXISTS ftps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// 创建监控历史索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_monitor_history_created_at
  ON monitor_history(created_at)
`);

// 生成或使用自定义密码
const adminPassword = customPassword || crypto.randomBytes(8).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);
const hashedPassword = bcrypt.hashSync(adminPassword, 10);

// 检查是否已有 admin 用户
const existingAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");

if (existingAdmin) {
  // 更新密码
  db.prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?").run(hashedPassword, "admin");
  console.log("Admin user password updated.");
} else {
  // 插入新用户
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "superadmin");
  console.log("Admin user created.");
}

// 插入默认设置
const settingsStmt = db.prepare("INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)");
settingsStmt.run("panel_name", "OpenPanel", "面板名称");
settingsStmt.run("panel_port", "8888", "面板端口");
// 安全入口默认为空（禁用），用户可在设置中启用
settingsStmt.run("security_path", "", "安全入口");
settingsStmt.run("api_enabled", "0", "API开关");
settingsStmt.run("api_key", "", "API密钥");

db.close();

console.log("");
console.log("========================================");
console.log("  数据库初始化完成!");
console.log("========================================");
console.log("  管理员账户: admin");
console.log("  管理员密码: " + adminPassword);
console.log("========================================");
console.log("");

// 如果有.env文件，更新 ADMIN_PASSWORD
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf-8");
  if (envContent.includes("ADMIN_PASSWORD=")) {
    envContent = envContent.replace(/ADMIN_PASSWORD=.*/, "ADMIN_PASSWORD=" + adminPassword);
  } else {
    envContent += "\nADMIN_PASSWORD=" + adminPassword;
  }
  fs.writeFileSync(envPath, envContent);
  console.log(".env file updated with ADMIN_PASSWORD");
}
