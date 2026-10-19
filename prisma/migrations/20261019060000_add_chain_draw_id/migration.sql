-- AlterTable
ALTER TABLE "Draw" ADD COLUMN "chainDrawId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Draw_chainDrawId_key" ON "Draw"("chainDrawId");
