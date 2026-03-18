-- Generated from classes.csv
COPY "Classe" ("id", "slug", "nome", "subtitulo", "descricao", "gameplay", "background", "img_corpo", "exemploPersonagem", "tags", "hp", "mana", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,slug,nome,subtitulo,descricao,gameplay,background,img_corpo,exemploPersonagem,tags,hp,mana,createdAt,updatedAt
1,guerreiro,Guerreiro,Combatente,"Os Guerreiros são o símbolo vivo da disciplina marcial. Cresceram em campos de treinamento, batalhas antigas ou clãs tradicionais onde a força bruta e a honra moldam o caráter. Não dependem de truques, apenas da solidez da lâmina, da resistência do corpo e da determinação inabalável.

Em Magos & Grimórios, porém, o Guerreiro transcende o papel comum: ele canaliza magia por meio das próprias armas, infundindo cada golpe com energia ancestral, runas despertas e artes marciais aprimoradas há gerações.

Seu corpo é um grimório vivo de movimentos rituais: cada estocada, cada guarda e cada impacto é uma forma de conjuração física. Por isso, mesmo quando invocam energia mística, seus feitiços sempre se manifestam como extensões naturais do combate, jamais como magias arcanas convencionais.","• ALTA RESISTÊNCIA: Aguenta grandes quantidades de dano e protege aliados na linha de frente.
• COMBATE CORPO A CORPO VERSÁTIL: Utiliza punhos, espadas, martelos, lanças e outras armas pesadas com eficiência.
• MAGIA MARCIAL: Conjura técnicas através dos próprios movimentos de combate — golpes que liberam energia, armas rúnicas e posturas fortalecedoras.
• SUSTENTAÇÃO EM BATALHA: Mantém desempenho constante mesmo em confrontos longos graças à disciplina física e às técnicas rúnicas.
",/imgs/backgrounds/classe_guerreiro.jpg,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/background/guerreiro.png,Ragnar Forja,"[""Corpo a Corpo"",""Tanque"",""Alta Resistência"",""Iniciante-Friendly""]",12,6,2025-11-29 18:50:40,2025-12-07 09:12:51
2,purificador,Purificador,Suporte,"Os Purificadores são uma classe frequentemente subestimada por aqueles que enxergam apenas suas artes de cura. No entanto, essa é apenas a superfície do que realmente representam. São estudiosos dedicados, observadores atentos e profundos conhecedores das forças que regem o equilíbrio entre vida, doença, energia e decadência. Sua magia vai muito além da restauração: dominam técnicas de ataque a média e longa distância, capazes de manipular toxinas, venenos alquímicos e feitiços debilitantes que enfraquecem inimigos sem necessariamente destruí-los.

Mesmo sem causar grandes quantidades de dano bruto, seu impacto tático é enorme. Eles compreendem a fisiologia, o fluxo de mana e as fragilidades do corpo — seja para curar, fortalecer ou minar as defesas de um oponente. Não é surpresa que muitos Purificadores sejam tímidos ou reservados, pois passam anos imersos em estudos, manuscritos e experimentos. Ainda assim, carregam uma calma e precisão impressionantes durante o combate, como se cada ação fosse calculada com serenidade absoluta.

Equilibrados em vida e mana, os Purificadores têm a resiliência necessária para permanecer ao lado da linha de frente e o poder mágico para sustentar sua equipe em situações de risco extremo. Em um grupo bem treinado, a presença de um bom Purificador transforma a dinâmica inteira da batalha: aliados passam a se arriscar mais, a avançar com confiança e a enfrentar inimigos que jamais ousariam encarar sozinhos. De certa forma, o Purificador é o maestro silencioso que conduz a orquestra — guiando o ritmo, ajustando cada detalhe e garantindo que todos permaneçam em harmonia, mesmo diante do caos.
","• SUPORTE E CURA: Especialistas em manter aliados vivos, restaurando vida e removendo efeitos negativos durante o combate.
• CONTROLE E DEBUFF: Podem utilizar magias de veneno, criar poções como enfraquecimento e técnicas de manipulação para reduzir a eficiência dos inimigos.
• MÉDIA A LONGA DISTÂNCIA: Atacam com segurança fora do alcance direto, equilibrando cura, dano moderado e habilidades táticas.
• JOGO ESTRATÉGICO: Exigem observação, timing e planejamento; quando bem utilizados, permitem que a equipe avance com mais ousadia e segurança.
",/imgs/backgrounds/classe_purificador.jpg,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/background/purificador.png,Seraphis Valen,"[""Média Distância"",""Debuff"",""Suporte"",""Estratégico""]",10,8,2025-11-29 18:51:10,2025-12-08 21:54:22
3,elementalista,Elementalista,Combate a Distancia,"Os Elementalistas são herdeiros de uma tradição arcana que une magia antiga com técnicas modernas de manipulação elemental. Diferente dos magos tradicionais, sua postura, vestimenta e forma de conjurar carregam um estilo mais dinâmico: camadas leves de tecido, ornamentos rúnicos, acessórios assimétricos e detalhes que brilham de acordo com o elemento canalizado. Ao entrarem em combate, suas magias assumem formas marcantes – chamas que lembram a mandíbula de um dragão, rajadas de vento como asas abertas ou descargas elétricas que serpenteiam como lagartos míticos.

São, acima de tudo, estrategistas. Observadores, calculistas e atentos ao ambiente ao redor, moldam o campo de batalha antes que o inimigo perceba. Seu poder destrutivo é incomparável: entre todas as classes, os Elementalistas possuem o maior potencial de dano, capazes de devastar grupos inteiros de adversários com apenas alguns gestos precisos.

Essa força, porém, tem um custo. No corpo a corpo, os Elementalistas são vulneráveis e sofrem uma penalidade significativa, preferindo sempre manter distância e usar o terreno a seu favor. Em compensação, possuem a maior reserva de mana entre todas as classes, sustentando feitiços devastadores por mais tempo e criando sequências de ataques elementais que poucos conseguem presenciar e sobreviver.
","• ATAQUES À DISTÂNCIA: Especialistas em longo alcance e controle do campo de batalha.  
• ALTO DANO: Classe com o maior potencial de dano do jogo, focada em explosões elementais e combos visuais.  
• MAIOR RESERVA DE MANA: Podem conjurar mais vezes e manter magias poderosas por mais tempo.  
• FRAGILIDADE FÍSICA: Ruins em combate próximo; sofrem penalidade de -3 em ataques corpo a corpo.  
• ESTILO ESTRATÉGICO: Jogadores precisam pensar antes de agir, aproveitando alcance, posicionamento e timing.
",/imgs/backgrounds/classe_elementalista.jpg,https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/background/elementalista.png,Amelia,"[""Alto Dano"",""Longo Alcance"",""Alta Mana"",""Estratégico""]",8,10,2025-11-29 18:51:29,2025-12-07 10:31:27
4,artifice,Artifice,Estratégia,null,null,null,null,null,null,11,7,2025-11-29 18:51:46,2025-12-06 20:36:37
5,null,Unico,Magias Especificas,null,null,null,null,null,null,1,1,2025-11-29 18:51:58,2025-11-29 18:51:59
\.
SELECT setval(pg_get_serial_sequence('"Classe"', 'id'), COALESCE((SELECT MAX("id") FROM "Classe"), 1), true);
