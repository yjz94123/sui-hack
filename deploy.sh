#!/bin/bash

# ==================== OG Predict Backend 部署脚本 ====================
# 使用方法: ./deploy.sh [start|stop|restart|logs|build|status]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境变量文件
check_env() {
    if [ ! -f .env.production ]; then
        echo -e "${RED}错误: .env.production 文件不存在${NC}"
        echo -e "${YELLOW}请复制 .env.production.example 并填写配置:${NC}"
        echo "cp .env.production.example .env.production"
        exit 1
    fi
}

# 构建镜像
build() {
    echo -e "${GREEN}构建 Docker 镜像...${NC}"
    docker-compose --env-file .env.production build --no-cache
    echo -e "${GREEN}✓ 镜像构建完成${NC}"
}

# 启动服务
start() {
    check_env
    echo -e "${GREEN}启动服务...${NC}"
    docker-compose --env-file .env.production up -d
    echo -e "${GREEN}✓ 服务已启动${NC}"
    echo ""
    status
}

# 停止服务
stop() {
    echo -e "${YELLOW}停止服务...${NC}"
    docker-compose --env-file .env.production down
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 重启服务
restart() {
    stop
    start
}

# 查看日志
logs() {
    docker-compose --env-file .env.production logs -f --tail=100 backend
}

# 查看状态
status() {
    echo -e "${GREEN}服务状态:${NC}"
    docker-compose --env-file .env.production ps
    echo ""
    echo -e "${GREEN}检查后端健康状态:${NC}"
    sleep 2
    curl -s http://localhost:3001/health | jq '.' || echo "健康检查失败或 jq 未安装"
}

# 数据库迁移
migrate() {
    echo -e "${GREEN}运行数据库迁移...${NC}"
    docker-compose --env-file .env.production exec backend npm run db:push
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
}

# 清理
clean() {
    echo -e "${YELLOW}清理 Docker 资源...${NC}"
    docker-compose --env-file .env.production down -v
    echo -e "${GREEN}✓ 清理完成${NC}"
}

# 备份数据库
backup() {
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${GREEN}备份数据库到 $BACKUP_FILE...${NC}"
    docker-compose --env-file .env.production exec -T postgres pg_dump -U ogpredict og_prediction_market > "$BACKUP_FILE"
    echo -e "${GREEN}✓ 数据库已备份到 $BACKUP_FILE${NC}"
}

# 主菜单
case "$1" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    migrate)
        migrate
        ;;
    backup)
        backup
        ;;
    clean)
        clean
        ;;
    *)
        echo "使用方法: $0 {build|start|stop|restart|logs|status|migrate|backup|clean}"
        echo ""
        echo "命令说明:"
        echo "  build   - 构建 Docker 镜像"
        echo "  start   - 启动所有服务"
        echo "  stop    - 停止所有服务"
        echo "  restart - 重启所有服务"
        echo "  logs    - 查看后端日志"
        echo "  status  - 查看服务状态"
        echo "  migrate - 运行数据库迁移"
        echo "  backup  - 备份数据库"
        echo "  clean   - 停止服务并清理数据"
        exit 1
        ;;
esac

exit 0
