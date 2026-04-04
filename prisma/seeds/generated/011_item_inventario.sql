-- Seed local de inventário por personagem
COPY "ItemInventario" ("id", "personagemId", "itemId", "quantidade", "durabilidadeAtual", "durabilidadeMax", "observacoes", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,itemId,quantidade,durabilidadeAtual,durabilidadeMax,observacoes,createdAt,updatedAt
1,1,1,1,4,4,Arma principal,2026-04-04 12:05:00,2026-04-04 12:05:00
2,1,2,2,1,1,Cura rápida,2026-04-04 12:05:00,2026-04-04 12:05:00
3,3,4,1,6,6,Canalizador arcano,2026-04-04 12:05:00,2026-04-04 12:05:00
4,3,3,3,1,1,Reserva de mana,2026-04-04 12:05:00,2026-04-04 12:05:00
5,8,5,4,null,null,Componentes para ritual,2026-04-04 12:05:00,2026-04-04 12:05:00
6,8,6,1,1,1,Equipamento de jornada,2026-04-04 12:05:00,2026-04-04 12:05:00
\.
SELECT setval(pg_get_serial_sequence('"ItemInventario"', 'id'), COALESCE((SELECT MAX("id") FROM "ItemInventario"), 1), true);
