-- Seed local de catálogo de itens
COPY "Item" ("id", "nome", "tipo", "descricao", "slots", "durabilidadeBase", "durabilidadeMax", "empilhavel", "meta", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,tipo,descricao,slots,durabilidadeBase,durabilidadeMax,empilhavel,meta,createdAt,updatedAt
1,Adaga Rúnica,ARMA,"Adaga curta canalizada com runas para combates rápidos.",1,4,4,true,null,2026-04-04 12:00:00,2026-04-04 12:00:00
2,Poção de Vida,CONSUMIVEL,"Frasco pequeno de cura imediata.",0.25,1,1,true,null,2026-04-04 12:00:00,2026-04-04 12:00:00
3,Poção de Mana,CONSUMIVEL,"Frasco simples de recuperação arcana.",0.25,1,1,true,null,2026-04-04 12:00:00,2026-04-04 12:00:00
4,Grimório Menor,MAGICO,"Livro ritual básico para canalização de feitiços.",1,6,6,true,null,2026-04-04 12:00:00,2026-04-04 12:00:00
5,Fragmento Arcano,MATERIAL,"Material bruto usado em rituais e aprimoramentos.",0.25,null,null,true,null,2026-04-04 12:00:00,2026-04-04 12:00:00
6,Capa Arcana,EQUIPAMENTO,"Manto reforçado para aventuras e viagens longas.",1,1,1,true,null,2026-04-04 12:00:00,2026-04-04 12:00:00
\.
SELECT setval(pg_get_serial_sequence('"Item"', 'id'), COALESCE((SELECT MAX("id") FROM "Item"), 1), true);
