# Sui 预测市场智能合约

基于 Sui 区块链的预测市场聚合交易终端智能合约。

## 技术栈

- **语言**: Move 2024
- **区块链**: Sui
- **SDK**: @mysten/sui v1.14.0+
- **运行时**: TypeScript (Node.js)

## 合约概述

### usdc_coin.move - 测试用 USDC 代币

标准的 Sui Coin 实现，任何人可铸造（有限制）。

**常量**:
- `MAX_MINT_AMOUNT`: 10,000 USDC (单次铸造上限)
- `MINT_COOLDOWN`: 1 小时 (铸造冷却时间)

**主要对象**:
- `MintController`: 共享对象，管理铸币权限和冷却时间

**函数**:

| 函数 | 权限 | 说明 |
| :--- | :--- | :--- |
| `mint(controller, amount)` | 任何人 | 铸造代币，单次上限 10,000 USDC，冷却 1 小时 |
| `mint_unlimited(controller, amount, recipient)` | 任何人 | 无限制铸造 (仅用于测试) |
| `get_last_mint_time(controller, user)` | 任何人 | 查询用户上次铸造时间 |

**错误码**:
- `EMintAmountExceeded (1)`: 超过单次铸造上限
- `EMintCooldownNotPassed (2)`: 冷却时间未过

---

### trading_hub.move - 订单管理合约

预测市场订单管理合约，仅持有 AdminCap 的管理员可下单和结算。

**常量**:
- `OUTCOME_NO = 0`: 选择 NO
- `OUTCOME_YES = 1`: 选择 YES

**主要对象**:
- `AdminCap`: 管理员权限凭证（owned object）
- `TradingHub`: 订单管理主对象（shared object）

**数据结构**:

```move
struct Order {
    order_id: u64,        // 订单ID
    user: address,        // 用户地址
    market_id: vector<u8>, // 市场ID
    outcome: u8,          // 选择: 0=NO, 1=YES
    amount: u64,          // 购买数量 (USDC, 6位小数)
    timestamp: u64,       // 下单时间戳 (毫秒)
    settled: bool,        // 是否已结算
}
```

**函数**:

| 函数 | 权限 | 说明 |
| :--- | :--- | :--- |
| `place_order(admin_cap, hub, user, market_id, outcome, payment)` | **AdminCap** | 为用户创建订单 |
| `settle_order(admin_cap, hub, order_id, won)` | **AdminCap** | 结算单个订单 |
| `settle_market(admin_cap, hub, market_id, winning_outcome)` | **AdminCap** | 批量结算市场所有订单 |
| `deposit_usdc(admin_cap, hub, payment)` | **AdminCap** | 存入 USDC 到合约 |
| `withdraw_usdc(admin_cap, hub, amount, recipient)` | **AdminCap** | 提取合约中的 USDC |
| `get_order(hub, order_id)` | 任何人 | 获取订单详情 |
| `get_user_orders(hub, user)` | 任何人 | 获取用户的所有订单ID |
| `get_market_orders(hub, market_id)` | 任何人 | 获取市场的所有订单ID |
| `total_orders(hub)` | 任何人 | 获取订单总数 |
| `get_balance(hub)` | 任何人 | 获取合约 USDC 余额 |

**事件**:
- `OrderPlaced`: 订单创建
- `OrderSettled`: 订单结算
- `MarketSettled`: 市场批量结算

**错误码**:
- `EInvalidAmount (1)`: 金额无效
- `EInvalidOutcome (2)`: 选择无效
- `EOrderNotFound (3)`: 订单不存在
- `EOrderAlreadySettled (4)`: 订单已结算
- `EInsufficientBalance (5)`: 合约余额不足
- `EUnauthorized (6)`: 未授权

---

## 交易流程

### 1. 用户准备

```typescript
// 用户铸造 USDC
await client.signAndExecuteTransaction({
  transaction: mintTx,
  signer: keypair,
});
```

### 2. 下单流程

```typescript
// 管理员为用户创建订单（用户需要提供 USDC Coin 对象）
const tx = new Transaction();
const [paymentCoin] = tx.splitCoins(tx.object(usdcCoinId), [amount]);

tx.moveCall({
  target: `${packageId}::trading_hub::place_order`,
  arguments: [
    tx.object(adminCapId),
    tx.object(tradingHubId),
    tx.pure.address(userAddress),
    tx.pure.vector('u8', marketIdBytes),
    tx.pure.u8(outcome),
    paymentCoin,
  ],
});
```

### 3. 结算流程

```typescript
// 管理员结算市场
tx.moveCall({
  target: `${packageId}::trading_hub::settle_market`,
  arguments: [
    tx.object(adminCapId),
    tx.object(tradingHubId),
    tx.pure.vector('u8', marketIdBytes),
    tx.pure.u8(winningOutcome),
  ],
});
```

### 4. 资金流转示例

```
用户下单 (YES, 100 USDC):
  └─ 用户 Coin 转入合约 Balance: 100 USDC

市场结算 (YES 获胜):
  └─ 合约创建 Coin 发送给用户: 200 USDC (本金 + 收益)

市场结算 (NO 获胜):
  └─ 用户获得: 0 USDC (本金留在合约)
```

---

## 快速开始

### 1. 安装依赖

```bash
cd move
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的私钥
```

`.env` 示例：
```env
DEPLOYER_PRIVATE_KEY=your_hex_private_key_without_0x_prefix
SUI_NETWORK=testnet
```

### 3. 获取测试币

访问 [Sui Testnet Faucet](https://faucet.testnet.sui.io/) 获取测试 SUI。

或使用命令行：
```bash
curl --location --request POST 'https://faucet.testnet.sui.io/v1/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'
```

### 4. 编译合约

```bash
sui move build
```

### 5. 部署合约

```bash
npm run deploy
```

部署成功后，会生成 `deployment.json` 文件，包含：
- Package ID
- USDC MintController ID
- TradingHub ID
- AdminCap ID

### 6. 测试交互

```bash
npm run interact
```

该脚本会演示完整流程：
1. 铸造 1000 USDC
2. 创建一个 YES 订单 (100 USDC)
3. 结算市场，YES 获胜
4. 用户获得 200 USDC 返还

---

## 开发命令

### 编译

```bash
sui move build
```

### 测试

```bash
sui move test
```

### 部署到不同网络

```bash
# Testnet (默认)
SUI_NETWORK=testnet npm run deploy

# Devnet
SUI_NETWORK=devnet npm run deploy

# Mainnet
SUI_NETWORK=mainnet npm run deploy
```

---

## TypeScript SDK 示例

### 初始化客户端

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const keypair = Ed25519Keypair.fromSecretKey(
  Buffer.from(privateKey, 'hex')
);
```

### 铸造 USDC

```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::usdc_coin::mint`,
  arguments: [
    tx.object(mintControllerId),
    tx.pure.u64(1000_000_000), // 1000 USDC
  ],
});

const result = await client.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
});
```

### 创建订单

```typescript
const tx = new Transaction();
const [paymentCoin] = tx.splitCoins(tx.object(usdcCoinId), [100_000_000]);

tx.moveCall({
  target: `${packageId}::trading_hub::place_order`,
  arguments: [
    tx.object(adminCapId),
    tx.object(tradingHubId),
    tx.pure.address(userAddress),
    tx.pure.vector('u8', Array.from(Buffer.from('market-001', 'utf-8'))),
    tx.pure.u8(1), // YES
    paymentCoin,
  ],
});
```

### 查询订单

```typescript
const hub = await client.getObject({
  id: tradingHubId,
  options: { showContent: true },
});

// 通过 Dynamic Field 查询订单
const order = await client.getDynamicFieldObject({
  parentId: tradingHubId,
  name: {
    type: 'u64',
    value: orderId.toString(),
  },
});
```

### 监听事件

```typescript
// 订阅 OrderPlaced 事件
const unsubscribe = await client.subscribeEvent({
  filter: {
    MoveEventType: `${packageId}::trading_hub::OrderPlaced`,
  },
  onMessage: (event) => {
    console.log('新订单:', event.parsedJson);
  },
});
```

---

## Sui 对象模型

### 所有权类型

| 对象 | 类型 | 说明 |
| :--- | :--- | :--- |
| `AdminCap` | Owned | 管理员独占拥有 |
| `MintController` | Shared | 所有人共享访问 |
| `TradingHub` | Shared | 所有人共享访问 |
| `Coin<USDC_COIN>` | Owned | 用户独占拥有 |

### 关键设计

1. **AdminCap 权限模型**: 使用 capability 对象实现权限控制，类似 Solidity 的 Ownable，但更灵活（可转移、可销毁）

2. **Shared Object**: TradingHub 使用共享对象，允许多个交易并发访问，Sui 会自动处理并发控制

3. **Balance vs Coin**:
   - `Coin`: 用户可见的代币对象
   - `Balance`: 合约内部的余额，不可直接访问

4. **Event Emission**: 所有关键操作都触发事件，便于前端监听和索引

---

## 安全特性

| 特性 | 实现方式 |
| :--- | :--- |
| 权限控制 | AdminCap capability 对象 |
| 重入保护 | Sui Move 语言级别的所有权系统 |
| 整数溢出 | Move 编译器自动检查 |
| 类型安全 | 强类型系统，泛型约束 |

---

## 与 EVM 版本对比

| 特性 | Solidity (EVM) | Move (Sui) |
| :--- | :--- | :--- |
| 权限控制 | Ownable modifier | AdminCap object |
| 重入保护 | ReentrancyGuard | 语言级所有权 |
| 代币标准 | ERC20 | Sui Coin Framework |
| 数据存储 | mapping | Table (Dynamic Field) |
| 事件 | event + emit | event::emit |
| 授权模式 | approve + transferFrom | Coin 对象直接转移 |

---

## 常见问题

### Q: 如何获取私钥？

A: 使用 Sui CLI 导出：
```bash
sui keytool export --key-identity <address>
```

### Q: 如何查看交易详情？

A: 访问 [Sui Explorer](https://suiexplorer.com/)，搜索交易哈希或对象 ID。

### Q: 如何升级合约？

A: 部署时会获得 `UpgradeCap`，使用它可以升级合约：
```bash
sui client upgrade --upgrade-capability <cap-id>
```

### Q: Gas 费用是多少？

A: Sui 的 Gas 费用非常低，通常一次交易少于 0.01 SUI。

---

## 项目结构

```
move/
├── Move.toml              # Move 项目配置
├── sources/
│   ├── usdc_coin.move     # USDC 代币模块
│   └── trading_hub.move   # 订单管理模块
├── scripts/
│   ├── deploy.ts          # 部署脚本
│   └── interact.ts        # 交互脚本
├── package.json           # Node.js 依赖
├── tsconfig.json          # TypeScript 配置
└── README.md              # 本文档
```

---

## 参考资源

- [Sui 官方文档](https://docs.sui.io/)
- [Sui Move 编程指南](https://docs.sui.io/guides/developer/first-app)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sui Move 标准库](https://github.com/MystenLabs/sui/tree/main/crates/sui-framework/packages)
- [Sui Explorer](https://suiexplorer.com/)

---

## 许可证

MIT
