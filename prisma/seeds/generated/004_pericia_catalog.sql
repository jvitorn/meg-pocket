-- Generated from periciaCatalog.csv
COPY "PericiaCatalog" ("id", "nome", "tipo", "descricao", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,nome,tipo,descricao,createdAt,updatedAt
1,Atletismo & Condicionamento Físico,Luta,"Voltado ao aprimoramento físico e resistência mágica. Aprendem técnicas de agilidade, equilíbrio e vigor para suportar longos rituais ou batalhas.",2025-11-29 18:56:46,2025-11-29 18:56:47
3,Combate,Luta,Luta,2025-11-29 18:57:55,2025-11-29 18:57:56
4,Ecologia & Artefatos,Suporte,"Permite identificar espécies, ervas e materiais naturais, entendendo suas propriedades e aplicações. Também possibilita reconhecer a origem e a função de artefatos, realizando apenas reparos simples quando necessário — **sem qualquer forma de encantamento**.

**Sugestões de uso da perícia:**

- **Investigação:** Analisar objetos misteriosos ou artefatos para determinar sua origem, função ou características mágicas.

- **Sobrevivência:** Localizar, identificar e coletar recursos naturais como ervas, plantas e materiais úteis.

- **Percepção:** Detectar elementos ocultos ou mágicos no ambiente ou em artefatos (detalhes invisíveis, plantas raras, inscrições, sinais de uso, etc.).",2025-12-12 21:02:27,2025-12-12 21:02:28
\.
SELECT setval(pg_get_serial_sequence('"PericiaCatalog"', 'id'), COALESCE((SELECT MAX("id") FROM "PericiaCatalog"), 1), true);
