# 快速部署指南

## 前提条件

✅ Docker 已安装
✅ Docker Compose 已安装
✅ 服务器可以访问外网

## 部署步骤

### 1️⃣ 上传项目到服务器

**方式一：使用 Git（推荐）**
```bash
# 在服务器上
cd /opt
git clone <your-repo-url> og-predict
cd og-predict
```

**方式二：使用 SCP**
```bash
# 在本地运行
scp -r /Users/zhuyingjie/code/sui-hack user@your-server:/opt/og-predict
```

**方式三：使用 rsync**
```bash
# 在本地运行
rsync -avz --progress /Users/zhuyingjie/code/sui-hack/ user@your-server:/opt/og-predict/
```

### 2️⃣ 配置环境变量

```bash
# 在服务器上
cd /opt/og-predict

# 复制配置模板
cp .env.production.example .env.production

# 编辑配置文件
vim .env.production
```

**必须配置的关键项**：
```bash
# 数据库
POSTGRES_PASSWORD=你的强密码

# 0G Storage
STORAGE_PRIVATE_KEY=0x...
OG_KV_STREAM_ID=...
OG_KV_NODE_RPC=http://...

# AI Compute
COMPUTE_PRIVATE_KEY=0x...
OG_COMPUTE_API_KEY=sk-...

# Oracle
ORACLE_PRIVATE_KEY=0x...

# 智能合约
DEMO_USDC_ADDRESS=0x...
TRADING_HUB_ADDRESS=0x...
```

### 3️⃣ 检查 Docker 环境

```bash
# 检查 Docker 版本
docker --version
docker compose version

# 检查 Docker 是否运行
docker ps

# 如果当前用户没有 Docker 权限，运行：
sudo usermod -aG docker $USER
# 然后重新登录
```

### 4️⃣ 构建并启动服务

```bash
# 构建镜像
./deploy.sh build

# 启动服务
./deploy.sh start

# 查看状态
./deploy.sh status
```

### 5️⃣ 初始化数据库

```bash
# 运行数据库迁移
./deploy.sh migrate
```

### 6️⃣ 验证部署

```bash
# 查看日志
./deploy.sh logs

# 检查健康状态
curl http://localhost:3001/health

# 应该返回类似：
# {"status":"ok","timestamp":"2024-..."}
```

### 7️⃣ 配置 Nginx 反向代理（可选但推荐）

如果服务器上没有 Nginx：
```bash
sudo apt install nginx -y
```

创建 Nginx 配置：
```bash
sudo vim /etc/nginx/sites-available/og-backend
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名或 IP

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

### 8️⃣ 配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 自动配置 HTTPS
sudo certbot --nginx -d your-domain.com

# Certbot 会自动修改 Nginx 配置并设置自动续期
```

## 防火墙配置

```bash
# 检查防火墙状态
sudo ufw status

# 如果防火墙未启用
sudo ufw enable

# 允许必要端口
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 查看状态
sudo ufw status numbered
```

## 常用命令

```bash
# 查看服务状态
./deploy.sh status

# 查看实时日志
./deploy.sh logs

# 重启服务
./deploy.sh restart

# 停止服务
./deploy.sh stop

# 备份数据库
./deploy.sh backup

# 进入后端容器调试
docker exec -it og-backend sh
```

## 测试 API

```bash
# 健康检查
curl http://localhost:3001/health

# 如果配置了 Nginx
curl http://your-domain.com/health

# 如果配置了 HTTPS
curl https://your-domain.com/health
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose --env-file .env.production logs backend

# 检查容器状态
docker ps -a

# 检查端口占用
sudo lsof -i :3001
```

### 数据库连接失败

```bash
# 检查数据库容器
docker-compose --env-file .env.production ps postgres

# 查看数据库日志
docker-compose --env-file .env.production logs postgres

# 测试数据库连接
docker-compose --env-file .env.production exec postgres \
  psql -U ogpredict -d og_prediction_market -c "SELECT 1"
```

### 权限问题

```bash
# 确保当前用户在 docker 组
groups

# 如果没有 docker 组，添加并重新登录
sudo usermod -aG docker $USER
# 退出并重新登录
```

## 监控和维护

### 查看资源使用

```bash
# 容器资源使用
docker stats

# 系统资源使用
htop

# 磁盘使用
df -h
```

### 定期备份

```bash
# 手动备份
./deploy.sh backup

# 设置定时备份（每天凌晨2点）
crontab -e
# 添加：
0 2 * * * cd /opt/og-predict && ./deploy.sh backup
```

### 日志管理

```bash
# 查看日志大小
docker system df

# 清理旧日志（谨慎使用）
docker system prune -a

# 限制日志大小（修改 docker-compose.yml）
# 在 backend 服务下添加：
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 更新部署

当代码有更新时：

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
./deploy.sh build

# 3. 重启服务
./deploy.sh restart

# 4. 如有数据库变更，运行迁移
./deploy.sh migrate

# 5. 检查状态
./deploy.sh status
```

## 完全重置（谨慎）

```bash
# 停止并删除所有数据
./deploy.sh clean

# 重新开始
./deploy.sh build
./deploy.sh start
./deploy.sh migrate
```

## 性能优化建议

1. **使用 SSD 磁盘**
2. **配置 CDN**（如使用静态资源）
3. **数据库连接池优化**（已在代码中配置）
4. **调整同步间隔**（.env.production 中的 SYNC_*_INTERVAL_MS）
5. **启用 Gzip 压缩**（Nginx）
6. **配置 HTTP/2**（Nginx）

## 安全检查清单

- [ ] 数据库使用强密码
- [ ] 私钥已妥善保管
- [ ] .env.production 文件权限设置为 600
- [ ] 防火墙已配置
- [ ] SSH 使用密钥登录
- [ ] HTTPS 已配置
- [ ] 定期备份已设置
- [ ] 监控已配置

## 下一步

部署完成后，你可能需要：
1. 配置前端连接到后端 API
2. 测试完整的交易流程
3. 配置监控和告警
4. 设置自动备份
5. 压力测试

有问题随时查看 [DEPLOYMENT.md](DEPLOYMENT.md) 获取更详细的说明。
