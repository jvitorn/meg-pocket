# meg-pocket

Aplicação Next.js com Prisma e PostgreSQL.

## Sobre o projeto

`meg-pocket` é a aplicação web de apoio ao universo de rpg `Magos & Grimórios`. O projeto concentra o fluxo principal de autenticação, criação de personagens, gerenciamento de fichas e persistência dos dados usados pela experiência do jogo como um facilitador do proprio sistema.

Hoje a aplicação roda com:

- `Next.js` no frontend e nas rotas server-side.
- `Prisma` como camada de acesso ao banco.
- `PostgreSQL` como banco principal.
- `NextAuth` para autenticação.

O projeto foi organizado para suportar dois contextos de banco:

- desenvolvimento local com PostgreSQL em Docker, para implementar e testar com segurança;
- ambiente remoto no Supabase, tratado neste repositório como `prod`.

Na prática, o fluxo recomendado é desenvolver e validar primeiro no banco local, e só depois trocar o snapshot ativo para o ambiente remoto quando for necessário conferir comportamento, dados ou compatibilidade com a base hospedada.

## Visão geral

O projeto trabalha com dois snapshots de ambiente:

- `.env.docker-local`: snapshot do banco local em Docker.
- `.env.prod`: snapshot do ambiente remoto no Supabase.

O arquivo ativo da aplicação é sempre `.env.local`. Os comandos `env:local` e `env:prod` apenas trocam o conteúdo desse arquivo ativo.

## Setup local

1. Instale as dependências:

```bash
npm install
```

2. Crie o snapshot local:

```bash
cp .env.example .env.docker-local
```

3. Ative o ambiente local:

```bash
npm run env:local
```

4. Suba o PostgreSQL:

```bash
npm run db:up
```

5. Aplique as migrations:

```bash
npm run db:setup
```

6. Se quiser popular o banco local:

```bash
npm run db:seed
```

7. Inicie a aplicação:

```bash
npm run dev
```

O banco local fica disponível em `localhost:5433`.

## Produção

Como neste fluxo `homolog == prod`, o snapshot remoto usa a nomenclatura de produção.

1. Crie o snapshot remoto:

```bash
cp .env.prod.example .env.prod
```

2. Preencha as credenciais reais do Supabase.

3. Ative o ambiente remoto:

```bash
npm run env:prod
```

4. Rode os comandos de banco necessários:

```bash
npm run db:setup
npm run db:seed
```

Para voltar ao ambiente local:

```bash
npm run env:local
```

## Scripts

- `npm run dev`: inicia o servidor Next.js em desenvolvimento.
- `npm run build`: gera o Prisma Client e cria o build de produção do Next.js.
- `npm run start`: sobe a aplicação já buildada.
- `npm run lint`: executa o lint do projeto.
- `npm run test`: executa os testes unitários com Vitest.
- `npm run test:watch`: inicia os testes unitários em modo observação.
- `npm run test:e2e:install`: instala o navegador Chromium usado pelo Playwright.
- `npm run test:e2e`: executa os testes automatizados end-to-end com Playwright.
- `npm run test:all`: executa a suíte unitária e a suíte automatizada em sequência.
- `npm run db:up`: sobe o container PostgreSQL local com Docker Compose.
- `npm run db:down`: derruba o ambiente Docker local.
- `npm run db:logs`: acompanha os logs do PostgreSQL local.
- `npm run db:generate`: gera o Prisma Client.
- `npm run db:migrate`: cria e aplica migrations no banco ativo.
- `npm run db:deploy`: aplica migrations existentes no banco ativo.
- `npm run db:setup`: atalho para `db:generate` + `db:deploy`.
- `npm run db:seed`: executa o seed SQL no banco ativo.
- `npm run env:local`: ativa o snapshot local em `.env.local`.
- `npm run env:prod`: ativa o snapshot remoto em `.env.local`.
- `npm run postinstall`: regenera automaticamente o Prisma Client após instalar dependências.

## Seeds

Os arquivos de seed estão em `prisma/seeds/generated`.

- `index.sql` orquestra a execução na ordem correta.
- O seed faz `TRUNCATE` das tabelas alvo antes de inserir os dados.
- A mensagem final `Seed plantada com sucesso.` confirma a execução completa.

## Arquivos de ambiente

- `.env.example`: template do snapshot local.
- `.env.prod.example`: template do snapshot remoto.
- `.env.local`: arquivo ativo lido pelo Next.js e pelo Prisma.
- `.env.docker-local`: snapshot local persistido fora do fluxo de produção.
- `.env.prod`: snapshot remoto persistido fora do fluxo local.

## Observações

- O banco local sobe vazio; o schema entra via migrations e os dados via seed.
- `db:setup` e `db:seed` sempre operam no ambiente atualmente ativo em `.env.local`.
- O projeto usa PostgreSQL local no Docker e Supabase como ambiente remoto.

## Testes

O projeto agora possui duas camadas de validação:

- testes unitários e de componente com `Vitest` + `Testing Library`;
- smoke tests automatizados com `Playwright` para fluxos públicos.

Estrutura recomendada:

- `tests/unit/components`: testes de componentes React.
- `tests/unit/lib`: regras de negócio e utilitários puros.
- `tests/unit/app`: rotas e comportamentos server-side.
- `tests/unit/services`: services cliente e integrações locais.
- `tests/e2e`: jornadas automatizadas no navegador.

Fluxo recomendado:

1. Rode `npm run test` durante o desenvolvimento para validar regras de negócio e componentes.
2. Instale o navegador do Playwright uma vez com `npm run test:e2e:install`.
3. Rode `npm run test:e2e` para validar os fluxos públicos no navegador.
4. Use `npm run test:all` antes de abrir PRs ou publicar mudanças relevantes.
