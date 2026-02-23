-- AlterTable
ALTER TABLE "Personagem" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Personagem_userId_idx" ON "Personagem"("userId");

-- AddForeignKey
ALTER TABLE "Personagem" ADD CONSTRAINT "Personagem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
