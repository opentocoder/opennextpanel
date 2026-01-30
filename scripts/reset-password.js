#!/usr/bin/env node
/**
 * OpenNextPanel 密码重置脚本
 * 用法: node scripts/reset-password.js [新密码]
 *
 * 示例:
 *   node scripts/reset-password.js              # 自动生成随机密码
 *   node scripts/reset-password.js MyNewPass123 # 使用指定密码
 */

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// 获取新密码（命令行参数或自动生成）
const newPassword = process.argv[2] || crypto.randomBytes(8).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 12);

// 数据库路径
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "panel.db");

// 检查数据库是否存在
if (!fs.existsSync(DB_PATH)) {
  console.error("错误: 数据库文件不存在:", DB_PATH);
  console.error("请先运行 node scripts/init-db.js 初始化数据库");
  process.exit(1);
}

try {
  const db = new Database(DB_PATH);

  // 检查 admin 用户是否存在
  const admin = db.prepare("SELECT id, username FROM users WHERE username = ?").get("admin");

  if (!admin) {
    console.error("错误: admin 用户不存在");
    console.error("请运行 node scripts/init-db.js 创建管理员账户");
    db.close();
    process.exit(1);
  }

  // 加密新密码
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  // 更新密码
  db.prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?").run(hashedPassword, "admin");

  db.close();

  console.log("");
  console.log("========================================");
  console.log("  密码重置成功!");
  console.log("========================================");
  console.log("  用户名: admin");
  console.log("  新密码: " + newPassword);
  console.log("========================================");
  console.log("");
  console.log("请立即登录并修改密码!");
  console.log("");

  // 更新 .env 文件中的密码
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("ADMIN_PASSWORD=")) {
      envContent = envContent.replace(/ADMIN_PASSWORD=.*/, "ADMIN_PASSWORD=" + newPassword);
    } else {
      envContent += "\nADMIN_PASSWORD=" + newPassword;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(".env 文件已更新");
  }

} catch (error) {
  console.error("密码重置失败:", error.message);
  process.exit(1);
}
