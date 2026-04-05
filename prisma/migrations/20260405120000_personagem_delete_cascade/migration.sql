ALTER TABLE "MagiaPersonagem"
DROP CONSTRAINT "MagiaPersonagem_personagemId_fkey",
ADD CONSTRAINT "MagiaPersonagem_personagemId_fkey"
FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "PericiaPersonagem"
DROP CONSTRAINT "PericiaPersonagem_personagemId_fkey",
ADD CONSTRAINT "PericiaPersonagem_personagemId_fkey"
FOREIGN KEY ("personagemId") REFERENCES "Personagem"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
