-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resolutionSource" TEXT,
    "imageUrl" TEXT,
    "iconUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tagSlugs" TEXT[],
    "tags" JSONB,
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "questionId" TEXT,
    "slug" TEXT,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "outcomes" TEXT[],
    "outcomePrices" TEXT[],
    "clobTokenIds" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastTradePrice" TEXT,
    "bestBid" TEXT,
    "bestAsk" TEXT,
    "spread" DOUBLE PRECISION,
    "onchainMarketId" TEXT,
    "resolutionStatus" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "yesPrice" DOUBLE PRECISION NOT NULL,
    "noPrice" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_tasks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "ogStorageKey" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_records" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "usdcCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "ogKvKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_active_closed_idx" ON "events"("active", "closed");

-- CreateIndex
CREATE INDEX "events_volume_idx" ON "events"("volume");

-- CreateIndex
CREATE INDEX "events_syncedAt_idx" ON "events"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "markets_conditionId_key" ON "markets"("conditionId");

-- CreateIndex
CREATE INDEX "markets_active_closed_idx" ON "markets"("active", "closed");

-- CreateIndex
CREATE INDEX "markets_eventId_idx" ON "markets"("eventId");

-- CreateIndex
CREATE INDEX "markets_conditionId_idx" ON "markets"("conditionId");

-- CreateIndex
CREATE INDEX "markets_onchainMarketId_idx" ON "markets"("onchainMarketId");

-- CreateIndex
CREATE INDEX "markets_syncedAt_idx" ON "markets"("syncedAt");

-- CreateIndex
CREATE INDEX "price_history_marketId_timestamp_idx" ON "price_history"("marketId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_tasks_taskId_key" ON "analysis_tasks"("taskId");

-- CreateIndex
CREATE INDEX "analysis_tasks_marketId_idx" ON "analysis_tasks"("marketId");

-- CreateIndex
CREATE INDEX "analysis_tasks_status_idx" ON "analysis_tasks"("status");

-- CreateIndex
CREATE INDEX "trade_records_userAddress_idx" ON "trade_records"("userAddress");

-- CreateIndex
CREATE INDEX "trade_records_marketId_idx" ON "trade_records"("marketId");

-- CreateIndex
CREATE INDEX "trade_records_positionId_idx" ON "trade_records"("positionId");

-- CreateIndex
CREATE INDEX "trade_records_status_idx" ON "trade_records"("status");

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
