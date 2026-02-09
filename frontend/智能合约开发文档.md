# 预测市场智能合约

预测市场聚合交易终端的智能合约，部署在 0G Testnet。

## 合约地址 (0G Testnet - Chain ID: 16602)

| 合约 | 地址 |
| :--- | :--- |
| **USDC** | `0x0F0dC21FcC101173BD742F9CfEa8d6e68Ada4031` |
| **TradingHub** | `0x8CaEe372b8cec0F5850eCbA4276b5e631a51192E` |

---

## 合约概述

### USDC.sol - 测试用 USDC 代币

| 属性 | 值 |
| :--- | :--- |
| 名称 | USD Coin |
| 符号 | USDC |
| 精度 | 6 |
| 标准 | ERC20 |

**常量**:
- `MAX_MINT_AMOUNT`: 10,000 USDC (单次铸造上限)
- `MINT_COOLDOWN`: 1 小时 (铸造冷却时间)

**函数**:

| 函数 | 权限 | 说明 |
| :--- | :--- | :--- |
| `mint(to, amount)` | 任何人 | 铸造代币，单次上限 10,000 USDC，冷却 1 小时 |
| `mintUnlimited(to, amount)` | 任何人 | 无限制铸造 (仅用于测试脚本) |
| `decimals()` | 任何人 | 返回精度 6 |

**错误**:
- `MintAmountExceeded(requested, maximum)`: 超过单次铸造上限
- `MintCooldownNotPassed(remainingTime)`: 冷却时间未过

---

### TradingHub.sol - 订单管理合约

预测市场订单管理合约，仅 Owner 可下单和结算。

**常量**:
- `OUTCOME_NO = 0`: 选择 NO
- `OUTCOME_YES = 1`: 选择 YES

**数据结构**:

```solidity
struct Order {
    uint256 orderId;      // 订单ID (自增)
    address user;         // 用户地址
    bytes32 marketId;     // 市场ID
    uint8 outcome;        // 选择: 0=NO, 1=YES
    uint256 amount;       // 购买数量 (USDC, 6位小数)
    uint256 timestamp;    // 下单时间戳
    bool settled;         // 是否已结算
}
```

**函数**:

| 函数 | 权限 | 说明 |
| :--- | :--- | :--- |
| `placeOrder(user, marketId, outcome, amount)` | **Owner** | 为用户创建订单，从用户转入 USDC |
| `settleOrder(orderId, won)` | **Owner** | 结算单个订单 |
| `settleMarket(marketId, winningOutcome)` | **Owner** | 批量结算市场所有订单 |
| `depositUSDC(user, amount)` | **Owner** | 从用户存入 USDC 到合约 |
| `withdrawUSDC(to, amount)` | **Owner** | 提取合约中的 USDC |
| `getOrder(orderId)` | 任何人 | 获取订单详情 |
| `getUserOrders(user)` | 任何人 | 获取用户的所有订单ID |
| `getMarketOrders(marketId)` | 任何人 | 获取市场的所有订单ID |
| `getUserMarketOrders(user, marketId)` | 任何人 | 获取用户在指定市场的订单 |
| `totalOrders()` | 任何人 | 获取订单总数 |

**事件**:
- `OrderPlaced(orderId, user, marketId, outcome, amount)`: 订单创建
- `OrderSettled(orderId, user, marketId, won, payout)`: 订单结算
- `MarketSettled(marketId, winningOutcome, totalOrders)`: 市场批量结算

**错误**:
- `InvalidAmount()`: 金额无效
- `InvalidOutcome()`: 选择无效
- `OrderNotFound()`: 订单不存在
- `OrderAlreadySettled()`: 订单已结算
- `InsufficientContractBalance()`: 合约余额不足

---

## 交易流程

### 1. 用户准备

```
1. 用户调用 USDC.mint(user, amount) 获取测试代币
2. 用户调用 USDC.approve(TradingHub, amount) 授权
```

### 2. 下单流程

```
1. 后端 (Owner) 调用 TradingHub.placeOrder(user, marketId, outcome, amount)
2. 合约从用户 transferFrom USDC
3. 创建订单记录，返回订单ID
```

### 3. 结算流程

```
1. 后端 (Owner) 调用 settleMarket(marketId, winningOutcome)
2. 遍历该市场所有订单:
   - 如果订单 outcome == winningOutcome: 支付 amount * 2 给用户
   - 如果订单 outcome != winningOutcome: 不支付
3. 标记所有订单为已结算
```

### 4. 资金流转示例

```
用户下单 (YES, 100 USDC):
  └─ 用户转入: 100 USDC → 合约

市场结算 (YES 获胜):
  └─ 合约支付: 200 USDC → 用户 (本金 + 收益)

市场结算 (NO 获胜):
  └─ 用户获得: 0 USDC (本金归合约)
```

---

## 开发命令

### 编译

```bash
forge build
```

### 测试

```bash
forge test
forge test -vvvv  # 详细输出
```

### 部署

```bash
forge script script/Deploy.s.sol \
    --rpc-url https://rpc.ankr.com/0g_galileo_testnet_evm \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast --legacy --with-gas-price 3000000000 -vvvv
```

### 生成 ABI

```bash
forge build --extra-output-files abi
mkdir -p abi
cat out/USDC.sol/USDC.json | jq '.abi' > abi/USDC.json
cat out/TradingHub.sol/TradingHub.json | jq '.abi' > abi/TradingHub.json
```

---

## 前端集成

### 事件监听

```javascript
// 监听订单创建
hub.on("OrderPlaced", (orderId, user, marketId, outcome, amount) => {
    console.log(`订单 ${orderId}: 用户 ${user} 下单 ${outcome === 1 ? 'YES' : 'NO'} ${amount}`);
});

// 监听订单结算
hub.on("OrderSettled", (orderId, user, marketId, won, payout) => {
    console.log(`订单 ${orderId} 结算: ${won ? '获胜' : '失败'}, 支付 ${payout}`);
});

// 监听市场结算
hub.on("MarketSettled", (marketId, winningOutcome, totalOrders) => {
    console.log(`市场 ${marketId} 已结算: ${winningOutcome === 1 ? 'YES' : 'NO'} 获胜`);
});
```

### 主要交互

| 操作 | 调用方 | 合约调用 |
| :--- | :--- | :--- |
| 领取测试币 | 用户 | `USDC.mint(user, amount)` |
| 授权 | 用户 | `USDC.approve(TradingHub, amount)` |
| 下单 | **后端(Owner)** | `TradingHub.placeOrder(user, marketId, outcome, amount)` |
| 结算 | **后端(Owner)** | `TradingHub.settleMarket(marketId, winningOutcome)` |
| 查询订单 | 任何人 | `TradingHub.getOrder(orderId)` |
| 查询用户订单 | 任何人 | `TradingHub.getUserOrders(user)` |

---

## 安全措施

| 措施 | 来源 | 用途 |
| :--- | :--- | :--- |
| `ReentrancyGuard` | OpenZeppelin | 防重入攻击 |
| `SafeERC20` | OpenZeppelin | 安全代币转账 |
| `Ownable` | OpenZeppelin | Owner 权限控制 |
| Custom Errors | Solidity 0.8+ | 节省 gas，清晰错误 |

---

## 技术栈

- **语言**: Solidity ^0.8.20
- **框架**: Foundry
- **依赖**: OpenZeppelin Contracts v5.x
- **网络**: 0G Testnet (Chain ID: 16602)
