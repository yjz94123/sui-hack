#!/bin/bash

# Sui 测试网部署准备脚本

set -e

echo "🚀 Sui Move 合约部署准备脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Sui CLI
echo "📦 步骤 1: 检查 Sui CLI..."
if ! command -v sui &> /dev/null; then
    echo -e "${RED}❌ Sui CLI 未安装${NC}"
    echo "请访问 https://docs.sui.io/guides/developer/getting-started/sui-install 安装"
    exit 1
fi

SUI_VERSION=$(sui --version)
echo -e "${GREEN}✅ $SUI_VERSION${NC}"
echo ""

# 初始化配置
echo "⚙️  步骤 2: 初始化 Sui 客户端配置..."
if [ ! -f ~/.sui/sui_config/client.yaml ]; then
    echo "正在创建配置文件..."
    echo "y" | sui client > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ 配置文件已创建${NC}"
else
    echo -e "${GREEN}✅ 配置文件已存在${NC}"
fi
echo ""

# 配置测试网
echo "🌐 步骤 3: 配置 Sui Testnet..."
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443 2>/dev/null || true
sui client switch --env testnet
echo -e "${GREEN}✅ 已切换到 Testnet 环境${NC}"
echo ""

# 检查地址
echo "👛 步骤 4: 检查钱包地址..."
ADDRESSES=$(sui client addresses 2>/dev/null | grep "0x" || true)

if [ -z "$ADDRESSES" ]; then
    echo -e "${YELLOW}⚠️  未找到钱包地址，正在创建新地址...${NC}"
    sui client new-address ed25519
    echo -e "${GREEN}✅ 新地址已创建${NC}"
    echo -e "${RED}⚠️  请务必保存好显示的助记词！${NC}"
else
    echo -e "${GREEN}✅ 找到现有地址${NC}"
    sui client active-address
fi
echo ""

# 获取当前地址
ACTIVE_ADDRESS=$(sui client active-address)
echo "当前活跃地址: $ACTIVE_ADDRESS"
echo ""

# 检查余额
echo "💰 步骤 5: 检查 SUI 余额..."
GAS_OBJECTS=$(sui client gas --json 2>/dev/null || echo "[]")
TOTAL_BALANCE=$(echo "$GAS_OBJECTS" | jq -r '[.[] | .balance] | add // 0')
BALANCE_SUI=$(echo "scale=4; $TOTAL_BALANCE / 1000000000" | bc)

echo "余额: $BALANCE_SUI SUI"

if (( $(echo "$BALANCE_SUI < 0.5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  余额不足，正在请求测试币...${NC}"
    sui client faucet || {
        echo -e "${YELLOW}⚠️  自动获取失败，请手动访问水龙头:${NC}"
        echo "https://faucet.testnet.sui.io/"
        echo "或运行: sui client faucet"
    }
else
    echo -e "${GREEN}✅ 余额充足${NC}"
fi
echo ""

# 编译合约
echo "🔨 步骤 6: 编译 Move 合约..."
cd "$(dirname "$0")/.."
sui move build --skip-fetch-latest-git-deps
echo -e "${GREEN}✅ 合约编译成功${NC}"
echo ""

# 显示部署信息
echo "================================"
echo -e "${GREEN}✅ 准备完成！${NC}"
echo ""
echo "📋 部署信息:"
echo "  - 网络: Testnet"
echo "  - 地址: $ACTIVE_ADDRESS"
echo "  - 余额: $BALANCE_SUI SUI"
echo ""
echo "🚀 下一步操作:"
echo "  1. 如果余额不足，请访问水龙头获取测试币:"
echo "     https://faucet.testnet.sui.io/"
echo ""
echo "  2. 部署合约:"
echo "     sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps"
echo ""
echo "  3. 或使用 TypeScript 脚本自动部署:"
echo "     npm run deploy"
echo ""
echo "  4. 查看完整部署指南:"
echo "     cat DEPLOY.md"
echo ""
