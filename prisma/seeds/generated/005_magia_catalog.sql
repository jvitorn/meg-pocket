-- Generated from magiacatalog.csv
COPY "MagiaCatalog" ("id", "nome", "alcance", "descricao", "custo_nivel", "classeId", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,alcance,descricao,custo_nivel,classeId,createdAt,updatedAt
3,"Machado Florestal 🪓","até 2 metros","Celi conjura um machado bruto de madeira viva e raízes rúnicas.
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

Sangramento não dá crítico",3,5,2025-11-29 19:07:15,2025-11-29 19:07:16
4,"Dança dos mil ventos🌪️ ","até 30 metros","Yuna inicia um movimento de ballet e os ventos se condensam ao redor dela, formando três grandes lâminas de ar cortante que são disparadas em sequência.

⚔️ Lâminas (3 golpes)
Dano por lâmina: 1d6 (média 3)
DT: 12
As três lâminas são ataques independentes.

📏 Alcance
Até 15 m

🔧 Limitações
• Falhar uma lâmina não impede lançar as outras.",3,5,2025-11-29 19:08:48,2025-12-10 19:58:50
5,"Manopla Hjorn 🥊","Pessoal","Monai invoca uma manopla tribal de madeira viva e raízes rúnicas. Ela pulsa com força primal, permitindo desferir uma sequência de socos enquanto a energia durar.

👊 Golpe

Dano: 1d6 − 1 (média 3)

Alcance: corpo a corpo

🔁 Sequência de golpes
DT inicial: 10 

A cada golpe contínuo bem-sucedido, DT aumenta +2.
A magia termina quando o teste falhar.",3,5,2025-12-03 21:33:26,2025-12-10 19:10:15
6,"Rei Vermelho🔥 ","até 10 metros","Petra invoca uma pequena fênix que carrega uma esfera de fogo crescente.
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
Se Petra for interrompida, a fênix desaparece sem causar dano.",3,5,2025-12-03 21:34:26,2025-12-03 21:34:28
7,"Escudo Rochoso","Pessoal ","Um escudo de rochas compactas se ergue diante do conjurador, reduzindo parte do dano recebido.

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
Não protege contra dano perfurante.",2,1,2025-12-03 21:43:00,2025-12-03 21:43:01
8,"Adagas Elementais","até 5 metros","Duas adagas do elemento escolhido surgem nas mãos do conjurador.
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
🌊 Água: alvo −2 em defesa/contra-ataque",2,1,2025-12-03 21:50:38,2025-12-03 21:50:39
9,"Capoeira Ciclone","Pessoal","O guerreiro gira o corpo em um movimento acrobático, criando um pequeno turbilhão de vento que impulsiona dois chutes rápidos e precisos.

⚔️ Dano
2d2 + 2 (média 4)

🌀 Ataque Extra
O giro pode continuar.
DT 11
Se passar → +1 chute adicional, com:
Dano: 1d2 + 1 (média 2)",2,1,2025-12-03 21:57:43,2025-12-10 19:21:57
10,"Rajada de vento","até 20 metros","Dispara orbes de vento cortante em sequência.
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
Até 20 m",1,3,2025-12-03 22:38:09,2025-12-03 22:38:10
11,"Serpente Elemental","até 50 metros","O Elementalista conjura uma serpente espiritual do elemento escolhido, ela voa até o alvo, aplica um único efeito e desaparece.

Alcance: até 50 m

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
Sucesso → sem efeito",2,3,2025-12-06 20:12:05,2025-12-06 20:12:06
12,"Rebote Ciclone","Pessoal","Um mini-ciclone surge no momento do impacto e tenta desviar uma magia inimiga.

🛡️ Defesa Reativa
Use somente ao sofrer um ataque mágico.
DT 15
Sucesso → a magia inimiga é desviada (sem dano/efeito)
Falha → o ataque acerta normalmente

🌬️ Afinidade Vento
DT reduzida para 12

📏 Regras
Não funciona contra golpes físicos
Uso imediato (reação)",2,3,2025-12-06 20:13:57,2025-12-06 20:13:58
13,"Bola de Fogo","até 10 metros","Forma uma esfera ígnea e a lança, explodindo em chamas ao atingir o alvo.

⚔️ Dano
2d3 + 2 (média 6)

🔥 Afinidade Fogo
2d4 + 2 (média 8)

📏 Alcance
Até 10 m",2,3,2025-12-07 14:16:46,2025-12-07 14:16:48
14,"Faíscas","Pessoal","O Artífice libera um arco elétrico que pode paralisar o alvo por um instante.

⚔️ Dano
1d4 + 1 (média 3)
Alcance: até 10 m

⚡ Paralisia
Após causar dano → DT 12
Falha → alvo Paralisado até o fim do turno
Sucesso → só recebe o dano

❗ Limitações
Paralisia só ocorre se o dano atingir
Não acumula com outras paralisias",2,4,2025-12-07 14:29:34,2025-12-07 14:29:35
15,"Investida Shuriken","até 5 metros","Lança uma shuriken energizada capaz de realizar dois golpes em sequência.
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
A shuriken desaparece após o ataque extra ou se o primeiro falhar",2,4,2025-12-07 14:31:27,2025-12-07 14:31:28
16,"Rajada Clow🌊","até 10 metros","Condensa até 3 esferas de água em uma carta mágica.
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
Dano puro, sem efeitos extras.",3,5,2025-12-07 14:33:33,2025-12-07 14:33:36
17,"Clava Rúnica","até 5 metros","Clava rúnica conjurada que dura 1 único ataque.
Pode ser usada corpo a corpo ou arremessada como ação bônus.

⚔️ Golpe (corpo a corpo)
Dano: 3d2 + 2 (média 5)

🎯 Arremesso
Dano: 1d8 + 1 (média 5)
Alcance: até 5 m
DT para ataque bônus: 13
Se passar → realiza o arremesso como ação bônus.

🌀 Extra — Bônus
Permite usar esta magia + outra magia no mesmo turno (pagando ambos os custos).",2,1,2025-12-10 19:07:42,2025-12-10 19:07:43
18,"Soco Explosivo ","até 2 metros","O conjurador concentra energia flamejante no punho e desfere um golpe direto que libera uma pequena explosão de fogo no impacto.

O ataque é rápido, direto e eficaz.
Dano médio: 3
Rolagem de dano: 1d4 + 1
Alcance: Curto — ≤ 2 m
Efeito Adicional — Explosão Flamejante

Se o conjurador obtiver 1d20 ≥ 18 (DT 18), o soco causa +2 de dano imediato de fogo.",1,1,2025-12-10 19:20:46,2025-12-10 19:20:48
19,"Lâmina Elemental","Pessoal","Uma lâmina formada pelo elemento do usuário surge na mão, vibrando com energia pura.

⚔️ Dano

1d3 por golpe (média 2)
Dura 1d2 golpes ou 1d2 turnos, o que vier primeiro.
Dano total possível: até 4.

📏 Alcance

Pessoal / corpo a corpo

❗ Limitação

Desaparece ao fim da duração ou após todos os golpes.",2,1,2025-12-10 19:23:43,2025-12-10 19:23:44
20,"Aura Cura","Pessoal","Uma névoa prateada envolve o conjurador, acumulando energia purificadora que será liberada apenas no próximo turno.

✨ Cura

2d3 por turno carregado (média 4)

🔄 Potência

Ao carregar a magia (em vez de liberar):

adiciona +1 rolagem de cura por turno carregado

enquanto carrega, o conjurador sofre +5 de penalidade em testes de ataque

A cura é aplicada no início do próximo turno após a liberação.

📏 Alcance
Pessoal",1,2,2025-12-10 19:26:49,2025-12-10 19:26:50
21,"Orbe de Aura","até 50 metros","O conjurador cria um orbe luminoso de energia purificadora e o dispara em linha reta.

⚔️ Dano

2d3 (média 4)

📏 Alcance

Até 50 m",2,2,2025-12-10 19:28:34,2025-12-10 19:28:35
22,"Impacto Cinético","até 3 metros","O Artífice concentra mana em um foco (ou nas mãos), criando um choque elétrico comprimido.

⚔️ Dano Base
1d4 (média 2)
Alcance: 3 m

⚡ Potência (Carregamento)
Cada turno carregando:
+1d4 de dano

DT reduzida em –3
A liberação ocorre no início do próximo turno ou quando decidir soltar.

Penalidade: sofre +5 em testes contra ataques enquanto carrega.
Interrupções cancelam a Potência.

🧊 Teste — Paralisia Total
DT 17 (–3 por turno carregado)
Falha → alvo fica Paralisado até o fim do turno
Sucesso → sofre metade do dano

❗ Limitações
Afeta apenas 1 alvo
Paralisia não acumula",1,4,2025-12-10 19:50:19,2025-12-10 19:50:20
23,"Chuva Revigorante ","5 metros (circular)","O Purificador traça um círculo mágico que libera uma chuva espiritual.

A chuva assume propriedades elementais escolhidas no momento da conjuração.

Ela cura até 2 aliados na área e, dependendo do elemento, cria um efeito adicional.
Alcance da área: 5 metros

Cura por aliado: 2d3 + 1

🌈 ESCOLHA DO ELEMENTO (efeito muda conforme o elemento escolhido)
Se o Purificador tiver afinidade com o elemento escolhido, o efeito é fortalecido conforme indicado.

💧 1) Água — Chuva Purificadora
Efeito base:
• Remove 1 debuff leve de cada aliado curado.
Afinidade Água:
• Remove 2 debuffs leves ou 1 debuff moderado (caso exista).

🌿 2) Natureza — Chuva Revitalizante
Efeito base:
• Aliados recebem +1 em testes de acerto até o fim do próximo turno.
Afinidade Natureza:
• Bônus aumenta para +2 em testes de acerto.

🌬️ 3) Vento — Chuva Arejada
Efeito base:
• Aliados ganham +1 em testes de esquiva até o fim do próximo turno.
Afinidade Vento:
• Esquiva aumenta para +2, e aliados podem reação de recuo de 1 metro sem custo.

🔥 4) Fogo — Chuva Ígnea Suave
(não causa dano — é “fogo espiritual”, usado como vigor)
Efeito base:
• Aliados recebem +1 de dano no próximo ataque (somente 1 ataque).
Afinidade Fogo:
• Bônus aumenta para +2 de dano no próximo ataque.

📏 Alcance / Área
• Área circular de 5 metros, centrada no Purificador.
• Cura até 2 aliados dentro da área.

🧭 Limitações
• Só afeta aliados.
• Efeitos não acumulam consigo mesmos.
• Se houver menos de 2 aliados, afeta apenas os presentes.",2,2,2026-01-04 16:31:02,2026-01-04 16:31:04
24,"Chicote de Cipó","Até 30 metros","O Elementalista faz emergir um longo cipó vivo reforçado por energia natural.
O chicote se estende em alta velocidade, estalando com força contra o alvo a grandes distâncias antes de desaparecer em fragmentos de folhas e luz verde.
🔹 Dano
Dano médio: 6

Rolagem: 2d3 + 2
(Faixa 4–8)

🌿 Dano com Afinidade Natureza

Quando o conjurador possui afinidade com o elemento Natureza:

Dano médio: 8
Rolagem: 2d4 + 2",2,3,2026-01-04 17:17:45,2026-01-04 17:17:47
25,"Essência Tóxica","Até 10 metros","O Purificador condensa energia corrupta em sua palma, criando uma pequena esfera escura envolta por vapores verdeados.
Ao ser lançada contra o alvo, a essência se desfaz em partículas tóxicas que tentam penetrar nas defesas do inimigo.
O veneno não causa efeito físico imediato a menos que o oponente falhe em resistir à toxina, permitindo que a energia nociva se espalhe pelo corpo.

Teste de Resistência:
1d20 ≥ 18 (DT 18)

Sucesso: o alvo resiste ao veneno e não sofre dano.
Falha: o veneno se instala e causa dano imediato.

Dano médio: 4
Rolagem de dano: 2d3

Limitação:
O dano só ocorre caso o alvo falhe no teste.
A magia não aplica envenenamento contínuo; o efeito é pontual (uma aplicação).",2,2,2026-01-04 18:27:54,2026-01-04 18:27:55
26,"Espectro","Pessoal |  Toque (aplicar em um aliado)
","O Purificador molda uma miragem luminosa feita de energia espiritual pura, que envolve o alvo escolhido — ele mesmo ou um aliado tocado.

A figura espectral permanece próxima, imóvel e silenciosa, aguardando o instante em que um ataque real se aproxima para protegê-lo.

✨ Funcionamento
• O alvo recebe 1 carga de Espectro.
• A magia precisa ser preparada antes do ataque ocorrer.
• A carga ativa automaticamente no próximo ataque recebido.
• Após ativar (com sucesso ou falha), o Espectro desaparece.

🔮 Ativação Automática (quando o ataque acerta)
O Espectro tenta interceptar o impacto:
Teste: 1d20 ≥ 12
✔️ Sucesso
• Reduz 50% do dano do ataque.
• Restaura 1 PM ao alvo protegido. 
✖️ Falha
• O dano não é reduzido.
• A magia é consumida.

🧭 Duração
Até ativar no próximo ataque recebido
ou até o fim da cena.

🌀 Extra — Bônus
Pode ser conjurada mesmo após outra magia no mesmo turno
",1,2,2026-04-18 13:22:00,2026-04-18 13:22:02
27,"Escudo Elemental","Pessoal","O Purificador convoca energia elemental pura, formando placas vivas ao seu redor.

Essas lâminas etéreas — feitas de água, vento, natureza ou fogo — orbitam o corpo e absorvem parte do dano recebido antes de se desfazerem, liberando um pequeno efeito secundário conforme o elemento do conjurador.

🧱 Absorção Base
• Absorção total: 4
• Rolagem: 2d3 (média 4)

❌ Não protege contra dano perfurante.

🌈 Efeitos por Afinidade Elemental
Quando o escudo absorve dano, ele libera automaticamente um efeito uma única vez, no momento do impacto.

🌊 Água — Purificação Fluida
🌿 Natureza — Cura Orgânica
• Remove 1 debuff leve do Purificador
• Restaura 1 PM

🌬️ Vento — Corte Aerodinâmico
🔥 Fogo — Estilhaço Ígneo
• Causa 1 de dano elemental ao atacante

🛡️ Extra — Defesa
Absorve dano ao ser atacado, ativando efeitos secundários automaticamente.
",1,2,2026-04-18 13:23:53,2026-04-18 13:23:55
28,"Raízes Entrelaçadas","Até 5 metros","Raízes brotam do solo e tentam prender o alvo ao chão.

🌀 Controle
Inimigo precisa fazer um teste DT 12
• Falha → alvo Imobilizado por 1 turno
• Sucesso → sem efeito

🍃 Afinidade Natureza
DT aumenta para 18

🌀 Extra — Bônus
Pode ser usada como ação bônus, junto com outra magia (pagando ambos os custos).",1,3,2026-04-18 13:26:50,2026-04-18 13:26:48
29,"Adagas Estilhaço","Corpo | Arremesso até 5m","Duas adagas de vidro arcano surgem nas mãos do Artífice.

Cada uma dura 2 golpes ou 2 turnos.

⚔️ Golpe
1d3 por adaga (média 2)

Máximo por adaga: 4
Total das duas: 8

💥 Explodir Adaga (Ação Extra)
Explode uma adaga ativa.
1d4 + 1 de dano (média 3)

A adaga é consumida.

❗ Limitação
Explodir não é reação; só uma ação extra.",2,4,2026-04-18 13:29:33,2026-04-18 13:29:36
30,"Bomba Elemental","Até 20m (3m de raio)","O Artífice lança uma bomba que cria fumaça e aplica um efeito conforme o elemento escolhido.

• Fumaça dura 1 turno

🎲 Teste
DT 18
Com afinidade → DT 14

🌿🌬️ Natureza / Vento — Gás Venenoso
Se falhar no teste → 1d4 + 1 (média 3)

🔥💧 Fogo / Água — Explosão Fragmentada
1d6 + 1 (média 4)

Atinge todos na área (menos o Artífice, se fora do raio)

🌀 Fumaça (comum)
• Meia cobertura (−3 acerto)
• Some com vento forte
• Sem dano adicional",2,4,2026-04-18 13:32:24,2026-04-18 13:32:21
31,"Escudo Portátil","Pessoal | Arremesso até 5m","Escudo mecânico dobrável que pode absorver dano ou ser arremessado.

🎯 Arremesso
• DT: 12
• Escudo some após o arremesso.

🌈 Afinidades (apenas conforme o elemento do personagem)

🌬️ Vento — Precisão
Arremesso: DT 10
Absorção:1d4+1

🌿 Natureza — Defesa Reforçada
Absorção: 2d3

💧 Água — Defesa Fluida
Absorção: 1d3+2

🔥 Fogo — Escudo Incandescente
Absorção: 1d3+1",2,4,2026-04-18 13:36:16,2026-04-18 13:36:17
\.
SELECT setval(pg_get_serial_sequence('"MagiaCatalog"', 'id'), COALESCE((SELECT MAX("id") FROM "MagiaCatalog"), 1), true);
