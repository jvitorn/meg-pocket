-- AlterTable
ALTER TABLE "CombateParticipante" ADD COLUMN "bloqueioUsado" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CombateParticipante" ADD COLUMN "esquivaUsada" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CombateParticipante" ADD COLUMN "contraAtaqueUsado" INTEGER NOT NULL DEFAULT 0;
