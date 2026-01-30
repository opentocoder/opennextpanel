#!/bin/bash
#
# OpenNextPanel 卸载脚本
# 完全移除 OpenNextPanel 及其相关配置
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
INSTALL_DIR="/opt/opennextpanel"
SERVICE_NAME="opennextpanel"
DEFAULT_PORT=8888

# 打印函数
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
    echo -e "${RED}"
    echo "  ___                   ____                  _ "
    echo " / _ \ _ __   ___ _ __ |  _ \ __ _ _ __   ___| |"
    echo "| | | | '_ \ / _ \ '_ \| |_) / _\` | '_ \ / _ \ |"
    echo "| |_| | |_) |  __/ | | |  __/ (_| | | | |  __/ |"
    echo " \___/| .__/ \___|_| |_|_|   \__,_|_| |_|\___|_|"
    echo "      |_|                                       "
    echo -e "${NC}"
    echo -e "OpenNextPanel 卸载脚本"
    echo -e "==================\n"
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -d, --dir DIR       指定安装目录 (默认: /opt/opennextpanel)"
    echo "  -k, --keep-data     保留数据目录"
    echo "  -y, --yes           自动确认所有提示"
    echo ""
    echo "示例:"
    echo "  $0                  完全卸载"
    echo "  $0 -k               卸载但保留数据"
    echo "  $0 -y               静默卸载"
    echo ""
}

# 检查 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 权限运行此脚本"
        echo "  sudo $0 $*"
        exit 1
    fi
}

# 获取服务端口
get_service_port() {
    if [ -f "$INSTALL_DIR/.env" ]; then
        PORT=$(grep -E "^PORT=" "$INSTALL_DIR/.env" 2>/dev/null | cut -d= -f2)
    fi
    echo "${PORT:-$DEFAULT_PORT}"
}

# 停止服务
stop_service() {
    print_step "停止服务"

    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        print_info "停止 $SERVICE_NAME 服务..."
        systemctl stop "$SERVICE_NAME"
        print_success "服务已停止"
    else
        print_info "服务未运行"
    fi

    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        print_info "禁用 $SERVICE_NAME 服务..."
        systemctl disable "$SERVICE_NAME"
        print_success "服务已禁用"
    fi
}

# 删除 systemd 服务
remove_service() {
    print_step "删除 systemd 服务"

    local service_file="/etc/systemd/system/${SERVICE_NAME}.service"

    if [ -f "$service_file" ]; then
        rm -f "$service_file"
        systemctl daemon-reload
        print_success "服务文件已删除"
    else
        print_info "服务文件不存在"
    fi
}

# 清理防火墙规则
cleanup_firewall() {
    print_step "清理防火墙规则"

    local port=$(get_service_port)

    # firewalld
    if command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld; then
        if firewall-cmd --list-ports | grep -q "${port}/tcp"; then
            print_info "移除 firewalld 端口 $port..."
            firewall-cmd --permanent --remove-port=${port}/tcp
            firewall-cmd --reload
            print_success "firewalld 规则已清理"
        fi
        return
    fi

    # ufw
    if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
        if ufw status | grep -q "$port"; then
            print_info "移除 ufw 端口 $port..."
            ufw delete allow ${port}/tcp 2>/dev/null || true
            print_success "ufw 规则已清理"
        fi
        return
    fi

    # iptables
    if command -v iptables &>/dev/null; then
        if iptables -L INPUT -n | grep -q "dpt:$port"; then
            print_info "移除 iptables 端口 $port..."
            iptables -D INPUT -p tcp --dport ${port} -j ACCEPT 2>/dev/null || true

            # 保存规则
            if command -v iptables-save &>/dev/null; then
                if [ -d /etc/iptables ]; then
                    iptables-save > /etc/iptables/rules.v4
                elif [ -f /etc/sysconfig/iptables ]; then
                    iptables-save > /etc/sysconfig/iptables
                fi
            fi
            print_success "iptables 规则已清理"
        fi
        return
    fi

    print_info "未检测到需要清理的防火墙规则"
}

# 备份数据
backup_data() {
    print_step "备份数据"

    local backup_dir="/root/opennextpanel-backup-$(date +%Y%m%d_%H%M%S)"

    if [ -d "$INSTALL_DIR/data" ]; then
        print_info "备份数据目录到 $backup_dir..."
        mkdir -p "$backup_dir"
        cp -r "$INSTALL_DIR/data" "$backup_dir/"

        if [ -f "$INSTALL_DIR/.env" ]; then
            cp "$INSTALL_DIR/.env" "$backup_dir/"
        fi

        print_success "数据已备份到: $backup_dir"
        BACKUP_PATH="$backup_dir"
    else
        print_info "没有数据需要备份"
    fi
}

# 删除安装目录
remove_files() {
    print_step "删除安装文件"

    if [ -d "$INSTALL_DIR" ]; then
        if [ "$KEEP_DATA" = "true" ] && [ -d "$INSTALL_DIR/data" ]; then
            print_info "保留数据目录..."
            # 删除除 data 目录外的所有文件
            find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 ! -name 'data' -exec rm -rf {} +
            print_success "程序文件已删除，数据目录已保留"
        else
            rm -rf "$INSTALL_DIR"
            print_success "安装目录已删除: $INSTALL_DIR"
        fi
    else
        print_info "安装目录不存在"
    fi
}

# 清理日志
cleanup_logs() {
    print_step "清理日志"

    # 清理 journald 日志
    if command -v journalctl &>/dev/null; then
        print_info "清理 systemd 日志..."
        journalctl --vacuum-time=0 --unit="$SERVICE_NAME" 2>/dev/null || true
    fi

    # 清理应用日志
    if [ -d "/var/log/opennextpanel" ]; then
        rm -rf "/var/log/opennextpanel"
        print_info "应用日志已清理"
    fi

    print_success "日志清理完成"
}

# 显示卸载结果
show_result() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    OpenNextPanel 卸载完成!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    if [ -n "$BACKUP_PATH" ]; then
        echo -e "数据备份位置: ${CYAN}$BACKUP_PATH${NC}"
        echo ""
    fi

    if [ "$KEEP_DATA" = "true" ] && [ -d "$INSTALL_DIR/data" ]; then
        echo -e "数据目录已保留: ${CYAN}$INSTALL_DIR/data${NC}"
        echo -e "如需完全清理，请手动删除该目录"
        echo ""
    fi

    echo -e "感谢使用 OpenNextPanel!"
    echo ""
}

# 主函数
main() {
    # 默认值
    KEEP_DATA="false"
    AUTO_YES="false"
    BACKUP_PATH=""

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -k|--keep-data)
                KEEP_DATA="true"
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

    # 检查是否已安装
    if [ ! -d "$INSTALL_DIR" ] && [ ! -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        print_warning "OpenNextPanel 似乎未安装"
        exit 0
    fi

    # 确认卸载
    if [ "$AUTO_YES" != "true" ]; then
        echo -e "${RED}警告: 此操作将卸载 OpenNextPanel!${NC}"
        echo ""
        echo -e "安装目录: ${CYAN}$INSTALL_DIR${NC}"
        if [ "$KEEP_DATA" = "true" ]; then
            echo -e "数据保留: ${GREEN}是${NC}"
        else
            echo -e "数据保留: ${RED}否 (将删除所有数据)${NC}"
        fi
        echo ""
        read -p "是否继续卸载? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "卸载已取消"
            exit 0
        fi

        # 询问是否备份
        if [ "$KEEP_DATA" != "true" ] && [ -d "$INSTALL_DIR/data" ]; then
            read -p "是否在卸载前备份数据? [Y/n] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                backup_data
            fi
        fi
    fi

    stop_service
    remove_service
    cleanup_firewall
    remove_files
    cleanup_logs
    show_result
}

# 运行
main "$@"
