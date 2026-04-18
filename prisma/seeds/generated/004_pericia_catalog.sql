-- Generated from periciaCatalog.csv
COPY "PericiaCatalog" ("id", "nome", "tipo", "descricao", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,tipo,descricao,createdAt,updatedAt
1,"Atletismo & Condicionamento Físico",Luta,"No combate, Atletismo está ligado à movimentação defensiva, reposicionamento e resistência física durante a luta.

+ Aumenta Slots de Esquiva

Ao gastar uma esquiva ou em testes de esquiva, o personagem pode usar esta pericia para melhorar suas chances, em vez de depender só da rolagem base.

**Sugestões de uso da perícia:**
- **Esquiva**
- **Atletismo**
- **Agilidade** ",2025-11-29 18:56:46,2025-11-29 18:56:47
3,"Combate",Luta,"Combate representa treinamento marcial, força aplicada em luta, precisão ofensiva, postura de batalha e domínio real de confronto físico. É a perícia de quem sabe bater, defender e vencer uma troca de golpes.

+ Aumenta Slots de Bloqueio
Ao gastar um bloqueio ou em testes de acertos sem dt de magia, o personagem pode usar esta pericia para melhorar suas chances, em vez de depender só da rolagem base.

**Sugestões de uso da perícia:**
- **Luta**
- **Força**
- **Pontaria** ",2025-11-29 18:57:55,2025-11-29 18:57:56
4,"Ecologia & Artefatos",Suporte,"Permite identificar espécies, ervas e materiais naturais, entendendo suas propriedades e aplicações. Também possibilita reconhecer a origem e a função de artefatos, realizando apenas reparos simples quando necessário — **sem qualquer forma de encantamento**.

**Sugestões de uso da perícia:**

- **Investigação:** Analisar objetos misteriosos ou artefatos para determinar sua origem, função ou características mágicas.

- **Sobrevivência:** Localizar, identificar e coletar recursos naturais como ervas, plantas e materiais úteis.

- **Percepção:** Detectar elementos ocultos ou mágicos no ambiente ou em artefatos (detalhes invisíveis, plantas raras, inscrições, sinais de uso, etc.).",2025-12-12 21:02:27,2025-12-12 21:02:28
5,"Alquimia",Suporte,"Alquimia representa o conhecimento de ingredientes, preparo de substâncias e criação de compostos úteis ou perigosos. É a perícia voltada para poções, venenos, antídotos, reagentes e soluções especiais.

**Sugestões de uso**
- Criação de poções, venenos, antídotos e elixires.
Localizar, identificar e extrair ervas, minerais e componentes ligados à cura ou fabricação de compostos.
- Examinar líquidos, toxinas e substâncias desconhecidas para descobrir seus efeitos.
- Produzir remédios simples ou soluções improvisadas em campo.

**Em combate:**
Aumenta testes ligados à DT de arremesso de frascos, bombas alquímicas e itens arremessáveis.",2026-04-18 14:09:53,2026-04-18 14:09:55
\.
SELECT setval(pg_get_serial_sequence('"PericiaCatalog"', 'id'), COALESCE((SELECT MAX("id") FROM "PericiaCatalog"), 1), true);
