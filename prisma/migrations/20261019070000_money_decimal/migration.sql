-- AlterTable
ALTER TABLE "Draw"
  ALTER COLUMN "ticketPrice" TYPE numeric(20,6) USING "ticketPrice"::numeric(20,6),
  ALTER COLUMN "operatorFeePct" TYPE numeric(5,2) USING "operatorFeePct"::numeric(5,2),
  ALTER COLUMN "potTotal" TYPE numeric(20,6) USING "potTotal"::numeric(20,6);

-- AlterTable
ALTER TABLE "Ticket"
  ALTER COLUMN "amount" TYPE numeric(20,6) USING "amount"::numeric(20,6);

-- AlterTable
ALTER TABLE "Winner"
  ALTER COLUMN "amount" TYPE numeric(20,6) USING "amount"::numeric(20,6),
  ALTER COLUMN "spent" TYPE numeric(20,6) USING "spent"::numeric(20,6);

-- AlterTable
ALTER TABLE "Referral"
  ALTER COLUMN "earnedCredits" TYPE numeric(20,6) USING "earnedCredits"::numeric(20,6);
