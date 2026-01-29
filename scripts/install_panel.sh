#!/bin/bash
#
# OpenPanel 一键安装脚本
# 支持: CentOS 7+, Debian 10+, Ubuntu 18.04+, Arch Linux
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
INSTALL_DIR="/opt/openpanel"
SERVICE_NAME="openpanel"
DEFAULT_PORT=8888
REPO_URL="${OPENPANEL_REPO_URL:-https://github.com/opentocoder/openpanel.git}"
DOWNLOAD_URL="${OPENPANEL_DOWNLOAD_URL:-}"  # 支持从 tar.gz 下载
MIN_NODE_VERSION=22

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${CYAN}==>${NC} ${GREEN}$1${NC}"
}

# 显示 banner
show_banner() {
    echo -e "${CYAN}"
    echo "  ___                   ____                  _ "
    echo " / _ \ _ __   ___ _ __ |  _ \ __ _ _ __   ___| |"
    echo "| | | | '_ \ / _ \ '_ \| |_) / _\` | '_ \ / _ \ |"
    echo "| |_| | |_) |  __/ | | |  __/ (_| | | | |  __/ |"
    echo " \___/| .__/ \___|_| |_|_|   \__,_|_| |_|\___|_|"
    echo "      |_|                                       "
    echo -e "${NC}"
    echo -e "OpenPanel 服务器管理面板 - 一键安装脚本"
    echo -e "========================================\n"
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -p, --port PORT     指定面板端口 (默认: 8888)"
    echo "  -d, --dir DIR       指定安装目录 (默认: /opt/openpanel)"
    echo "  -s, --skip-firewall 跳过防火墙配置"
    echo "  -y, --yes           自动确认所有提示"
    echo ""
    echo "数据库选项 (默认不安装，可后续通过软件商店安装):"
    echo "  --with-mysql        安装 MySQL 8.0"
    echo "  --with-mysql=5.7    安装 MySQL 5.7"
    echo "  --with-mariadb      安装 MariaDB 10.x"
    echo ""
    echo "示例:"
    echo "  $0                  使用默认配置安装"
    echo "  $0 -p 9999          使用端口 9999 安装"
    echo "  $0 -d /home/panel   安装到 /home/panel"
    echo ""
}

# 检测系统类型
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
        VERSION=$(rpm -q --qf "%{VERSION}" centos-release 2>/dev/null || echo "7")
    elif [ -f /etc/arch-release ]; then
        OS="arch"
        VERSION="rolling"
    else
        print_error "无法检测操作系统类型"
        exit 1
    fi

    print_info "检测到系统: $OS $VERSION"
}

# 检查 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 权限运行此脚本"
        echo "  sudo $0 $*"
        exit 1
    fi
}

# 检查系统要求
check_requirements() {
    print_step "检查系统要求"

    # 检查内存
    local mem_total=$(free -m | awk '/^Mem:/{print $2}' || echo "0")
    mem_total=${mem_total:-0}
    if [ "$mem_total" -lt 512 ]; then
        print_warning "内存不足 512MB，可能影响性能"
    else
        print_info "内存: ${mem_total}MB"
    fi

    # 检查磁盘空间
    local disk_free=$(df -m "$INSTALL_DIR" 2>/dev/null | awk 'NR==2{print $4}' || df -m / | awk 'NR==2{print $4}' || echo "0")
    disk_free=${disk_free:-0}
    if [ "$disk_free" -lt 1024 ]; then
        print_warning "磁盘空间不足 1GB"
    else
        print_info "可用磁盘: ${disk_free}MB"
    fi
}

# 安装系统依赖
install_dependencies() {
    print_step "安装系统依赖"

    case $OS in
        centos|rhel|fedora|rocky|almalinux)
            print_info "使用 yum/dnf 安装依赖..."
            if command -v dnf &>/dev/null; then
                dnf install -y curl wget git tar gcc-c++ make
                # ttyd 可能需要 EPEL
                dnf install -y epel-release 2>/dev/null || true
                dnf install -y ttyd 2>/dev/null || print_warning "ttyd 安装失败，Web终端功能可能不可用"
            else
                yum install -y curl wget git tar gcc-c++ make
                yum install -y epel-release 2>/dev/null || true
                yum install -y ttyd 2>/dev/null || print_warning "ttyd 安装失败，Web终端功能可能不可用"
            fi
            ;;
        debian|ubuntu)
            print_info "使用 apt 安装依赖..."
            apt-get update
            apt-get install -y curl wget git tar build-essential ttyd
            ;;
        arch|manjaro)
            print_info "使用 pacman 安装依赖..."
            pacman -Sy --noconfirm curl wget git tar base-devel ttyd
            ;;
        *)
            print_error "不支持的操作系统: $OS"
            exit 1
            ;;
    esac

    print_success "系统依赖安装完成"
}

# 检查 Node.js 版本
check_node_version() {
    if command -v node &>/dev/null; then
        local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$node_version" -ge "$MIN_NODE_VERSION" ]; then
            print_info "Node.js 版本: $(node -v)"
            return 0
        fi
    fi
    return 1
}

# 安装 Node.js
install_nodejs() {
    print_step "安装 Node.js"

    if check_node_version; then
        print_success "Node.js 已安装且版本满足要求"
        return
    fi

    print_info "安装 Node.js ${MIN_NODE_VERSION}.x..."

    case $OS in
        centos|rhel|fedora|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_${MIN_NODE_VERSION}.x | bash -
            if command -v dnf &>/dev/null; then
                dnf install -y nodejs
            else
                yum install -y nodejs
            fi
            ;;
        debian|ubuntu)
            curl -fsSL https://deb.nodesource.com/setup_${MIN_NODE_VERSION}.x | bash -
            apt-get install -y nodejs
            # 标记为手动安装，防止 autoremove 删除
            apt-mark manual nodejs
            ;;
        arch|manjaro)
            pacman -S --noconfirm nodejs npm
            ;;
        *)
            print_error "无法为 $OS 安装 Node.js"
            exit 1
            ;;
    esac

    if check_node_version; then
        print_success "Node.js $(node -v) 安装完成"
    else
        print_error "Node.js 安装失败"
        exit 1
    fi
}

# 下载面板
download_panel() {
    print_step "下载 OpenPanel"

    if [ -d "$INSTALL_DIR" ]; then
        print_warning "安装目录已存在: $INSTALL_DIR"
        if [ "$AUTO_YES" != "true" ]; then
            read -p "是否删除并重新安装? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "安装已取消"
                exit 1
            fi
        fi
        rm -rf "$INSTALL_DIR"
    fi

    print_info "下载源码到 $INSTALL_DIR..."

    mkdir -p "$INSTALL_DIR"

    # 优先级: 1.环境变量指定的下载URL 2.本地源码 3.Git克隆
    if [ -n "$DOWNLOAD_URL" ]; then
        print_info "从 $DOWNLOAD_URL 下载..."
        curl -sSL "$DOWNLOAD_URL" -o /tmp/openpanel.tar.gz && \
        tar -xzf /tmp/openpanel.tar.gz -C "$INSTALL_DIR" && \
        rm -f /tmp/openpanel.tar.gz
    elif [ -d "/tmp/openpanel-source" ]; then
        print_info "使用本地源码..."
        cp -r /tmp/openpanel-source/* "$INSTALL_DIR/"
    else
        print_info "从 Git 克隆..."
        git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" 2>/dev/null || {
            print_error "无法下载源码，请设置 OPENPANEL_DOWNLOAD_URL 环境变量"
            print_info "示例: OPENPANEL_DOWNLOAD_URL=http://your-server/openpanel.tar.gz bash install_panel.sh"
            exit 1
        }
    fi

    print_success "下载完成"
}

# 安装面板依赖
install_panel_deps() {
    print_step "安装面板依赖"

    cd "$INSTALL_DIR"

    if [ ! -f "package.json" ]; then
        print_error "未找到 package.json，安装包可能不完整"
        exit 1
    fi

    print_info "运行 npm install..."
    npm install --legacy-peer-deps 2>&1 | tail -10

    print_success "依赖安装完成"
}

# 构建面板
build_panel() {
    print_step "构建面板"

    cd "$INSTALL_DIR"

    print_info "运行 npm run build..."
    npm run build 2>&1 | tail -10

    if [ -d ".next" ]; then
        print_success "构建完成"
    else
        print_error "构建失败"
        exit 1
    fi
}

# 安装和配置数据库
install_database() {
    local db_name=""
    case "$INSTALL_DB" in
        mysql57) db_name="MySQL 5.7" ;;
        mysql80) db_name="MySQL 8.0" ;;
        mariadb) db_name="MariaDB" ;;
    esac
    print_step "安装和配置 $db_name"

    # 检查 MySQL/MariaDB 是否已安装
    if command -v mysql &>/dev/null; then
        print_info "MySQL/MariaDB 已安装"
    else
        print_info "安装 $db_name..."
        case $OS in
            centos|rhel|fedora|rocky|almalinux)
                if [ "$INSTALL_DB" = "mysql57" ]; then
                    # MySQL 5.7 需要添加官方源
                    rpm -Uvh https://dev.mysql.com/get/mysql57-community-release-el7-11.noarch.rpm 2>/dev/null || true
                    yum install -y mysql-community-server
                elif [ "$INSTALL_DB" = "mysql80" ]; then
                    if command -v dnf &>/dev/null; then
                        dnf install -y mysql-server
                    else
                        yum install -y mysql-server
                    fi
                else
                    # MariaDB
                    if command -v dnf &>/dev/null; then
                        dnf install -y mariadb-server
                    else
                        yum install -y mariadb-server
                    fi
                fi
                ;;
            debian|ubuntu)
                if [ "$INSTALL_DB" = "mysql57" ]; then
                    # MySQL 5.7 在新版 Ubuntu 需要添加源
                    print_warning "Ubuntu 22.04+ 默认不支持 MySQL 5.7，将安装 MySQL 8.0"
                    DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
                elif [ "$INSTALL_DB" = "mysql80" ]; then
                    DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
                else
                    # MariaDB
                    DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server
                fi
                ;;
            arch|manjaro)
                if [ "$INSTALL_DB" = "mariadb" ]; then
                    pacman -S --noconfirm mariadb
                    mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
                else
                    # Arch 默认用 MariaDB，MySQL 需要 AUR
                    print_warning "Arch Linux 推荐使用 MariaDB，将安装 MariaDB"
                    pacman -S --noconfirm mariadb
                    mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
                fi
                ;;
        esac

        # 启动服务
        if [ "$INSTALL_DB" = "mariadb" ] || [ "$OS" = "arch" ] || [ "$OS" = "manjaro" ]; then
            systemctl start mariadb
            systemctl enable mariadb
        else
            systemctl start mysql 2>/dev/null || systemctl start mysqld
            systemctl enable mysql 2>/dev/null || systemctl enable mysqld
        fi
    fi

    # 生成 OpenPanel 专用 MySQL 用户密码
    MYSQL_PANEL_USER="openpanel"
    MYSQL_PANEL_PASSWORD=$(generate_password 20)

    print_info "创建 OpenPanel 专用 MySQL 用户..."

    # 创建用户的 SQL
    local create_user_sql="
CREATE USER IF NOT EXISTS '${MYSQL_PANEL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PANEL_PASSWORD}';
GRANT ALL PRIVILEGES ON *.* TO '${MYSQL_PANEL_USER}'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
"

    # 尝试多种方式连接 MySQL
    local mysql_connected=false

    # 方式1: 无密码登录（auth_socket 或空密码）
    if mysql -u root -e "SELECT 1" &>/dev/null 2>&1; then
        print_info "使用 auth_socket 连接 MySQL..."
        echo "$create_user_sql" | mysql -u root
        mysql_connected=true
    # 方式2: 尝试常见密码（用于已设置密码的情况）
    elif mysql -u root -p'123456' -e "SELECT 1" &>/dev/null 2>&1; then
        print_info "使用已有密码连接 MySQL..."
        echo "$create_user_sql" | mysql -u root -p'123456'
        mysql_connected=true
    elif mysql -u root -p'root' -e "SELECT 1" &>/dev/null 2>&1; then
        echo "$create_user_sql" | mysql -u root -p'root'
        mysql_connected=true
    # 方式3: 检查是否已存在 openpanel 用户
    elif mysql -u openpanel -p"${MYSQL_PANEL_PASSWORD}" -e "SELECT 1" &>/dev/null 2>&1; then
        print_info "OpenPanel MySQL 用户已存在"
        mysql_connected=true
    fi

    if [ "$mysql_connected" = true ]; then
        # 验证用户是否创建成功
        if mysql -u "${MYSQL_PANEL_USER}" -p"${MYSQL_PANEL_PASSWORD}" -e "SELECT 1" &>/dev/null 2>&1; then
            print_success "MySQL 用户 '${MYSQL_PANEL_USER}' 配置成功"
        else
            print_warning "MySQL 用户验证失败，请检查配置"
        fi
    else
        print_warning "无法连接 MySQL，请手动创建用户"
        print_info "创建用户命令:"
        print_info "  mysql -u root -p -e \"CREATE USER '${MYSQL_PANEL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PANEL_PASSWORD}';\""
        print_info "  mysql -u root -p -e \"GRANT ALL PRIVILEGES ON *.* TO '${MYSQL_PANEL_USER}'@'localhost' WITH GRANT OPTION;\""
        MYSQL_PANEL_PASSWORD=""
    fi
}

# 生成随机密码
generate_password() {
    local length=${1:-16}
    tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom | head -c "$length"
}

# 创建配置文件
create_config() {
    print_step "创建配置文件"

    local admin_password=$(generate_password 16)
    local jwt_secret=$(generate_password 32)

    cat > "$INSTALL_DIR/.env" << EOF
# OpenPanel 配置文件
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# 服务端口
PORT=$PANEL_PORT

# 管理员密码 (首次登录后请修改)
ADMIN_PASSWORD=$admin_password

# JWT 密钥
JWT_SECRET=$jwt_secret

# 数据目录
DATA_DIR=$INSTALL_DIR/data

# 日志级别 (debug, info, warn, error)
LOG_LEVEL=info

# 运行环境
NODE_ENV=production

# MySQL 配置（OpenPanel 专用用户，非 root）
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_ROOT_USER=$MYSQL_PANEL_USER
MYSQL_ROOT_PASSWORD=$MYSQL_PANEL_PASSWORD
EOF

    chmod 600 "$INSTALL_DIR/.env"

    # 保存密码供显示
    ADMIN_PASSWORD="$admin_password"

    print_success "配置文件已创建"

    # 初始化数据库
    print_info "初始化数据库..."
    cd "$INSTALL_DIR"
    if [ -f "scripts/init-db.js" ]; then
        node scripts/init-db.js --password "$admin_password" 2>&1 | tail -10
        print_success "数据库初始化完成"
    else
        print_warning "未找到数据库初始化脚本，跳过"
    fi
}

# 创建 systemd 服务
create_service() {
    print_step "创建 systemd 服务"

    cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=OpenPanel Server Management Panel
Documentation=https://github.com/opentocoder/openpanel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/node_modules/.bin/next start -p $PANEL_PORT
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=openpanel

# 环境变量
Environment=NODE_ENV=production
Environment=PORT=$PANEL_PORT
EnvironmentFile=$INSTALL_DIR/.env

# 安全限制
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"

    print_success "systemd 服务已创建"
}

# 配置防火墙
configure_firewall() {
    if [ "$SKIP_FIREWALL" = "true" ]; then
        print_info "跳过防火墙配置"
        return
    fi

    print_step "配置防火墙"

    # firewalld (CentOS/Fedora)
    if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld; then
        print_info "配置 firewalld..."
        firewall-cmd --permanent --add-port=${PANEL_PORT}/tcp
        firewall-cmd --reload
        print_success "firewalld 已开放端口 $PANEL_PORT"
        return
    fi

    # ufw (Ubuntu/Debian)
    if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
        print_info "配置 ufw..."
        ufw allow ${PANEL_PORT}/tcp
        print_success "ufw 已开放端口 $PANEL_PORT"
        return
    fi

    # iptables
    if command -v iptables &>/dev/null; then
        print_info "配置 iptables..."
        iptables -I INPUT -p tcp --dport ${PANEL_PORT} -j ACCEPT

        # 保存规则
        if command -v iptables-save &>/dev/null; then
            if [ -d /etc/iptables ]; then
                iptables-save > /etc/iptables/rules.v4
            elif [ -f /etc/sysconfig/iptables ]; then
                iptables-save > /etc/sysconfig/iptables
            fi
        fi

        print_success "iptables 已开放端口 $PANEL_PORT"
        return
    fi

    print_warning "未检测到防火墙，跳过配置"
}

# 启动服务
start_service() {
    print_step "启动服务"

    systemctl start "$SERVICE_NAME"

    sleep 3

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "服务启动成功"
    else
        print_error "服务启动失败"
        journalctl -u "$SERVICE_NAME" -n 20 --no-pager
        exit 1
    fi
}

# 获取服务器 IP
get_server_ip() {
    local ip
    ip=$(curl -s --connect-timeout 5 https://api.ipify.org 2>/dev/null) || \
    ip=$(curl -s --connect-timeout 5 https://ifconfig.me 2>/dev/null) || \
    ip=$(hostname -I | awk '{print $1}')
    echo "$ip"
}

# 显示安装结果
show_result() {
    local server_ip=$(get_server_ip)

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    OpenPanel 安装完成!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址: ${CYAN}http://${server_ip}:${PANEL_PORT}${NC}"
    echo ""
    echo -e "管理员账号: ${YELLOW}admin${NC}"
    echo -e "管理员密码: ${YELLOW}${ADMIN_PASSWORD}${NC}"
    echo ""
    if [ -n "$MYSQL_PANEL_PASSWORD" ]; then
        echo ""
        echo -e "MySQL 管理用户: ${YELLOW}${MYSQL_PANEL_USER}${NC}"
        echo -e "MySQL 密码: ${YELLOW}${MYSQL_PANEL_PASSWORD}${NC}"
        echo -e "${CYAN}(专用用户，非 root，更安全)${NC}"
        echo ""
    fi
    echo -e "${RED}请立即登录并修改默认密码!${NC}"
    echo ""
    echo -e "常用命令:"
    echo -e "  ${CYAN}systemctl status openpanel${NC}   - 查看状态"
    echo -e "  ${CYAN}systemctl restart openpanel${NC} - 重启服务"
    echo -e "  ${CYAN}systemctl stop openpanel${NC}    - 停止服务"
    echo -e "  ${CYAN}journalctl -u openpanel -f${NC}  - 查看日志"
    echo ""
    echo -e "安装目录: ${CYAN}${INSTALL_DIR}${NC}"
    echo -e "配置文件: ${CYAN}${INSTALL_DIR}/.env${NC}"
    echo ""
}

# 主函数
main() {
    # 默认值
    PANEL_PORT=$DEFAULT_PORT
    SKIP_FIREWALL="false"
    AUTO_YES="false"

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -p|--port)
                PANEL_PORT="$2"
                shift 2
                ;;
            -d|--dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -s|--skip-firewall)
                SKIP_FIREWALL="true"
                shift
                ;;
            --with-mysql)
                INSTALL_DB="mysql80"
                shift
                ;;
            --with-mysql=5.7)
                INSTALL_DB="mysql57"
                shift
                ;;
            --with-mysql=8.0)
                INSTALL_DB="mysql80"
                shift
                ;;
            --with-mariadb)
                INSTALL_DB="mariadb"
                shift
                ;;
            -y|--yes)
                AUTO_YES="true"
                shift
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    show_banner
    check_root "$@"
    detect_os
    check_requirements

    # 确认安装
    if [ "$AUTO_YES" != "true" ]; then
        echo -e "\n安装配置:"
        echo -e "  安装目录: ${CYAN}$INSTALL_DIR${NC}"
        echo -e "  面板端口: ${CYAN}$PANEL_PORT${NC}"
        case "$INSTALL_DB" in
            mysql57)
                echo -e "  数据库:   ${GREEN}MySQL 5.7${NC}"
                ;;
            mysql80)
                echo -e "  数据库:   ${GREEN}MySQL 8.0${NC}"
                ;;
            mariadb)
                echo -e "  数据库:   ${GREEN}MariaDB${NC}"
                ;;
            *)
                echo -e "  数据库:   ${YELLOW}不安装 (可通过软件商店安装)${NC}"
                ;;
        esac
        echo ""
        read -p "是否继续安装? [Y/n] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_error "安装已取消"
            exit 1
        fi
    fi

    install_dependencies
    install_nodejs
    download_panel
    install_panel_deps
    build_panel
    if [ -n "$INSTALL_DB" ]; then
        install_database
    else
        print_info "跳过数据库安装 (可通过软件商店安装)"
        MYSQL_PANEL_USER=""
        MYSQL_PANEL_PASSWORD=""
    fi
    create_config
    create_service
    configure_firewall
    start_service
    show_result
}

# 运行
main "$@"
