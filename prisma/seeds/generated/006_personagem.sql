-- Personagens de exemplo atualizados
COPY "Personagem" ("id", "nome", "apelido", "descricao", "campanhaId", "classeId", "racaId", "elemento", "hp_atual", "mana_atual", "hp_base", "mana_base", "imagem_principal", "imagem_perfil", "statusEspecial", "createdAt", "updatedAt", "especialId", "userId", "defesa_atual", "defesa_max", "anotacoes", "habilidadeDiariaUsada") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,apelido,descricao,campanhaId,classeId,racaId,elemento,hp_atual,mana_atual,hp_base,mana_base,imagem_principal,imagem_perfil,statusEspecial,createdAt,updatedAt,especialId,userId,defesa_atual,defesa_max,anotacoes,habilidadeDiariaUsada
1,Celi,null,"Celi é uma elfa que treinou a vida inteira para ser uma guerreira, tem uma forte conexão com a floresta, assim como nunca deixa seus companheiros para trás.",1,1,3,natureza,20,9,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/celi_pixel.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/celi_profile.png,null,2025-11-29 18:58:54,2026-02-24 00:02:09.438,null,cmknadd9s0000jmsb075f9ziw,0,0,null,false
2,Monai,null,"Guerreiro élfico lindo e simpático, nascido nas florestas ancestrais. Domina a magia da natureza e usa sua conexão com os elementos para proteger seu povo.",1,1,3,natureza,18,8,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/monai_pixel_2.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/monai_profile.png,null,2025-11-29 19:00:11,2026-05-01 03:48:48.588,null,cmknadd9s0000jmsb075f9ziw,0,0,null,false
3,Yuna,null,"Yuna é uma maga ambiciosa e disciplinada,nascida em uma família que valoriza poder acima de tudo.",1,3,4,vento,14,15,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/yuna_pixel2.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/yuna_profile2.jpeg,null,2025-11-29 19:01:18,2025-12-12 23:00:47.215,null,cmknadd9s0000jmsb075f9ziw,0,0,null,false
4,Clau,null,null,1,4,1,agua,13,14,1,1,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/clau_pixel.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/clau_profile.png,null,2025-11-29 19:49:04,2025-12-07 17:32:10.477,null,null,0,0,null,false
5,Petra,null,null,1,3,4,fogo,8,13,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/petra_pixel.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/petra_profile.png,null,2025-12-03 17:40:23,2025-12-14 00:02:29.373,null,null,0,0,null,false
7,Orion,null,"Morreu de forma misteriosa segundo seus parentes mais próximos, ele ainda era jovem quando teve seu trágico fim. A alma dele busca respostas por sua morte e por isso ele continua ligado ao mundo mortal, não pretendendo descansar até descobrir o que realmente aconteceu naquele fatídico dia.",2,1,1,vento,8,3,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/orion_full.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/orion.png,null,2026-01-04 16:54:01,2026-01-14 13:08:23.127,null,null,0,0,null,false
8,Robin,null,"Uma ser de luz ,vive a mt anos trabalhando em sua guilda sendo bem gentil e atenciosa aos seus companheiros, sua aparencia infantil n condiz com sua idade mt menos sua maturidade pra agir diante de todas as situações. Ela é bem solitária em mt momentos, ent pra evitar ser isolada socialmente ela sempre busca agradar as pessoas q do seu ciclo social em busca de viver bem e alegre, por isso trabalha tanto mesmo com coisas pequenas.",2,2,2,vento,10,6,14,16,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/robin_full.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/robin.png,null,2026-01-04 17:07:54,2026-05-02 15:44:57.567,null,cmknadd9s0000jmsb075f9ziw,0,0,"dois poção de mana:1d4
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
",true
10,Sylas,null,"Um jovem de 24 anos, formou-se na academia cedo e conseguiu um trabalho na guilda de aventureiros, em poucos meses ele recebeu uma missão em grupo que mudou sua perspectiva do mundo, o tornando frio e erradicando cada traço de felicidade que possuía.
 A morte de seu grupo de colegas fez com que Sylas passasse a trabalhar sozinho, em missões que jamais imaginaria aceitar, o jovem se recusava a trabalhar em equipe, e quando o fazia se afastava o máximo das pessoas.",2,3,4,fogo,12,10,null,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/Sylas_full.png,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/oneshot/Sylas.png,null,2026-01-04 17:13:35,2026-01-05 01:45:08.932,null,null,0,0,null,false
13,Alberto,null,albertinho nasceu em uma vila pequena,2,1,1,fogo,17,13,17,13,null,https://i.pinimg.com/736x/36/48/47/364847ae1462d2be3fcabbba32c71819.jpg,null,2026-02-28 00:44:25.568,2026-02-28 00:46:06.934,null,cmkd5kjbj0000sbk92vwr25fp,0,0,null,false
14,teste,null,teste,2,2,4,fogo,16,14,16,14,null,https://i.pinimg.com/736x/ba/94/d5/ba94d5ee05da77460955d38a266000ed.jpg,null,2026-02-28 01:32:33.301,2026-02-28 01:32:33.301,null,cmkd5kjbj0000sbk92vwr25fp,0,0,null,false
16,Escanor,O Pecado do Orgulho,"""Meus ataques poderosos não podem te alcançar? E quem decidiu isso? Meu sol foi engolido? E quem decidiu isso? O único que decide essas coisas SOU EU!""",2,1,2,fogo,16,14,16,14,null,https://www.reddit.com/r/NanatsunoTaizai/comments/1hzq4xg/escanor_solo_naruto/?tl=pt-br,null,2026-02-28 14:17:44.895,2026-02-28 14:17:44.895,null,cmm6ed4fr000004l1khlscdo4,0,0,null,false
17,Maverick Sangris,Sangria,Psicopatinha,2,3,4,fogo,14,16,14,16,null,https://picrew.me/ja/image_maker/1361506/complete?cd=1SbeM0eyNG,null,2026-02-28 16:38:00.292,2026-02-28 16:38:00.292,null,cmm6j0cs4000004k3l70wa6zg,0,0,null,false
18,Damar Schenko,Selo do Eclipse,"Um Elfo que nasceu na floresta mas que o destino não o permitiu continuar vivendo por lá. Seu destino era acabar com a força das trevas de acordo, a profecia que o guiava também era a que traria seu fim em uma noite de eclipse.",2,3,3,natureza,16,14,16,14,null,https://i.pinimg.com/736x/7c/f7/60/7cf760d318eab534c610420dfeb204ab.jpg,null,2026-03-01 11:07:19.35,2026-03-01 11:08:04.975,null,cmm7mwopw000004jr04xkah49,0,0,null,false
19,Ugred,Filho da Natureza,"Ugred nasceu em meio a natureza, seus pais morreram em meio a um acidente e apenas o garoto sobreviveu, assim a natureza acolheu aquela criança, criando ela como um de seus filhos.

Ugred tem uma grande afinidade com a natureza e os seres nela presente, odiando quem machuca a natureza e os seres presentes.

Ugred tem um temperamento calmo e analítico, como um predador que necessita compreender o ambiente a sua volta antes de agir.",2,3,1,natureza,13,17,13,17,null,https://pin.it/3I1R28iWn,null,2026-03-02 14:25:41.547,2026-03-02 14:28:57.284,null,cmm99f8gi000004jubjxyz6v3,0,0,null,false
25,Eliane Grindewall,Cinerária,"Eliane é uma princesa elfa do reino dos Elfos da Floresta, ela é uma princesa guerreira que luta em nome do seu reino, para trazer glória e honra a sua família.",6,3,3,fogo,4,12,16,14,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/personagens/2026/04/53270265-0040-4311-83e0-dc35f77c797a.webp,null,2026-04-26 20:59:42.493,2026-04-26 23:41:08.49,null,cmm6paz3d000004juybe2lpd4,0,0,null,false
26,Carrion,null,Um jovem camponês de uma vila afastada especializado em magia de cura,6,2,1,natureza,14,0,15,15,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/personagens/2026/04/8bd478f3-187a-4e69-8eb8-159c4c053385.webp,null,2026-04-26 21:01:47.57,2026-04-26 23:33:11.635,null,cmkd5kjbj0000sbk92vwr25fp,0,0,"roubaru minhas poções
",false
27,Edrev Oleram,E.D,"Edrev é um andarilho que vagueia pelas terras devastadas durante séculos, ele aprendeu com humanos sobre técnicas e sistemas e desenvolveu sua afinidade com o elemento vento nesse meio tempo. Ed busca conhecimento pois antes de sua morte fatídica ele era um jovem estudioso e curioso.",6,4,1,vento,12,8,16,14,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/personagens/2026/04/a71c307c-be6a-41bf-9100-b8b7d9e481f3.webp,null,2026-04-26 21:03:28.616,2026-04-26 23:40:14.171,null,cmm7mwopw000004jr04xkah49,3,3,"2 goblins

",false
28,Ruby Seraphina,Ruby,"Ruby Seraphina é uma espadachim mercenária de elite, conhecida por cumprir contratos com precisão impecável e sem deixar sobreviventes.",6,1,4,fogo,4,7,18,12,null,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/personagens/2026/04/24cdd491-01e3-44bd-a15f-626e511c75c2.webp,null,2026-04-26 21:16:53.932,2026-04-26 23:38:27.063,null,cmm5pl8ae000004l79z7jtv4d,3,3,null,false
\.
SELECT setval(pg_get_serial_sequence('"Personagem"', 'id'), COALESCE((SELECT MAX("id") FROM "Personagem"), 1), true);
