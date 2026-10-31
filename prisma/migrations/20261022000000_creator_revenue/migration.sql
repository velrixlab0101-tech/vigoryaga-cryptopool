-- Creator revenue-share program (private, invite-only).
-- Referral gains creator fields + secret access token + payout ledger.
-- Anonymous: payouts store no on-chain tx hash.

ALTER TABLE "Referral" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Referral" ADD COLUMN "sharePct" DECIMAL(5,2);
ALTER TABLE "Referral" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "Referral" ADD COLUMN "paidOut" DECIMAL(20,6) NOT NULL DEFAULT 0;
ALTER TABLE "Referral" ADD COLUMN "isCreator" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Referral" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Referral_accessToken_key" ON "Referral"("accessToken");

-- Ticket records the referral share applied at purchase time (audit).
ALTER TABLE "Ticket" ADD COLUMN "referralSharePct" DECIMAL(5,2);

CREATE INDEX "Ticket_referrerCode_idx" ON "Ticket"("referrerCode");

-- CreateTable
CREATE TABLE "ReferralPayout" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferralPayout_referralId_idx" ON "ReferralPayout"("referralId");

-- AddForeignKey
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
