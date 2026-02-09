# Frontend 迁移到 Sui 指南

## 已完成的迁移工作

### 1. 依赖更新
- ✅ 移除 EVM 相关依赖：`ethers`, `viem`, `wagmi`, `@rainbow-me/rainbowkit`
- ✅ 添加 Sui 依赖：`@mysten/sui`, `@mysten/dapp-kit`

### 2. 配置文件
- ✅ 创建 [src/config/sui.ts](src/config/sui.ts) - Sui 网络配置
- ✅ 更新 [src/contracts/config.ts](src/contracts/config.ts) - Sui 合约地址配置
- ✅ 创建 [.env.example](.env.example) - 环境变量模板

### 3. 合约 Hooks
- ✅ 重写 [src/contracts/hooks/useUSDC.ts](src/contracts/hooks/useUSDC.ts)
  - `useUSDCBalance` - 查询 USDC 余额
  - `useMintUSDC` - 铸造 USDC
  - `useLastMintTime` - 查询上次铸造时间
  - `useMaxMintAmount` - 查询最大铸造额度
  - `useMintCooldown` - 查询冷却时间
  - ⚠️ 移除了 `useUSDCAllowance` 和 `useApproveUSDC`（Sui 不需要 approve）

- ✅ 重写 [src/contracts/hooks/useTradingHub.ts](src/contracts/hooks/useTradingHub.ts)
  - `useOrder` - 查询订单详情
  - `useUserOrders` - 查询用户订单列表
  - `useMarketOrders` - 查询市场订单列表
  - `useUserMarketOrders` - 查询用户在特定市场的订单
  - `useTotalOrders` - 查询订单总数
  - `useWatchOrderPlaced` - 监听订单创建事件
  - `useWatchOrderSettled` - 监听订单结算事件
  - `useWatchMarketSettled` - 监听市场结算事件
  - `useTradingHubEvents` - 综合事件监听

### 4. 主入口更新
- ✅ 更新 [src/App.tsx](src/App.tsx) - 使用 Sui Provider
- ✅ 更新 [src/components/common/ConnectButton.tsx](src/components/common/ConnectButton.tsx) - Sui 钱包连接按钮

## 需要注意的重要变化

### 1. 钱包连接
**EVM 方式（旧）：**
```typescript
import { useAccount, useConnect } from 'wagmi';

const { address } = useAccount();
const { connect } = useConnect();
```

**Sui 方式（新）：**
```typescript
import { useCurrentAccount } from '@mysten/dapp-kit';

const account = useCurrentAccount();
const address = account?.address;
```

### 2. 代币授权
**EVM 方式（旧）：**
```typescript
// 需要先 approve
await approve(spenderAddress, amount);
// 再转账
await transfer(to, amount);
```

**Sui 方式（新）：**
```typescript
// 直接转移 Coin 对象，不需要 approve
const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::module::function`,
  arguments: [coinObject],
});
```

### 3. 交易执行
**EVM 方式（旧）：**
```typescript
import { useWriteContract } from 'wagmi';

const { writeContract } = useWriteContract();
writeContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: 'mint',
  args: [to, amount],
});
```

**Sui 方式（新）：**
```typescript
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::module::mint`,
  arguments: [
    tx.object(mintControllerId),
    tx.pure.u64(amount),
  ],
});

await signAndExecute({ transaction: tx });
```

### 4. 事件监听
**EVM 方式（旧）：**
```typescript
import { useWatchContractEvent } from 'wagmi';

useWatchContractEvent({
  address: contractAddress,
  abi: contractAbi,
  eventName: 'OrderPlaced',
  onLogs(logs) {
    // 处理事件
  },
});
```

**Sui 方式（新）：**
```typescript
const client = useSuiClient();

// 轮询方式
const interval = setInterval(async () => {
  const events = await client.queryEvents({
    query: { MoveEventType: eventType },
    order: 'descending',
    limit: 10,
  });
  // 处理事件
}, 5000);
```

## 需要手动完成的步骤

### 1. 安装依赖
```bash
cd frontend
npm install
```

### 2. 部署合约并更新配置
```bash
# 1. 部署合约
cd ../contract/move
npm run deploy

# 2. 复制 deployment.json 中的信息到 frontend/.env
cd ../../frontend
cp .env.example .env

# 3. 编辑 .env，填入合约地址：
# VITE_SUI_PACKAGE_ID=<从 deployment.json 获取>
# VITE_SUI_USDC_MINT_CONTROLLER=<从 deployment.json 获取>
# VITE_SUI_TRADING_HUB=<从 deployment.json 获取>
```

### 3. 更新其他使用钱包的组件
需要手动更新以下类型的组件：

#### 使用 `useAccount` 的组件
```typescript
// 旧代码
import { useAccount } from 'wagmi';
const { address, isConnected } = useAccount();

// 新代码
import { useCurrentAccount } from '@mysten/dapp-kit';
const account = useCurrentAccount();
const address = account?.address;
const isConnected = !!account;
```

#### 使用 `useBalance` 的组件
```typescript
// 旧代码
import { useBalance } from 'wagmi';
const { data: balance } = useBalance({ address });

// 新代码
import { useUSDCBalance } from '../contracts';
const { data: balance } = useUSDCBalance();
```

### 4. 删除不再需要的文件
```bash
rm -f src/config/wagmi.ts
rm -f src/stores/wallet-store.ts  # 如果不再需要
```

### 5. 更新 TypeScript 类型
某些组件可能使用了 EVM 特定的类型：
- `0x${string}` → `string`（Sui 地址也是字符串）
- `bigint` → `string | bigint`（根据实际情况）
- `bytes32` → `vector<u8>`（以字符串形式传递）

## 测试清单

- [ ] 钱包连接功能正常
- [ ] 显示 USDC 余额
- [ ] 铸造 USDC 代币
- [ ] 创建预测订单（需要后端支持）
- [ ] 查询订单列表
- [ ] 事件监听正常工作

## 常见问题

### Q: 为什么没有 approve 功能了？
A: Sui 使用对象模型，代币是 Coin 对象。转移时直接传递 Coin 对象，不需要 approve。

### Q: 如何获取用户的 Coin 对象？
A: 使用 `useSuiClient().getCoins()` 查询用户拥有的 Coin 对象，然后在交易中使用。

### Q: 事件为什么使用轮询而不是 WebSocket？
A: Sui 的事件 API 目前推荐使用轮询方式。未来可能会支持 WebSocket 订阅。

### Q: 如何调试合约交互？
A:
1. 使用 `devInspectTransactionBlock` 模拟执行（不上链）
2. 查看 [Sui Explorer](https://suiexplorer.com/) 的交易详情
3. 使用浏览器控制台查看错误信息

## 参考资源

- [Sui dApp Kit 文档](https://sdk.mystenlabs.com/dapp-kit)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sui 开发者文档](https://docs.sui.io/)
- [合约文档](../contract/move/README.md)
