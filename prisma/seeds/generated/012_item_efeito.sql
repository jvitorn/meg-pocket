-- Seed local de efeitos de itens
COPY "ItemEfeito" ("id", "itemId", "modulo", "operacao", "valor", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,itemId,modulo,operacao,valor,createdAt,updatedAt
1,2,VIDA,ADICIONAR,3,2026-04-04 12:10:00,2026-04-04 12:10:00
2,3,MANA,ADICIONAR,3,2026-04-04 12:10:00,2026-04-04 12:10:00
3,6,DEFESA,ADICIONAR,3,2026-04-04 12:10:00,2026-04-04 12:10:00
\.
SELECT setval(pg_get_serial_sequence('"ItemEfeito"', 'id'), COALESCE((SELECT MAX("id") FROM "ItemEfeito"), 1), true);
