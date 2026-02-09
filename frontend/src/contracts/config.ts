/**
 * Sui 合约配置
 *
 * 使用说明：
 * 1. 部署合约后，从 deployment.json 获取以下信息：
 *    - PACKAGE_ID: Package ID
 *    - USDC_MINT_CONTROLLER: USDC MintController 对象 ID
 *    - TRADING_HUB: TradingHub 共享对象 ID
 *    - ADMIN_CAP: AdminCap 对象 ID (仅管理员使用)
 *
 * 2. 更新 .env 文件或直接在此处替换
 */

// 从环境变量读取或使用默认值（需要部署后更新）
export const CONTRACTS = {
  // Package ID - 合约包 ID
  PACKAGE_ID: import.meta.env.VITE_SUI_PACKAGE_ID || '0x0',

  // USDC MintController - 共享对象
  USDC_MINT_CONTROLLER: import.meta.env.VITE_SUI_USDC_MINT_CONTROLLER || '0x0',

  // TradingHub - 共享对象
  TRADING_HUB: import.meta.env.VITE_SUI_TRADING_HUB || '0x0',

  // AdminCap - 管理员权限对象 (仅后端使用，前端不需要)
  ADMIN_CAP: import.meta.env.VITE_SUI_ADMIN_CAP || '0x0',
} as const;

// 模块名称
export const MODULES = {
  USDC_COIN: 'usdc_coin',
  TRADING_HUB: 'trading_hub',
} as const;

// 预测结果常量
export const OUTCOME = {
  NO: 0,
  YES: 1,
} as const;

// USDC 配置
export const USDC_DECIMALS = 6;
export const MAX_MINT_AMOUNT = 10000; // 10,000 USDC
export const MINT_COOLDOWN = 3600; // 1 hour in seconds

// 代币类型
export const USDC_COIN_TYPE = `${CONTRACTS.PACKAGE_ID}::${MODULES.USDC_COIN}::USDC_COIN`;
