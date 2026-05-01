\set ON_ERROR_STOP on
BEGIN;
TRUNCATE TABLE "ItemEfeito", "ItemInventario", "Item", "PericiaPersonagem", "MagiaPersonagem", "slots_defensivos", "campanha_npc", "Personagem", "Session", "Account", "User", "EspecialRoleAction", "Especial", "MagiaCatalog", "PericiaCatalog", "Campanha", "npc_template_geracao", "npc_estilo_narrativo", "Classe", "Raca" RESTART IDENTITY CASCADE;
\ir 000_auth_seed.sql
\ir 001_raca.sql
\ir 002_classe.sql
\ir 013_npc_templates.sql
\ir 003_campanha.sql
\ir 004_pericia_catalog.sql
\ir 005_magia_catalog.sql
\ir 006_personagem.sql
\ir 007_magia_personagem.sql
\ir 007_pericia_personagem.sql
\ir 010_item.sql
\ir 011_item_inventario.sql
\ir 012_item_efeito.sql
\ir 009_slots_defensivos.sql
COMMIT;
\echo Seed plantada com sucesso.
