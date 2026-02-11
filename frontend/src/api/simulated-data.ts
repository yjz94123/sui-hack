import type {
  AnalysisTask,
  ApiResponse,
  EventDetail,
  EventSummary,
  OrderBookData,
  PriceHistory,
  TradeRecord,
} from "@og-predict/shared";
import { delay } from "./sim-mode";
import type { AnalysisStreamMessage } from "./markets";
import type { BuyOrderRequest, BuyOrderResponse } from "./trades";

type EventSortBy = "volume" | "volume24h" | "liquidity" | "endDate" | "createdAt";
type SortOrder = "asc" | "desc";

interface MockEventDetail extends EventDetail {
  slug?: string;
  active?: boolean;
  closed?: boolean;
  featured?: boolean;
  syncedAt?: string;
  createdAt: string;
  markets: Array<{
    marketId: string;
    question: string;
    bestBid: string;
    bestAsk: string;
    outcomePrices: string[];
    outcomes: string[];
    volume: number;
  }>;
}

const mockEventDetails: MockEventDetail[] = [
  {
    eventId: "sim-fed-rate-cut-q3-2026",
    slug: "fed-rate-cut-q3-2026",
    title: "Will the Fed cut rates by at least 25 bps before Sep 2026?",
    description:
      "Simulation mode market. This data is local and does not come from Polymarket.",
    imageUrl: "",
    iconUrl: "",
    startDate: "2026-02-01T00:00:00.000Z",
    endDate: "2026-09-30T23:59:59.000Z",
    volume: 1284500,
    volume24h: 186300,
    liquidity: 932000,
    tags: [
      { slug: "finance", label: "Finance" },
      { slug: "macro", label: "Macro" },
    ],
    active: true,
    closed: false,
    featured: true,
    syncedAt: new Date().toISOString(),
    createdAt: "2026-02-01T09:00:00.000Z",
    markets: [
      {
        marketId: "sim-fed-main",
        question: "Fed cuts rates >= 25 bps before Sep 30, 2026",
        bestBid: "0.62",
        bestAsk: "0.64",
        outcomePrices: ["0.63", "0.37"],
        outcomes: ["Yes", "No"],
        volume: 880000,
      },
      {
        marketId: "sim-fed-double-cut",
        question: "Fed cuts rates >= 50 bps before Sep 30, 2026",
        bestBid: "0.32",
        bestAsk: "0.35",
        outcomePrices: ["0.34", "0.66"],
        outcomes: ["Yes", "No"],
        volume: 404500,
      },
    ],
  },
  {
    eventId: "sim-eth-ath-2026",
    slug: "eth-ath-2026",
    title: "Will ETH hit a new all-time high before Dec 2026?",
    description: "Simulation mode crypto market.",
    imageUrl: "",
    iconUrl: "",
    startDate: "2026-01-20T00:00:00.000Z",
    endDate: "2026-12-31T23:59:59.000Z",
    volume: 980300,
    volume24h: 221400,
    liquidity: 721100,
    tags: [
      { slug: "crypto", label: "Crypto" },
      { slug: "tech", label: "Tech" },
    ],
    active: true,
    closed: false,
    featured: false,
    syncedAt: new Date().toISOString(),
    createdAt: "2026-01-20T13:30:00.000Z",
    markets: [
      {
        marketId: "sim-eth-main",
        question: "ETH all-time high by Dec 31, 2026",
        bestBid: "0.57",
        bestAsk: "0.59",
        outcomePrices: ["0.58", "0.42"],
        outcomes: ["Yes", "No"],
        volume: 980300,
      },
    ],
  },
  {
    eventId: "sim-ai-regulation-2026",
    slug: "ai-regulation-2026",
    title: "Will a major US federal AI bill pass in 2026?",
    description: "Simulation mode policy market.",
    imageUrl: "",
    iconUrl: "",
    startDate: "2026-01-05T00:00:00.000Z",
    endDate: "2026-11-30T23:59:59.000Z",
    volume: 604200,
    volume24h: 62400,
    liquidity: 510700,
    tags: [
      { slug: "politics", label: "Politics" },
      { slug: "tech", label: "Tech" },
    ],
    active: true,
    closed: false,
    featured: false,
    syncedAt: new Date().toISOString(),
    createdAt: "2026-01-05T10:00:00.000Z",
    markets: [
      {
        marketId: "sim-ai-main",
        question: "Major US federal AI bill passed in 2026",
        bestBid: "0.44",
        bestAsk: "0.47",
        outcomePrices: ["0.46", "0.54"],
        outcomes: ["Yes", "No"],
        volume: 604200,
      },
    ],
  },
];

function asSummary(detail: MockEventDetail): EventSummary {
  return {
    eventId: detail.eventId,
    title: detail.title,
    description: detail.description,
    imageUrl: detail.imageUrl,
    iconUrl: detail.iconUrl,
    startDate: detail.startDate,
    endDate: detail.endDate,
    volume: detail.volume,
    volume24h: detail.volume24h,
    liquidity: detail.liquidity,
    tags: detail.tags,
    markets: detail.markets,
  };
}

const mockEventSummaries: EventSummary[] = mockEventDetails.map(asSummary);

function compareBySortField(a: EventSummary, b: EventSummary, sortBy: EventSortBy, order: SortOrder): number {
  const direction = order === "asc" ? 1 : -1;

  const aCreatedAt = new Date((a as EventSummary & { createdAt?: string }).createdAt || a.startDate || 0).getTime();
  const bCreatedAt = new Date((b as EventSummary & { createdAt?: string }).createdAt || b.startDate || 0).getTime();

  const aVal =
    sortBy === "volume"
      ? a.volume || 0
      : sortBy === "volume24h"
        ? a.volume24h || 0
        : sortBy === "liquidity"
          ? a.liquidity || 0
          : sortBy === "endDate"
            ? new Date(a.endDate || 0).getTime()
            : aCreatedAt;

  const bVal =
    sortBy === "volume"
      ? b.volume || 0
      : sortBy === "volume24h"
        ? b.volume24h || 0
        : sortBy === "liquidity"
          ? b.liquidity || 0
          : sortBy === "endDate"
            ? new Date(b.endDate || 0).getTime()
            : bCreatedAt;

  if (aVal === bVal) return 0;
  return aVal > bVal ? direction : -direction;
}

function buildMockOrderBook(mid: number): OrderBookData {
  const makeSide = (base: number, direction: 1 | -1) => {
    const rows = Array.from({ length: 12 }).map((_, idx) => {
      const step = (idx + 1) * 0.0025;
      const price = Math.max(0.01, Math.min(0.99, base + step * direction));
      const size = 1800 - idx * 110;
      return {
        price: price.toFixed(4),
        size: String(Math.max(120, size)),
      };
    });

    if (direction === -1) {
      return {
        bids: rows,
        asks: [],
      };
    }

    return {
      bids: [],
      asks: rows.reverse(),
    };
  };

  const yesBids = makeSide(mid, -1).bids;
  const yesAsks = makeSide(mid, 1).asks;
  const noMid = Math.max(0.01, Math.min(0.99, 1 - mid));
  const noBids = makeSide(noMid, -1).bids;
  const noAsks = makeSide(noMid, 1).asks;

  return {
    yes: {
      bids: yesBids,
      asks: yesAsks,
      spread: (Math.max(0, Number(yesAsks[0].price) - Number(yesBids[0].price))).toFixed(4),
    },
    no: {
      bids: noBids,
      asks: noAsks,
      spread: (Math.max(0, Number(noAsks[0].price) - Number(noBids[0].price))).toFixed(4),
    },
  };
}

function buildMockPriceHistory(base: number): PriceHistory {
  const points = 72;
  const now = Date.now();
  const history = Array.from({ length: points }).map((_, idx) => {
    const progress = idx / points;
    const drift = Math.sin(idx / 6) * 0.015 + Math.cos(idx / 11) * 0.01;
    const trend = (progress - 0.5) * 0.035;
    const price = Math.max(0.02, Math.min(0.98, base + drift + trend));
    return {
      timestamp: Math.floor((now - (points - idx) * 60 * 60 * 1000) / 1000),
      price: Number(price.toFixed(4)),
    };
  });

  return { history };
}

const marketMidPrice: Record<string, number> = {
  "sim-fed-main": 0.63,
  "sim-fed-double-cut": 0.34,
  "sim-eth-main": 0.58,
  "sim-ai-main": 0.46,
};

const mockAnalysisResult = {
  event: "Will the Fed cut rates by at least 25 bps before Sep 2026?",
  prior_probability: 0.5,
  posterior_probability: 0.896,
  confidence: 0.33,
  fair_probability_band: {
    low: 0.708,
    high: 1.0,
  },
  evidence_summary: {
    count: 8,
    net_signal: 1.792,
    total_weight: 2.427,
  },
  risk_factors: {
    resolution: 0.16,
    time: 0.28,
    tail: 0.28,
  },
  formula: {
    posterior_probability: "p_true = 1 / (1 + exp(-(L0 + ΣΔL_i)))",
    bas: "BAS = 100 * sigmoid(A * Conv * C - B * Risk)",
  },
  bet_attractiveness_score: 59,
};

const mockAnalysisJsonText = `{
  "event": "Will the Fed cut rates by at least 25 bps before Sep 2026?",
  "prior_probability": 0.500,
  "posterior_probability": 0.896,
  "confidence": 0.330,
  "fair_probability_band": {
    "low": 0.708,
    "high": 1.000
  },
  "evidence_summary": {
    "count": 8.000,
    "net_signal": 1.792,
    "total_weight": 2.427
  },
  "risk_factors": {
    "resolution": 0.160,
    "time": 0.280,
    "tail": 0.280
  },
  "formula": {
    "posterior_probability": "p_true = 1 / (1 + exp(-(L0 + ΣΔL_i)))",
    "bas": "BAS = 100 * sigmoid(A * Conv * C - B * Risk)"
  },
  "bet_attractiveness_score": 59.000
}`;

const mockAnalysisDeltasZh: string[] = [
  `[1/6] 事件定义与可验证判据
- 事件陈述: Will the Fed cut rates by at least 25 bps before Sep 2026?
- TODAY: 2026-02-11
- YES 条件: 美联储在 2026-09-30 23:59:59 UTC 前累计降息 >= 25bps。
- NO 条件: 未达到上述门槛。
- 判定优先级: Federal Reserve 官方公告 > FOMC 会议纪要 > 权威媒体转述。
- 歧义处理: 仅认定“官方目标利率区间累计下调幅度”，忽略市场预期措辞。

`,
  `[2/6] 新闻检索与证据表（至少 8 条独立来源）
- i=1 | source_i=Federal Reserve | date_i=2026-01-23 | claim_i=政策声明强调数据依赖并保留宽松空间 | link_i=https://www.federalreserve.gov/newsevents/pressreleases.htm | d_i=+1.0 | s_i=1.057 | r_i=0.951 | u_i=0.890 | a_i=19
- i=2 | source_i=BLS CPI | date_i=2026-01-29 | claim_i=通胀分项继续回落，缓解持续高利率必要性 | link_i=https://www.bls.gov/cpi/ | d_i=+0.9 | s_i=1.085 | r_i=0.884 | u_i=0.811 | a_i=13
- i=3 | source_i=BEA GDP | date_i=2026-01-18 | claim_i=增长动能放缓，支持年内政策回调 | link_i=https://www.bea.gov/data/gdp/gross-domestic-product | d_i=+0.6 | s_i=1.645 | r_i=0.939 | u_i=0.825 | a_i=24
- i=4 | source_i=Reuters Macro Desk | date_i=2026-01-16 | claim_i=主流机构预测降息窗口集中在 Q3 前后 | link_i=https://www.reuters.com/world/us/ | d_i=+0.4 | s_i=1.806 | r_i=0.869 | u_i=0.956 | a_i=26

`,
  `[3/6] 证据表续 + 冲突与缺口
- i=5 | source_i=EIA STEO | date_i=2026-01-14 | claim_i=能源价格上行风险可能推迟宽松 | link_i=https://www.eia.gov/outlooks/steo/ | d_i=-0.4 | s_i=1.008 | r_i=0.892 | u_i=0.723 | a_i=28
- i=6 | source_i=BLS Employment Situation | date_i=2026-01-17 | claim_i=就业韧性超预期，削弱短期降息紧迫性 | link_i=https://www.bls.gov/news.release/empsit.nr0.htm | d_i=-0.2 | s_i=0.980 | r_i=0.783 | u_i=0.942 | a_i=25
- i=7 | source_i=FOMC Minutes Digest | date_i=2026-02-01 | claim_i=会议纪要显示委员对后续降息路径讨论增加 | link_i=https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm | d_i=+1.0 | s_i=1.869 | r_i=0.853 | u_i=0.958 | a_i=10
- i=8 | source_i=Chicago Fed NFCI | date_i=2026-01-25 | claim_i=金融条件边际改善，为政策放松提供环境 | link_i=https://www.chicagofed.org/research/data/nfci/background | d_i=+0.8 | s_i=1.721 | r_i=0.897 | u_i=0.896 | a_i=17

【证据冲突与信息缺口】
- 冲突点: 通胀回落与增长放缓支持 YES，但能源与就业韧性对 NO 有阶段性支撑。
- 缺口: 后续 CPI/PCE 与失业率更新可能重定路径，当前结论需随数据滚动校准。

`,
  `[4/6] 概率估计（加权对数赔率更新）
- 先验概率: p0 = 0.500
- 参数: λ = 0.07, γ = 1.2
- 单条权重: w_i = r_i * u_i * exp(-λ * a_i) * s_i
- 对数赔率增量: ΔL_i = γ * w_i * d_i
- w_i = [0.237, 0.313, 0.237, 0.243, 0.092, 0.126, 0.758, 0.421]
- ΔL_i = [0.284, 0.339, 0.171, 0.117, -0.044, -0.030, 0.910, 0.404]
- Σw_i = 2.427, Σ(w_i*d_i) = 1.792, ΣΔL_i = 2.151
- L0 = ln(p0/(1-p0)) = 0.000
- L = L0 + ΣΔL_i = 2.151
- p_true = 1 / (1 + exp(-L)) = 0.896
- C_qty = Σw_i / (Σw_i + κ), κ=3 => 0.447
- D = 1 - |Σ(w_i*d_i)| / (Σw_i + ε), ε=1e-6 => 0.262
- C = clamp(C_qty * (1 - D), 0, 1) = 0.330

`,
  `[5/6] BAS（下注价值分数）
- R_res = 0.160, R_time = 0.280, R_tail = 0.280
- Risk = 0.5*R_res + 0.3*R_time + 0.2*R_tail = 0.220
- Conv = 2 * |p_true - 0.5| = 0.792
- BAS = round(100 * sigmoid(3 * Conv * C - 2 * Risk)) = 59
- M = 0.02 + 0.25 * (1 - C) = 0.187
- 公平概率区间: [p_low, p_high] = [0.708, 1.000]（已裁剪到 [0,1]）
- 条件化判断（不使用市场数据）: 若隐含概率 < 0.708，则 YES 可能有价值；若隐含概率 > 1.000，则 NO 可能有价值；否则不建议下注。

`,
  "[6/6] 最终 JSON 输出\n",
  "```json\n",
  `${mockAnalysisJsonText}\n`,
  "```\n",
];

const mockAnalysisDeltasEn: string[] = [
  `[1/6] Event definition and verifiable criteria
- Event statement: Will the Fed cut rates by at least 25 bps before Sep 2026?
- TODAY: 2026-02-11
- YES condition: The Federal Reserve delivers cumulative cuts >= 25 bps before 2026-09-30 23:59:59 UTC.
- NO condition: The threshold above is not reached.
- Source priority: Federal Reserve official releases > FOMC minutes > top-tier media reports.
- Ambiguity handling: We only use official target range changes, and ignore market expectation wording.

`,
  `[2/6] News retrieval and evidence table (at least 8 independent sources)
- i=1 | source_i=Federal Reserve | date_i=2026-01-23 | claim_i=Policy statement remains data-dependent and leaves room for easing | link_i=https://www.federalreserve.gov/newsevents/pressreleases.htm | d_i=+1.0 | s_i=1.057 | r_i=0.951 | u_i=0.890 | a_i=19
- i=2 | source_i=BLS CPI | date_i=2026-01-29 | claim_i=Inflation components continue cooling, reducing pressure for prolonged high rates | link_i=https://www.bls.gov/cpi/ | d_i=+0.9 | s_i=1.085 | r_i=0.884 | u_i=0.811 | a_i=13
- i=3 | source_i=BEA GDP | date_i=2026-01-18 | claim_i=Growth momentum slows, supporting policy recalibration within the year | link_i=https://www.bea.gov/data/gdp/gross-domestic-product | d_i=+0.6 | s_i=1.645 | r_i=0.939 | u_i=0.825 | a_i=24
- i=4 | source_i=Reuters Macro Desk | date_i=2026-01-16 | claim_i=Consensus forecasts concentrate easing window around Q3 | link_i=https://www.reuters.com/world/us/ | d_i=+0.4 | s_i=1.806 | r_i=0.869 | u_i=0.956 | a_i=26

`,
  `[3/6] Remaining evidence + conflicts and gaps
- i=5 | source_i=EIA STEO | date_i=2026-01-14 | claim_i=Energy upside risk could delay easing | link_i=https://www.eia.gov/outlooks/steo/ | d_i=-0.4 | s_i=1.008 | r_i=0.892 | u_i=0.723 | a_i=28
- i=6 | source_i=BLS Employment Situation | date_i=2026-01-17 | claim_i=Labor market resilience weakens urgency of near-term cuts | link_i=https://www.bls.gov/news.release/empsit.nr0.htm | d_i=-0.2 | s_i=0.980 | r_i=0.783 | u_i=0.942 | a_i=25
- i=7 | source_i=FOMC Minutes Digest | date_i=2026-02-01 | claim_i=Minutes show increasing committee discussion around future easing path | link_i=https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm | d_i=+1.0 | s_i=1.869 | r_i=0.853 | u_i=0.958 | a_i=10
- i=8 | source_i=Chicago Fed NFCI | date_i=2026-01-25 | claim_i=Financial conditions improved at the margin, making easing more feasible | link_i=https://www.chicagofed.org/research/data/nfci/background | d_i=+0.8 | s_i=1.721 | r_i=0.897 | u_i=0.896 | a_i=17

[Conflicts and information gaps]
- Conflict: Cooling inflation and slowing growth support YES, while energy and labor resilience support NO in the near term.
- Gap: Upcoming CPI/PCE and unemployment updates can materially shift the path; this output should be recalibrated as new data arrives.

`,
  `[4/6] Probability estimation (weighted log-odds update)
- Prior probability: p0 = 0.500
- Parameters: λ = 0.07, γ = 1.2
- Single evidence weight: w_i = r_i * u_i * exp(-λ * a_i) * s_i
- Log-odds increment: ΔL_i = γ * w_i * d_i
- w_i = [0.237, 0.313, 0.237, 0.243, 0.092, 0.126, 0.758, 0.421]
- ΔL_i = [0.284, 0.339, 0.171, 0.117, -0.044, -0.030, 0.910, 0.404]
- Σw_i = 2.427, Σ(w_i*d_i) = 1.792, ΣΔL_i = 2.151
- L0 = ln(p0/(1-p0)) = 0.000
- L = L0 + ΣΔL_i = 2.151
- p_true = 1 / (1 + exp(-L)) = 0.896
- C_qty = Σw_i / (Σw_i + κ), κ=3 => 0.447
- D = 1 - |Σ(w_i*d_i)| / (Σw_i + ε), ε=1e-6 => 0.262
- C = clamp(C_qty * (1 - D), 0, 1) = 0.330

`,
  `[5/6] BAS (bet attractiveness score)
- R_res = 0.160, R_time = 0.280, R_tail = 0.280
- Risk = 0.5*R_res + 0.3*R_time + 0.2*R_tail = 0.220
- Conv = 2 * |p_true - 0.5| = 0.792
- BAS = round(100 * sigmoid(3 * Conv * C - 2 * Risk)) = 59
- M = 0.02 + 0.25 * (1 - C) = 0.187
- Fair probability band: [p_low, p_high] = [0.708, 1.000] (clamped to [0,1])
- Conditional call (without market data): if implied probability < 0.708, YES may have value; if implied probability > 1.000, NO may have value; otherwise no-trade.

`,
  "[6/6] Final JSON output\n",
  "```json\n",
  `${mockAnalysisJsonText}\n`,
  "```\n",
];

function getMockAnalysisDeltas(): string[] {
  const storedLang =
    typeof window !== "undefined"
      ? window.localStorage.getItem("i18nextLng") ?? window.navigator.language ?? "en"
      : "en";
  return storedLang.toLowerCase().startsWith("zh") ? mockAnalysisDeltasZh : mockAnalysisDeltasEn;
}

export async function getMockEvents(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sortBy?: EventSortBy;
  order?: SortOrder;
  search?: string;
}): Promise<ApiResponse<EventSummary[]>> {
  await delay(120);

  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const sortBy = params?.sortBy ?? "volume";
  const order = params?.order ?? "desc";
  const search = params?.search?.trim().toLowerCase();
  const tag = params?.tag?.trim().toLowerCase();

  let items = [...mockEventSummaries];

  if (tag) {
    items = items.filter((event) =>
      (event.tags || []).some(
        (t) => t.slug.toLowerCase() === tag || t.label.toLowerCase() === tag
      )
    );
  }

  if (search) {
    items = items.filter((event) => event.title.toLowerCase().includes(search));
  }

  items.sort((a, b) => compareBySortField(a, b, sortBy, order));

  const paged = items.slice(offset, offset + limit);
  return { data: paged };
}

export async function getMockEventDetail(eventId: string): Promise<ApiResponse<EventDetail>> {
  await delay(100);
  const detail = mockEventDetails.find((item) => item.eventId === eventId) || mockEventDetails[0];
  return { data: detail };
}

export async function getMockOrderBook(marketId: string): Promise<ApiResponse<OrderBookData>> {
  await delay(140);
  const mid = marketMidPrice[marketId] ?? 0.5;
  return { data: buildMockOrderBook(mid) };
}

export async function getMockPriceHistory(
  marketId: string,
  outcome: "yes" | "no" = "yes"
): Promise<ApiResponse<PriceHistory>> {
  await delay(150);
  const base = marketMidPrice[marketId] ?? 0.5;
  const priceBase = outcome === "yes" ? base : 1 - base;
  return { data: buildMockPriceHistory(priceBase) };
}

export async function triggerMockAnalysis(marketId: string): Promise<ApiResponse<AnalysisTask>> {
  await delay(90);
  const now = new Date().toISOString();
  const task: AnalysisTask = {
    id: `sim-task-${Date.now()}`,
    marketId,
    status: "running",
    question: "Simulation mode analysis",
    createdAt: now,
    updatedAt: now,
  };
  return { data: task };
}

export async function getMockAnalyses(marketId?: string): Promise<ApiResponse<AnalysisTask[]>> {
  await delay(80);
  const now = new Date().toISOString();
  return {
    data: [
      {
        id: "sim-task-latest",
        marketId,
        status: "completed",
        result: mockAnalysisResult,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export async function getMockAnalysisDetail(taskId: string): Promise<ApiResponse<AnalysisTask>> {
  await delay(80);
  const now = new Date().toISOString();
  return {
    data: {
      id: taskId,
      marketId: "sim-fed-main",
      status: "completed",
      result: mockAnalysisResult,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export async function streamMockAnalysis(options: {
  signal?: AbortSignal;
  onMessage: (msg: AnalysisStreamMessage) => void;
}): Promise<void> {
  const taskId = `sim-task-${Date.now()}`;
  options.onMessage({ type: "task", taskId });

  const deltas = getMockAnalysisDeltas();

  for (const chunk of deltas) {
    await delay(230, options.signal);
    options.onMessage({ type: "delta", content: chunk });
  }

  await delay(120, options.signal);
  options.onMessage({ type: "done", taskId, result: mockAnalysisResult });
}

export async function placeMockBuyOrder(
  body: BuyOrderRequest
): Promise<ApiResponse<BuyOrderResponse>> {
  await delay(220);

  const assumedPrice =
    body.outcome === "YES"
      ? marketMidPrice[body.marketId] ?? 0.5
      : 1 - (marketMidPrice[body.marketId] ?? 0.5);

  return {
    data: {
      positionId: Math.floor(Math.random() * 900000) + 100000,
      txHash: `0xsim${Date.now().toString(16)}`,
      tokenAmount: Number((body.usdcAmount / Math.max(assumedPrice, 0.01)).toFixed(2)),
      price: Number(assumedPrice.toFixed(4)),
    },
  };
}

export async function getMockUserTrades(): Promise<ApiResponse<{ trades: TradeRecord[]; pagination: unknown }>> {
  await delay(120);
  return {
    data: {
      trades: [
        {
          tradeId: "sim-trade-1",
          marketId: "sim-fed-main",
          tradeType: "buy",
          outcome: "YES",
          amount: 120,
          price: 0.61,
          status: "filled",
          timestamp: Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000),
        },
        {
          tradeId: "sim-trade-2",
          marketId: "sim-eth-main",
          tradeType: "buy",
          outcome: "NO",
          amount: 80,
          price: 0.44,
          status: "filled",
          timestamp: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000),
        },
      ],
      pagination: {
        total: 2,
        limit: 20,
        offset: 0,
      },
    },
  };
}
