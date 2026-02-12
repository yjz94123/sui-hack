#!/bin/bash

# ==================== 服务器环境配置脚本 ====================
# 适用于 Ubuntu 20.04/22.04 和 Debian 11/12
# 使用方法: sudo bash server-setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  OG Predict 服务器环境配置${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查是否是 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
    echo -e "${GREEN}检测到操作系统: $OS $VER${NC}"
else
    echo -e "${RED}无法检测操作系统${NC}"
    exit 1
fi

# 1. 更新系统
echo -e "\n${YELLOW}[1/8] 更新系统包...${NC}"
apt-get update
apt-get upgrade -y

# 2. 安装基础工具
echo -e "\n${YELLOW}[2/8] 安装基础工具...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    jq \
    ca-certificates \
    gnupg \
    lsb-release

# 3. 安装 Docker
echo -e "\n${YELLOW}[3/8] 安装 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    # 添加 Docker 官方 GPG 密钥
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${OS}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # 添加 Docker 仓库
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS} \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # 安装 Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # 启动 Docker
    systemctl start docker
    systemctl enable docker

    echo -e "${GREEN}✓ Docker 安装完成${NC}"
    docker --version
else
    echo -e "${GREEN}✓ Docker 已安装${NC}"
    docker --version
fi

# 4. 安装 Docker Compose (独立版本，可选)
echo -e "\n${YELLOW}[4/8] 检查 Docker Compose...${NC}"
if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose (插件版本) 已安装${NC}"
    docker compose version
else
    # 安装独立版本的 docker-compose
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose 安装完成${NC}"
    docker-compose --version
fi

# 5. 配置防火墙
echo -e "\n${YELLOW}[5/8] 配置防火墙...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
# 如果需要直接暴露后端端口（不推荐），取消下面的注释
# ufw allow 3001/tcp
echo -e "${GREEN}✓ 防火墙配置完成${NC}"
ufw status

# 6. 优化系统参数
echo -e "\n${YELLOW}[6/8] 优化系统参数...${NC}"

# 增加文件描述符限制
cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
EOF

# 优化网络参数
cat >> /etc/sysctl.conf << EOF
# OG Predict 优化
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65535
vm.swappiness = 10
EOF

sysctl -p
echo -e "${GREEN}✓ 系统参数优化完成${NC}"

# 7. 创建应用目录
echo -e "\n${YELLOW}[7/8] 创建应用目录...${NC}"
mkdir -p /opt/og-predict
mkdir -p /opt/og-predict/backups
mkdir -p /opt/og-predict/logs
echo -e "${GREEN}✓ 应用目录创建完成${NC}"

# 8. 安装可选工具
echo -e "\n${YELLOW}[8/8] 安装可选工具...${NC}"

# Nginx (可选，用于反向代理)
read -p "是否安装 Nginx? (y/n): " install_nginx
if [[ $install_nginx == "y" ]]; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx 安装完成${NC}"
fi

# Certbot (可选，用于 HTTPS)
read -p "是否安装 Certbot (Let's Encrypt)? (y/n): " install_certbot
if [[ $install_certbot == "y" ]]; then
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot 安装完成${NC}"
fi

# 9. 创建 Docker 用户组（可选）
echo -e "\n${YELLOW}配置 Docker 用户组...${NC}"
read -p "输入需要添加到 docker 组的用户名（留空跳过）: " docker_user
if [[ ! -z "$docker_user" ]]; then
    usermod -aG docker $docker_user
    echo -e "${GREEN}✓ 用户 $docker_user 已添加到 docker 组${NC}"
    echo -e "${YELLOW}注意: 用户需要重新登录才能生效${NC}"
fi

# 完成
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  环境配置完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}已安装组件:${NC}"
echo "  ✓ Docker: $(docker --version | cut -d ' ' -f3)"
echo "  ✓ Docker Compose: $(docker compose version --short 2>/dev/null || docker-compose --version | cut -d ' ' -f4)"
echo ""
echo -e "${BLUE}下一步操作:${NC}"
echo "  1. 上传项目代码到服务器"
echo "  2. 配置 .env.production 文件"
echo "  3. 运行: ./deploy.sh build"
echo "  4. 运行: ./deploy.sh start"
echo ""
echo -e "${BLUE}系统信息:${NC}"
echo "  - 应用目录: /opt/og-predict"
echo "  - 备份目录: /opt/og-predict/backups"
echo "  - 日志目录: /opt/og-predict/logs"
echo ""
echo -e "${YELLOW}建议重启系统以应用所有更改:${NC}"
echo "  sudo reboot"
echo ""
