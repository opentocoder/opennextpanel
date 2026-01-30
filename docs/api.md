# OpenPanel API 文档

## 概述

OpenPanel 提供 RESTful API 用于自动化管理。所有 API 需要身份验证。

## 认证

### 获取 Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

响应：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "superadmin"
  }
}
```

### 使用 Token

在请求头中携带 Token：
```http
Authorization: Bearer <token>
```

或通过 Cookie（登录后自动设置）。

---

## 网站管理

### 获取网站列表

```http
GET /api/sites
```

响应：
```json
{
  "sites": [
    {
      "id": 1,
      "name": "example",
      "domain": "example.com",
      "status": "running",
      "phpVersion": "8.2",
      "sslEnabled": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 创建网站

```http
POST /api/sites
Content-Type: application/json

{
  "name": "mysite",
  "domain": "mysite.com",
  "type": "php",
  "phpVersion": "8.2"
}
```

### 获取单个网站

```http
GET /api/sites/[id]
```

### 更新网站

```http
PUT /api/sites/[id]
Content-Type: application/json

{
  "domain": "newdomain.com",
  "phpVersion": "8.3"
}
```

### 删除网站

```http
DELETE /api/sites/[id]
```

### 申请 SSL 证书

```http
POST /api/sites/[id]
Content-Type: application/json

{
  "action": "apply_ssl"
}
```

### 获取 Nginx 配置

```http
POST /api/sites/[id]
Content-Type: application/json

{
  "action": "get_nginx_config"
}
```

### 保存 Nginx 配置

```http
POST /api/sites/[id]
Content-Type: application/json

{
  "action": "save_nginx_config",
  "config": "server { ... }"
}
```

---

## 数据库管理

### 获取数据库列表

```http
GET /api/database
```

响应：
```json
{
  "databases": [
    {
      "name": "wordpress_db",
      "size": "15.2 MB",
      "tables": 12,
      "charset": "utf8mb4"
    }
  ]
}
```

### 创建数据库

```http
POST /api/database
Content-Type: application/json

{
  "name": "new_database",
  "charset": "utf8mb4"
}
```

### 创建数据库用户

```http
POST /api/database
Content-Type: application/json

{
  "action": "create_user",
  "username": "db_user",
  "password": "secure_password",
  "database": "new_database",
  "privileges": ["SELECT", "INSERT", "UPDATE", "DELETE"]
}
```

### 删除数据库

```http
DELETE /api/database?name=database_name
```

### 备份数据库

```http
POST /api/database/backup
Content-Type: application/json

{
  "database": "wordpress_db"
}
```

---

## 软件管理

### 获取软件列表

```http
GET /api/software
```

响应：
```json
{
  "software": [
    {
      "id": "nginx",
      "name": "Nginx",
      "version": "1.24.0",
      "status": "active",
      "serviceName": "nginx"
    }
  ]
}
```

### 安装软件

```http
POST /api/software/[name]
Content-Type: application/json

{
  "action": "install",
  "version": "8.2"
}
```

### 卸载软件

```http
PUT /api/software/[name]
Content-Type: application/json

{
  "action": "uninstall"
}
```

### 启动服务

```http
POST /api/software/[name]
```

### 停止服务

```http
DELETE /api/software/[name]
```

---

## 文件管理

### 获取文件列表

```http
GET /api/files?path=/var/www
```

响应：
```json
{
  "files": [
    {
      "name": "index.html",
      "type": "file",
      "size": 1024,
      "permissions": "644",
      "modified": "2024-01-01T00:00:00Z"
    }
  ],
  "path": "/var/www"
}
```

### 读取文件内容

```http
GET /api/files/content?path=/var/www/index.html
```

### 保存文件内容

```http
POST /api/files/content
Content-Type: application/json

{
  "path": "/var/www/index.html",
  "content": "<html>...</html>"
}
```

### 上传文件

```http
POST /api/files/upload
Content-Type: multipart/form-data

path=/var/www
file=@localfile.txt
```

### 创建目录

```http
POST /api/files
Content-Type: application/json

{
  "action": "mkdir",
  "path": "/var/www/newdir"
}
```

### 删除文件/目录

```http
DELETE /api/files?path=/var/www/oldfile.txt
```

### 压缩文件

```http
POST /api/files/compress
Content-Type: application/json

{
  "files": ["/var/www/file1.txt", "/var/www/file2.txt"],
  "destination": "/var/www/archive.zip"
}
```

### 解压文件

```http
POST /api/files/extract
Content-Type: application/json

{
  "file": "/var/www/archive.zip",
  "destination": "/var/www/extracted"
}
```

---

## 系统管理

### 获取系统信息

```http
GET /api/system
```

响应：
```json
{
  "hostname": "server",
  "os": "Ubuntu 24.04",
  "kernel": "6.5.0-generic",
  "uptime": "10 days",
  "cpu": {
    "model": "Intel Xeon",
    "cores": 4,
    "usage": 25.5
  },
  "memory": {
    "total": 8192,
    "used": 4096,
    "free": 4096
  },
  "disk": {
    "total": 100,
    "used": 45,
    "free": 55
  }
}
```

### 系统控制

```http
POST /api/system/control
Content-Type: application/json

{
  "action": "reboot"  // reboot, shutdown, restart_panel
}
```

---

## 监控数据

### 获取监控数据

```http
GET /api/monitor
```

响应：
```json
{
  "cpu": 25.5,
  "memory": 50.2,
  "disk": 45.0,
  "network": {
    "rx": 1024000,
    "tx": 512000
  },
  "load": [1.5, 1.2, 0.9]
}
```

### 获取历史监控数据

```http
GET /api/monitor?period=24h
```

---

## Docker 管理

### 获取容器列表

```http
GET /api/docker
```

### 创建容器

```http
POST /api/docker
Content-Type: application/json

{
  "image": "nginx:latest",
  "name": "my-nginx",
  "ports": ["80:80"],
  "volumes": ["/data:/var/www"]
}
```

### 启动/停止容器

```http
POST /api/docker/[container_id]
Content-Type: application/json

{
  "action": "start"  // start, stop, restart, remove
}
```

---

## 定时任务

### 获取任务列表

```http
GET /api/cron
```

### 创建定时任务

```http
POST /api/cron
Content-Type: application/json

{
  "name": "备份任务",
  "schedule": "0 2 * * *",
  "command": "/opt/scripts/backup.sh",
  "enabled": true
}
```

### 更新定时任务

```http
PUT /api/cron
Content-Type: application/json

{
  "id": 1,
  "enabled": false
}
```

### 删除定时任务

```http
DELETE /api/cron?id=1
```

---

## 用户管理

### 获取用户列表

```http
GET /api/users
```

### 创建用户

```http
POST /api/users
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "secure_password",
  "role": "user",
  "quota": {
    "sites": 10,
    "databases": 10,
    "storage": 10240
  }
}
```

### 更新用户

```http
PUT /api/users
Content-Type: application/json

{
  "id": 2,
  "password": "new_password",
  "status": "active"
}
```

### 删除用户

```http
DELETE /api/users?id=2
```

---

## 设置

### 获取设置

```http
GET /api/settings
```

### 修改密码

```http
POST /api/settings
Content-Type: application/json

{
  "action": "change_password",
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

## 错误响应

所有 API 在出错时返回统一格式：

```json
{
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 常见错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 速率限制

- 默认：100 请求/分钟
- 登录接口：10 请求/分钟

超出限制返回 `429 Too Many Requests`。

---

## SDK

### Node.js

```javascript
const OpenPanel = require('openpanel-sdk');

const client = new OpenPanel({
  url: 'http://your-server:8888',
  token: 'your-api-token'
});

// 获取网站列表
const sites = await client.sites.list();

// 创建网站
await client.sites.create({
  name: 'mysite',
  domain: 'mysite.com'
});
```

### Python

```python
from openpanel import OpenPanel

client = OpenPanel(
    url='http://your-server:8888',
    token='your-api-token'
)

# 获取网站列表
sites = client.sites.list()

# 创建网站
client.sites.create(name='mysite', domain='mysite.com')
```

---

*API 文档持续更新中，如有问题请提交 Issue。*
