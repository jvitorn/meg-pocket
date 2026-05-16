-- Seed deterministico para desenvolvimento local e testes e2e.
-- Mantem IDs estaveis para que fixtures, relacoes e testes continuem previsiveis.
\set ON_ERROR_STOP on
BEGIN;
TRUNCATE TABLE "ItemEfeito", "ItemInventario", "Item", "PericiaPersonagem", "MagiaPersonagem", "SlotsDefensivos", "CampanhaNpc", "Ameaca", "Personagem", "Session", "Account", "User", "EspecialRoleAction", "Especial", "MagiaCatalog", "PericiaCatalog", "Campanha", "NpcTemplateGeracao", "NpcEstiloNarrativo", "Classe", "Raca" RESTART IDENTITY CASCADE;

-- Contas locais de teste.
\ir 000_auth_seed.sql

-- Catalogos estruturais.
\ir 001_raca.sql
\ir 002_classe.sql
\ir 013_npc_templates.sql

-- Dados narrativos e fichas demonstrativas.
\ir 003_campanha.sql
\ir 004_pericia_catalog.sql
\ir 005_magia_catalog.sql
\ir 006_personagem.sql
\ir 007_magia_personagem.sql
\ir 007_pericia_personagem.sql
\ir 014_campanha_npc.sql
\ir 010_item.sql
\ir 011_item_inventario.sql
\ir 012_item_efeito.sql
\ir 009_slots_defensivos.sql
\ir 015_ameaca.sql
COMMIT;
\echo Seed concluida com sucesso.
