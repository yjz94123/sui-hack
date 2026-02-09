# Sui 预测市场智能合约

基于 Sui 区块链的预测市场聚合交易终端智能合约。

## 技术栈

- **语言**: Move 2024
- **区块链**: Sui
- **SDK**: @mysten/sui v1.14.0+
- **运行时**: TypeScript (Node.js)

## 项目结构

```
contract/
├── move/                      # Sui Move 合约项目
│   ├── sources/              # Move 源码
│   │   ├── usdc_coin.move    # USDC 测试代币模块
│   │   └── trading_hub.move  # 订单管理模块
│   ├── scripts/              # TypeScript 部署和交互脚本
│   │   ├── deploy.ts         # 部署脚本
│   │   └── interact.ts       # 交互演示脚本
│   ├── Move.toml             # Move 项目配置
│   ├── package.json          # Node.js 依赖
│   └── README.md             # 详细文档
└── README.md                 # 本文件
```

## 快速开始

### 1. 进入 Move 项目目录

```bash
cd move
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的私钥
```

### 4. 编译合约

```bash
sui move build
```

### 5. 部署到 Sui Testnet

```bash
npm run deploy
```

### 6. 运行交互演示

```bash
npm run interact
```

## 合约功能

### usdc_coin - 测试用 USDC 代币

- ✅ 标准 Sui Coin 实现
- ✅ 铸造限制：10,000 USDC/次
- ✅ 冷却时间：1 小时
- ✅ 6 位精度

### trading_hub - 预测市场订单管理

- ✅ AdminCap 权限控制
- ✅ 创建预测订单（YES/NO）
- ✅ 单个订单结算
- ✅ 批量市场结算
- ✅ 资金管理（存入/提取）
- ✅ 多维度查询（用户、市场、订单）

## 核心特性

### 🔐 安全性

- **类型安全**: Move 强类型系统
- **所有权保护**: 语言级防重入
- **权限控制**: AdminCap capability 对象
- **溢出检查**: 编译器自动检查

### ⚡ 性能

- **并发支持**: Shared Object + Sui 并发引擎
- **低 Gas**: Move 编译器优化
- **高效索引**: Table 动态字段

### 🔄 交易流程

```
1. 用户铸造 USDC
   ↓
2. 管理员创建订单（用户支付 USDC）
   ↓
3. 订单存入合约 Balance
   ↓
4. 市场结算
   ↓
5. 预测正确的用户获得 2 倍返还
```

## 与 EVM 版本对比

| 特性 | Solidity (EVM) | Move (Sui) |
|------|----------------|------------|
| 代币标准 | ERC20 | Sui Coin Framework |
| 授权模式 | approve + transferFrom | Coin 对象直接转移 |
| 权限控制 | Ownable modifier | AdminCap object |
| 重入保护 | ReentrancyGuard | 语言级所有权 |
| 并发处理 | 串行执行 | 原生并发支持 |
| Gas 优化 | 手动优化 | 编译器自动优化 |

## 文档

详细的合约说明、API 文档和使用示例，请查看：

📚 **[move/README.md](move/README.md)**

## 开发命令

```bash
# 进入项目目录
cd move

# 编译合约
sui move build

# 运行测试
sui move test

# 部署到 Testnet
npm run deploy

# 交互演示
npm run interact
```

## 获取测试币

### Sui Testnet Faucet

访问：https://faucet.testnet.sui.io/

或使用命令行：
```bash
curl --location --request POST 'https://faucet.testnet.sui.io/v1/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'
```

## 资源链接

- [Sui 官方文档](https://docs.sui.io/)
- [Sui Move 编程指南](https://docs.sui.io/guides/developer/first-app)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sui Explorer](https://suiexplorer.com/)
- [Sui Move 标准库](https://github.com/MystenLabs/sui/tree/main/crates/sui-framework/packages)

## 许可证

MIT
