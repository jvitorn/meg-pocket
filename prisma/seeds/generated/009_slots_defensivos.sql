-- Slots reativos iniciais dos personagens de exemplo
COPY "SlotsDefensivos" ("id", "personagemId", "esquivaUsada", "bloqueioUsado", "contraAtaqueUsado") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,esquivaUsada,bloqueioUsado,contraAtaqueUsado
1,1,0,0,0
2,2,0,0,0
3,3,0,0,0
4,4,0,0,0
5,5,0,0,0
6,7,0,0,0
7,8,0,0,0
8,10,0,0,0
9,13,0,0,0
10,14,0,0,0
11,16,0,0,0
12,17,0,0,0
13,18,0,0,0
14,19,0,0,0
15,25,0,0,0
16,26,0,0,0
17,27,0,0,0
18,28,0,0,0
\.
SELECT setval(pg_get_serial_sequence('"SlotsDefensivos"', 'id'), COALESCE((SELECT MAX("id") FROM "SlotsDefensivos"), 1), true);
