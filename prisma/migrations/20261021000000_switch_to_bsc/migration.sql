-- Switch payment chain from Base (8453) to BNB Smart Chain (56).
-- New tickets default to chain 56; existing rows keep their recorded chain id.

ALTER TABLE "Ticket" ALTER COLUMN "chainId" SET DEFAULT 56;
