/**
 * Sui 预测市场合约部署脚本
 * 使用最新的 @mysten/sui SDK
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
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
  timestamp: string;
}

async function deploy() {
  console.log('🚀 开始部署 Sui 预测市场合约...\n');

  // 1. 初始化客户端和密钥对
  const network = process.env.SUI_NETWORK || 'testnet';
  const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl(network as any);
  const client = new SuiClient({ url: rpcUrl });

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('请在 .env 文件中设置 DEPLOYER_PRIVATE_KEY');
  }

  // 从 base64 或 hex 字符串恢复密钥对
  const keypair = Ed25519Keypair.fromSecretKey(
    Buffer.from(privateKey, 'hex')
  );
  const deployerAddress = keypair.getPublicKey().toSuiAddress();

  console.log(`📍 部署者地址: ${deployerAddress}`);
  console.log(`🌐 网络: ${network}`);
  console.log(`🔗 RPC: ${rpcUrl}\n`);

  // 2. 检查余额
  const balance = await client.getBalance({
    owner: deployerAddress,
  });
  console.log(`💰 SUI 余额: ${Number(balance.totalBalance) / 1e9} SUI\n`);

  if (Number(balance.totalBalance) === 0) {
    console.log('❌ 余额不足，请先获取测试币:');
    console.log(`   curl --location --request POST 'https://faucet.${network}.sui.io/v1/gas' \\`);
    console.log(`        --header 'Content-Type: application/json' \\`);
    console.log(`        --data-raw '{"FixedAmountRequest":{"recipient":"${deployerAddress}"}}'`);
    process.exit(1);
  }

  // 3. 编译合约
  console.log('🔨 编译 Move 合约...');
  const projectRoot = resolve(__dirname, '..');
  try {
    execSync('sui move build', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log('✅ 编译成功\n');
  } catch (error) {
    console.error('❌ 编译失败:', error);
    process.exit(1);
  }

  // 4. 部署合约
  console.log('📦 部署合约到 Sui 网络...');

  const tx = new Transaction();

  // 读取编译后的字节码
  const compiledModulesPath = resolve(
    projectRoot,
    'build/prediction_market/bytecode_modules'
  );
  const modules = ['usdc_coin.mv', 'trading_hub.mv'];
  const compiledModules = modules.map((mod) =>
    Array.from(readFileSync(resolve(compiledModulesPath, mod)))
  );

  // 读取依赖
  const dependenciesPath = resolve(
    projectRoot,
    'build/prediction_market/dependencies.json'
  );
  const dependencies = JSON.parse(
    readFileSync(dependenciesPath, 'utf-8')
  );

  // 发布合约
  const [upgradeCap] = tx.publish({
    modules: compiledModules,
    dependencies: Object.keys(dependencies),
  });

  // 转移 UpgradeCap 给部署者
  tx.transferObjects([upgradeCap], deployerAddress);

  // 执行交易
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  console.log(`✅ 部署成功!`);
  console.log(`📝 Transaction Digest: ${result.digest}\n`);

  // 5. 解析部署结果
  const objectChanges = result.objectChanges || [];

  let packageId = '';
  let usdcMintController = '';
  let tradingHubId = '';
  let adminCapId = '';

  for (const change of objectChanges) {
    if (change.type === 'published') {
      packageId = change.packageId;
      console.log(`📦 Package ID: ${packageId}`);
    } else if (change.type === 'created') {
      const objectType = change.objectType;

      if (objectType.includes('::usdc_coin::MintController')) {
        usdcMintController = change.objectId;
        console.log(`💵 USDC MintController: ${usdcMintController}`);
      } else if (objectType.includes('::trading_hub::TradingHub')) {
        tradingHubId = change.objectId;
        console.log(`🏢 TradingHub: ${tradingHubId}`);
      } else if (objectType.includes('::trading_hub::AdminCap')) {
        adminCapId = change.objectId;
        console.log(`🔑 AdminCap: ${adminCapId}`);
      }
    }
  }

  // 6. 保存部署信息
  const deploymentInfo: DeploymentInfo = {
    network,
    packageId,
    usdcMintController,
    tradingHubId,
    adminCapId,
    deployerAddress,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = resolve(projectRoot, 'deployment.json');
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('\n✅ 部署信息已保存到 deployment.json');
  console.log('\n📋 部署摘要:');
  console.log('━'.repeat(60));
  console.log(`网络:              ${network}`);
  console.log(`Package ID:        ${packageId}`);
  console.log(`USDC Controller:   ${usdcMintController}`);
  console.log(`TradingHub:        ${tradingHubId}`);
  console.log(`AdminCap:          ${adminCapId}`);
  console.log(`部署者:            ${deployerAddress}`);
  console.log('━'.repeat(60));

  console.log('\n🎉 部署完成！现在可以运行交互脚本:');
  console.log('   npm run interact\n');
}

deploy().catch((error) => {
  console.error('❌ 部署失败:', error);
  process.exit(1);
});
