# OpenPanel 安装指南

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
curl -sSL https://raw.githubusercontent.com/opentocoder/openpanel/master/scripts/install.sh | bash
```

### 方式二：wget 安装

```bash
wget -qO- https://raw.githubusercontent.com/opentocoder/openpanel/master/scripts/install.sh | bash
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
git clone https://github.com/opentocoder/openpanel.git
cd openpanel
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
cat > /etc/systemd/system/openpanel.service << 'EOF'
[Unit]
Description=OpenPanel Server Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/openpanel
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
systemctl enable openpanel
systemctl start openpanel
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
systemctl status openpanel
```

应显示 `active (running)`。

### 检查端口

```bash
ss -tlnp | grep 8888
```

### 访问面板

打开浏览器访问：`http://服务器IP:8888`

---

## 初始账户

安装完成后，查看安装日志获取初始密码：

```bash
# 查看安装日志
cat /var/log/openpanel-install.log | grep -i password

# 或查看服务日志
journalctl -u openpanel | grep -i password
```

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

## 升级面板

### 自动升级

```bash
cd /opt/openpanel
./scripts/upgrade.sh
```

### 手动升级

```bash
cd /opt/openpanel

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
systemctl restart openpanel
```

---

## 卸载面板

```bash
# 停止服务
systemctl stop openpanel
systemctl disable openpanel

# 删除服务文件
rm /etc/systemd/system/openpanel.service
systemctl daemon-reload

# 删除面板目录
rm -rf /opt/openpanel

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
chown -R root:root /opt/openpanel
chmod -R 755 /opt/openpanel
```

### 服务启动失败

```bash
# 查看详细日志
journalctl -u openpanel -f

# 手动启动测试
cd /opt/openpanel
npm start
```

---

## 获取帮助

- 查看文档：[docs/](https://github.com/opentocoder/openpanel/tree/master/docs)
- 提交 Issue：[GitHub Issues](https://github.com/opentocoder/openpanel/issues)
- 常见问题：[FAQ](faq.md)

---

*安装遇到问题？请查看 [FAQ](faq.md) 或提交 Issue。*
