-- Custodial payment model.
-- Users send USDC/USDT directly to the operator address on Base; tickets record
-- the token + chain, and on-chain draw ids are no longer used.

ALTER TABLE "Draw" DROP COLUMN "chainDrawId";

ALTER TABLE "Draw" ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "Ticket" ADD COLUMN "chainId" INTEGER NOT NULL DEFAULT 8453;
ALTER TABLE "Ticket" ADD COLUMN "token" TEXT NOT NULL DEFAULT 'USDC';
ALTER TABLE "Ticket" ADD COLUMN "refundTxHash" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "refundedAt" TIMESTAMP(3);

DROP INDEX "Ticket_txHash_key";
CREATE UNIQUE INDEX "Ticket_chainId_txHash_key" ON "Ticket"("chainId", "txHash");

ALTER TABLE "Winner" ADD COLUMN "token" TEXT;
