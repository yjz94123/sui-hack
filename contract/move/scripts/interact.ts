/**
 * Sui 预测市场合约交互脚本
 * 演示如何与部署的合约进行交互
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DeploymentInfo {
  network: string;
  packageId: string;
  usdcMintController: string;
  tradingHubId: string;
  adminCapId: string;
  deployerAddress: string;
}

async function interact() {
  console.log('🔗 开始与 Sui 预测市场合约交互...\n');

  // 1. 加载部署信息
  const projectRoot = resolve(__dirname, '..');
  const deploymentPath = resolve(projectRoot, 'deployment.json');
  let deployment: DeploymentInfo;

  try {
    deployment = JSON.parse(readFileSync(deploymentPath, 'utf-8'));
  } catch (error) {
    console.error('❌ 未找到 deployment.json，请先运行部署脚本:');
    console.error('   npm run deploy\n');
    process.exit(1);
  }

  // 2. 初始化客户端和密钥对
  const network = deployment.network;
  const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl(network as any);
  const client = new SuiClient({ url: rpcUrl });

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('请在 .env 文件中设置 DEPLOYER_PRIVATE_KEY');
  }

  const keypair = Ed25519Keypair.fromSecretKey(
    Buffer.from(privateKey, 'hex')
  );
  const userAddress = keypair.getPublicKey().toSuiAddress();

  console.log(`📍 用户地址: ${userAddress}`);
  console.log(`🌐 网络: ${network}`);
  console.log(`📦 Package ID: ${deployment.packageId}\n`);

  // 3. 铸造测试 USDC
  console.log('💵 步骤 1: 铸造 1000 USDC...');
  const mintAmount = 1000 * 1_000_000; // 1000 USDC (6位小数)

  const mintTx = new Transaction();
  mintTx.moveCall({
    target: `${deployment.packageId}::usdc_coin::mint`,
    arguments: [
      mintTx.object(deployment.usdcMintController),
      mintTx.pure.u64(mintAmount),
    ],
  });

  const mintResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: mintTx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log(`✅ 铸造成功! Digest: ${mintResult.digest}`);

  // 获取铸造的 USDC Coin 对象
  const mintedCoin = mintResult.objectChanges?.find(
    (change) =>
      change.type === 'created' &&
      change.objectType.includes('::usdc_coin::USDC_COIN')
  );

  if (!mintedCoin || mintedCoin.type !== 'created') {
    console.error('❌ 未找到铸造的 USDC Coin');
    return;
  }

  const usdcCoinId = mintedCoin.objectId;
  console.log(`   USDC Coin ID: ${usdcCoinId}\n`);

  // 4. 创建订单
  console.log('📝 步骤 2: 创建预测订单 (YES, 100 USDC)...');
  const orderAmount = 100 * 1_000_000; // 100 USDC
  const marketId = Array.from(Buffer.from('market-test-001', 'utf-8'));
  const outcome = 1; // YES

  const orderTx = new Transaction();

  // 分割 USDC Coin 用于支付
  const [paymentCoin] = orderTx.splitCoins(orderTx.object(usdcCoinId), [
    orderAmount,
  ]);

  orderTx.moveCall({
    target: `${deployment.packageId}::trading_hub::place_order`,
    arguments: [
      orderTx.object(deployment.adminCapId),
      orderTx.object(deployment.tradingHubId),
      orderTx.pure.address(userAddress),
      orderTx.pure.vector('u8', marketId),
      orderTx.pure.u8(outcome),
      paymentCoin,
    ],
  });

  const orderResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: orderTx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log(`✅ 订单创建成功! Digest: ${orderResult.digest}`);

  // 解析事件
  const orderEvent = orderResult.events?.find((e) =>
    e.type.includes('::trading_hub::OrderPlaced')
  );

  if (orderEvent) {
    console.log('   订单详情:');
    console.log(`   - Order ID: ${(orderEvent.parsedJson as any).order_id}`);
    console.log(`   - User: ${(orderEvent.parsedJson as any).user}`);
    console.log(`   - Market ID: market-test-001`);
    console.log(`   - Outcome: YES`);
    console.log(`   - Amount: 100 USDC\n`);
  }

  // 5. 查询订单
  console.log('🔍 步骤 3: 查询 TradingHub 状态...');
  const hubObject = await client.getObject({
    id: deployment.tradingHubId,
    options: {
      showContent: true,
    },
  });

  if (hubObject.data?.content?.dataType === 'moveObject') {
    const fields = hubObject.data.content.fields as any;
    console.log(`   合约余额: ${fields.balance / 1_000_000} USDC`);
    console.log(`   订单总数: ${fields.next_order_id - 1}\n`);
  }

  // 6. 结算订单（演示）
  console.log('🎲 步骤 4: 结算市场 (假设 YES 获胜)...');
  const winningOutcome = 1; // YES

  const settleTx = new Transaction();
  settleTx.moveCall({
    target: `${deployment.packageId}::trading_hub::settle_market`,
    arguments: [
      settleTx.object(deployment.adminCapId),
      settleTx.object(deployment.tradingHubId),
      settleTx.pure.vector('u8', marketId),
      settleTx.pure.u8(winningOutcome),
    ],
  });

  const settleResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: settleTx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log(`✅ 市场结算成功! Digest: ${settleResult.digest}`);

  // 解析结算事件
  const settleEvent = settleResult.events?.find((e) =>
    e.type.includes('::trading_hub::OrderSettled')
  );

  if (settleEvent) {
    const event = settleEvent.parsedJson as any;
    console.log('   结算详情:');
    console.log(`   - Order ID: ${event.order_id}`);
    console.log(`   - 结果: ${event.won ? '获胜 🎉' : '失败'}`);
    console.log(`   - 支付: ${event.payout / 1_000_000} USDC\n`);
  }

  // 7. 查询最终余额
  console.log('💰 步骤 5: 查询最终余额...');
  const coins = await client.getCoins({
    owner: userAddress,
    coinType: `${deployment.packageId}::usdc_coin::USDC_COIN`,
  });

  let totalBalance = 0;
  for (const coin of coins.data) {
    totalBalance += Number(coin.balance);
  }

  console.log(`   用户 USDC 余额: ${totalBalance / 1_000_000} USDC`);

  console.log('\n✅ 交互演示完成！\n');
  console.log('📋 总结:');
  console.log('━'.repeat(60));
  console.log('1. 铸造了 1000 USDC');
  console.log('2. 创建了一个 YES 订单 (100 USDC)');
  console.log('3. 结算市场，YES 获胜');
  console.log('4. 用户获得 200 USDC 返还 (本金 + 收益)');
  console.log('5. 最终余额增加了 100 USDC (收益)');
  console.log('━'.repeat(60));
}

interact().catch((error) => {
  console.error('❌ 交互失败:', error);
  process.exit(1);
});
