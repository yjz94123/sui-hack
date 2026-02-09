# ✅ 准备就绪！可以开始部署了

## 当前状态

- ✅ Sui CLI 已安装: **v1.65.1**
- ✅ 钱包已配置
  - 地址: `0x8f85591031379a46b5d9730dfa5218769773894db862e04a190dcce3c7b3c820`
  - 助记词: ⚠️ **请务必保存好！**
- ✅ 网络配置: **Testnet**
- ✅ 合约编译成功

## ⚠️ 注意事项

### 1. 获取测试币

当前余额不足，需要先获取测试 SUI。有以下几种方式：

#### 方式 1: 网页水龙头（推荐）
访问: https://faucet.testnet.sui.io/
输入你的地址: `0x8f85591031379a46b5d9730dfa5218769773894db862e04a190dcce3c7b3c820`

#### 方式 2: CLI 命令
```bash
sui client faucet
```
注意：有频率限制（60分钟一次）

#### 方式 3: curl 命令
```bash
curl --location --request POST 'https://faucet.testnet.sui.io/v1/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "0x8f85591031379a46b5d9730dfa5218769773894db862e04a190dcce3c7b3c820"
    }
  }'
```

### 2. 检查余额

获取测试币后，运行以下命令检查余额：

```bash
sui client gas
```

确保有至少 **0.5 SUI** 用于部署（实际可能只需要 0.1-0.2 SUI）。

## 🚀 部署步骤

### 步骤 1: 确认余额充足

```bash
cd /Users/zhuyingjie/code/sui-hack/contract/move
sui client gas
```

### 步骤 2: 部署合约

```bash
sui client publish --gas-budget 100000000
```

参数说明：
- `--gas-budget 100000000`: Gas 预算（0.1 SUI）
- 如果失败，可以增加到 `200000000`（0.2 SUI）

### 步骤 3: 记录部署信息

部署成功后，终端会显示：

```
╭──────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                      │
│  ┌──                                                                  │
│  │ ObjectID: 0x...                                                   │
│  │ Owner: Shared                                                     │
│  │ ObjectType: ...::usdc_coin::MintController                       │
│  └──                                                                  │
│  ┌──                                                                  │
│  │ ObjectID: 0x...                                                   │
│  │ Owner: Shared                                                     │
│  │ ObjectType: ...::trading_hub::TradingHub                         │
│  └──                                                                  │
│  ┌──                                                                  │
│  │ ObjectID: 0x...                                                   │
│  │ Owner: Account Address ( 0x... )                                 │
│  │ ObjectType: ...::trading_hub::AdminCap                           │
│  └──                                                                  │
╰──────────────────────────────────────────────────────────────────────╯
```

**请记录以下信息：**
- ✏️ Package ID: `_______________________________________________`
- ✏️ MintController ID: `_______________________________________________`
- ✏️ TradingHub ID: `_______________________________________________`
- ✏️ AdminCap ID: `_______________________________________________`
- ✏️ Transaction Digest: `_______________________________________________`

### 步骤 4: 创建部署记录

将部署信息保存到 `deployment.json`:

```bash
cat > deployment.json << 'EOF'
{
  "network": "testnet",
  "packageId": "0x...",
  "usdcMintController": "0x...",
  "tradingHubId": "0x...",
  "adminCapId": "0x...",
  "deployerAddress": "0x8f85591031379a46b5d9730dfa5218769773894db862e04a190dcce3c7b3c820",
  "timestamp": "2024-02-09T08:40:00.000Z",
  "transactionDigest": "..."
}
EOF
```

### 步骤 5: 更新前端配置

```bash
cd ../../frontend

# 创建 .env 文件
cat > .env << 'EOF'
VITE_SUI_NETWORK=testnet
VITE_SUI_PACKAGE_ID=0x...
VITE_SUI_USDC_MINT_CONTROLLER=0x...
VITE_SUI_TRADING_HUB=0x...
VITE_SUI_ADMIN_CAP=0x...
EOF
```

## 🔍 验证部署

### 1. 在 Sui Explorer 查看

访问: https://suiexplorer.com/?network=testnet

搜索你的 Package ID 或 Transaction Digest。

### 2. 查询对象

```bash
# 查看 MintController
sui client object <MINT_CONTROLLER_ID>

# 查看 TradingHub
sui client object <TRADING_HUB_ID>

# 查看 AdminCap
sui client object <ADMIN_CAP_ID>
```

### 3. 测试铸造 USDC

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module usdc_coin \
  --function mint \
  --args <MINT_CONTROLLER_ID> 1000000000 \
  --gas-budget 10000000
```

成功后，查看你的对象：

```bash
sui client objects
```

应该能看到新铸造的 USDC Coin。

## 📝 常用命令

```bash
# 查看当前地址
sui client active-address

# 查看余额
sui client gas

# 查看所有对象
sui client objects

# 查看环境配置
sui client envs

# 切换网络
sui client switch --env testnet
```

## 🎉 下一步

部署成功后：

1. ✅ 安装前端依赖: `cd ../../frontend && npm install`
2. ✅ 启动前端: `npm run dev`
3. ✅ 测试钱包连接
4. ✅ 测试铸造 USDC
5. ✅ 测试创建订单（需要后端）

## 📚 相关文档

- [完整部署指南](DEPLOY.md)
- [合约文档](README.md)
- [前端迁移指南](../../frontend/MIGRATION.md)
- [Sui Explorer (Testnet)](https://suiexplorer.com/?network=testnet)
- [Sui 文档](https://docs.sui.io/)

---

**准备好了吗？开始部署吧！** 🚀

```bash
# 获取测试币后运行：
sui client publish --gas-budget 100000000
```
