-- AlterTable
ALTER TABLE "CombateParticipante" ADD COLUMN "hpAtual" INTEGER;
ALTER TABLE "CombateParticipante" ADD COLUMN "manaAtual" INTEGER;

-- Backfill current values for existing threat participants.
UPDATE "CombateParticipante" cp
SET
  "hpAtual" = a."pv",
  "manaAtual" = a."mana"
FROM "Ameaca" a
WHERE cp."ameacaId" = a."id"
  AND cp."tipo" = 'AMEACA'
  AND (cp."hpAtual" IS NULL OR cp."manaAtual" IS NULL);
