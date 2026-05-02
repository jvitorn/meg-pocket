-- CreateTable
CREATE TABLE "ameacas" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tipoSecundario" TEXT,
    "elemento" TEXT NOT NULL,
    "va" DOUBLE PRECISION NOT NULL,
    "pv" INTEGER NOT NULL,
    "mana" INTEGER NOT NULL,
    "danoBase" TEXT NOT NULL,
    "danoMedio" INTEGER NOT NULL,
    "defesa" INTEGER NOT NULL,
    "funcao" TEXT NOT NULL,
    "reacoes" JSONB NOT NULL,
    "fraquezas" JSONB NOT NULL,
    "resistencias" JSONB NOT NULL,
    "imunidades" JSONB NOT NULL,
    "descricao" TEXT NOT NULL,
    "narrativa" TEXT NOT NULL,
    "golpes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ameacas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ameacas_slug_key" ON "ameacas"("slug");

-- CreateIndex
CREATE INDEX "ameacas_tipo_idx" ON "ameacas"("tipo");

-- CreateIndex
CREATE INDEX "ameacas_elemento_idx" ON "ameacas"("elemento");

-- CreateIndex
CREATE INDEX "ameacas_va_idx" ON "ameacas"("va");
