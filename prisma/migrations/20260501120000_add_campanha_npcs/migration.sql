-- CreateTable
CREATE TABLE "campanha_npc" (
    "id" SERIAL NOT NULL,
    "campanhaId" INTEGER NOT NULL,
    "criadoPor" TEXT,
    "nome" TEXT NOT NULL,
    "racaId" INTEGER,
    "racaNome" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "classeId" INTEGER,
    "classeNome" TEXT,
    "profissao" TEXT,
    "importancia" TEXT,
    "tom" TEXT,
    "personalidade" TEXT,
    "aparencia" TEXT,
    "segredo" TEXT,
    "objetivoCampanha" TEXT NOT NULL,
    "gancho" TEXT,
    "frase" TEXT,
    "relacaoComGrupo" TEXT,
    "detalheVisual" TEXT,
    "descricao" TEXT,
    "dadosJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanha_npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_template_geracao" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "racaId" INTEGER,
    "racaNome" TEXT,
    "genero" TEXT,
    "classeId" INTEGER,
    "classeNome" TEXT,
    "profissao" TEXT,
    "tom" TEXT,
    "importancia" TEXT,
    "peso" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npc_template_geracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_estilo_narrativo" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "template" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npc_estilo_narrativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campanha_npc_campanhaId_idx" ON "campanha_npc"("campanhaId");

-- CreateIndex
CREATE INDEX "campanha_npc_racaId_idx" ON "campanha_npc"("racaId");

-- CreateIndex
CREATE INDEX "campanha_npc_classeId_idx" ON "campanha_npc"("classeId");

-- CreateIndex
CREATE INDEX "npc_template_geracao_tipo_ativo_idx" ON "npc_template_geracao"("tipo", "ativo");

-- CreateIndex
CREATE INDEX "npc_template_geracao_racaId_idx" ON "npc_template_geracao"("racaId");

-- CreateIndex
CREATE INDEX "npc_template_geracao_classeId_idx" ON "npc_template_geracao"("classeId");

-- CreateIndex
CREATE UNIQUE INDEX "npc_estilo_narrativo_chave_key" ON "npc_estilo_narrativo"("chave");

-- AddForeignKey
ALTER TABLE "campanha_npc" ADD CONSTRAINT "campanha_npc_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha_npc" ADD CONSTRAINT "campanha_npc_racaId_fkey" FOREIGN KEY ("racaId") REFERENCES "Raca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanha_npc" ADD CONSTRAINT "campanha_npc_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_template_geracao" ADD CONSTRAINT "npc_template_geracao_racaId_fkey" FOREIGN KEY ("racaId") REFERENCES "Raca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_template_geracao" ADD CONSTRAINT "npc_template_geracao_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
