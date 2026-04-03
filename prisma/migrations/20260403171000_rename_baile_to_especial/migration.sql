ALTER TABLE "Baile" RENAME TO "Especial";

ALTER TABLE "BaileRoleAction" RENAME TO "EspecialRoleAction";

ALTER TABLE "Personagem"
RENAME COLUMN "status_baile" TO "statusEspecial";

ALTER TABLE "Personagem"
RENAME COLUMN "baileId" TO "especialId";

ALTER TABLE "EspecialRoleAction"
RENAME COLUMN "baileId" TO "especialId";

ALTER TABLE "Especial"
RENAME CONSTRAINT "Baile_pkey" TO "Especial_pkey";

ALTER TABLE "EspecialRoleAction"
RENAME CONSTRAINT "BaileRoleAction_pkey" TO "EspecialRoleAction_pkey";

ALTER TABLE "Personagem"
RENAME CONSTRAINT "Personagem_baileId_fkey" TO "Personagem_especialId_fkey";

ALTER TABLE "EspecialRoleAction"
RENAME CONSTRAINT "BaileRoleAction_baileId_fkey" TO "EspecialRoleAction_especialId_fkey";

ALTER INDEX "BaileRoleAction_baileId_tipo_idx"
RENAME TO "EspecialRoleAction_especialId_tipo_idx";

ALTER SEQUENCE "Baile_id_seq" RENAME TO "Especial_id_seq";

ALTER SEQUENCE "BaileRoleAction_id_seq" RENAME TO "EspecialRoleAction_id_seq";
