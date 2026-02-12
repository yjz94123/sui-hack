# Backend 部署指南 (Docker)

## 快速开始

### 1. 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

### 2. 准备配置文件

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑配置文件，填写实际值
vim .env.production  # 或使用你喜欢的编辑器
```

**必须配置的重要环境变量：**

- `POSTGRES_PASSWORD` - 数据库密码（强密码）
- `STORAGE_PRIVATE_KEY` - 存储服务私钥
- `OG_KV_STREAM_ID` - 0G KV Stream ID
- `OG_KV_NODE_RPC` - KV 节点 RPC 地址
- `COMPUTE_PRIVATE_KEY` - 计算服务私钥
- `OG_COMPUTE_API_KEY` - Kimi API Key
- `ORACLE_PRIVATE_KEY` - Oracle 私钥
- `DEMO_USDC_ADDRESS` - USDC 合约地址
- `TRADING_HUB_ADDRESS` - Trading Hub 合约地址

### 3. 构建和启动

```bash
# 赋予部署脚本执行权限
chmod +x deploy.sh

# 构建 Docker 镜像
./deploy.sh build

# 启动所有服务
./deploy.sh start

# 查看服务状态
./deploy.sh status
```

### 4. 运行数据库迁移

```bash
# 首次部署时需要初始化数据库
./deploy.sh migrate
```

### 5. 验证部署

```bash
# 查看日志
./deploy.sh logs

# 检查健康状态
curl http://localhost:3001/health
```

## 常用命令

```bash
./deploy.sh start     # 启动服务
./deploy.sh stop      # 停止服务
./deploy.sh restart   # 重启服务
./deploy.sh logs      # 查看日志
./deploy.sh status    # 查看状态
./deploy.sh migrate   # 运行数据库迁移
./deploy.sh backup    # 备份数据库
./deploy.sh clean     # 清理所有数据（谨慎使用）
```

## 服务架构

```
┌─────────────────┐
│   Nginx/Caddy   │ (可选反向代理)
│   Port: 80/443  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OG Backend     │
│   Port: 3001    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│   Port: 5432    │
└─────────────────┘
```

## 生产环境配置

### 使用 Nginx 反向代理

创建 `/etc/nginx/sites-available/og-backend` 配置：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # 日志
    access_log /var/log/nginx/og-backend-access.log;
    error_log /var/log/nginx/og-backend-error.log;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/og-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 使用 Caddy (更简单)

创建 `Caddyfile`：

```
api.yourdomain.com {
    reverse_proxy localhost:3001
}
```

### 配置 HTTPS (Let's Encrypt)

使用 Caddy（自动 HTTPS）：
```bash
caddy run
```

使用 Nginx + Certbot：
```bash
sudo certbot --nginx -d api.yourdomain.com
```

## 监控和日志

### 查看实时日志

```bash
# 查看所有服务日志
docker-compose --env-file .env.production logs -f

# 只查看后端日志
docker-compose --env-file .env.production logs -f backend

# 只查看数据库日志
docker-compose --env-file .env.production logs -f postgres
```

### 进入容器调试

```bash
# 进入后端容器
docker-compose --env-file .env.production exec backend sh

# 进入数据库容器
docker-compose --env-file .env.production exec postgres psql -U ogpredict -d og_prediction_market
```

## 数据备份和恢复

### 备份数据库

```bash
# 使用部署脚本
./deploy.sh backup

# 或手动备份
docker-compose --env-file .env.production exec -T postgres \
  pg_dump -U ogpredict og_prediction_market > backup.sql
```

### 恢复数据库

```bash
# 恢复数据
docker-compose --env-file .env.production exec -T postgres \
  psql -U ogpredict og_prediction_market < backup.sql
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
./deploy.sh build

# 3. 停止旧服务
./deploy.sh stop

# 4. 启动新服务
./deploy.sh start

# 5. 运行数据库迁移（如有需要）
./deploy.sh migrate

# 6. 验证部署
./deploy.sh status
```

## 性能优化

### 调整数据库连接池

在 `.env.production` 中添加：

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20
```

### 调整同步间隔

根据实际需求调整同步间隔：

```bash
# 降低频率以减少负载
SYNC_ORDERBOOK_HOT_INTERVAL_MS=60000
SYNC_PRICE_INTERVAL_MS=60000
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose --env-file .env.production logs backend

# 检查环境变量
docker-compose --env-file .env.production config

# 检查端口占用
sudo lsof -i :3001
```

### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose --env-file .env.production ps postgres

# 测试数据库连接
docker-compose --env-file .env.production exec postgres \
  psql -U ogpredict -d og_prediction_market -c "SELECT 1"
```

### 清理并重新开始

```bash
# 停止所有服务并删除数据
./deploy.sh clean

# 重新启动
./deploy.sh build
./deploy.sh start
./deploy.sh migrate
```

## 安全建议

1. **保护环境变量**
   ```bash
   chmod 600 .env.production
   ```

2. **配置防火墙**
   ```bash
   # 只开放必要端口
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **定期更新**
   ```bash
   # 更新基础镜像
   docker-compose --env-file .env.production pull
   ```

4. **使用强密码**
   - 数据库密码至少 16 位
   - 私钥妥善保管，不要提交到代码库

5. **定期备份**
   ```bash
   # 设置 cron 定时备份
   0 2 * * * cd /path/to/project && ./deploy.sh backup
   ```

## 系统要求

### 最低配置
- CPU: 2 核
- 内存: 4GB
- 磁盘: 20GB SSD

### 推荐配置
- CPU: 4 核
- 内存: 8GB
- 磁盘: 50GB SSD

## 支持

如遇到问题，请查看：
1. 日志文件：`./deploy.sh logs`
2. 健康检查：`curl http://localhost:3001/health`
3. 数据库状态：`docker-compose ps postgres`
