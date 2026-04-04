-- CreateEnum
CREATE TYPE "ItemEfeitoModulo" AS ENUM ('VIDA', 'MANA', 'DEFESA');

-- CreateEnum
CREATE TYPE "ItemEfeitoOperacao" AS ENUM ('ADICIONAR', 'REMOVER');

-- AlterTable
ALTER TABLE "Personagem"
ADD COLUMN "defesa_atual" INTEGER DEFAULT 0,
ADD COLUMN "defesa_max" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "ItemInventario"
ADD COLUMN "efeitoAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "esgotadoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ItemEfeito" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "modulo" "ItemEfeitoModulo" NOT NULL,
    "operacao" "ItemEfeitoOperacao" NOT NULL DEFAULT 'ADICIONAR',
    "valor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemEfeito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemEfeito_itemId_key" ON "ItemEfeito"("itemId");

-- CreateIndex
CREATE INDEX "ItemEfeito_modulo_idx" ON "ItemEfeito"("modulo");

-- AddForeignKey
ALTER TABLE "ItemEfeito" ADD CONSTRAINT "ItemEfeito_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
