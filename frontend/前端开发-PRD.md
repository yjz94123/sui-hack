# 预测市场聚合交易终端 - 前端 PRD

| 文档版本 | 日期 | 作者 | 状态 |
| :--- | :--- | :--- | :--- |
| v1.1 | 2026-01-31 | Codex | 细化草稿 |

## 1. 背景与目标

### 1.1 背景
产品聚合 Polymarket 市场数据，并在 0G 测试网上提供模拟交易体验，前端承担用户交互、链上操作与 AI 分析结果展示。

### 1.2 目标
- 提供市场浏览、详情查看、下单、资产管理、AI 分析的完整体验。
- 连接 0G 测试网钱包，完成 Demo 级链上交互。
- 与后端 API 对接，保证数据与状态同步清晰。

### 1.3 非目标
- 不支持真实资金。
- 不做高频交易或复杂做市策略。
- 不承担链下撮合与风控逻辑。

## 2. 目标用户与场景
- **普通用户**：浏览热门市场、查看 AI 分析、尝试下单。
- **高参与用户**：频繁调整订单、查看持仓与订单簿。

## 3. 成功指标（MVP）
- 首屏可用时间 < 3s（测试环境）。
- 关键流程完成率：连接钱包 → 下单 ≥ 70%。
- AI 分析发起成功率 ≥ 95%。
- 主要接口错误率 < 2%。

## 4. 范围

### 4.1 In Scope
- 市场列表、市场详情、资产页。
- 钱包连接与基础链上交易。
- AI 分析发起与结果展示。

### 4.2 Out of Scope
- 多账户体系与登录系统。
- 高级交易工具（止损、策略单）。
- 真实资金充值与提现。

## 5. 体验原则
- **清晰**：数据来源（Polymarket vs 链上）明确区分。
- **低摩擦**：交易流程尽量少步骤，明确错误提示。
- **安全感**：链上交易状态可追踪、可回溯。

## 6. 信息架构与路由
- `/` 市场列表
- `/market/:marketId` 市场详情
- `/portfolio` 资产与订单

## 7. 页面需求细化

### 7.1 市场列表页
- **展示字段**：标题、缩略图、成交量、到期时间、是否解析。
- **交互**：排序（volume/creationDate/endDate），分页或加载更多。
- **状态**：加载中 Skeleton、空列表提示、请求失败提示。

### 7.2 市场详情页
- **顶部信息**：标题、描述、解析来源、到期时间、解析状态。
- **订单簿**：
  - Polymarket 订单簿（参考）
  - 链上订单簿（可交易）
- **交易面板**：YES/NO、价格、数量、预估成本、下单按钮。
- **AI 分析**：发起按钮、轮询状态、结果卡片（预测/置信度/论据）。

### 7.3 资产页
- **余额区**：钱包 dUSDC 余额、TradingHub 合约余额。
- **持仓区**：YES/NO 代币持仓、可赎回状态。
- **订单区**：我的订单列表、状态、取消操作。

## 8. 技术栈与框架
- 框架：React
- 构建工具：Vite
- Web3：wagmi + RainbowKit
- UI：TailwindCSS（+ 组件库可选）
- 状态管理：Zustand
- 数据请求：axios

## 9. 核心组件规格（示例）

### 9.1 `MarketCard`
- Props：`title`, `imageUrl`, `volume`, `endDate`, `isResolved`
- 行为：点击进入详情页

### 9.2 `OrderBook`
- Props：`bids`, `asks`, `source` (polymarket/onchain)
- 展示：价格/数量/深度条

### 9.3 `TradePanel`
- Props：`marketId`, `outcomes`, `bestPrices`
- 行为：校验价格范围（1-99）、数量 >= 1

### 9.4 `AIAnalysisPanel`
- Props：`marketId`
- 行为：发起分析 → 轮询 → 展示结果

## 10. 数据与状态管理
- **来源**：
  - 后端 API（市场列表/详情/AI 分析）
  - 链上合约（余额、订单、持仓）
- **刷新策略**：
  - 市场列表：30s 或手动刷新
  - 订单簿：10-15s
  - 钱包余额：交易后立即刷新

## 11. Web3 交互规范（wagmi + RainbowKit）
- **钱包连接**：RainbowKit 统一入口
- **网络检测**：非 0G 测试网提示切换
- **交易流程**：
  - Mint dUSDC → `DemoUSDC.mint`
  - Deposit → `TradingHub.deposit`
  - Withdraw → `TradingHub.withdraw`
  - 下单 → `TradingHub.placeOrder`
  - 取消 → `TradingHub.cancelOrder`
  - 赎回 → `TradingHub.redeem`

## 12. API 对接规范（前端视角）

### 12.1 市场列表
`GET /api/v1/markets?limit=20&offset=0&sortBy=volume`

### 12.2 市场详情
`GET /api/v1/markets/{marketId}`

### 12.3 AI 分析
`POST /api/v1/markets/{marketId}/analyze`
`GET /api/v1/analysis/{taskId}`

### 12.4 错误统一格式
```json
{ "error": { "code": "BAD_REQUEST", "message": "..." } }
```

## 13. 状态与异常处理
- Loading：Skeleton / spinner
- Empty：明确提示（暂无市场 / 暂无订单）
- Error：统一 toast + 详情说明
- Tx Pending：显示等待状态与交易哈希

## 14. 可访问性（基础）
- 表单可键盘操作
- 颜色对比度符合 WCAG AA
- 重要信息可用文字说明（不依赖颜色）

## 15. 性能与体验
- 关键列表分页，避免一次性加载过多
- 图片懒加载
- API 失败自动重试 1 次

## 16. 埋点与日志
- 页面访问（list/detail/portfolio）
- 下单事件（成功/失败）
- AI 分析触发与完成

## 17. 测试与验收
- 钱包连接与切网
- 下单/取消/赎回完整流程
- AI 分析可正常展示
- 资产页余额与订单展示

## 18. 依赖与风险
- 依赖：后端 API 完整可用、合约 ABI 稳定
- 风险：链上交易延迟、Polymarket 数据不稳定

## 19. 里程碑
- M1：钱包连接 + 市场列表/详情
- M2：下单/资产页 + AI 分析
- M3：全链路测试与体验优化
