-- First-5-loss 50% credit-back protection.
-- Per-user spendable in-app credit balance + ledger.
-- No on-chain payments: credits are redeemed as tickets only.

ALTER TABLE "Ticket" ADD COLUMN "creditApplied" DECIMAL(20,6);

-- CreateTable
CREATE TABLE "UserCredit" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "balance" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "lifetimeEarned" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "lossesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditEntry" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "drawId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCredit_wallet_key" ON "UserCredit"("wallet");

-- CreateIndex
CREATE INDEX "CreditEntry_wallet_idx" ON "CreditEntry"("wallet");

-- CreateIndex
CREATE INDEX "CreditEntry_drawId_idx" ON "CreditEntry"("drawId");
