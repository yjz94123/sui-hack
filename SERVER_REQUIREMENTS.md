# 服务器环境要求

## 操作系统要求

### 推荐操作系统
- **Ubuntu 22.04 LTS** (推荐)
- Ubuntu 20.04 LTS
- Debian 12
- Debian 11

### 其他支持的系统
- CentOS 8+
- RHEL 8+
- Amazon Linux 2023

## 硬件配置

### 最低配置 (测试环境)
- **CPU**: 2 核心
- **内存**: 4GB RAM
- **磁盘**: 20GB SSD
- **网络**: 10Mbps 带宽

### 推荐配置 (生产环境)
- **CPU**: 4 核心或更多
- **内存**: 8GB RAM
- **磁盘**: 50GB SSD (NVMe 更佳)
- **网络**: 100Mbps 带宽或更高

### 高负载配置
- **CPU**: 8 核心或更多
- **内存**: 16GB RAM
- **磁盘**: 100GB NVMe SSD
- **网络**: 1Gbps 带宽

## 软件环境

### 必需软件

#### 1. Docker
- **版本**: 20.10 或更高
- **用途**: 容器化部署
- **安装**: 使用官方脚本或包管理器

```bash
# 快速安装 (官方脚本)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### 2. Docker Compose
- **版本**: 2.0 或更高
- **用途**: 多容器编排
- **安装**: 随 Docker 一起安装或单独安装

```bash
# 检查是否已安装
docker compose version
```

### 可选软件

#### 1. Nginx (推荐)
- **用途**: 反向代理、HTTPS、负载均衡
- **安装**: `sudo apt install nginx`

#### 2. Certbot
- **用途**: 自动配置 HTTPS (Let's Encrypt)
- **安装**: `sudo apt install certbot python3-certbot-nginx`

#### 3. 监控工具
- **htop**: 系统监控 `sudo apt install htop`
- **netdata**: 实时监控面板 (可选)
- **prometheus + grafana**: 生产级监控 (可选)

## 一键环境配置

我已经为你准备了自动化配置脚本，只需运行：

```bash
# 下载配置脚本
wget https://your-repo/server-setup.sh

# 或使用已有的脚本
chmod +x server-setup.sh
sudo bash server-setup.sh
```

脚本会自动完成：
- ✅ 系统更新
- ✅ Docker 安装
- ✅ Docker Compose 安装
- ✅ 防火墙配置
- ✅ 系统参数优化
- ✅ 创建必要目录
- ✅ 可选安装 Nginx 和 Certbot

## 手动配置步骤

如果你想手动配置，请按以下步骤：

### 1. 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. 安装 Docker

```bash
# 安装依赖
sudo apt install -y ca-certificates curl gnupg lsb-release

# 添加 Docker GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 3. 配置 Docker 用户权限

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录以应用权限
# 或运行: newgrp docker
```

### 4. 配置防火墙

```bash
# 启用 UFW 防火墙
sudo ufw enable

# 允许 SSH (确保先允许 SSH，避免被锁定)
sudo ufw allow ssh

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 查看状态
sudo ufw status
```

### 5. 优化系统参数

```bash
# 增加文件描述符限制
sudo tee -a /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
EOF

# 优化网络参数
sudo tee -a /etc/sysctl.conf << EOF
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65535
vm.swappiness = 10
EOF

# 应用配置
sudo sysctl -p
```

### 6. 创建工作目录

```bash
sudo mkdir -p /opt/og-predict
sudo mkdir -p /opt/og-predict/backups
sudo mkdir -p /opt/og-predict/logs
sudo chown -R $USER:$USER /opt/og-predict
```

## 网络配置

### 开放端口

| 端口 | 协议 | 用途 | 是否必需 |
|------|------|------|----------|
| 22 | TCP | SSH | 必需 |
| 80 | TCP | HTTP | 推荐 |
| 443 | TCP | HTTPS | 推荐 |
| 3001 | TCP | 后端 API (内部) | 可选 |
| 5432 | TCP | PostgreSQL (内部) | 不推荐对外开放 |

**推荐配置**：
- 只开放 80 和 443 端口给外网
- 使用 Nginx 反向代理到后端 3001 端口
- PostgreSQL 仅在 Docker 内网访问

### 域名配置 (可选)

如果你有域名，需要配置 DNS 记录：

```
A 记录:
api.yourdomain.com -> 你的服务器 IP
```

## 安全配置

### 1. SSH 安全

```bash
# 编辑 SSH 配置
sudo vim /etc/ssh/sshd_config

# 建议修改以下配置:
# PermitRootLogin no                 # 禁止 root 登录
# PasswordAuthentication no          # 禁用密码登录，只允许密钥
# Port 2222                          # 修改 SSH 端口 (可选)

# 重启 SSH 服务
sudo systemctl restart sshd
```

### 2. 自动安全更新

```bash
# Ubuntu/Debian
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 3. Fail2Ban (防止暴力破解)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 存储配置

### 磁盘空间规划

```
/                      # 系统分区: 20GB
/opt/og-predict        # 应用目录: 10GB
/var/lib/docker        # Docker 数据: 20GB+
/opt/og-predict/backups # 备份目录: 根据需求
```

### Docker 数据目录 (可选迁移)

如果系统盘空间不足，可以迁移 Docker 数据目录：

```bash
# 停止 Docker
sudo systemctl stop docker

# 移动数据
sudo mv /var/lib/docker /data/docker

# 创建软链接
sudo ln -s /data/docker /var/lib/docker

# 启动 Docker
sudo systemctl start docker
```

## 监控和日志

### 配置日志轮转

```bash
sudo tee /etc/logrotate.d/og-predict << EOF
/opt/og-predict/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

### 安装监控工具

```bash
# 基础监控
sudo apt install htop iotop nethogs

# 查看系统资源
htop

# 查看磁盘 I/O
iotop

# 查看网络使用
nethogs
```

## 云服务商特殊配置

### AWS EC2
- 确保安全组开放了必要端口 (80, 443)
- 使用 Elastic IP 固定 IP 地址
- 建议使用 RDS 替代自建数据库

### 阿里云 ECS
- 配置安全组规则
- 建议使用 RDS PostgreSQL
- 可使用 SLB 负载均衡

### 腾讯云 CVM
- 配置安全组
- 建议使用 TencentDB for PostgreSQL
- 可使用 CLB 负载均衡

### DigitalOcean Droplet
- 配置防火墙规则
- 可使用 Managed Database
- 可使用 Load Balancer

## 验证环境

配置完成后，运行以下命令验证：

```bash
# 检查 Docker
docker --version
docker compose version
docker ps

# 检查系统资源
free -h
df -h
nproc

# 检查网络
curl -I https://google.com
ss -tlnp

# 检查防火墙
sudo ufw status
```

## 常见问题

### Q: Docker 权限问题
```bash
# 将用户添加到 docker 组后需要重新登录
sudo usermod -aG docker $USER
# 然后退出并重新登录
```

### Q: 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3001
sudo netstat -tlnp | grep 3001
```

### Q: 磁盘空间不足
```bash
# 清理 Docker 资源
docker system prune -a

# 清理日志
sudo journalctl --vacuum-time=7d
```

## 下一步

环境配置完成后，请参考 [DEPLOYMENT.md](DEPLOYMENT.md) 进行应用部署。
