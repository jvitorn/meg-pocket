\set ON_ERROR_STOP on
BEGIN;
TRUNCATE TABLE "PericiaPersonagem", "MagiaPersonagem", "Inventorio", "slots_defensivos", "Personagem", "Session", "Account", "User", "BaileRoleAction", "Baile", "MagiaCatalog", "PericiaCatalog", "Campanha", "Classe", "Raca" RESTART IDENTITY CASCADE;
\ir 000_auth_seed.sql
\ir 001_raca.sql
\ir 002_classe.sql
\ir 003_campanha.sql
\ir 004_pericia_catalog.sql
\ir 005_magia_catalog.sql
\ir 006_personagem.sql
\ir 007_magia_personagem.sql
\ir 007_pericia_personagem.sql
\ir 009_slots_defensivos.sql
COMMIT;
\echo Seed plantada com sucesso.
