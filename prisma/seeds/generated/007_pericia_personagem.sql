-- Pericias vinculadas aos personagens de exemplo
COPY "PericiaPersonagem" ("id", "personagemId", "periciaId", "pontuacao", "descricao", "createdAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,periciaId,pontuacao,descricao,createdAt
1,3,1,2,null,2025-12-03 17:30:38
2,1,3,2,null,2025-12-03 17:31:33
3,2,3,2,null,2025-12-03 17:31:49
4,4,3,2,null,2025-12-03 17:32:00
6,5,4,2,null,2025-12-12 21:03:01
7,5,1,2,null,2025-12-13 21:35:47
8,7,3,3,null,2026-01-04 16:55:09
10,10,1,3,null,2026-01-04 17:29:16
11,14,1,1,null,2026-02-28 01:32:33.301
13,16,1,1,null,2026-02-28 14:17:44.895
14,17,1,1,null,2026-02-28 16:38:00.292
15,18,1,1,null,2026-03-01 11:07:19.35
16,19,3,1,null,2026-03-02 14:25:41.547
25,26,4,2,null,2026-04-26 21:01:47.57
26,26,5,2,null,2026-04-26 21:01:47.57
37,27,1,2,null,2026-04-26 21:11:45.061
38,27,4,2,null,2026-04-26 21:11:45.061
39,28,3,2,null,2026-04-26 21:16:53.932
40,28,1,2,null,2026-04-26 21:16:53.932
41,25,1,2,null,2026-04-26 21:17:24.998
42,25,3,2,null,2026-04-26 21:17:24.998
47,8,1,2,null,2026-05-02 15:44:57.567
48,8,5,2,null,2026-05-02 15:44:57.567
\.
SELECT setval(pg_get_serial_sequence('"PericiaPersonagem"', 'id'), COALESCE((SELECT MAX("id") FROM "PericiaPersonagem"), 1), true);
