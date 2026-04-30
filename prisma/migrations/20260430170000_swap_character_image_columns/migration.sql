ALTER TABLE "Personagem"
RENAME COLUMN "imagem_perfil" TO "imagem_tmp";

ALTER TABLE "Personagem"
RENAME COLUMN "imagem_principal" TO "imagem_perfil";

ALTER TABLE "Personagem"
RENAME COLUMN "imagem_tmp" TO "imagem_principal";
