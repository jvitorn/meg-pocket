-- CreateTable
CREATE TABLE "slots_defensivos" (
    "id" SERIAL NOT NULL,
    "personagemId" INTEGER NOT NULL,
    "esquivaUsada" INTEGER NOT NULL DEFAULT 0,
    "bloqueioUsado" INTEGER NOT NULL DEFAULT 0,
    "contraAtaqueUsado" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "slots_defensivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slots_defensivos_personagemId_key" ON "slots_defensivos"("personagemId");

-- AddForeignKey
ALTER TABLE "slots_defensivos" ADD CONSTRAINT "slots_defensivos_personagemId_fkey" FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
