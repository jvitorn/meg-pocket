-- Generated from periciaPersonagem.csv
COPY "PericiaPersonagem" ("id", "personagemId", "periciaId", "pontuacao", "descricao", "createdAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,periciaId,pontuacao,descricao,createdAt
1,3,1,2,null,2025-12-03 17:30:38
2,1,3,2,null,2025-12-03 17:31:33
3,2,3,2,null,2025-12-03 17:31:49
4,4,3,2,null,2025-12-03 17:32:00
6,5,4,2,null,2025-12-12 21:03:01
7,5,1,2,null,2025-12-13 21:35:47
8,7,3,3,null,2026-01-04 16:55:09
9,8,1,3,null,2026-01-04 17:08:57
10,10,1,3,null,2026-01-04 17:29:16
11,14,1,1,null,2026-02-28 01:32:33.301
12,15,4,1,null,2026-02-28 02:36:49.822
13,16,1,1,null,2026-02-28 14:17:44.895
14,17,1,1,null,2026-02-28 16:38:00.292
15,18,1,1,null,2026-03-01 11:07:19.35
16,19,3,1,null,2026-03-02 14:25:41.547
17,20,4,1,null,2026-03-04 13:43:01.389
\.
SELECT setval(pg_get_serial_sequence('"PericiaPersonagem"', 'id'), COALESCE((SELECT MAX("id") FROM "PericiaPersonagem"), 1), true);
