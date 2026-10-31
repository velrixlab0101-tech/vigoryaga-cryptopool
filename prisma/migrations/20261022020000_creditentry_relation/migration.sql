-- CreditEntry.userCredit relation (added after the base credit-back migration).

ALTER TABLE "CreditEntry" ADD COLUMN "userCreditId" TEXT;

CREATE INDEX "CreditEntry_userCreditId_idx" ON "CreditEntry"("userCreditId");

ALTER TABLE "CreditEntry"
  ADD CONSTRAINT "CreditEntry_userCreditId_fkey"
  FOREIGN KEY ("userCreditId") REFERENCES "UserCredit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
