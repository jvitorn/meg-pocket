-- CreateEnum
CREATE TYPE "CombateStatus" AS ENUM ('RASCUNHO', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "CombateParticipanteTipo" AS ENUM ('PERSONAGEM', 'AMEACA');

-- CreateTable
CREATE TABLE "Combate" (
    "id" SERIAL NOT NULL,
    "campanhaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "CombateStatus" NOT NULL DEFAULT 'RASCUNHO',
    "rodadaAtual" INTEGER NOT NULL DEFAULT 1,
    "turnoAtual" INTEGER NOT NULL DEFAULT 0,
    "vaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombateParticipante" (
    "id" SERIAL NOT NULL,
    "combateId" INTEGER NOT NULL,
    "tipo" "CombateParticipanteTipo" NOT NULL,
    "personagemId" INTEGER,
    "ameacaId" INTEGER,
    "nome" TEXT NOT NULL,
    "iniciativa" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombateParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Combate_campanhaId_idx" ON "Combate"("campanhaId");

-- CreateIndex
CREATE INDEX "Combate_status_idx" ON "Combate"("status");

-- CreateIndex
CREATE INDEX "CombateParticipante_combateId_idx" ON "CombateParticipante"("combateId");

-- CreateIndex
CREATE INDEX "CombateParticipante_personagemId_idx" ON "CombateParticipante"("personagemId");

-- CreateIndex
CREATE INDEX "CombateParticipante_ameacaId_idx" ON "CombateParticipante"("ameacaId");

-- CreateIndex
CREATE INDEX "CombateParticipante_tipo_idx" ON "CombateParticipante"("tipo");

-- AddForeignKey
ALTER TABLE "Combate" ADD CONSTRAINT "Combate_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombateParticipante" ADD CONSTRAINT "CombateParticipante_combateId_fkey" FOREIGN KEY ("combateId") REFERENCES "Combate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombateParticipante" ADD CONSTRAINT "CombateParticipante_personagemId_fkey" FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombateParticipante" ADD CONSTRAINT "CombateParticipante_ameacaId_fkey" FOREIGN KEY ("ameacaId") REFERENCES "Ameaca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
