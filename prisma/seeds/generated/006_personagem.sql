-- Generated from personagem.csv
COPY "Personagem" ("id", "nome", "apelido", "descricao", "campanhaId", "classeId", "racaId", "elemento", "hp_atual", "mana_atual", "hp_base", "mana_base", "imagem_pixel", "url_imagem", "statusEspecial", "createdAt", "updatedAt", "especialId", "userId") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,apelido,descricao,campanhaId,classeId,racaId,elemento,hp_atual,mana_atual,hp_base,mana_base,imagem_pixel,url_imagem,statusEspecial,createdAt,updatedAt,especialId,userId
1,Celi,null,"Celi é uma elfa que treinou a vida inteira para ser uma guerreira, tem uma forte conexão com a floresta, assim como nunca deixa seus companheiros para trás. 
    ",1,1,3,natureza,20,9,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/celi_pixel.png,"https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/celi_profile.png
    ",null,2025-11-29 18:58:54,2026-02-24 00:02:09.438,null,cmknadd9s0000jmsb075f9ziw
2,Monai,null,"Guerreiro élfico lindo e simpático, nascido nas florestas ancestrais. Domina a magia da natureza e usa sua conexão com os elementos para proteger seu povo.",1,1,3,natureza,18,6,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/monai_pixel_2.png,"https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/monai_profile.png
   ",null,2025-11-29 19:00:11,2026-02-25 00:13:40.078,null,cmknadd9s0000jmsb075f9ziw
3,Yuna,null,"Yuna é uma maga ambiciosa e disciplinada,nascida em uma família que valoriza poder acima de tudo.",1,3,4,vento,14,15,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/yuna_pixel2.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/yuna_profile2.jpeg,null,2025-11-29 19:01:18,2025-12-12 23:00:47.215,null,null
4,Clau,null,null,1,4,1,agua,13,14,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/clau_pixel.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/clau_profile.png,null,2025-11-29 19:49:04,2025-12-07 17:32:10.477,null,null
5,Petra,null,null,1,3,4,fogo,8,13,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/petra_pixel.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/petra_profile.png,null,2025-12-03 17:40:23,2025-12-14 00:02:29.373,null,null
7,Orion,null,"Morreu de forma misteriosa segundo seus parentes mais próximos, ele ainda era jovem quando teve seu trágico fim. A alma dele busca respostas por sua morte e por isso ele continua ligado ao mundo mortal, não pretendendo descansar até descobrir o que realmente aconteceu naquele fatídico dia.",2,1,1,vento,8,3,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/orion_full.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/orion.png,null,2026-01-04 16:54:01,2026-01-14 13:08:23.127,null,null
8,Robin,null,"Uma ser de luz ,vive a mt anos trabalhando em sua guilda sendo bem gentil e atenciosa aos seus companheiros, sua aparencia infantil n condiz com sua idade mt menos sua maturidade pra agir diante de todas as situações. Ela é bem solitária em mt momentos, ent pra evitar ser isolada socialmente ela sempre busca agradar as pessoas q do seu ciclo social em busca de viver bem e alegre, por isso trabalha tanto mesmo com coisas pequenas.


dois poção de mana:1d4
dois poção de HP:1d6
pequena poção de cura e mana 2
Adagda: 3 de duração, cada ataque ou uso consome 1 de duração
moedas:14

crianças q sumiram a 4 dias, uma criança por noite some: 
fml do zach (Julie)
fml do jean( Chris)
fml do torreto( Alice)
fml do vice prefeito vitor (sophia)
vistas pela ultima vez pelos proprios pais
flash de luz durante a noite pra cegar os guardas e o sumiço acontecia 
crianças bem educadas e respeitosas
vivem do proprio cultivo, vendem e revendem para outros reinos
raramente compram recursos de outros lugares
vice prefeito trabalha na taverna, ele tem coisas a dizer (suspeitas) 

durante o segundo dia, um aventureiro sumiu e um boneco(josias) voltou sozinho da floresta. 
boneco pano( uma aura roxa, uma vibrança, uma voz gritando por ajuda vindo do boneco)

relato do vitor

",2,2,2,vento,10,6,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/robin_full.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/robin.png,null,2026-01-04 17:07:54,2026-01-05 02:25:18.34,null,null
10,Sylas,null,"Um jovem de 24 anos, formou-se na academia cedo e conseguiu um trabalho na guilda de aventureiros, em poucos meses ele recebeu uma missão em grupo que mudou sua perspectiva do mundo, o tornando frio e erradicando cada traço de felicidade que possuía.
 A morte de seu grupo de colegas fez com que Sylas passasse a trabalhar sozinho, em missões que jamais imaginaria aceitar, o jovem se recusava a trabalhar em equipe, e quando o fazia se afastava o máximo das pessoas.",2,3,4,fogo,12,10,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/Sylas_full.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/Sylas.png,null,2026-01-04 17:13:35,2026-01-05 01:45:08.932,null,null
13,Alberto,null,albertinho nasceu em uma vila pequena,2,1,1,fogo,17,13,17,13,null,https://i.pinimg.com/736x/36/48/47/364847ae1462d2be3fcabbba32c71819.jpg,null,2026-02-28 00:44:25.568,2026-02-28 00:46:06.934,null,cmkd5kjbj0000sbk92vwr25fp
14,teste,null,teste,2,2,4,fogo,16,14,16,14,null,https://i.pinimg.com/736x/ba/94/d5/ba94d5ee05da77460955d38a266000ed.jpg,null,2026-02-28 01:32:33.301,2026-02-28 01:32:33.301,null,cmkd5kjbj0000sbk92vwr25fp
15,Claudete,Clau,null,2,3,3,agua,16,14,16,14,null,null,null,2026-02-28 02:36:49.822,2026-02-28 02:36:49.822,null,cmm5pl8ae000004l79z7jtv4d
16,Escanor,O Pecado do Orgulho,"""Meus ataques poderosos não podem te alcançar? E quem decidiu isso? Meu sol foi engolido? E quem decidiu isso? O único que decide essas coisas SOU EU!""",2,1,2,fogo,16,14,16,14,null,https://www.reddit.com/r/NanatsunoTaizai/comments/1hzq4xg/escanor_solo_naruto/?tl=pt-br,null,2026-02-28 14:17:44.895,2026-02-28 14:17:44.895,null,cmm6ed4fr000004l1khlscdo4
17,Maverick Sangris,Sangria,Psicopatinha,2,3,4,fogo,14,16,14,16,null,https://picrew.me/ja/image_maker/1361506/complete?cd=1SbeM0eyNG,null,2026-02-28 16:38:00.292,2026-02-28 16:38:00.292,null,cmm6j0cs4000004k3l70wa6zg
18,Damar Schenko,Selo do Eclipse,"Um Elfo que nasceu na floresta mas que o destino não o permitiu continuar vivendo por lá. Seu destino era acabar com a força das trevas de acordo, a profecia que o guiava também era a que traria seu fim em uma noite de eclipse.",1,3,3,natureza,16,14,16,14,null,https://i.pinimg.com/736x/7c/f7/60/7cf760d318eab534c610420dfeb204ab.jpg,null,2026-03-01 11:07:19.35,2026-03-01 11:08:04.975,null,cmm7mwopw000004jr04xkah49
19,Ugred,Filho da Natureza,"Ugred nasceu em meio a natureza, seus pais morreram em meio a um acidente e apenas o garoto sobreviveu, assim a natureza acolheu aquela criança, criando ela como um de seus filhos.

Ugred tem uma grande afinidade com a natureza e os seres nela presente, odiando quem machuca a natureza e os seres presentes.

Ugred tem um temperamento calmo e analítico, como um predador que necessita compreender o ambiente a sua volta antes de agir.",1,3,1,natureza,13,17,13,17,null,https://pin.it/3I1R28iWn,null,2026-03-02 14:25:41.547,2026-03-02 14:28:57.284,null,cmm99f8gi000004jubjxyz6v3
20,Amara,null,null,3,2,1,fogo,15,15,15,15,null,null,null,2026-03-04 13:43:01.389,2026-03-04 13:43:01.389,null,cmm6paz3d000004juybe2lpd4
\.
SELECT setval(pg_get_serial_sequence('"Personagem"', 'id'), COALESCE((SELECT MAX("id") FROM "Personagem"), 1), true);
