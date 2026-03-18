-- Generated from slots_defensivos.csv
COPY "slots_defensivos" ("id", "personagemId", "esquivaUsada", "bloqueioUsado", "contraAtaqueUsado") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,esquivaUsada,bloqueioUsado,contraAtaqueUsado
1,1,0,0,0
2,5,0,0,0
3,3,0,0,0
4,2,0,0,0
5,4,0,0,0
6,7,0,0,0
7,10,0,0,0
8,8,0,0,0
9,14,3,0,0
10,15,0,0,0
11,16,0,0,0
12,17,0,0,0
13,18,0,0,0
14,19,0,0,0
15,20,0,0,0
\.
SELECT setval(pg_get_serial_sequence('"slots_defensivos"', 'id'), COALESCE((SELECT MAX("id") FROM "slots_defensivos"), 1), true);
