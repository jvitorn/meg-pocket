# Seeds

Os seeds deste projeto contêm dados estruturais e fictícios necessários para demonstrar e usar o sistema de RPG localmente.

Eles incluem classes, raças, campanhas, magias, itens, personagens de exemplo e usuários locais de teste.

Esses dados não representam pessoas reais.

## Estrutura

O ponto de entrada é `prisma/seeds/generated/index.sql`.

Ele organiza a execução em blocos:

- contas locais de teste;
- catálogos estruturais;
- campanhas, fichas e vínculos de demonstração;
- inventário, slots defensivos e ameaças.

Os arquivos usam `COPY ... FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null')` para manter os dados tabulares compactos e revisáveis. Quando uma tabela usa `autoincrement`, o arquivo também atualiza a sequência com `setval`.

## Manutenção

Mantenha IDs estáveis sempre que possível. Alguns testes e relacionamentos usam fixtures determinísticas, especialmente personagens e usuários locais.

Evite inserir dumps reais de mesa ou produção. Use nomes fictícios, textos revisados e imagens locais ou assets controlados pelo projeto.

Ao adicionar um novo arquivo de seed, inclua-o em `index.sql` na ordem das dependências de chave estrangeira.

## Aviso Importante

Os comandos de seed podem apagar dados existentes nas tabelas alvo antes de inserir os dados novamente.

Use seeds apenas em ambientes locais ou de desenvolvimento.

O script `run-sql-file.mjs` bloqueia seeds contra bancos não locais por padrão. Ele carrega `.env` e `.env.local`, aceita `DATABASE_URL` ou `DIRECT_URL`, e só libera seeds automaticamente para hosts locais como `localhost`, `127.0.0.1`, `::1` e `postgres`.

O runner suporta os comandos usados pelos seeds versionados: `\set`, `\echo`, `\ir` e `COPY FROM stdin`.

Para executar uma seed fora de ambiente local, é necessário passar a flag explícita `--prod` ou usar `npm run db:seed:prod`.

Antes de rodar qualquer seed, confirme que `.env.local` aponta para o banco correto.
