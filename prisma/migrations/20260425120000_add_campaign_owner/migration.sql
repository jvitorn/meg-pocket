ALTER TABLE "Campanha"
ADD COLUMN "userId" TEXT;

CREATE INDEX "Campanha_userId_idx" ON "Campanha"("userId");

ALTER TABLE "Campanha"
ADD CONSTRAINT "Campanha_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
