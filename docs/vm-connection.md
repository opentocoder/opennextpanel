# VM 连接方法

## VM 基本信息

- **VM 路径**: `/home/man/vms/panel-test/`
- **SSH 端口**: 2222 (映射到 VM 的 22)
- **Web 面板**: http://localhost:8888 (映射到 VM 的 80)
- **用户**: test / 123456
- **面板登录**: admin / admin123
- **SSH Key**: `/home/man/vms/panel-test/id_ed25519`

## 启动 VM

```bash
cd /home/man/vms/panel-test
./start.sh
```

如果需要更多端口转发，编辑 start.sh 添加:
```bash
-netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8888-:80,hostfwd=tcp::8080-:8080,hostfwd=tcp::8081-:8081,hostfwd=tcp::18082-:8082,hostfwd=tcp::18083-:8083,hostfwd=tcp::19000-:9000,hostfwd=tcp::13306-:3306
```

## SSH 连接

```bash
ssh -i /home/man/vms/panel-test/id_ed25519 -p 2222 test@localhost
```

## VM 网络配置 (每次重启后需要)

VM 重启后网络可能不自动配置，需要手动配置。

### 方法1: VNC 控制台

```bash
# 查看 VNC 端口
echo "info vnc" | nc -U /home/man/vms/panel-test/qemu-monitor.sock

# 用 VNC 客户端连接后执行:
sudo ip addr add 10.0.2.15/24 dev ens3
sudo ip link set ens3 up
sudo ip route add default via 10.0.2.2
```

### 方法2: QEMU Monitor 发送键盘命令

```bash
# 发送命令到 VM
send_to_vm() {
    local sock="/home/man/vms/panel-test/qemu-monitor.sock"
    for char in $(echo "$1" | grep -o .); do
        case $char in
            ' ') key="spc" ;;
            '/') key="slash" ;;
            '.') key="dot" ;;
            '-') key="minus" ;;
            ':') key="shift-semicolon" ;;
            '=') key="equal" ;;
            [A-Z]) key="shift-$(echo $char | tr 'A-Z' 'a-z')" ;;
            *) key="$char" ;;
        esac
        echo "sendkey $key" | nc -U $sock
        sleep 0.05
    done
    echo "sendkey ret" | nc -U $sock
}

# 登录并配置网络
send_to_vm "test"
sleep 1
send_to_vm "123456"
sleep 1
send_to_vm "sudo ip addr add 10.0.2.15/24 dev ens3"
send_to_vm "123456"  # sudo 密码
send_to_vm "sudo ip link set ens3 up"
send_to_vm "sudo ip route add default via 10.0.2.2"
```

## 持久化网络配置

编辑 VM 内的 `/etc/netplan/01-netcfg.yaml`:

```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      addresses:
        - 10.0.2.15/24
      routes:
        - to: default
          via: 10.0.2.2
      nameservers:
        addresses:
          - 10.0.2.3
```

然后执行:
```bash
sudo netplan apply
```

## 部署 OpenPanel 到 VM

```bash
# 在主机上构建
cd /home/man/temp/temp/006/openpanel
npm run build

# 打包传输
tar czf openpanel.tar.gz .next package.json next.config.ts public src

# 传到 VM
scp -i /home/man/vms/panel-test/id_ed25519 -P 2222 openpanel.tar.gz test@localhost:~

# 在 VM 上解压部署
ssh -i /home/man/vms/panel-test/id_ed25519 -p 2222 test@localhost
cd /path/to/openpanel
tar xzf ~/openpanel.tar.gz
npm install --production
npm start
```

## 常见问题

### SSH 连接超时

检查 VM 网络是否配置:
```bash
# VNC 查看或 QEMU monitor 发送命令检查
ip addr show ens3
```

如果 ens3 是 DOWN 状态或没有 IP，按上述方法配置网络。

### 端口冲突

如果端口被占用，修改 start.sh 中的 hostfwd 映射，使用其他端口:
- 3000 被占用 -> 用 13000
- 8082 被占用 -> 用 18082

### Google Fonts 构建失败

VM 无法访问外网时，layout.tsx 不能用 Google Fonts。
已修改为使用系统字体: `className="font-sans"`
