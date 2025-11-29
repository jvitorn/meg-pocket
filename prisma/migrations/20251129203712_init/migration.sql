-- CreateTable
CREATE TABLE "Raca" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "hp" INTEGER DEFAULT 0,
    "mana" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classe" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "nome" TEXT NOT NULL,
    "subtitulo" TEXT,
    "descricao" TEXT,
    "gameplay" TEXT,
    "background" TEXT,
    "img_corpo" TEXT,
    "exemploPersonagem" TEXT,
    "tags" JSONB,
    "hp" INTEGER DEFAULT 0,
    "mana" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campanha" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sinopse" TEXT,
    "capa" TEXT,
    "count_jogadores" INTEGER,
    "mestre" TEXT,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personagem" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "descricao" TEXT,
    "campanhaId" INTEGER NOT NULL,
    "classeId" INTEGER NOT NULL,
    "racaId" INTEGER NOT NULL,
    "elemento" TEXT NOT NULL,
    "hp_atual" INTEGER,
    "mana_atual" INTEGER,
    "hp_base" INTEGER,
    "mana_base" INTEGER,
    "imagem_pixel" TEXT,
    "url_imagem" TEXT,
    "status_baile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baileId" INTEGER,

    CONSTRAINT "Personagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagiaCatalog" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "alcance" TEXT,
    "descricao" TEXT,
    "custo_nivel" INTEGER,
    "classeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagiaCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagiaPersonagem" (
    "id" SERIAL NOT NULL,
    "personagemId" INTEGER NOT NULL,
    "magiaId" INTEGER NOT NULL,
    "custo_nivel" INTEGER,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagiaPersonagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PericiaCatalog" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PericiaCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PericiaPersonagem" (
    "id" SERIAL NOT NULL,
    "personagemId" INTEGER NOT NULL,
    "periciaId" INTEGER NOT NULL,
    "pontuacao" INTEGER NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PericiaPersonagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventorio" (
    "id" SERIAL NOT NULL,
    "personagemId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inventorio_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Classe_slug_key" ON "Classe"("slug");

-- CreateIndex
CREATE INDEX "Personagem_campanhaId_idx" ON "Personagem"("campanhaId");

-- CreateIndex
CREATE INDEX "Personagem_racaId_idx" ON "Personagem"("racaId");

-- CreateIndex
CREATE INDEX "Personagem_classeId_idx" ON "Personagem"("classeId");

-- CreateIndex
CREATE INDEX "MagiaCatalog_classeId_idx" ON "MagiaCatalog"("classeId");

-- CreateIndex
CREATE UNIQUE INDEX "MagiaCatalog_nome_classeId_key" ON "MagiaCatalog"("nome", "classeId");

-- CreateIndex
CREATE INDEX "MagiaPersonagem_personagemId_idx" ON "MagiaPersonagem"("personagemId");

-- CreateIndex
CREATE INDEX "MagiaPersonagem_magiaId_idx" ON "MagiaPersonagem"("magiaId");

-- CreateIndex
CREATE UNIQUE INDEX "PericiaCatalog_nome_tipo_key" ON "PericiaCatalog"("nome", "tipo");

-- CreateIndex
CREATE INDEX "PericiaPersonagem_personagemId_idx" ON "PericiaPersonagem"("personagemId");

-- CreateIndex
CREATE INDEX "PericiaPersonagem_periciaId_idx" ON "PericiaPersonagem"("periciaId");

-- CreateIndex
CREATE INDEX "Inventorio_personagemId_idx" ON "Inventorio"("personagemId");

-- CreateIndex
CREATE INDEX "BaileRoleAction_baileId_tipo_idx" ON "BaileRoleAction"("baileId", "tipo");

-- AddForeignKey
ALTER TABLE "Personagem" ADD CONSTRAINT "Personagem_baileId_fkey" FOREIGN KEY ("baileId") REFERENCES "Baile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personagem" ADD CONSTRAINT "Personagem_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personagem" ADD CONSTRAINT "Personagem_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personagem" ADD CONSTRAINT "Personagem_racaId_fkey" FOREIGN KEY ("racaId") REFERENCES "Raca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagiaCatalog" ADD CONSTRAINT "MagiaCatalog_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagiaPersonagem" ADD CONSTRAINT "MagiaPersonagem_magiaId_fkey" FOREIGN KEY ("magiaId") REFERENCES "MagiaCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagiaPersonagem" ADD CONSTRAINT "MagiaPersonagem_personagemId_fkey" FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PericiaPersonagem" ADD CONSTRAINT "PericiaPersonagem_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "PericiaCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PericiaPersonagem" ADD CONSTRAINT "PericiaPersonagem_personagemId_fkey" FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventorio" ADD CONSTRAINT "Inventorio_personagemId_fkey" FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaileRoleAction" ADD CONSTRAINT "BaileRoleAction_baileId_fkey" FOREIGN KEY ("baileId") REFERENCES "Baile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
