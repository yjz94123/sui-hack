# Backend 部署文档

本文档提供 OG Predict Backend 服务的完整部署指南。

## 目录

- [系统要求](#系统要求)
- [部署前准备](#部署前准备)
- [方式一：Docker 部署（推荐）](#方式一docker-部署推荐)
- [方式二：传统 Node.js 部署](#方式二传统-nodejs-部署)
- [环境变量配置](#环境变量配置)
- [数据库迁移](#数据库迁移)
- [Nginx 反向代理配置](#nginx-反向代理配置)
- [SSL 证书配置](#ssl-证书配置)
- [进程管理](#进程管理)
- [日志管理](#日志管理)
- [监控与健康检查](#监控与健康检查)
- [常见问题排查](#常见问题排查)

---

## 系统要求

### 硬件要求
- **CPU**: 2 核心或以上
- **内存**: 4GB RAM 或以上
- **磁盘**: 20GB 可用空间

### 软件要求
- **操作系统**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Node.js**: v20.x（如果不使用 Docker）
- **Docker**: v24.0+ 和 Docker Compose v2.0+（Docker 部署）
- **PostgreSQL**: v14+ 或使用云数据库服务
- **Nginx**: v1.18+（可选，用于反向代理）

---

## 部署前准备

### 1. 创建部署用户

```bash
# 创建专用部署用户
sudo useradd -m -s /bin/bash ogpredict

# 设置密码
sudo passwd ogpredict

# 添加 sudo 权限（可选）
sudo usermod -aG sudo ogpredict

# 切换到部署用户
su - ogpredict
```

### 2. 安装必要软件

#### 安装 Docker（推荐）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 安装 Node.js（非 Docker 部署）

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version
```

#### 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. 准备数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 PostgreSQL 中执行
CREATE DATABASE og_prediction_market;
CREATE USER ogpredict WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE og_prediction_market TO ogpredict;
\q
```

### 4. 克隆项目代码

```bash
# 创建项目目录
mkdir -p ~/projects
cd ~/projects

# 克隆代码（替换为你的仓库地址）
git clone https://github.com/your-org/sui-hack.git
cd sui-hack/backend
```

---

## 方式一：Docker 部署（推荐）

Docker 部署是最简单和可靠的方式，推荐用于生产环境。

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（参考"环境变量配置"章节）
nano .env
```

### 2. 创建 docker-compose.yml

在 `backend` 目录创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ogpredict-db
    restart: always
    environment:
      POSTGRES_DB: og_prediction_market
      POSTGRES_USER: ogpredict
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ogpredict"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ..
      dockerfile: backend/Dockerfile.standalone
    container_name: ogpredict-backend
    restart: always
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://ogpredict:${DB_PASSWORD}@postgres:5432/og_prediction_market
      PORT: 3001
      # 从 .env 文件加载其他环境变量
      POLYMARKET_GAMMA_BASE_URL: ${POLYMARKET_GAMMA_BASE_URL}
      POLYMARKET_CLOB_BASE_URL: ${POLYMARKET_CLOB_BASE_URL}
      OG_RPC_URL: ${OG_RPC_URL}
      OG_STORAGE_INDEXER_RPC: ${OG_STORAGE_INDEXER_RPC}
      STORAGE_PRIVATE_KEY: ${STORAGE_PRIVATE_KEY}
      OG_KV_STREAM_ID: ${OG_KV_STREAM_ID}
      OG_KV_NODE_RPC: ${OG_KV_NODE_RPC}
      COMPUTE_PRIVATE_KEY: ${COMPUTE_PRIVATE_KEY}
      OG_COMPUTE_API_KEY: ${OG_COMPUTE_API_KEY}
      OG_COMPUTE_BASE_URL: ${OG_COMPUTE_BASE_URL}
      OG_COMPUTE_MODEL: ${OG_COMPUTE_MODEL}
      DEMO_USDC_ADDRESS: ${DEMO_USDC_ADDRESS}
      TRADING_HUB_ADDRESS: ${TRADING_HUB_ADDRESS}
      ORACLE_PRIVATE_KEY: ${ORACLE_PRIVATE_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
    driver: local
```

### 3. 构建并启动服务

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 查看服务状态
docker-compose ps
```

### 4. 运行数据库迁移

```bash
# 进入容器执行迁移
docker-compose exec backend sh -c "cd backend && npx prisma migrate deploy"
```

### 5. 验证部署

```bash
# 检查健康状态
curl http://localhost:3001/health

# 应该返回: {"status":"ok"}
```

### 6. Docker 常用命令

```bash
# 停止服务
docker-compose down

# 重启服务
docker-compose restart backend

# 查看实时日志
docker-compose logs -f backend

# 清理并重建
docker-compose down -v
docker-compose up -d --build

# 进入容器调试
docker-compose exec backend sh
```

---

## 方式二：传统 Node.js 部署

适合不使用 Docker 或需要更细粒度控制的场景。

### 1. 安装依赖

```bash
cd ~/projects/sui-hack

# 如果使用 workspace（monorepo）
npm install

# 构建 shared 包
npm run build --workspace=packages/shared

# 安装 backend 依赖
cd backend
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env

# 确保 DATABASE_URL 指向正确的数据库
# DATABASE_URL=postgresql://ogpredict:password@localhost:5432/og_prediction_market
```

### 3. 生成 Prisma Client 并运行迁移

```bash
# 生成 Prisma Client
npm run db:generate

# 运行数据库迁移
npm run db:migrate
```

### 4. 构建项目

```bash
npm run build

# 构建输出在 dist/ 目录
ls -la dist/
```

### 5. 使用 PM2 管理进程

```bash
# 全局安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name ogpredict-backend

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs ogpredict-backend

# 重启服务
pm2 restart ogpredict-backend

# 停止服务
pm2 stop ogpredict-backend
```

### 6. PM2 配置文件（可选）

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ogpredict-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    autorestart: true
  }]
};
```

使用配置文件启动:

```bash
pm2 start ecosystem.config.js
```

---

## 环境变量配置

详细的环境变量说明（编辑 `.env` 文件）:

```bash
# ==================== 服务器配置 ====================
PORT=3001
NODE_ENV=production

# ==================== 数据库配置 ====================
DATABASE_URL=postgresql://ogpredict:your_password@localhost:5432/og_prediction_market

# ==================== Polymarket API ====================
POLYMARKET_GAMMA_BASE_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_BASE_URL=https://clob.polymarket.com

# ==================== 0G Network ====================
OG_RPC_URL=https://evmrpc-testnet.0g.ai/

# ==================== 0G Storage ====================
OG_STORAGE_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
STORAGE_PRIVATE_KEY=0x1234...  # 存储服务的钱包私钥
OG_KV_STREAM_ID=your_stream_id_here
OG_KV_NODE_RPC=http://your_kv_node:6789

# ==================== AI 计算服务 ====================
COMPUTE_PRIVATE_KEY=0x5678...  # AI 计算服务的钱包私钥
OG_COMPUTE_API_KEY=sk-xxx...   # Kimi API Key
OG_COMPUTE_BASE_URL=https://api.moonshot.cn/v1
OG_COMPUTE_MODEL=kimi-k2.5
OG_COMPUTE_MAX_TOKENS=50000
OG_COMPUTE_TEMPERATURE=0.6
OG_COMPUTE_THINKING_TYPE=disabled
AI_PROMPT_PATH=../prompt.md

# ==================== 智能合约地址 ====================
DEMO_USDC_ADDRESS=0xYourUSDCContractAddress
TRADING_HUB_ADDRESS=0xYourTradingHubAddress

# ==================== Oracle 配置 ====================
ORACLE_PRIVATE_KEY=0x9abc...  # Oracle 服务的钱包私钥

# ==================== 同步任务间隔 ====================
SYNC_EVENTS_INTERVAL_MS=300000        # 事件同步：5 分钟
SYNC_ORDERBOOK_HOT_INTERVAL_MS=30000   # 热门订单簿：30 秒
SYNC_ORDERBOOK_COLD_INTERVAL_MS=120000 # 冷门订单簿：2 分钟
SYNC_PRICE_INTERVAL_MS=30000           # 价格同步：30 秒
ORACLE_CHECK_INTERVAL_MS=300000        # Oracle 检查：5 分钟
SNAPSHOT_INTERVAL_MS=1800000           # 快照保存：30 分钟

# ==================== 做市商配置（可选）====================
MARKET_MAKER_ENABLED=false
MARKET_MAKER_PRIVATE_KEY=0xdef...
MARKET_MAKER_INTERVAL_MS=60000
MARKET_MAKER_SPREAD_BPS=300
MARKET_MAKER_ORDER_AMOUNT=50
MARKET_MAKER_MAX_MARKETS=5
MARKET_MAKER_MIN_BALANCE=100
MARKET_MAKER_MINT_AMOUNT=5000
```

### 敏感信息保护

```bash
# 设置环境变量文件权限
chmod 600 .env

# 确保 .env 不被提交到 Git
echo ".env" >> .gitignore
```

---

## 数据库迁移

### 首次部署

```bash
# 生成 Prisma Client
npx prisma generate

# 运行迁移（开发环境）
npx prisma migrate dev

# 运行迁移（生产环境）
npx prisma migrate deploy
```

### 后续更新

```bash
# 拉取最新代码
git pull

# 运行新的迁移
npx prisma migrate deploy

# 重启服务
pm2 restart ogpredict-backend
# 或 Docker
docker-compose restart backend
```

### 数据库备份

```bash
# 创建备份脚本
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/postgresql
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U ogpredict og_prediction_market | gzip > $BACKUP_DIR/og_prediction_market_$TIMESTAMP.sql.gz
# 保留最近 7 天的备份
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x ~/backup-db.sh

# 添加到 crontab（每天凌晨 2 点备份）
crontab -e
# 添加这行：
# 0 2 * * * ~/backup-db.sh
```

---

## Nginx 反向代理配置

### 安装 Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 配置反向代理

创建 Nginx 配置文件 `/etc/nginx/sites-available/ogpredict`:

```nginx
# HTTP -> HTTPS 重定向
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 证书配置（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/ogpredict_access.log;
    error_log /var/log/nginx/ogpredict_error.log;

    # 反向代理到 Node.js 后端
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        access_log off;
    }

    # 限流配置
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001;
    }
}
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/ogpredict /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 设置开机自启
sudo systemctl enable nginx
```

---

## SSL 证书配置

### 使用 Certbot 申请 Let's Encrypt 证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo certbot renew --dry-run

# Certbot 会自动添加 cron 任务进行续期
```

---

## 进程管理

### Docker 方式

```bash
# 查看服务状态
docker-compose ps

# 查看资源使用
docker stats ogpredict-backend

# 重启服务
docker-compose restart backend

# 更新服务
git pull
docker-compose up -d --build
```

### PM2 方式

```bash
# 查看进程
pm2 list

# 监控
pm2 monit

# 重启
pm2 restart ogpredict-backend

# 停止
pm2 stop ogpredict-backend

# 删除
pm2 delete ogpredict-backend

# 查看详细信息
pm2 info ogpredict-backend
```

---

## 日志管理

### Docker 日志

```bash
# 查看实时日志
docker-compose logs -f backend

# 查看最近 100 行日志
docker-compose logs --tail=100 backend

# 导出日志
docker-compose logs backend > backend.log
```

### PM2 日志

```bash
# 查看日志
pm2 logs ogpredict-backend

# 清空日志
pm2 flush

# 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 系统日志

```bash
# Nginx 日志
sudo tail -f /var/log/nginx/ogpredict_access.log
sudo tail -f /var/log/nginx/ogpredict_error.log

# 系统日志
journalctl -u nginx -f
```

---

## 监控与健康检查

### 健康检查端点

```bash
# 基本健康检查
curl http://localhost:3001/health
# 响应: {"status":"ok"}

# 使用 watch 持续监控
watch -n 5 'curl -s http://localhost:3001/health | jq'
```

### 设置监控告警

创建监控脚本 `~/monitor.sh`:

```bash
#!/bin/bash

HEALTH_URL="http://localhost:3001/health"
WEBHOOK_URL="your_slack_or_discord_webhook_url"

# 检查健康状态
if ! curl -sf $HEALTH_URL > /dev/null; then
    # 发送告警
    curl -X POST $WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d '{"text":"⚠️ OG Predict Backend is DOWN!"}'

    # 尝试重启服务
    docker-compose restart backend
    # 或: pm2 restart ogpredict-backend
fi
```

添加到 crontab（每 5 分钟检查一次）:

```bash
chmod +x ~/monitor.sh
crontab -e
# 添加：
# */5 * * * * ~/monitor.sh
```

### 使用 Uptime Kuma（可选）

```bash
# 使用 Docker 部署 Uptime Kuma
docker run -d --restart=always \
  -p 3002:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1

# 访问 http://your-server-ip:3002 配置监控
```

---

## 常见问题排查

### 1. 服务无法启动

```bash
# 检查端口占用
sudo lsof -i :3001
sudo netstat -tulpn | grep 3001

# 检查日志
docker-compose logs backend
# 或
pm2 logs ogpredict-backend
```

### 2. 数据库连接失败

```bash
# 测试数据库连接
psql -U ogpredict -d og_prediction_market -h localhost

# 检查 DATABASE_URL 格式
echo $DATABASE_URL

# 检查 PostgreSQL 状态
sudo systemctl status postgresql
```

### 3. 内存不足

```bash
# 查看内存使用
free -h

# 添加 Swap（如果需要）
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. Docker 磁盘空间不足

```bash
# 清理未使用的镜像和容器
docker system prune -a

# 清理未使用的 volume
docker volume prune

# 查看磁盘使用
docker system df
```

### 5. Nginx 502 Bad Gateway

```bash
# 检查后端服务是否运行
curl http://localhost:3001/health

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 检查 SELinux（如果启用）
sudo setsebool -P httpd_can_network_connect 1
```

### 6. SSL 证书问题

```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期
sudo certbot renew

# 测试 SSL 配置
curl -I https://api.yourdomain.com
```

---

## 更新部署

### 常规更新流程

```bash
# 1. 备份数据库
~/backup-db.sh

# 2. 拉取最新代码
cd ~/projects/sui-hack
git pull

# 3. Docker 方式
docker-compose down
docker-compose up -d --build

# 或 PM2 方式
cd backend
npm install
npm run build
npx prisma migrate deploy
pm2 restart ogpredict-backend

# 4. 验证部署
curl http://localhost:3001/health
```

### 零停机更新（PM2）

```bash
# 使用 PM2 reload 实现零停机
pm2 reload ogpredict-backend
```

---

## 安全最佳实践

1. **使用强密码**: 数据库和所有账户使用强密码
2. **限制访问**: 使用防火墙限制访问
   ```bash
   sudo ufw enable
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   ```
3. **定期更新**: 保持系统和依赖更新
   ```bash
   sudo apt update && sudo apt upgrade
   ```
4. **密钥管理**: 私钥使用环境变量，不要硬编码
5. **监控日志**: 定期检查日志文件
6. **备份**: 自动化数据库备份

---

## 性能优化

### 1. 数据库优化

```sql
-- 在 PostgreSQL 中创建索引（已在 schema 中定义）
-- 定期清理
VACUUM ANALYZE;
```

### 2. Node.js 优化

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### 3. Nginx 缓存

```nginx
# 在 Nginx 配置中添加缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

---

## 技术支持

如遇到问题，请按以下顺序排查：

1. 查看本文档的"常见问题排查"章节
2. 检查日志文件
3. 访问项目 GitHub Issues
4. 联系技术支持团队

---

## 附录

### 快速命令速查表

```bash
# Docker 部署
docker-compose up -d          # 启动
docker-compose down           # 停止
docker-compose logs -f        # 查看日志
docker-compose restart        # 重启

# PM2 部署
pm2 start ecosystem.config.js # 启动
pm2 stop ogpredict-backend   # 停止
pm2 logs                      # 查看日志
pm2 restart ogpredict-backend # 重启

# 数据库
psql -U ogpredict -d og_prediction_market  # 连接数据库
npx prisma migrate deploy                  # 运行迁移
npx prisma studio                          # 打开管理界面

# Nginx
sudo nginx -t                 # 测试配置
sudo systemctl restart nginx  # 重启
sudo tail -f /var/log/nginx/error.log  # 查看日志
```

---

**最后更新**: 2026-02-12
**版本**: 1.0.0
