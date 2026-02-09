# Sui 预测市场前端

基于 Sui 区块链的预测市场前端应用，使用 React + TypeScript + Vite 构建。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite
- **区块链**: Sui
- **钱包连接**: @mysten/dapp-kit
- **SDK**: @mysten/sui v1.14.0+
- **状态管理**: Zustand + React Query
- **路由**: React Router v7
- **样式**: Tailwind CSS
- **图表**: Lightweight Charts + Recharts

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入部署后的合约地址：

```env
# Sui 网络
VITE_SUI_NETWORK=testnet

# 合约地址（从 contract/move/deployment.json 获取）
VITE_SUI_PACKAGE_ID=0x...
VITE_SUI_USDC_MINT_CONTROLLER=0x...
VITE_SUI_TRADING_HUB=0x...
VITE_SUI_ADMIN_CAP=0x...
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 4. 构建生产版本

```bash
npm run build
npm run preview
```

## 项目结构

```
frontend/
├── src/
│   ├── api/                # API 接口
│   ├── components/         # React 组件
│   │   ├── common/        # 通用组件
│   │   ├── layout/        # 布局组件
│   │   ├── market/        # 市场相关组件
│   │   ├── portfolio/     # 投资组合组件
│   │   └── trade/         # 交易组件
│   ├── config/            # 配置文件
│   │   └── sui.ts         # Sui 网络配置
│   ├── contracts/         # 智能合约交互
│   │   ├── config.ts      # 合约地址配置
│   │   └── hooks/         # 合约 Hooks
│   │       ├── useUSDC.ts
│   │       └── useTradingHub.ts
│   ├── hooks/             # 自定义 Hooks
│   ├── pages/             # 页面组件
│   ├── stores/            # 状态管理
│   ├── styles/            # 全局样式
│   ├── types/             # TypeScript 类型
│   ├── utils/             # 工具函数
│   ├── App.tsx            # 主应用组件
│   └── main.tsx           # 入口文件
├── .env.example           # 环境变量模板
├── MIGRATION.md           # 迁移指南
├── package.json
└── vite.config.ts
```

## 核心功能

### 1. 钱包连接

使用 Sui 官方的 dApp Kit 连接钱包：

```typescript
import { useCurrentAccount } from '@mysten/dapp-kit';

function MyComponent() {
  const account = useCurrentAccount();

  if (!account) {
    return <div>请连接钱包</div>;
  }

  return <div>地址: {account.address}</div>;
}
```

### 2. USDC 操作

#### 查询余额

```typescript
import { useUSDCBalance } from '@/contracts';

function BalanceDisplay() {
  const { data: balance, isLoading } = useUSDCBalance();

  if (isLoading) return <div>加载中...</div>;

  return <div>USDC 余额: {balance?.balance}</div>;
}
```

#### 铸造 USDC

```typescript
import { useMintUSDC } from '@/contracts';

function MintButton() {
  const { mint, isPending } = useMintUSDC();

  const handleMint = async () => {
    try {
      await mint('1000'); // 铸造 1000 USDC
      alert('铸造成功！');
    } catch (error) {
      alert('铸造失败：' + error.message);
    }
  };

  return (
    <button onClick={handleMint} disabled={isPending}>
      {isPending ? '铸造中...' : '铸造 USDC'}
    </button>
  );
}
```

### 3. 订单操作

#### 查询订单

```typescript
import { useOrder } from '@/contracts';

function OrderDetail({ orderId }: { orderId: string }) {
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) return <div>加载中...</div>;
  if (!order) return <div>订单不存在</div>;

  return (
    <div>
      <p>订单ID: {order.orderId}</p>
      <p>用户: {order.user}</p>
      <p>市场: {order.marketId}</p>
      <p>预测: {order.outcomeName}</p>
      <p>金额: {order.amount} USDC</p>
      <p>状态: {order.settled ? '已结算' : '未结算'}</p>
    </div>
  );
}
```

#### 监听订单事件

```typescript
import { useWatchOrderPlaced } from '@/contracts';

function OrderMonitor() {
  useWatchOrderPlaced((data) => {
    console.log('新订单:', data);
    // 可以在这里更新 UI 或显示通知
  });

  return <div>监听订单中...</div>;
}
```

### 4. 交易构建示例

创建订单需要通过后端调用（因为需要 AdminCap），但前端可以准备数据：

```typescript
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { CONTRACTS, MODULES, USDC_COIN_TYPE } from '@/contracts';

function PlaceOrderButton({ marketId, outcome, amount }: Props) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const handlePlaceOrder = async () => {
    if (!account) return;

    // 1. 获取用户的 USDC Coins
    const coins = await client.getCoins({
      owner: account.address,
      coinType: USDC_COIN_TYPE,
    });

    if (coins.data.length === 0) {
      alert('没有 USDC，请先铸造');
      return;
    }

    // 2. 构建交易
    const tx = new Transaction();

    // 选择或合并 Coin 以满足金额需求
    const [paymentCoin] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [
      tx.pure.u64(BigInt(amount * 1e6)), // 转换为最小单位
    ]);

    // 3. 调用合约（实际需要通过后端，这里仅作演示）
    // tx.moveCall({
    //   target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::place_order`,
    //   arguments: [
    //     tx.object(CONTRACTS.ADMIN_CAP),  // 需要 AdminCap
    //     tx.object(CONTRACTS.TRADING_HUB),
    //     tx.pure.address(account.address),
    //     tx.pure.vector('u8', Buffer.from(marketId)),
    //     tx.pure.u8(outcome),
    //     paymentCoin,
    //   ],
    // });

    // 实际应该调用后端 API
    await fetch('/api/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: account.address,
        marketId,
        outcome,
        amount,
        // 后端会使用 AdminCap 创建订单
      }),
    });
  };

  return (
    <button onClick={handlePlaceOrder}>
      创建订单
    </button>
  );
}
```

## 合约 Hooks API

### USDC Hooks

| Hook | 说明 | 返回值 |
|------|------|--------|
| `useUSDCBalance()` | 查询当前账户 USDC 余额 | `{ balance, balanceRaw, coins }` |
| `useMintUSDC()` | 铸造 USDC | `{ mint, isPending }` |
| `useLastMintTime()` | 查询上次铸造时间 | `{ data: timestamp }` |
| `useMaxMintAmount()` | 查询最大铸造额度 | `{ data: { maxMintAmount } }` |
| `useMintCooldown()` | 查询冷却时间（秒） | `{ data: seconds }` |

### TradingHub Hooks

| Hook | 说明 | 返回值 |
|------|------|--------|
| `useOrder(orderId)` | 查询订单详情 | `{ data: Order }` |
| `useUserOrders(address)` | 查询用户订单ID列表 | `{ data: bigint[] }` |
| `useMarketOrders(marketId)` | 查询市场订单ID列表 | `{ data: bigint[] }` |
| `useTotalOrders()` | 查询订单总数 | `{ data: number }` |
| `useWatchOrderPlaced(callback)` | 监听订单创建事件 | `{ isSubscribed }` |
| `useWatchOrderSettled(callback)` | 监听订单结算事件 | `{ isSubscribed }` |
| `useWatchMarketSettled(callback)` | 监听市场结算事件 | `{ isSubscribed }` |

## 支持的钱包

- Sui Wallet
- Suiet Wallet
- Ethos Wallet
- Martian Wallet
- 其他支持 Sui 标准的钱包

## 开发建议

### 1. 使用 React Query 缓存
所有合约查询都使用了 React Query，自动处理缓存和重新获取。

### 2. 错误处理
```typescript
const { data, error, isLoading } = useOrder(orderId);

if (error) {
  return <div>错误: {error.message}</div>;
}
```

### 3. 交易确认
```typescript
const { mint, isPending } = useMintUSDC();

const result = await mint('1000');
// result.digest 是交易哈希
// 可以用于查询交易状态或跳转到浏览器
```

### 4. 事件监听去重
如果使用事件监听，记得在组件中去重，避免重复处理相同事件。

## 常见问题

### Q: 如何切换网络？
A: 修改 `.env` 中的 `VITE_SUI_NETWORK`，支持 `mainnet`, `testnet`, `devnet`。

### Q: 为什么余额没有实时更新？
A: React Query 默认每 5 秒刷新一次。可以手动调用 `refetch()` 立即刷新。

### Q: 交易失败如何调试？
A:
1. 检查浏览器控制台的错误信息
2. 访问 [Sui Explorer](https://suiexplorer.com/) 查看交易详情
3. 确认合约地址配置正确
4. 确认钱包有足够的 SUI 用于 gas

### Q: 如何测试？
A:
1. 访问 [Sui Faucet](https://faucet.testnet.sui.io/) 获取测试 SUI
2. 在应用中铸造测试 USDC
3. 通过后端 API 创建订单测试

## 相关资源

- [合约文档](../contract/move/README.md)
- [迁移指南](./MIGRATION.md)
- [Sui dApp Kit](https://sdk.mystenlabs.com/dapp-kit)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)

## 许可证

MIT
