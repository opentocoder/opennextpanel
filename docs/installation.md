# OpenNextPanel 安装指南

## 系统要求

### 支持的操作系统
- Ubuntu 22.04 LTS (推荐)
- Ubuntu 24.04 LTS
- Debian 11
- Debian 12

### 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 硬盘 | 20 GB | 50 GB+ |
| 网络 | 有公网 IP | 有公网 IP |

### 端口要求
确保以下端口未被占用且防火墙已放行：
- 8888 (面板)
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH)

---

## 一键安装

### 方式一：在线安装脚本

```bash
curl -sSL https://raw.githubusercontent.com/opentocoder/opennextpanel/master/scripts/install.sh | bash
```

### 方式二：wget 安装

```bash
wget -qO- https://raw.githubusercontent.com/opentocoder/opennextpanel/master/scripts/install.sh | bash
```

---

## 手动安装

### 1. 安装依赖

```bash
# 更新系统
apt update && apt upgrade -y

# 安装基础依赖
apt install -y curl wget git build-essential

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证安装
node -v  # 应显示 v20.x.x
npm -v   # 应显示 10.x.x
```

### 2. 克隆项目

```bash
cd /opt
git clone https://github.com/opentocoder/opennextpanel.git
cd opennextpanel
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

```bash
cp .env.example .env

# 生成 JWT 密钥
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
```

### 5. 初始化数据库

```bash
# 创建数据目录
mkdir -p data

# 初始化 (首次运行自动创建表和管理员账户)
npm run build
```

### 6. 配置 Systemd 服务

```bash
cat > /etc/systemd/system/opennextpanel.service << 'EOF'
[Unit]
Description=OpenNextPanel Server Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/opennextpanel
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8888

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
systemctl daemon-reload
systemctl enable opennextpanel
systemctl start opennextpanel
```

### 7. 配置防火墙

```bash
# UFW (Ubuntu)
ufw allow 8888/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# 或 firewalld (Debian)
firewall-cmd --permanent --add-port=8888/tcp
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

---

## 验证安装

### 检查服务状态

```bash
systemctl status opennextpanel
```

应显示 `active (running)`。

### 检查端口

```bash
ss -tlnp | grep 8888
```

### 访问面板

打开浏览器访问：`http://服务器IP:8888`

---

## 初始账户与密码配置

### 面板管理员密码

面板管理员密码有两种配置方式：

**方式一：自动生成（推荐）**

如果不在 `.env` 中设置 `ADMIN_PASSWORD`，系统会自动生成随机密码：

```bash
# 运行初始化脚本时会显示生成的密码
node scripts/init-db.js

# 输出示例：
# ========================================
#   数据库初始化完成!
# ========================================
#   管理员账户: admin
#   管理员密码: xK9mP2nQ5rT8
# ========================================

# 密码会自动写入 .env 文件
cat .env | grep ADMIN_PASSWORD
# ADMIN_PASSWORD=xK9mP2nQ5rT8
```

**方式二：手动指定**

在 `.env` 中提前设置密码：

```bash
# 编辑 .env
echo "ADMIN_PASSWORD=YourSecurePassword123" >> .env

# 运行初始化（使用指定的密码）
node scripts/init-db.js
```

或通过命令行参数指定：

```bash
node scripts/init-db.js --password YourSecurePassword123
```

### MySQL/MariaDB 密码

安装 MariaDB 或 MySQL 时，系统会：

1. **自动生成 root 密码**并保存到 `/opt/opennextpanel/.env`
2. 创建面板专用用户（如需要）
3. 配置远程访问权限

```bash
# 查看生成的 MySQL 密码
cat /opt/opennextpanel/.env | grep MYSQL_ROOT_PASSWORD

# 也可以在安装前手动指定密码
echo "MYSQL_ROOT_PASSWORD=YourMySQLPassword" >> .env
```

### 密码存储位置

| 密码类型 | 存储位置 | 环境变量 |
|----------|----------|----------|
| 面板管理员 | `.env` | `ADMIN_PASSWORD` |
| MySQL root | `.env` | `MYSQL_ROOT_PASSWORD` |
| 网站数据库 | 面板数据库 + `.credentials/` | - |

默认用户名：`admin`

---

## 安装后配置

### 1. 修改默认密码

登录后立即在「设置」页面修改默认密码。

### 2. 开启安全入口

在「设置」→「安全设置」中配置安全入口。

### 3. 安装基础软件

在「软件中心」安装：
- Nginx (必需)
- PHP 8.x (按需)
- MariaDB (按需)

---

## Docker 应用连接数据库

### Docker WordPress 连接服务器 MySQL/MariaDB

当通过 Docker 应用商店安装 WordPress 时，需要连接到服务器上安装的 MySQL/MariaDB 数据库。

#### 步骤 1：确保 MySQL 已安装并允许 Docker 网络访问

在软件中心安装 MariaDB 后，系统会自动配置允许 Docker 容器访问。

MySQL 用户权限配置（自动完成）：
```sql
-- 允许来自 Docker 网络的连接
CREATE USER 'root'@'172.17.%' IDENTIFIED BY 'your_password';
CREATE USER 'root'@'172.18.%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'172.17.%' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'172.18.%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

#### 步骤 2：获取服务器内网 IP

Docker 容器需要通过服务器的 Docker 网桥 IP 连接：

```bash
# 获取 Docker 网桥 IP（通常是 172.17.0.1）
ip addr show docker0 | grep -oP 'inet \K[\d.]+'

# 或者使用特殊域名（Docker 18.03+）
# host.docker.internal  # 仅 Docker Desktop 支持
# 172.17.0.1           # Linux 上的 Docker 网桥地址
```

#### 步骤 3：WordPress 数据库配置

在 WordPress 安装向导或 Docker 环境变量中使用：

| 配置项 | 值 |
|--------|-----|
| 数据库主机 | `172.17.0.1` 或 Docker 网桥 IP |
| 数据库名 | 在面板「数据库管理」中创建 |
| 数据库用户 | `root` 或创建的专用用户 |
| 数据库密码 | `.env` 中的 `MYSQL_ROOT_PASSWORD` |
| 表前缀 | `wp_`（默认） |

#### 步骤 4：通过面板创建 WordPress 数据库

1. 进入「数据库管理」
2. 点击「添加数据库」
3. 填写：
   - 数据库名：`wordpress`（或自定义）
   - 用户名：`wp_user`（或自定义）
   - 密码：自动生成或手动设置
4. 点击创建

#### Docker Compose 示例

```yaml
version: '3'
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8081:80"
    environment:
      WORDPRESS_DB_HOST: 172.17.0.1:3306  # Docker 网桥 IP
      WORDPRESS_DB_USER: wp_user
      WORDPRESS_DB_PASSWORD: your_db_password
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wordpress_data:/var/www/html
    # 使用面板创建的共享网络
    networks:
      - opennextpanel-network

networks:
  opennextpanel-network:
    external: true

volumes:
  wordpress_data:
```

#### 常见问题

**Q: WordPress 提示无法连接数据库？**

A: 检查以下几点：
1. MySQL 是否正在运行：`systemctl status mariadb`
2. 防火墙是否允许 3306 端口：`ufw status`
3. MySQL 用户权限是否正确
4. Docker 网桥 IP 是否正确

```bash
# 在容器内测试连接
docker exec -it wordpress-container bash
apt update && apt install -y mysql-client
mysql -h 172.17.0.1 -u root -p
```

**Q: 如何找到正确的 Docker 网桥 IP？**

```bash
# 方法 1: 查看 docker0 接口
ip addr show docker0

# 方法 2: 查看 Docker 网络
docker network inspect bridge | grep Gateway

# 方法 3: 使用 opennextpanel-network
docker network inspect opennextpanel-network | grep Gateway
```

**Q: 如何让 MySQL 监听所有接口？**

如果 MySQL 只监听 localhost，需要修改配置：

```bash
# 编辑 MySQL 配置
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf

# 将 bind-address 改为
bind-address = 0.0.0.0

# 重启 MySQL
sudo systemctl restart mariadb
```

---

## 升级面板

### 自动升级

```bash
cd /opt/opennextpanel
./scripts/upgrade.sh
```

### 手动升级

```bash
cd /opt/opennextpanel

# 备份
cp -r data data.bak
cp .env .env.bak

# 拉取更新
git pull

# 安装依赖
npm install

# 重新构建
npm run build

# 重启服务
systemctl restart opennextpanel
```

---

## 卸载面板

```bash
# 停止服务
systemctl stop opennextpanel
systemctl disable opennextpanel

# 删除服务文件
rm /etc/systemd/system/opennextpanel.service
systemctl daemon-reload

# 删除面板目录
rm -rf /opt/opennextpanel

# 可选：删除面板安装的软件
apt remove nginx php* mariadb* redis*
```

---

## 常见安装问题

### npm install 失败

```bash
# 清理缓存
npm cache clean --force

# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 端口被占用

```bash
# 查看端口占用
lsof -i :8888

# 停止占用端口的进程
kill -9 <PID>
```

### 权限问题

```bash
# 修复权限
chown -R root:root /opt/opennextpanel
chmod -R 755 /opt/opennextpanel
```

### 服务启动失败

```bash
# 查看详细日志
journalctl -u opennextpanel -f

# 手动启动测试
cd /opt/opennextpanel
npm start
```

---

## 获取帮助

- 查看文档：[docs/](https://github.com/opentocoder/opennextpanel/tree/master/docs)
- 提交 Issue：[GitHub Issues](https://github.com/opentocoder/opennextpanel/issues)
- 常见问题：[FAQ](faq.md)

---

*安装遇到问题？请查看 [FAQ](faq.md) 或提交 Issue。*
