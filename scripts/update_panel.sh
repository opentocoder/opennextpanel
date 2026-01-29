#!/bin/bash
#
# OpenPanel 更新脚本
# 备份配置、拉取最新代码、重建并重启
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
INSTALL_DIR="/opt/openpanel"
SERVICE_NAME="openpanel"
BACKUP_DIR="/root/openpanel-backups"
MAX_BACKUPS=5

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
    echo -e "${CYAN}"
    echo "  ___                   ____                  _ "
    echo " / _ \ _ __   ___ _ __ |  _ \ __ _ _ __   ___| |"
    echo "| | | | '_ \ / _ \ '_ \| |_) / _\` | '_ \ / _ \ |"
    echo "| |_| | |_) |  __/ | | |  __/ (_| | | | |  __/ |"
    echo " \___/| .__/ \___|_| |_|_|   \__,_|_| |_|\___|_|"
    echo "      |_|                                       "
    echo -e "${NC}"
    echo -e "OpenPanel 更新脚本"
    echo -e "==================\n"
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -d, --dir DIR       指定安装目录 (默认: /opt/openpanel)"
    echo "  -b, --branch BRANCH 指定 Git 分支 (默认: main)"
    echo "  -f, --force         强制更新 (忽略本地修改)"
    echo "  -s, --skip-backup   跳过备份"
    echo "  -r, --rollback      回滚到上一个版本"
    echo "  -y, --yes           自动确认所有提示"
    echo ""
    echo "示例:"
    echo "  $0                  更新到最新版本"
    echo "  $0 -b develop       更新到 develop 分支"
    echo "  $0 -r               回滚到上一个版本"
    echo "  $0 -f -y            强制静默更新"
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

# 检查安装
check_installation() {
    print_step "检查安装"

    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "OpenPanel 未安装在 $INSTALL_DIR"
        exit 1
    fi

    if [ ! -f "$INSTALL_DIR/package.json" ]; then
        print_error "安装目录不完整，缺少 package.json"
        exit 1
    fi

    # 获取当前版本
    if [ -f "$INSTALL_DIR/package.json" ]; then
        CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' "$INSTALL_DIR/package.json" | head -1 | cut -d'"' -f4)
        print_info "当前版本: ${CURRENT_VERSION:-未知}"
    fi

    print_success "安装检查通过"
}

# 获取最新版本信息
check_update() {
    print_step "检查更新"

    cd "$INSTALL_DIR"

    if [ -d ".git" ]; then
        print_info "获取远程更新信息..."
        git fetch origin "$GIT_BRANCH" 2>/dev/null || {
            print_warning "无法获取远程更新信息"
            return
        }

        local LOCAL=$(git rev-parse HEAD 2>/dev/null)
        local REMOTE=$(git rev-parse "origin/$GIT_BRANCH" 2>/dev/null)

        if [ "$LOCAL" = "$REMOTE" ]; then
            print_info "当前已是最新版本"
            if [ "$FORCE_UPDATE" != "true" ]; then
                read -p "是否仍要重新构建? [y/N] " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    print_info "更新已取消"
                    exit 0
                fi
            fi
        else
            local COMMITS=$(git log --oneline "$LOCAL..$REMOTE" 2>/dev/null | wc -l)
            print_info "发现 $COMMITS 个新提交"
        fi
    else
        print_warning "非 Git 仓库，将尝试直接更新"
    fi
}

# 备份配置和数据
backup_config() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        print_info "跳过备份"
        return
    fi

    print_step "备份配置和数据"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$timestamp"

    mkdir -p "$backup_path"

    # 备份配置文件
    if [ -f "$INSTALL_DIR/.env" ]; then
        cp "$INSTALL_DIR/.env" "$backup_path/"
        print_info "已备份 .env"
    fi

    # 备份数据目录
    if [ -d "$INSTALL_DIR/data" ]; then
        cp -r "$INSTALL_DIR/data" "$backup_path/"
        print_info "已备份 data 目录"
    fi

    # 记录当前 Git 版本
    if [ -d "$INSTALL_DIR/.git" ]; then
        cd "$INSTALL_DIR"
        echo "$(git rev-parse HEAD)" > "$backup_path/git_version"
        echo "$(git log -1 --format='%H %s')" >> "$backup_path/git_version"
    fi

    # 记录当前 package.json 版本
    if [ -f "$INSTALL_DIR/package.json" ]; then
        cp "$INSTALL_DIR/package.json" "$backup_path/"
    fi

    CURRENT_BACKUP="$backup_path"
    print_success "备份完成: $backup_path"

    # 清理旧备份
    cleanup_old_backups
}

# 清理旧备份
cleanup_old_backups() {
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -d "$BACKUP_DIR"/backup_* 2>/dev/null | wc -l)
        if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
            print_info "清理旧备份 (保留最近 $MAX_BACKUPS 个)..."
            ls -dt "$BACKUP_DIR"/backup_* | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf
        fi
    fi
}

# 列出可用备份
list_backups() {
    print_step "可用的备份"

    if [ ! -d "$BACKUP_DIR" ]; then
        print_info "没有可用的备份"
        return
    fi

    local backups=$(ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null)
    if [ -z "$backups" ]; then
        print_info "没有可用的备份"
        return
    fi

    echo ""
    local i=1
    for backup in $backups; do
        local name=$(basename "$backup")
        local date=$(echo "$name" | sed 's/backup_//' | sed 's/_/ /')
        local version=""
        if [ -f "$backup/package.json" ]; then
            version=$(grep -o '"version": *"[^"]*"' "$backup/package.json" | head -1 | cut -d'"' -f4)
        fi
        echo "  $i) $name ${version:+(v$version)}"
        ((i++))
    done
    echo ""
}

# 回滚到指定备份
rollback() {
    print_step "回滚版本"

    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "没有可用的备份"
        exit 1
    fi

    local backups=$(ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null)
    if [ -z "$backups" ]; then
        print_error "没有可用的备份"
        exit 1
    fi

    list_backups

    local backup_count=$(echo "$backups" | wc -l)
    read -p "选择要回滚的备份 [1-$backup_count]: " choice

    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "$backup_count" ]; then
        print_error "无效选择"
        exit 1
    fi

    local selected_backup=$(echo "$backups" | sed -n "${choice}p")
    print_info "选择的备份: $(basename "$selected_backup")"

    # 确认回滚
    read -p "确认回滚到此版本? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "回滚已取消"
        exit 0
    fi

    # 停止服务
    stop_service

    # 恢复配置
    if [ -f "$selected_backup/.env" ]; then
        cp "$selected_backup/.env" "$INSTALL_DIR/"
        print_info "已恢复 .env"
    fi

    # 恢复数据
    if [ -d "$selected_backup/data" ]; then
        rm -rf "$INSTALL_DIR/data"
        cp -r "$selected_backup/data" "$INSTALL_DIR/"
        print_info "已恢复 data 目录"
    fi

    # 恢复 Git 版本
    if [ -f "$selected_backup/git_version" ] && [ -d "$INSTALL_DIR/.git" ]; then
        local git_hash=$(head -1 "$selected_backup/git_version")
        cd "$INSTALL_DIR"
        git checkout "$git_hash" 2>/dev/null || print_warning "无法恢复 Git 版本"
    fi

    # 重新构建
    rebuild_panel

    # 启动服务
    start_service

    print_success "回滚完成"
    exit 0
}

# 停止服务
stop_service() {
    print_step "停止服务"

    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME"
        print_success "服务已停止"
    else
        print_info "服务未运行"
    fi
}

# 拉取最新代码
pull_latest() {
    print_step "拉取最新代码"

    cd "$INSTALL_DIR"

    if [ ! -d ".git" ]; then
        print_warning "非 Git 仓库，跳过代码更新"
        return
    fi

    # 检查本地修改
    if [ -n "$(git status --porcelain)" ]; then
        if [ "$FORCE_UPDATE" = "true" ]; then
            print_warning "强制重置本地修改..."
            git reset --hard HEAD
            git clean -fd
        else
            print_error "存在未提交的本地修改"
            git status --short
            echo ""
            read -p "是否放弃本地修改继续更新? [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git reset --hard HEAD
                git clean -fd
            else
                print_error "更新已取消"
                exit 1
            fi
        fi
    fi

    print_info "拉取 $GIT_BRANCH 分支..."
    git pull origin "$GIT_BRANCH"

    # 获取新版本
    if [ -f "package.json" ]; then
        NEW_VERSION=$(grep -o '"version": *"[^"]*"' package.json | head -1 | cut -d'"' -f4)
        print_info "新版本: ${NEW_VERSION:-未知}"
    fi

    print_success "代码更新完成"
}

# 重新构建
rebuild_panel() {
    print_step "重新构建"

    cd "$INSTALL_DIR"

    # 安装依赖
    print_info "安装依赖..."
    npm install --production=false 2>&1 | tail -5

    # 构建
    print_info "构建项目..."
    npm run build 2>&1 | tail -10

    if [ -d ".next" ]; then
        print_success "构建完成"
    else
        print_error "构建失败"
        if [ -n "$CURRENT_BACKUP" ]; then
            print_warning "可以使用以下命令回滚:"
            echo "  $0 -r"
        fi
        exit 1
    fi
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
        if [ -n "$CURRENT_BACKUP" ]; then
            print_warning "可以使用以下命令回滚:"
            echo "  $0 -r"
        fi
        exit 1
    fi
}

# 显示更新结果
show_result() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    OpenPanel 更新完成!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    if [ -n "$CURRENT_VERSION" ] && [ -n "$NEW_VERSION" ]; then
        echo -e "版本更新: ${YELLOW}$CURRENT_VERSION${NC} -> ${GREEN}$NEW_VERSION${NC}"
    fi

    echo ""
    echo -e "服务状态: ${GREEN}运行中${NC}"
    echo ""

    if [ -n "$CURRENT_BACKUP" ]; then
        echo -e "备份位置: ${CYAN}$CURRENT_BACKUP${NC}"
        echo -e "如需回滚: ${CYAN}$0 -r${NC}"
        echo ""
    fi
}

# 主函数
main() {
    # 默认值
    GIT_BRANCH="main"
    FORCE_UPDATE="false"
    SKIP_BACKUP="false"
    DO_ROLLBACK="false"
    AUTO_YES="false"
    CURRENT_BACKUP=""

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
            -b|--branch)
                GIT_BRANCH="$2"
                shift 2
                ;;
            -f|--force)
                FORCE_UPDATE="true"
                shift
                ;;
            -s|--skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            -r|--rollback)
                DO_ROLLBACK="true"
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
    check_installation

    # 回滚模式
    if [ "$DO_ROLLBACK" = "true" ]; then
        rollback
        exit 0
    fi

    check_update

    # 确认更新
    if [ "$AUTO_YES" != "true" ]; then
        echo ""
        read -p "是否继续更新? [Y/n] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "更新已取消"
            exit 0
        fi
    fi

    backup_config
    stop_service
    pull_latest
    rebuild_panel
    start_service
    show_result
}

# 运行
main "$@"
