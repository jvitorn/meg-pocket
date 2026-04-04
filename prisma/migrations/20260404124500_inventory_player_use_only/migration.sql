UPDATE "Item"
SET "empilhavel" = true
WHERE "empilhavel" = false;

ALTER TABLE "Item"
ALTER COLUMN "empilhavel" SET DEFAULT true;

CREATE UNIQUE INDEX "ItemInventario_personagemId_itemId_key"
ON "ItemInventario"("personagemId", "itemId");
