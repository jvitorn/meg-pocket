-- Generated from raca.csv
COPY "Raca" ("id", "nome", "descricao", "hp", "mana", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,descricao,hp,mana,createdAt,updatedAt
1,Umbra,"Antigamente almas de humanos que não encontraram paz após a morte, os Umbra são seres etéreos nascidos das sombras. Vagam entre os mundos porque ainda carregam objetivos inacabados, segredos não revelados ou promessas não cumpridas. São considerados místicos, enigmáticos e, muitas vezes, temidos por outros povos — especialmente pelos Lumis e Humanos, que os veem como amaldiçoados ou perigosos. Mas nem todos são mal-intencionados: alguns buscam redenção, outros apenas compreensão.",5,7,2025-11-29 18:48:52,2025-11-29 18:48:54
2,Lumis,"Humanoides feitos de luz pura, os Lumis brilham com uma aura suave mesmo durante o dia. Criados para trazer esperança, são seres calmos, doces e dedicados a ajudar os outros. Quando morrem, sua luz ascende ao céu e se torna uma nova estrela — um símbolo eterno de bondade e paz.",4,8,2025-11-29 18:49:15,2025-11-29 18:49:16
3,Elfo,"Elfos são seres antigos e sábios, vivendo até cinco vezes mais que humanos. Conhecidos por sua inteligência, graça e certa arrogância natural, eles carregam séculos de experiência em cada olhar.
Seu domínio sobre armas e estratégias refinadas torna-os formidáveis em combate e mestres na observação de detalhes sutis no mundo ao seu redor.",8,4,2025-11-29 18:49:48,2025-11-29 18:49:49
4,Humano,"A raça mais antiga do mundo. Humanos são adaptáveis, criativos e determinados, capazes de prosperar em qualquer situação. Sua versatilidade é lendária, tornando-os aliados confiáveis e aventureiros capazes de enfrentar qualquer desafio.",6,6,2025-11-29 18:50:10,2025-11-29 18:50:11
\.
SELECT setval(pg_get_serial_sequence('"Raca"', 'id'), COALESCE((SELECT MAX("id") FROM "Raca"), 1), true);
