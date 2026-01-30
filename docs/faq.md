# 常见问题 (FAQ)

## 安装相关

### Q: 支持哪些操作系统？
A: 目前支持：
- Ubuntu 22.04 LTS
- Ubuntu 24.04 LTS
- Debian 11
- Debian 12

### Q: 安装需要多少资源？
A: 最低配置：
- CPU: 1 核
- 内存: 1 GB
- 硬盘: 20 GB

推荐配置：
- CPU: 2 核+
- 内存: 2 GB+
- 硬盘: 50 GB+

### Q: 安装失败怎么办？
A: 检查以下内容：
1. 确保系统为全新安装，没有其他面板
2. 查看安装日志：`/var/log/opennextpanel-install.log`
3. 确保网络正常，能访问软件源
4. 确保使用 root 用户或 sudo 权限

### Q: 如何更新面板？
A: 执行以下命令：
```bash
cd /opt/opennextpanel
git pull
npm run build
sudo systemctl restart opennextpanel
```

---

## 登录相关

### Q: 忘记管理员密码怎么办？
A: 通过 SSH 登录服务器，执行：
```bash
cd /opt/opennextpanel
node -e "
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const db = new Database('data/panel.db');
const newPassword = 'admin123';
const hash = bcrypt.hashSync(newPassword, 10);
db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'admin');
console.log('密码已重置为: admin123');
"
```

### Q: 面板无法访问？
A: 排查步骤：
1. 检查服务状态：`systemctl status opennextpanel`
2. 检查端口监听：`ss -tlnp | grep 8888`
3. 检查防火墙：`ufw status` 或 `firewall-cmd --list-all`
4. 查看日志：`journalctl -u opennextpanel -f`

### Q: 安全入口是什么？
A: 安全入口是面板访问的特殊路径，设置后必须通过 `http://IP:8888/安全入口` 才能访问面板，可以防止面板被扫描发现。

在设置页面可以开启/关闭此功能。

---

## 网站相关

### Q: 如何创建 WordPress 网站？
A: 步骤：
1. 软件中心安装 Nginx + PHP + MariaDB
2. 网站管理创建新站点，选择 PHP 类型
3. 数据库管理创建数据库
4. 使用文件管理器上传 WordPress 文件
5. 访问域名完成 WordPress 安装

### Q: SSL 证书申请失败？
A: 常见原因：
1. **域名未解析**: 确保域名 A 记录指向服务器 IP
2. **端口不通**: 确保 80 端口对外开放
3. **频率限制**: Let's Encrypt 限制每周 5 次，等待后重试
4. **域名问题**: 某些域名可能被 CA 限制

### Q: 如何配置反向代理？
A: 创建网站时选择「反向代理」类型，然后在 Nginx 配置中设置：
```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Q: 网站显示 502 错误？
A: 检查：
1. PHP-FPM 是否运行：`systemctl status php8.2-fpm`
2. 网站 PHP 版本是否正确
3. PHP-FPM 配置是否正确

### Q: 如何开启 HTTPS 强制跳转？
A: 在网站的 Nginx 配置中添加：
```nginx
if ($scheme = http) {
    return 301 https://$host$request_uri;
}
```

---

## 数据库相关

### Q: 数据库连接失败？
A: 检查：
1. MariaDB 服务状态：`systemctl status mariadb`
2. 用户名密码是否正确
3. 用户是否有访问权限

### Q: 如何查看数据库密码？
A: 面板自动生成的数据库凭据保存在 `/opt/opennextpanel/.env` 文件中：
```bash
cat /opt/opennextpanel/.env | grep MYSQL
```

### Q: phpMyAdmin 无法登录？
A: 确保：
1. 使用正确的数据库用户名和密码
2. MariaDB 服务正在运行
3. 用户有 localhost 的访问权限

### Q: 如何导入大型数据库？
A: 建议使用命令行：
```bash
mysql -u username -p database_name < backup.sql
```

phpMyAdmin 默认限制上传大小，可在 `/etc/php/8.x/fpm/php.ini` 中修改：
```ini
upload_max_filesize = 100M
post_max_size = 100M
```

---

## 软件相关

### Q: PHP 版本切换不生效？
A: 切换后需要：
1. 重启对应的 PHP-FPM 服务
2. 清理 OPcache：重启 PHP-FPM 即可

### Q: 如何安装 PHP 扩展？
A: 以 Redis 扩展为例：
```bash
apt install php8.2-redis
systemctl restart php8.2-fpm
```

### Q: Docker 容器无法访问外网？
A: 检查 Docker DNS 配置：
```bash
# 编辑 /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

# 重启 Docker
systemctl restart docker
```

### Q: 软件卸载不干净？
A: 使用 `apt autoremove` 清理依赖：
```bash
apt autoremove -y
```

---

## 文件相关

### Q: 上传文件大小限制？
A: 默认限制 100MB。修改方法：
1. 编辑 `/etc/nginx/nginx.conf`，设置 `client_max_body_size`
2. 编辑 PHP 配置，设置 `upload_max_filesize` 和 `post_max_size`
3. 重启 Nginx 和 PHP-FPM

### Q: 权限问题导致网站无法运行？
A: 常用权限设置：
```bash
# 目录权限
chmod 755 /var/www/yoursite

# 文件权限
chmod 644 /var/www/yoursite/*

# 所有者
chown -R www-data:www-data /var/www/yoursite
```

---

## 安全相关

### Q: 如何防止 SSH 暴力破解？
A:
1. 安装 Fail2ban（软件中心一键安装）
2. 更改 SSH 端口
3. 禁用密码登录，使用密钥认证

### Q: 面板被攻击怎么办？
A:
1. 开启安全入口
2. 设置强密码
3. 限制访问 IP（可在 Nginx 中配置）
4. 检查日志排查攻击来源

---

## 备份恢复

### Q: 如何备份整个网站？
A: 需要备份：
1. 网站文件：`/var/www/sitename`
2. 数据库：通过面板导出或 mysqldump
3. Nginx 配置：`/etc/nginx/sites-available/`

### Q: 如何迁移到新服务器？
A: 步骤：
1. 新服务器安装 OpenNextPanel
2. 复制网站文件
3. 导入数据库
4. 恢复 Nginx 配置
5. 修改域名 DNS 解析

---

## 性能优化

### Q: 网站访问慢怎么办？
A: 优化建议：
1. 开启 Redis 缓存
2. 开启 OPcache
3. 配置 Nginx 静态文件缓存
4. 使用 CDN
5. 优化数据库查询

### Q: 如何开启 Gzip 压缩？
A: 在 Nginx 配置中启用：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

---

## 其他问题

### Q: 面板日志在哪里？
A:
- 面板日志：`journalctl -u opennextpanel`
- Nginx 日志：`/var/log/nginx/`
- PHP 日志：`/var/log/php8.x-fpm.log`

### Q: 如何卸载面板？
A:
```bash
systemctl stop opennextpanel
systemctl disable opennextpanel
rm -rf /opt/opennextpanel
rm /etc/systemd/system/opennextpanel.service
systemctl daemon-reload
```

### Q: 可以同时安装其他面板吗？
A: 不建议。多个面板可能造成端口冲突、配置冲突等问题。

---

*还有其他问题？请提交 [Issue](https://github.com/opentocoder/opennextpanel/issues)*
