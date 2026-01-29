import { executeCommand } from "./executor";
import * as fs from "fs/promises";
import * as path from "path";

const NGINX_SITES_AVAILABLE = "/etc/nginx/sites-available";
const NGINX_SITES_ENABLED = "/etc/nginx/sites-enabled";

export type SiteType = "php" | "static" | "proxy" | "nodejs";

export interface NginxSiteConfig {
  domain: string;
  type: SiteType;
  rootPath?: string;
  phpVersion?: string;
  proxyPort?: number;
  proxyHost?: string;
  proxyUrl?: string;  // 完整代理URL，如 http://127.0.0.1:8081
  proxyWebsocket?: boolean;  // 是否支持 WebSocket
  ssl?: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
}

/**
 * 生成 PHP 站点配置
 */
function generatePhpConfig(config: NginxSiteConfig): string {
  const { domain, rootPath = `/var/www/${domain}`, phpVersion = "8.2", ssl } = config;

  let serverBlock = `
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    root ${rootPath};
    index index.php index.html index.htm;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass unix:/run/php/php${phpVersion}-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }

    # Static files caching
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;
}
`;

  if (ssl && config.sslCertPath && config.sslKeyPath) {
    serverBlock += `
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain} www.${domain};
    root ${rootPath};
    index index.php index.html index.htm;

    ssl_certificate ${config.sslCertPath};
    ssl_certificate_key ${config.sslKeyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass unix:/run/php/php${phpVersion}-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }

    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;
}
`;
  }

  return serverBlock;
}

/**
 * 生成静态站点配置
 */
function generateStaticConfig(config: NginxSiteConfig): string {
  const { domain, rootPath = `/var/www/${domain}`, ssl } = config;

  let serverBlock = `
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    root ${rootPath};
    index index.html index.htm;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;
}
`;

  if (ssl && config.sslCertPath && config.sslKeyPath) {
    serverBlock += `
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain} www.${domain};
    root ${rootPath};
    index index.html index.htm;

    ssl_certificate ${config.sslCertPath};
    ssl_certificate_key ${config.sslKeyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;
}
`;
  }

  return serverBlock;
}

/**
 * 生成反向代理配置
 */
function generateProxyConfig(config: NginxSiteConfig): string {
  const { domain, proxyPort = 3000, proxyHost = "127.0.0.1", proxyUrl, proxyWebsocket = true, ssl } = config;

  // 确定代理目标地址
  const backendUrl = proxyUrl || `http://${proxyHost}:${proxyPort}`;

  // WebSocket 支持配置
  const wsConfig = proxyWebsocket ? `
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";` : `
        proxy_http_version 1.1;`;

  let serverBlock = `
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};

    location / {
        proxy_pass ${backendUrl};${wsConfig}
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;
        client_max_body_size 100m;
    }

    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;
}
`;

  if (ssl && config.sslCertPath && config.sslKeyPath) {
    serverBlock += `
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain} www.${domain};

    ssl_certificate ${config.sslCertPath};
    ssl_certificate_key ${config.sslKeyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass ${backendUrl};${wsConfig}
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;
        client_max_body_size 100m;
    }

    access_log /var/log/nginx/${domain}.access.log;
    error_log /var/log/nginx/${domain}.error.log;
}
`;
  }

  return serverBlock;
}

/**
 * 生成 Nginx 配置
 */
export function generateNginxConfig(config: NginxSiteConfig): string {
  switch (config.type) {
    case "php":
      return generatePhpConfig(config);
    case "static":
      return generateStaticConfig(config);
    case "proxy":
    case "nodejs":
      return generateProxyConfig(config);
    default:
      throw new Error(`Unknown site type: ${config.type}`);
  }
}

/**
 * 创建站点配置文件
 */
export async function createSiteConfig(config: NginxSiteConfig): Promise<void> {
  const configContent = generateNginxConfig(config);
  const configPath = path.join(NGINX_SITES_AVAILABLE, `${config.domain}.conf`);

  // 写入配置文件
  await fs.writeFile(configPath, configContent, "utf-8");
}

/**
 * 启用站点
 */
export async function enableSite(domain: string): Promise<void> {
  const availablePath = path.join(NGINX_SITES_AVAILABLE, `${domain}.conf`);
  const enabledPath = path.join(NGINX_SITES_ENABLED, `${domain}.conf`);

  // 创建符号链接
  await executeCommand("ln", ["-sf", availablePath, enabledPath]);
}

/**
 * 禁用站点
 */
export async function disableSite(domain: string): Promise<void> {
  // 删除所有可能的符号链接格式（有.conf和无.conf）
  const enabledPathConf = path.join(NGINX_SITES_ENABLED, `${domain}.conf`);
  const enabledPathNoConf = path.join(NGINX_SITES_ENABLED, domain);
  await executeCommand("rm", ["-f", enabledPathConf, enabledPathNoConf]);
}

/**
 * 删除站点配置
 */
export async function deleteSiteConfig(domain: string): Promise<void> {
  await disableSite(domain);
  // 删除所有可能的配置文件格式（有.conf和无.conf）
  const availablePathConf = path.join(NGINX_SITES_AVAILABLE, `${domain}.conf`);
  const availablePathNoConf = path.join(NGINX_SITES_AVAILABLE, domain);
  await executeCommand("rm", ["-f", availablePathConf, availablePathNoConf]);
}

/**
 * 测试 Nginx 配置
 */
export async function testNginxConfig(): Promise<{ valid: boolean; message: string }> {
  const result = await executeCommand("nginx", ["-t"]);

  if (result.code === 0) {
    return { valid: true, message: "Configuration test successful" };
  }

  return { valid: false, message: result.stderr };
}

/**
 * 重新加载 Nginx
 */
export async function reloadNginx(): Promise<{ success: boolean; message: string }> {
  // 先测试配置
  const testResult = await testNginxConfig();
  if (!testResult.valid) {
    return { success: false, message: testResult.message };
  }

  // 重新加载
  const result = await executeCommand("systemctl", ["reload", "nginx"]);

  if (result.code === 0) {
    return { success: true, message: "Nginx reloaded successfully" };
  }

  return { success: false, message: result.stderr };
}

/**
 * 获取 Nginx 状态
 */
export async function getNginxStatus(): Promise<{
  running: boolean;
  version: string;
  config: string;
}> {
  const statusResult = await executeCommand("systemctl", ["is-active", "nginx"]);
  const versionResult = await executeCommand("nginx", ["-v"]);

  return {
    running: statusResult.stdout.trim() === "active",
    version: versionResult.stderr.trim(), // nginx -v 输出到 stderr
    config: NGINX_SITES_AVAILABLE,
  };
}

/**
 * 列出所有站点
 */
export async function listSites(): Promise<{ name: string; enabled: boolean }[]> {
  const availableResult = await executeCommand("ls", [NGINX_SITES_AVAILABLE], { useSudo: false });
  const enabledResult = await executeCommand("ls", [NGINX_SITES_ENABLED], { useSudo: false });

  const availableFiles = availableResult.stdout.split("\n").filter((f) => f.endsWith(".conf"));
  const enabledFiles = new Set(enabledResult.stdout.split("\n").filter((f) => f.endsWith(".conf")));

  return availableFiles.map((file) => ({
    name: file.replace(".conf", ""),
    enabled: enabledFiles.has(file),
  }));
}
