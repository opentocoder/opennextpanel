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
  sqlite: {
    apt: ["sqlite3"],
    yum: ["sqlite"],
    dnf: ["sqlite"],
    pacman: ["sqlite"],
    apk: ["sqlite"],
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
  // Web 服务器
  apache: {
    apt: ["apache2"],
    yum: ["httpd"],
    dnf: ["httpd"],
    pacman: ["apache"],
    apk: ["apache2"],
  },
  openresty: {
    apt: ["openresty"],
    yum: ["openresty"],
    dnf: ["openresty"],
    pacman: ["openresty"],
    apk: ["openresty"],
  },
  caddy: {
    apt: ["caddy"],
    yum: ["caddy"],
    dnf: ["caddy"],
    pacman: ["caddy"],
    apk: ["caddy"],
  },
  // PHP 旧版本
  "php74": {
    apt: ["php7.4", "php7.4-fpm", "php7.4-cli", "php7.4-mysql", "php7.4-curl", "php7.4-gd", "php7.4-mbstring", "php7.4-xml", "php7.4-zip"],
    yum: ["php74", "php74-php-fpm", "php74-php-cli", "php74-php-mysqlnd"],
    dnf: ["php74", "php74-php-fpm", "php74-php-cli", "php74-php-mysqlnd"],
    pacman: ["php"],
    apk: ["php7", "php7-fpm"],
  },
  "php56": {
    apt: ["php5.6", "php5.6-fpm", "php5.6-cli", "php5.6-mysql", "php5.6-curl", "php5.6-gd", "php5.6-mbstring", "php5.6-xml"],
    yum: ["php56", "php56-php-fpm", "php56-php-cli"],
    dnf: ["php56", "php56-php-fpm", "php56-php-cli"],
    pacman: ["php"],
    apk: ["php5", "php5-fpm"],
  },
  // 运行时
  java: {
    apt: ["default-jdk"],
    yum: ["java-17-openjdk", "java-17-openjdk-devel"],
    dnf: ["java-17-openjdk", "java-17-openjdk-devel"],
    pacman: ["jdk-openjdk"],
    apk: ["openjdk17"],
  },
  go: {
    apt: ["golang"],
    yum: ["golang"],
    dnf: ["golang"],
    pacman: ["go"],
    apk: ["go"],
  },
  rust: {
    apt: ["rustc", "cargo"],
    yum: ["rust", "cargo"],
    dnf: ["rust", "cargo"],
    pacman: ["rust"],
    apk: ["rust", "cargo"],
  },
  // Java 应用服务器
  tomcat: {
    apt: ["tomcat10"],
    yum: ["tomcat"],
    dnf: ["tomcat"],
    pacman: ["tomcat10"],
    apk: ["tomcat-native"],
  },
  // 工具
  vsftpd: {
    apt: ["vsftpd"],
    yum: ["vsftpd"],
    dnf: ["vsftpd"],
    pacman: ["vsftpd"],
    apk: ["vsftpd"],
  },
  composer: {
    apt: ["composer"],
    yum: ["composer"],
    dnf: ["composer"],
    pacman: ["composer"],
    apk: ["composer"],
  },
  supervisor: {
    apt: ["supervisor"],
    yum: ["supervisor"],
    dnf: ["supervisor"],
    pacman: ["supervisor"],
    apk: ["supervisor"],
  },
  adminer: {
    apt: ["adminer"],
    yum: ["adminer"],
    dnf: ["adminer"],
    pacman: ["adminer"],
    apk: ["adminer"],
  },
  // 安全
  certbot: {
    apt: ["certbot", "python3-certbot-nginx"],
    yum: ["certbot", "python3-certbot-nginx"],
    dnf: ["certbot", "python3-certbot-nginx"],
    pacman: ["certbot", "certbot-nginx"],
    apk: ["certbot", "certbot-nginx"],
  },
  clamav: {
    apt: ["clamav", "clamav-daemon"],
    yum: ["clamav", "clamav-update", "clamd"],
    dnf: ["clamav", "clamav-update", "clamd"],
    pacman: ["clamav"],
    apk: ["clamav"],
  },
  // 消息队列
  rabbitmq: {
    apt: ["rabbitmq-server"],
    yum: ["rabbitmq-server"],
    dnf: ["rabbitmq-server"],
    pacman: ["rabbitmq"],
    apk: ["rabbitmq-server"],
  },
  // 搜索引擎
  elasticsearch: {
    apt: ["elasticsearch"],
    yum: ["elasticsearch"],
    dnf: ["elasticsearch"],
    pacman: ["elasticsearch"],
    apk: ["elasticsearch"],
  },
  // 监控
  prometheus: {
    apt: ["prometheus"],
    yum: ["prometheus"],
    dnf: ["prometheus"],
    pacman: ["prometheus"],
    apk: ["prometheus"],
  },
  grafana: {
    apt: ["grafana"],
    yum: ["grafana"],
    dnf: ["grafana"],
    pacman: ["grafana"],
    apk: ["grafana"],
  },
  // 常用工具
  git: {
    apt: ["git"],
    yum: ["git"],
    dnf: ["git"],
    pacman: ["git"],
    apk: ["git"],
  },
  vim: {
    apt: ["vim"],
    yum: ["vim-enhanced"],
    dnf: ["vim-enhanced"],
    pacman: ["vim"],
    apk: ["vim"],
  },
  htop: {
    apt: ["htop"],
    yum: ["htop"],
    dnf: ["htop"],
    pacman: ["htop"],
    apk: ["htop"],
  },
  zip: {
    apt: ["zip", "unzip"],
    yum: ["zip", "unzip"],
    dnf: ["zip", "unzip"],
    pacman: ["zip", "unzip"],
    apk: ["zip", "unzip"],
  },
  // Web 终端
  ttyd: {
    apt: ["ttyd"],
    yum: ["ttyd"],
    dnf: ["ttyd"],
    pacman: ["ttyd"],
    apk: ["ttyd"],
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

// 添加 OpenResty 官方源 (Ubuntu/Debian)
async function addOpenRestyRepo(): Promise<{ success: boolean; message: string }> {
  try {
    // 检查是否已添加
    const { stdout } = await execAsync("ls /etc/apt/sources.list.d/ 2>/dev/null || true");
    if (stdout.includes("openresty")) {
      return { success: true, message: "OpenResty repo already added" };
    }

    console.log("Adding OpenResty official repo...");

    // 安装依赖
    await execAsync("sudo apt-get install -y wget gnupg ca-certificates");

    // 添加 GPG 密钥
    await execAsync("wget -O - https://openresty.org/package/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/openresty.gpg");

    // 获取系统代号
    const { stdout: codename } = await execAsync("lsb_release -sc");
    const distro = codename.trim();

    // 添加软件源
    await execAsync(`echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/openresty.gpg] http://openresty.org/package/ubuntu ${distro} main" | sudo tee /etc/apt/sources.list.d/openresty.list`);

    await execAsync("sudo apt-get update");
    return { success: true, message: "OpenResty repo added successfully" };
  } catch (error: any) {
    console.log("Failed to add OpenResty repo:", error.message);
    return { success: false, message: error.message };
  }
}

// 添加 Docker 官方源 (Ubuntu/Debian)
async function addDockerRepo(): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execAsync("ls /etc/apt/sources.list.d/ 2>/dev/null || true");
    if (stdout.includes("docker")) {
      return { success: true, message: "Docker repo already added" };
    }

    console.log("Adding Docker official repo...");

    await execAsync("sudo apt-get install -y ca-certificates curl");
    await execAsync("sudo install -m 0755 -d /etc/apt/keyrings");
    await execAsync("sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc");
    await execAsync("sudo chmod a+r /etc/apt/keyrings/docker.asc");

    const { stdout: codename } = await execAsync("lsb_release -sc");
    const distro = codename.trim();

    await execAsync(`echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${distro} stable" | sudo tee /etc/apt/sources.list.d/docker.list`);

    await execAsync("sudo apt-get update");
    return { success: true, message: "Docker repo added successfully" };
  } catch (error: any) {
    console.log("Failed to add Docker repo:", error.message);
    return { success: false, message: error.message };
  }
}

// 添加 MongoDB 官方源 (Ubuntu/Debian)
async function addMongoDBRepo(): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execAsync("ls /etc/apt/sources.list.d/ 2>/dev/null || true");
    if (stdout.includes("mongodb")) {
      return { success: true, message: "MongoDB repo already added" };
    }

    console.log("Adding MongoDB official repo...");

    await execAsync("sudo apt-get install -y gnupg curl");
    await execAsync("curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg");

    const { stdout: codename } = await execAsync("lsb_release -sc");
    const distro = codename.trim();

    await execAsync(`echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu ${distro}/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list`);

    await execAsync("sudo apt-get update");
    return { success: true, message: "MongoDB repo added successfully" };
  } catch (error: any) {
    console.log("Failed to add MongoDB repo:", error.message);
    return { success: false, message: error.message };
  }
}

// 配置 MySQL/MariaDB 允许 Docker 容器连接
async function configureMySQLForDocker(): Promise<{ success: boolean; message: string }> {
  console.log("Configuring MySQL/MariaDB for Docker access...");

  try {
    // 查找配置文件
    const configPaths = [
      "/etc/mysql/mariadb.conf.d/50-server.cnf",
      "/etc/mysql/mysql.conf.d/mysqld.cnf",
      "/etc/my.cnf.d/server.cnf",
      "/etc/my.cnf",
    ];

    let configFile = "";
    for (const path of configPaths) {
      try {
        await execAsync(`test -f ${path}`);
        configFile = path;
        break;
      } catch {
        continue;
      }
    }

    if (configFile) {
      // 修改 bind-address 为 0.0.0.0 允许所有连接
      await execAsync(`sudo sed -i 's/^bind-address.*=.*/bind-address = 0.0.0.0/' ${configFile}`);
      // 如果没有 bind-address 行，添加一个
      await execAsync(`sudo grep -q "^bind-address" ${configFile} || sudo sed -i '/\\[mysqld\\]/a bind-address = 0.0.0.0' ${configFile}`);
      console.log(`Updated bind-address in ${configFile}`);
    }

    // 重启服务使配置生效
    try {
      await execAsync("sudo systemctl restart mariadb 2>/dev/null || sudo systemctl restart mysql 2>/dev/null");
    } catch {
      console.log("Service restart skipped");
    }

    return { success: true, message: "MySQL 已配置为允许 Docker 连接" };
  } catch (error: any) {
    console.log("Failed to configure MySQL for Docker:", error.message);
    return { success: false, message: error.message };
  }
}

// 配置 phpMyAdmin Nginx
async function configurePhpMyAdmin(): Promise<{ success: boolean; message: string }> {
  const fs = require("fs").promises;

  try {
    // 检查 phpMyAdmin 是否安装
    try {
      await fs.access("/usr/share/phpmyadmin");
    } catch {
      return { success: false, message: "phpMyAdmin 未安装" };
    }

    // 检测 PHP-FPM socket
    let phpSocket = "/run/php/php8.2-fpm.sock";
    const phpVersions = ["8.3", "8.2", "8.1", "8.0", "7.4"];
    for (const ver of phpVersions) {
      try {
        await fs.access(`/run/php/php${ver}-fpm.sock`);
        phpSocket = `/run/php/php${ver}-fpm.sock`;
        break;
      } catch {
        continue;
      }
    }

    // 创建 Nginx 配置
    const nginxConfig = `# phpMyAdmin Nginx Configuration
# Auto-generated by OpenPanel
server {
    listen 8082;
    server_name _;
    root /usr/share/phpmyadmin;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpSocket};
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }
}
`;

    await fs.writeFile("/etc/nginx/sites-available/phpmyadmin.conf", nginxConfig);
    await execAsync("sudo ln -sf /etc/nginx/sites-available/phpmyadmin.conf /etc/nginx/sites-enabled/");
    await execAsync("sudo nginx -t && sudo systemctl reload nginx");

    return { success: true, message: "phpMyAdmin 已配置，访问端口: 8082" };
  } catch (error: any) {
    console.log("Failed to configure phpMyAdmin:", error.message);
    return { success: false, message: error.message };
  }
}

// 删除 phpMyAdmin Nginx 配置
async function removePhpMyAdminConfig(): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync("sudo rm -f /etc/nginx/sites-enabled/phpmyadmin.conf /etc/nginx/sites-available/phpmyadmin.conf");
    await execAsync("sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true");
    return { success: true, message: "phpMyAdmin 配置已删除" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 配置 Adminer Nginx
async function configureAdminer(): Promise<{ success: boolean; message: string }> {
  const fs = require("fs").promises;

  try {
    // Adminer 通常安装为单文件，需要下载
    const adminerPath = "/var/www/adminer";
    try {
      await fs.access(adminerPath);
    } catch {
      await fs.mkdir(adminerPath, { recursive: true });
    }

    // 下载 Adminer
    try {
      await execAsync("curl -sL https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php -o /var/www/adminer/index.php");
    } catch {
      // 如果下载失败，尝试备用地址
      await execAsync("curl -sL https://www.adminer.org/latest.php -o /var/www/adminer/index.php");
    }

    // 检测 PHP-FPM socket
    let phpSocket = "/run/php/php8.2-fpm.sock";
    const phpVersions = ["8.3", "8.2", "8.1", "8.0", "7.4"];
    for (const ver of phpVersions) {
      try {
        await fs.access(`/run/php/php${ver}-fpm.sock`);
        phpSocket = `/run/php/php${ver}-fpm.sock`;
        break;
      } catch {
        continue;
      }
    }

    // 创建 Nginx 配置
    const nginxConfig = `# Adminer Nginx Configuration
# Auto-generated by OpenPanel
server {
    listen 8083;
    server_name _;
    root /var/www/adminer;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpSocket};
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
`;

    await fs.writeFile("/etc/nginx/sites-available/adminer.conf", nginxConfig);
    await execAsync("sudo ln -sf /etc/nginx/sites-available/adminer.conf /etc/nginx/sites-enabled/");
    await execAsync("sudo nginx -t && sudo systemctl reload nginx");

    return { success: true, message: "Adminer 已配置，访问端口: 8083" };
  } catch (error: any) {
    console.log("Failed to configure Adminer:", error.message);
    return { success: false, message: error.message };
  }
}

// 删除 Adminer 配置
async function removeAdminerConfig(): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync("sudo rm -f /etc/nginx/sites-enabled/adminer.conf /etc/nginx/sites-available/adminer.conf");
    await execAsync("sudo rm -rf /var/www/adminer");
    await execAsync("sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true");
    return { success: true, message: "Adminer 配置已删除" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 创建 MySQL/MariaDB 面板用户（使用随机密码）
async function createMySQLPanelUser(): Promise<{ success: boolean; message: string }> {
  const crypto = require("crypto");
  const fs = require("fs");
  const path = require("path");

  // 生成随机密码
  const password = crypto.randomBytes(16).toString("base64").replace(/[+/=]/g, "").substring(0, 20);
  const username = "openpanel";

  console.log("Creating MySQL panel user...");

  try {
    // 等待 MySQL 服务启动
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 尝试使用 socket 认证连接（MariaDB/MySQL 默认方式）
    // 创建 localhost 和 Docker 网段 (172.17.%) 的用户
    // 使用 CREATE OR REPLACE (MariaDB) 或先删除再创建，确保密码被更新
    const createUserSQL = `
      DROP USER IF EXISTS '${username}'@'localhost';
      DROP USER IF EXISTS '${username}'@'172.17.%';
      DROP USER IF EXISTS '${username}'@'172.18.%';
      CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}';
      CREATE USER '${username}'@'172.17.%' IDENTIFIED BY '${password}';
      CREATE USER '${username}'@'172.18.%' IDENTIFIED BY '${password}';
      GRANT ALL PRIVILEGES ON *.* TO '${username}'@'localhost' WITH GRANT OPTION;
      GRANT ALL PRIVILEGES ON *.* TO '${username}'@'172.17.%' WITH GRANT OPTION;
      GRANT ALL PRIVILEGES ON *.* TO '${username}'@'172.18.%' WITH GRANT OPTION;
      FLUSH PRIVILEGES;
    `;

    await execAsync(`sudo mysql -u root -e "${createUserSQL}"`);

    // 更新 .env 文件
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // 更新或添加 MySQL 配置
    if (envContent.includes("MYSQL_ROOT_USER=")) {
      envContent = envContent.replace(/MYSQL_ROOT_USER=.*/, `MYSQL_ROOT_USER=${username}`);
    } else {
      envContent += `\nMYSQL_ROOT_USER=${username}`;
    }

    if (envContent.includes("MYSQL_ROOT_PASSWORD=")) {
      envContent = envContent.replace(/MYSQL_ROOT_PASSWORD=.*/, `MYSQL_ROOT_PASSWORD=${password}`);
    } else {
      envContent += `\nMYSQL_ROOT_PASSWORD=${password}`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log(`MySQL panel user '${username}' created successfully`);
    return { success: true, message: `MySQL 用户 '${username}' 创建成功，密码已保存到 .env` };
  } catch (error: any) {
    console.log("Failed to create MySQL panel user:", error.message);
    return { success: false, message: `创建 MySQL 用户失败: ${error.message}` };
  }
}

// 添加 Elasticsearch 官方源 (Ubuntu/Debian)
async function addElasticsearchRepo(): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execAsync("ls /etc/apt/sources.list.d/ 2>/dev/null || true");
    if (stdout.includes("elastic")) {
      return { success: true, message: "Elasticsearch repo already added" };
    }

    console.log("Adding Elasticsearch official repo...");

    await execAsync("wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg");
    await execAsync("sudo apt-get install -y apt-transport-https");
    await execAsync('echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list');

    await execAsync("sudo apt-get update");
    return { success: true, message: "Elasticsearch repo added successfully" };
  } catch (error: any) {
    console.log("Failed to add Elasticsearch repo:", error.message);
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

  // OpenResty 需要添加官方源 (Ubuntu/Debian)
  if (softwareId === "openresty" && pm === "apt") {
    const repoResult = await addOpenRestyRepo();
    logs += `Repo: ${repoResult.message}\n`;
    if (!repoResult.success) {
      return { success: false, message: repoResult.message, logs };
    }
  }

  // Docker 需要添加官方源 (Ubuntu/Debian)
  if (softwareId === "docker" && pm === "apt") {
    const repoResult = await addDockerRepo();
    logs += `Repo: ${repoResult.message}\n`;
  }

  // MongoDB 需要添加官方源 (Ubuntu/Debian)
  if (softwareId === "mongodb" && pm === "apt") {
    const repoResult = await addMongoDBRepo();
    logs += `Repo: ${repoResult.message}\n`;
  }

  // Elasticsearch 需要添加官方源 (Ubuntu/Debian)
  if (softwareId === "elasticsearch" && pm === "apt") {
    const repoResult = await addElasticsearchRepo();
    logs += `Repo: ${repoResult.message}\n`;
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

    let logs = stdout + "\n" + stderr;

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

    // Docker 安装后配置 DNS
    if (softwareId === "docker") {
      try {
        const { configureDockerDNS } = await import("./docker");
        const dnsResult = await configureDockerDNS();
        logs += `\nDocker DNS: ${dnsResult.message}`;
      } catch (e: any) {
        logs += `\nDocker DNS config warning: ${e.message}`;
      }
    }

    // MySQL/MariaDB 安装后配置 Docker 访问并创建面板用户
    if (softwareId === "mysql" || softwareId === "mariadb") {
      // 先配置允许 Docker 连接
      const dockerConfigResult = await configureMySQLForDocker();
      logs += `\n${dockerConfigResult.message}`;

      // 再创建面板用户
      const panelUserResult = await createMySQLPanelUser();
      logs += `\n${panelUserResult.message}`;
    }

    // phpMyAdmin 安装后配置 Nginx
    if (softwareId === "phpmyadmin") {
      try {
        const phpMyAdminConfig = await configurePhpMyAdmin();
        logs += `\n${phpMyAdminConfig.message}`;
      } catch (e: any) {
        logs += `\nphpMyAdmin 配置警告: ${e.message}`;
      }
    }

    // Adminer 安装后配置 Nginx
    if (softwareId === "adminer") {
      try {
        const adminerConfig = await configureAdminer();
        logs += `\n${adminerConfig.message}`;
      } catch (e: any) {
        logs += `\nAdminer 配置警告: ${e.message}`;
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

    let logs = stdout + "\n" + stderr;

    // phpMyAdmin 卸载后删除 Nginx 配置
    if (softwareId === "phpmyadmin") {
      const configResult = await removePhpMyAdminConfig();
      logs += `\n${configResult.message}`;
    }

    // Adminer 卸载后删除 Nginx 配置和文件
    if (softwareId === "adminer") {
      const configResult = await removeAdminerConfig();
      logs += `\n${configResult.message}`;
    }

    return {
      success: true,
      message: `Successfully uninstalled ${softwareId}`,
      logs,
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
