CREATE TYPE "CampanhaStatus" AS ENUM ('ATIVA', 'ENCERRADA');

ALTER TABLE "Campanha"
ADD COLUMN "status" "CampanhaStatus" NOT NULL DEFAULT 'ATIVA';

CREATE INDEX "Campanha_status_idx" ON "Campanha"("status");
