-- Generated from campanha.csv
COPY "Campanha" ("id", "nome", "sinopse", "capa", "count_jogadores", "mestre", "tags", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,sinopse,capa,count_jogadores,mestre,tags,createdAt,updatedAt
1,Conservatório de Magia Cooper,"O Conservatório Cooper é o mais renomado colégio de magia do mundo, berço dos maiores magos e estudiosos das artes arcanas. Entre suas torres douradas e corredores encantados, o conhecimento é tratado como poder — e o poder, como um fardo. Mas por trás do prestígio e da harmonia, escondem-se segredos antigos, selados nas profundezas da academia. Muitos acreditam que o verdadeiro propósito do Cooper vai além do ensino... e que certas portas jamais deveriam ser abertas.",https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/academia.jpg,6,jvitorn,"[""magia"",""mistério"",""academia""]",2025-11-29 18:54:34,2025-11-29 18:54:35
2,O Desaparecimento na Vila,null,null,null,jvitorn,"[""magia"",""mistério"",""academia""]",2026-01-04 16:52:53,2026-01-04 16:52:52
3,Campanha teste,null,null,null,Jao,null,2026-02-28 13:14:39,2026-02-28 13:14:41
\.
SELECT setval(pg_get_serial_sequence('"Campanha"', 'id'), COALESCE((SELECT MAX("id") FROM "Campanha"), 1), true);
