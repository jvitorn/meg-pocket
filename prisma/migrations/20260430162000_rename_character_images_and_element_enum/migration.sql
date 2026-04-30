CREATE TYPE "Elemento" AS ENUM ('natureza', 'agua', 'fogo', 'vento');

ALTER TABLE "Personagem"
RENAME COLUMN "imagem_pixel" TO "imagem_perfil";

ALTER TABLE "Personagem"
RENAME COLUMN "url_imagem" TO "imagem_principal";

ALTER TABLE "Personagem"
ALTER COLUMN "elemento" TYPE "Elemento"
USING "elemento"::"Elemento";
