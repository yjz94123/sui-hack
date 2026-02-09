# Sui Move 合约部署指南

## 准备工作

### 1. 安装 Sui CLI

✅ 已安装：Sui CLI 1.22.0

### 2. 初始化 Sui 客户端配置

```bash
# 初始化配置（选择 testnet）
echo "y" | sui client

# 或者手动配置
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

### 3. 创建或导入钱包

#### 方式 A: 创建新钱包（推荐用于测试）

```bash
# 创建新地址
sui client new-address ed25519

# 这会生成一个新地址和助记词
# ⚠️ 请务必保存好助记词！
```

#### 方式 B: 导入现有钱包

```bash
# 从助记词导入
sui keytool import "your twelve word mnemonic phrase here" ed25519

# 或从私钥导入
sui keytool import <private-key> ed25519
```

### 4. 查看当前地址

```bash
# 查看所有地址
sui client addresses

# 查看当前活跃地址
sui client active-address

# 切换地址
sui client switch --address <address>
```

### 5. 获取测试币

```bash
# 方式 1: 使用 CLI 自动获取
sui client faucet

# 方式 2: 访问网页水龙头
# https://faucet.testnet.sui.io/

# 方式 3: 使用 curl
curl --location --request POST 'https://faucet.testnet.sui.io/v1/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "YOUR_SUI_ADDRESS"
    }
  }'

# 查看余额
sui client gas
```

## 部署步骤

### 步骤 1: 编译合约

```bash
cd /Users/zhuyingjie/code/sui-hack/contract/move

# 编译合约
sui move build

# 如果有警告，使用 --skip-fetch-latest-git-deps 跳过
sui move build --skip-fetch-latest-git-deps
```

### 步骤 2: 运行测试（可选）

```bash
# 运行所有测试
sui move test

# 运行特定测试
sui move test --filter usdc_coin

# 详细输出
sui move test -v
```

### 步骤 3: 部署到测试网

```bash
# 部署合约
sui client publish --gas-budget 100000000

# 如果需要跳过依赖检查
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
```

### 步骤 4: 保存部署信息

部署成功后，控制台会输出类似以下信息：

```
╭──────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                      │
│  ┌──                                                                  │
│  │ ObjectID: 0xabc...                                                │
│  │ Sender: 0x123...                                                  │
│  │ Owner: Shared                                                     │
│  │ ObjectType: 0xpackage::usdc_coin::MintController                 │
│  └──                                                                  │
│  ┌──                                                                  │
│  │ ObjectID: 0xdef...                                                │
│  │ Sender: 0x123...                                                  │
│  │ Owner: Shared                                                     │
│  │ ObjectType: 0xpackage::trading_hub::TradingHub                   │
│  └──                                                                  │
│  ┌──                                                                  │
│  │ ObjectID: 0xghi...                                                │
│  │ Sender: 0x123...                                                  │
│  │ Owner: Account Address ( 0x123... )                              │
│  │ ObjectType: 0xpackage::trading_hub::AdminCap                     │
│  └──                                                                  │
╰──────────────────────────────────────────────────────────────────────╯
```

请记录以下信息：
- **Package ID**: 合约包 ID
- **MintController ID**: USDC MintController 对象 ID
- **TradingHub ID**: TradingHub 对象 ID
- **AdminCap ID**: AdminCap 对象 ID
- **Transaction Digest**: 交易哈希

### 步骤 5: 更新配置文件

创建 `deployment.json`:

```json
{
  "network": "testnet",
  "packageId": "0x...",
  "usdcMintController": "0x...",
  "tradingHubId": "0x...",
  "adminCapId": "0x...",
  "deployerAddress": "0x...",
  "timestamp": "2024-02-09T08:00:00.000Z",
  "transactionDigest": "..."
}
```

更新前端 `.env` 文件：

```bash
cd ../../frontend
cp .env.example .env

# 编辑 .env
VITE_SUI_PACKAGE_ID=0x...
VITE_SUI_USDC_MINT_CONTROLLER=0x...
VITE_SUI_TRADING_HUB=0x...
VITE_SUI_ADMIN_CAP=0x...
```

## 验证部署

### 1. 在 Sui Explorer 查看

访问: https://suiexplorer.com/?network=testnet

搜索你的 Package ID 或 Transaction Digest

### 2. 使用 CLI 查询对象

```bash
# 查询 MintController
sui client object <MINT_CONTROLLER_ID>

# 查询 TradingHub
sui client object <TRADING_HUB_ID>

# 查询 AdminCap
sui client object <ADMIN_CAP_ID>
```

### 3. 测试合约调用

```bash
# 铸造 USDC
sui client call \
  --package <PACKAGE_ID> \
  --module usdc_coin \
  --function mint \
  --args <MINT_CONTROLLER_ID> 1000000000 \
  --gas-budget 10000000

# 查询余额
sui client objects --address <YOUR_ADDRESS>
```

## 使用 TypeScript 脚本部署（推荐）

我们已经准备了自动化部署脚本：

```bash
cd /Users/zhuyingjie/code/sui-hack/contract/move

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env

# 编辑 .env，填入你的私钥
DEPLOYER_PRIVATE_KEY=your_private_key_hex
SUI_NETWORK=testnet

# 3. 运行部署脚本
npm run deploy

# 4. 测试交互
npm run interact
```

## 获取私钥

如果需要在 TypeScript 脚本中使用私钥：

```bash
# 导出私钥（十六进制格式）
sui keytool export --address <YOUR_ADDRESS>

# 这会显示类似：
# Private key: 0xabcdef...
# 复制 0x 后面的部分到 .env 文件
```

⚠️ **重要提示**：
- 私钥非常重要，切勿泄露！
- 测试网私钥也要妥善保管
- 不要将包含私钥的 .env 文件提交到 git

## 常见问题

### Q: 部署失败，提示 "Insufficient gas"
A: 增加 gas budget:
```bash
sui client publish --gas-budget 200000000
```

### Q: 如何更新已部署的合约？
A: Sui 支持合约升级：
```bash
# 需要使用部署时获得的 UpgradeCap
sui client upgrade \
  --upgrade-capability <UPGRADE_CAP_ID> \
  --gas-budget 100000000
```

### Q: 如何查看合约的源代码？
A: 在 Sui Explorer 中查看 Package，可以看到完整的 Move 源码。

### Q: 部署后发现合约有 bug 怎么办？
A:
1. 修复代码
2. 运行测试确认
3. 使用 UpgradeCap 升级合约
4. 或者重新部署一个新版本

### Q: 测试币不够用怎么办？
A:
1. 每次可以从水龙头获取约 1 SUI
2. 可以多次请求（有冷却时间）
3. 也可以在 Discord 社区申请

## 下一步

部署成功后：

1. ✅ 更新前端配置
2. ✅ 启动前端测试
3. ✅ 测试铸造 USDC
4. ✅ 测试创建订单
5. ✅ 测试事件监听

## 相关资源

- [Sui 官方文档](https://docs.sui.io/)
- [Sui Explorer (Testnet)](https://suiexplorer.com/?network=testnet)
- [Sui Testnet Faucet](https://faucet.testnet.sui.io/)
- [Sui Discord](https://discord.gg/sui)
