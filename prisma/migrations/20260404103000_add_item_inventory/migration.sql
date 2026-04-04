-- CreateEnum
CREATE TYPE "ItemTipo" AS ENUM ('ARMA', 'CONSUMIVEL', 'MAGICO', 'MATERIAL', 'EQUIPAMENTO');

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ItemTipo" NOT NULL,
    "descricao" TEXT,
    "slots" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "durabilidadeBase" INTEGER,
    "durabilidadeMax" INTEGER,
    "empilhavel" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemInventario" (
    "id" SERIAL NOT NULL,
    "personagemId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "durabilidadeAtual" INTEGER,
    "durabilidadeMax" INTEGER,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemInventario_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy inventory rows into the new catalog + character inventory structure.
INSERT INTO "Item" (
    "id",
    "nome",
    "tipo",
    "descricao",
    "slots",
    "durabilidadeBase",
    "durabilidadeMax",
    "empilhavel",
    "createdAt",
    "updatedAt"
)
SELECT
    legacy."id",
    legacy."nome",
    CASE UPPER(COALESCE(NULLIF(TRIM(legacy."tipo"), ''), 'MATERIAL'))
        WHEN 'ARMA' THEN 'ARMA'::"ItemTipo"
        WHEN 'CONSUMIVEL' THEN 'CONSUMIVEL'::"ItemTipo"
        WHEN 'MAGICO' THEN 'MAGICO'::"ItemTipo"
        WHEN 'EQUIPAMENTO' THEN 'EQUIPAMENTO'::"ItemTipo"
        ELSE 'MATERIAL'::"ItemTipo"
    END,
    legacy."descricao",
    1,
    NULL,
    NULL,
    false,
    legacy."createdAt",
    legacy."createdAt"
FROM "Inventorio" legacy;

INSERT INTO "ItemInventario" (
    "id",
    "personagemId",
    "itemId",
    "quantidade",
    "durabilidadeAtual",
    "durabilidadeMax",
    "observacoes",
    "createdAt",
    "updatedAt"
)
SELECT
    legacy."id",
    legacy."personagemId",
    legacy."id",
    1,
    NULL,
    NULL,
    legacy."icon",
    legacy."createdAt",
    legacy."createdAt"
FROM "Inventorio" legacy;

SELECT setval(
    pg_get_serial_sequence('"Item"', 'id'),
    COALESCE((SELECT MAX("id") FROM "Item"), 1),
    (SELECT COUNT(*) > 0 FROM "Item")
);

SELECT setval(
    pg_get_serial_sequence('"ItemInventario"', 'id'),
    COALESCE((SELECT MAX("id") FROM "ItemInventario"), 1),
    (SELECT COUNT(*) > 0 FROM "ItemInventario")
);

-- CreateIndex
CREATE INDEX "Item_tipo_idx" ON "Item"("tipo");

-- CreateIndex
CREATE INDEX "Item_nome_idx" ON "Item"("nome");

-- CreateIndex
CREATE INDEX "ItemInventario_personagemId_idx" ON "ItemInventario"("personagemId");

-- CreateIndex
CREATE INDEX "ItemInventario_itemId_idx" ON "ItemInventario"("itemId");

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_personagemId_fkey" FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInventario" ADD CONSTRAINT "ItemInventario_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "Inventorio";
