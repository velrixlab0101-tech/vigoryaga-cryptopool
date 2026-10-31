CREATE TABLE "Lottery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "prizeConfig" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lottery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lottery_slug_key" ON "Lottery"("slug");

CREATE TABLE "LotteryRound" (
    "id" TEXT NOT NULL,
    "lotteryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ticketPrice" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "startTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "potTotal" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "prizeConfig" JSONB,
    "rules" JSONB,
    "rolloverFromId" TEXT,
    "isRollover" BOOLEAN NOT NULL DEFAULT false,
    "rolloverAmount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "drawnAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotteryRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LotteryEntry" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 56,
    "token" TEXT NOT NULL DEFAULT 'USDC',
    "qty" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(20,6) NOT NULL,
    "numbers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LotteryEntry_chainId_txHash_key" ON "LotteryEntry"("chainId", "txHash");
CREATE INDEX "LotteryEntry_roundId_idx" ON "LotteryEntry"("roundId");
CREATE INDEX "LotteryEntry_buyerAddress_idx" ON "LotteryEntry"("buyerAddress");

CREATE TABLE "LotteryWinner" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "place" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(20,6) NOT NULL,
    "spent" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "token" TEXT,
    "tier" TEXT,
    "matches" INTEGER,
    "txHash" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryWinner_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LotteryRound" ADD CONSTRAINT "LotteryRound_lotteryId_fkey" FOREIGN KEY ("lotteryId") REFERENCES "Lottery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LotteryEntry" ADD CONSTRAINT "LotteryEntry_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "LotteryRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LotteryWinner" ADD CONSTRAINT "LotteryWinner_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "LotteryRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
