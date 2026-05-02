-- Generated from magiaPersonagem.csv
COPY "MagiaPersonagem" ("id", "personagemId", "magiaId", "custo_nivel", "descricao", "createdAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,magiaId,custo_nivel,descricao,createdAt
1,1,3,3,"Celi conjura um machado bruto de madeira viva e raízes rúnicas.
Dura 1d2 turnos ou 1d2 golpes.

⚔️ Golpe

Dano: 1d6
Alcance: corpo a corpo

🩸 Sangramento

Após cada golpe: DT 14
Se passar → aplica Sangramento 1d2 (início do turno do alvo)
Duração: 1d2 turnos
Acúmulo máximo: 2

❗ Limitações

Só funciona em criaturas que possam sangrar
Sangramento não dá crítico",2025-12-10 18:58:50
2,3,4,3,"Yuna inicia um movimento de ballet e os ventos se condensam ao redor dela, formando três grandes lâminas de ar cortante que são disparadas em sequência.

⚔️ Lâminas (3 golpes)
Dano por lâmina: 1d6 (média 3)
DT: 12
As três lâminas são ataques independentes.

📏 Alcance
Até 15 m

🔧 Limitações
• Falhar uma lâmina não impede lançar as outras.",2025-12-03 17:25:16
4,2,5,3,"Monai invoca uma manopla tribal de madeira viva e raízes rúnicas. Ela pulsa com força primal, permitindo desferir uma sequência de socos enquanto a energia durar.

👊 Golpe

Dano: 1d6 − 1 (média 3)

Alcance: corpo a corpo

🔁 Sequência de golpes
DT inicial: 10 

A cada golpe contínuo bem-sucedido, DT aumenta +2.
A magia termina quando o teste falhar.",2025-12-03 21:35:02
6,1,7,2,"Um escudo de rochas compactas se ergue diante do conjurador, reduzindo parte do dano recebido.

🛡️ Absorção
1d4 de redução de dano
(média 2)
Some após ser totalmente consumido.

📏 Alcance:
Pessoal

🌀 Extra — Defesa
Reduz dano recebido antes do impacto final.
Não concede ação extra nem reação.

❗ Limitação
Não protege contra dano perfurante.",2025-12-03 21:48:03
7,2,7,2,"Um escudo de rochas compactas se ergue diante do conjurador, reduzindo parte do dano recebido.

🛡️ Absorção
1d4 de redução de dano
(média 2)
Some após ser totalmente consumido.

📏 Alcance:
Pessoal

🌀 Extra — Defesa
Reduz dano recebido antes do impacto final.
Não concede ação extra nem reação.

❗ Limitação
Não protege contra dano perfurante.",2025-12-03 21:48:18
8,1,8,2,"Duas adagas do elemento escolhido surgem nas mãos do conjurador.
Podem ser usadas corpo a corpo ou arremessadas.

⚔️ Dano

1d2 por adaga (média 2 cada)
Total: 2d2 (média 4)
DT para desviar: 16

📏 Alcance

Corpo a corpo ou arremesso até 5 m

🔥💨🌿🌊 Efeito Elemental (por adaga)

Após causar dano, teste para ativar o efeito:

Com afinidade: DT 11
Sem afinidade: DT 16

Efeitos (1 turno):
🔥 Fogo: +2 de dano imediato
💨 Vento: empurra 2 m e +1 dano opcional
🌿 Natureza: alvo −2 em testes de acerto
🌊 Água: alvo −2 em defesa/contra-ataque",2025-12-03 21:54:35
9,2,9,2,"O conjurador gira o corpo em um movimento ágil de capoeira, formando um pequeno turbilhão ao redor de si. No auge do giro, ele desfere dois chutes velozes carregados de energia elemental, cada impacto soltando um clarão ao atingir o alvo.

Golpes iniciais: 2 chutes

Dano por chute: 1d2 de dano elemental

Dano médio por chute: 1,5

Chance de ataque extra: lance uma moeda

Cara: +1 chute (1d2+1)

Coroa: nenhum ataque adicional",2025-12-03 21:59:16
10,3,10,1,"Dispara orbes de vento cortante em sequência.
A magia continua gerando orbes enquanto o conjurador passar nos testes.
⚔️ Dano por orbe
1d3 (média 2)

🔁 Sequência
Após cada orbe, faça um teste:
DT inicial: 10
A cada orbe nova, a DT aumenta
+3 por orbe
+2 se tiver afinidade Vento
Falhou → a magia termina.

📏 Alcance
Até 20 m",2025-12-06 20:11:09
11,3,12,2,"Um mini-ciclone surge no momento do impacto e tenta desviar uma magia inimiga.

🛡️ Defesa Reativa
Use somente ao sofrer um ataque mágico.
DT 15
Sucesso → a magia inimiga é desviada (sem dano/efeito)
Falha → o ataque acerta normalmente

🌬️ Afinidade Vento
DT reduzida para 12

📏 Regras
Não funciona contra golpes físicos
Uso imediato (reação)",2025-12-06 20:14:48
12,5,11,2,"Conjura uma serpente espiritual do elemento escolhido, ela voa até o alvo, aplica um único efeito e desaparece.
💧 Serpente Aquática — Suporte
Ao tocar um aliado:
Cura: 1d3 (média 2 PV)
Recupera Mana: 1d3 (média 2 PM)
🔥 Boitatá — Fogo
Ataque direto de fogo.
Dano: 2d3 − 1 (média 4)
🌬️ Tirambóia — Vento
Dano leve + ilusão.
Dano: 1d3 (média 2)
Ilusão: DT 14
Falha → alvo é deslocado até 10 m
Sucesso → apenas dano
🌿 Serpente Predadora — Natureza
Tenta prender o alvo.
Teste: DT 14
Falha → alvo imobilizado por 1 turno
Sucesso → sem efeito",2025-12-07 14:14:42
13,5,13,2,"Forma uma esfera ígnea e a lança, explodindo em chamas ao atingir o alvo.

⚔️ Dano
2d3 + 2 (média 6)

🔥 Afinidade Fogo
2d4 + 2 (média 8)

📏 Alcance
Até 10 m",2025-12-07 14:23:46
14,5,6,3,"Petra invoca uma pequena fênix que carrega uma esfera de fogo crescente.
💥 Explosão Flamejante
Dano: 2d3 por turno carregado (média 4 por turno)
DT: 17 (–3 por turno carregado)
Sucesso → metade do dano
Falha → dano total

⚡ Potência
A fênix só explode quando Petra decidir.
Carregar aumenta o dano e reduz a DT.
Enquanto carrega, Petra sofre +5 contra ataques.
📏 Alcance
10 m
🔧 Limitações
Se Petra for interrompida, a fênix desaparece sem causar dano.",2025-12-07 14:25:04
15,4,14,2,"O Artífice libera um arco elétrico que pode paralisar o alvo por um instante.

⚔️ Dano
1d4 + 1 (média 3)
Alcance: até 10 m

⚡ Paralisia
Após causar dano → DT 12
Falha → alvo Paralisado até o fim do turno
Sucesso → só recebe o dano

❗ Limitações
Paralisia só ocorre se o dano atingir
Não acumula com outras paralisias",2025-12-07 14:30:32
16,4,15,2,"Lança uma shuriken energizada capaz de realizar dois golpes em sequência.
Alcance: 10 m
⚔️ Ataque Principal
Dano: 1d4
DT: 12
🌀 Ataque Extra
Se o primeiro acertar:
Dano: 1d4 + 1
DT: 14
🌀 Extra — Bônus
Pode ser usada junto com outra magia no turno (pagando ambos os custos).
❗ Limitações
O ataque extra só ocorre se o primeiro acertar
A shuriken desaparece após o ataque extra ou se o primeiro falhar",2025-12-07 14:31:51
17,4,16,3,"Condensa até 3 esferas de água em uma carta mágica.
Podem ser disparadas pelo Artífice ou entregues a um aliado.

⚔️ Esferas (até 3)
Dano: 1d6 – 1 (média 3)
DT: 12
Cada esfera é um ataque separado.

🤝 Entregar a um aliado
DT 10
Se passar, o aliado pode disparar as esferas como ação extra.
Se falhar, a carta cai e é perdida.

📏 Alcance
Esferas: 15 m
Entrega: 10 m

🔧 Limitações
Dano puro, sem efeitos extras.",2025-12-07 14:34:02
18,7,18,1,"O conjurador concentra energia flamejante no punho e desfere um golpe direto que libera uma pequena explosão de fogo no impacto.

O ataque é rápido, direto e eficaz.
Dano médio: 3
Rolagem de dano: 1d4 + 1
Alcance: Curto — ≤ 2 m
Efeito Adicional — Explosão Flamejante

Se o conjurador obtiver 1d20 ≥ 18 (DT 18), o soco causa +2 de dano imediato de fogo.",2026-01-04 16:57:10
19,7,9,2,"O guerreiro gira o corpo em um movimento acrobático, criando um pequeno turbilhão de vento que impulsiona dois chutes rápidos e precisos.

⚔️ Dano
2d2 + 2 (média 4)

🌀 Ataque Extra
O giro pode continuar.
DT 11
Se passar → +1 chute adicional, com:
Dano: 1d2 + 1 (média 2)",2026-01-04 17:00:00
20,7,17,2,"Clava rúnica conjurada que dura 1 único ataque.
Pode ser usada corpo a corpo ou arremessada como ação bônus.

⚔️ Golpe (corpo a corpo)
Dano: 3d2 + 2 (média 5)

🎯 Arremesso
Dano: 1d8 + 1 (média 5)
Alcance: até 5 m
DT para ataque bônus: 13
Se passar → realiza o arremesso como ação bônus.

🌀 Extra — Bônus
Permite usar esta magia + outra magia no mesmo turno (pagando ambos os custos).",2026-01-04 17:03:37
21,10,24,2,"O Elementalista faz emergir um longo cipó vivo reforçado por energia natural.
O chicote se estende em alta velocidade, estalando com força contra o alvo a grandes distâncias antes de desaparecer em fragmentos de folhas e luz verde.
🔹 Dano
Dano médio: 6

Rolagem: 2d3 + 2
(Faixa 4–8)

🌿 Dano com Afinidade Natureza

Quando o conjurador possui afinidade com o elemento Natureza:

Dano médio: 8
Rolagem: 2d4 + 2",2026-01-04 17:19:36
22,10,10,1,null,2026-01-04 17:24:56
23,10,13,2,null,2026-01-04 17:25:53
24,8,21,2,null,2026-01-04 18:20:39
25,8,23,2,null,2026-01-04 18:23:24
26,8,25,null,null,2026-01-04 18:29:22
27,13,9,null,null,2026-02-28 00:44:25.568
28,13,7,null,null,2026-02-28 00:44:25.568
29,13,17,null,null,2026-02-28 00:44:25.568
30,14,20,null,null,2026-02-28 01:32:33.301
31,14,21,null,null,2026-02-28 01:32:33.301
32,14,23,null,null,2026-02-28 01:32:33.301
34,16,17,null,null,2026-02-28 14:17:44.895
35,16,18,null,null,2026-02-28 14:17:44.895
36,16,19,null,null,2026-02-28 14:17:44.895
37,17,24,null,null,2026-02-28 16:38:00.292
38,18,12,null,null,2026-03-01 11:07:19.35
39,18,11,null,null,2026-03-01 11:07:19.35
40,18,24,null,null,2026-03-01 11:07:19.35
41,19,10,null,null,2026-03-02 14:25:41.547
42,19,11,null,null,2026-03-02 14:25:41.547
43,19,24,null,null,2026-03-02 14:25:41.547
\.
SELECT setval(pg_get_serial_sequence('"MagiaPersonagem"', 'id'), COALESCE((SELECT MAX("id") FROM "MagiaPersonagem"), 1), true);
