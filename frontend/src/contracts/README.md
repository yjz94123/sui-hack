# Smart Contract Integration

This directory contains all the smart contract integration code for the 0G Prediction Market frontend.

## Structure

```
contracts/
├── abis/                  # Contract ABIs
│   ├── USDC.json
│   └── TradingHub.json
├── hooks/                 # React hooks for contract interactions
│   ├── useUSDC.ts        # USDC contract hooks
│   └── useTradingHub.ts  # TradingHub contract hooks
├── config.ts             # Contract addresses and constants
├── utils.ts              # Utility functions
├── index.ts              # Main export file
└── README.md             # This file
```

## Contract Addresses (0G Testnet - Chain ID: 16602)

- **USDC**: `0x0F0dC21FcC101173BD742F9CfEa8d6e68Ada4031`
- **TradingHub**: `0x8CaEe372b8cec0F5850eCbA4276b5e631a51192E`

## Usage Examples

### 1. Check USDC Balance

```typescript
import { useAccount } from 'wagmi';
import { useUSDCBalance } from '@/contracts';

function MyComponent() {
  const { address } = useAccount();
  const { balance, isLoading } = useUSDCBalance(address);

  return (
    <div>
      {isLoading ? 'Loading...' : `Balance: ${balance} USDC`}
    </div>
  );
}
```

### 2. Mint Test USDC

```typescript
import { useAccount } from 'wagmi';
import { useMintUSDC } from '@/contracts';

function MintButton() {
  const { address } = useAccount();
  const { mint, isPending, isSuccess } = useMintUSDC();

  const handleMint = () => {
    if (address) {
      mint(address, '1000'); // Mint 1000 USDC
    }
  };

  return (
    <button onClick={handleMint} disabled={isPending}>
      {isPending ? 'Minting...' : isSuccess ? 'Minted!' : 'Mint 1000 USDC'}
    </button>
  );
}
```

### 3. Approve USDC Spending

```typescript
import { useApproveUSDC, CONTRACTS } from '@/contracts';

function ApproveButton() {
  const { approve, isPending, isSuccess } = useApproveUSDC();

  const handleApprove = () => {
    approve(CONTRACTS.TradingHub.address, '10000'); // Approve 10000 USDC
  };

  return (
    <button onClick={handleApprove} disabled={isPending}>
      {isPending ? 'Approving...' : isSuccess ? 'Approved!' : 'Approve USDC'}
    </button>
  );
}
```

### 4. Get User Orders

```typescript
import { useAccount } from 'wagmi';
import { useUserOrders, useOrder } from '@/contracts';

function UserOrders() {
  const { address } = useAccount();
  const { orderIds, isLoading } = useUserOrders(address);

  if (isLoading) return <div>Loading orders...</div>;

  return (
    <div>
      {orderIds?.map((orderId) => (
        <OrderItem key={orderId.toString()} orderId={orderId} />
      ))}
    </div>
  );
}

function OrderItem({ orderId }: { orderId: bigint }) {
  const { order } = useOrder(orderId);

  if (!order) return null;

  return (
    <div>
      Order #{order.orderId.toString()}: {order.outcomeName} - {order.amount} USDC
      {order.settled && ' (Settled)'}
    </div>
  );
}
```

### 5. Watch Contract Events

```typescript
import { useTradingHubEvents } from '@/contracts';
import { useEffect } from 'react';

function EventListener() {
  const { events } = useTradingHubEvents({
    onOrderPlaced: (data) => {
      console.log('New order placed:', data);
    },
    onOrderSettled: (data) => {
      console.log('Order settled:', data);
    },
    onMarketSettled: (data) => {
      console.log('Market settled:', data);
    },
  });

  return (
    <div>
      <h3>Recent Events</h3>
      {events.map((event, i) => (
        <div key={i}>
          {event.type}: {JSON.stringify(event.data)}
        </div>
      ))}
    </div>
  );
}
```

### 6. Check Mint Cooldown

```typescript
import { useAccount } from 'wagmi';
import { useLastMintTime, canMint, getRemainingCooldown, formatCooldown } from '@/contracts';
import { useState, useEffect } from 'react';

function MintCooldown() {
  const { address } = useAccount();
  const { lastMintTime } = useLastMintTime(address);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getRemainingCooldown(lastMintTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastMintTime]);

  return (
    <div>
      {canMint(lastMintTime) ? (
        <span>Ready to mint!</span>
      ) : (
        <span>Cooldown: {formatCooldown(timeLeft)}</span>
      )}
    </div>
  );
}
```

## Available Hooks

### USDC Hooks

- `useUSDCBalance(address)` - Get USDC balance
- `useUSDCAllowance(owner, spender)` - Get allowance amount
- `useMintUSDC()` - Mint test USDC (faucet)
- `useApproveUSDC()` - Approve USDC spending
- `useLastMintTime(address)` - Get last mint timestamp
- `useMaxMintAmount()` - Get max mint amount constant
- `useMintCooldown()` - Get mint cooldown constant

### TradingHub Hooks

- `useOrder(orderId)` - Get order details
- `useUserOrders(address)` - Get all user order IDs
- `useMarketOrders(marketId)` - Get all market order IDs
- `useUserMarketOrders(address, marketId)` - Get user's orders for a market
- `useTotalOrders()` - Get total number of orders
- `useWatchOrderPlaced(callback)` - Watch OrderPlaced events
- `useWatchOrderSettled(callback)` - Watch OrderSettled events
- `useWatchMarketSettled(callback)` - Watch MarketSettled events
- `useTradingHubEvents(callbacks)` - Watch all events

## Utility Functions

```typescript
import {
  formatUSDC,
  parseUSDC,
  canMint,
  getRemainingCooldown,
  formatCooldown,
  marketIdToBytes32,
  bytes32ToMarketId,
  formatOutcome,
  formatOrderDate,
  calculatePayout,
  shortenAddress,
} from '@/contracts/utils';
```

## Constants

```typescript
import {
  CONTRACTS,      // Contract addresses and ABIs
  OUTCOME,        // { NO: 0, YES: 1 }
  USDC_DECIMALS,  // 6
  MAX_MINT_AMOUNT, // 10000
  MINT_COOLDOWN,  // 3600 seconds
} from '@/contracts';
```

## Notes

- The TradingHub contract is **Owner-only** for placing orders and settling markets
- Frontend can only read order data and listen to events
- Users can mint test USDC and approve spending
- All amounts are in USDC with 6 decimals
- Orders pay 2x on winning outcome
