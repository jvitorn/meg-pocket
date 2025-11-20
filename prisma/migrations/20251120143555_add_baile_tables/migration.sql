-- AlterTable
ALTER TABLE "Personagem" ADD COLUMN     "baileId" INTEGER;

-- CreateTable
CREATE TABLE "Baile" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Baile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaileRoleAction" (
    "id" SERIAL NOT NULL,
    "baileId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "acoes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaileRoleAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaileRoleAction_baileId_tipo_idx" ON "BaileRoleAction"("baileId", "tipo");

-- AddForeignKey
ALTER TABLE "Personagem" ADD CONSTRAINT "Personagem_baileId_fkey" FOREIGN KEY ("baileId") REFERENCES "Baile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaileRoleAction" ADD CONSTRAINT "BaileRoleAction_baileId_fkey" FOREIGN KEY ("baileId") REFERENCES "Baile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
