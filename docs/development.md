# Guia de Desenvolvimento

Este guia concentra as instruções para rodar, testar e operar o Meg Pocket em ambiente local.

## Requisitos

- Node.js `22.12.0`.
- npm `10` ou superior.
- Docker e Docker Compose.
- PostgreSQL local via Docker, usando a porta `5433`.
- Playwright Chromium, caso rode os testes e2e.

O repositório inclui `.nvmrc` e `.node-version` para fixar a versão recomendada do Node.js.

## Instalando Node.js e npm

O npm vem junto com o Node.js. Você não precisa instalar o npm separadamente na maioria dos casos.

### Opção recomendada para Linux/macOS: nvm

`nvm` é um gerenciador de versões do Node.js. Ele facilita alternar entre versões sem mexer no sistema inteiro.

1. Instale o `nvm` seguindo o guia oficial:

```text
https://github.com/nvm-sh/nvm#installing-and-updating
```

2. Feche e abra o terminal.

3. Na pasta do projeto, rode:

```bash
nvm install
nvm use
```

Esses comandos leem o arquivo `.nvmrc` e ativam o Node.js `22.12.0`.

4. Confirme as versões:

```bash
node -v
npm -v
```

### Opção simples: instalador oficial

Se você não quiser usar `nvm`, instale o Node.js pelo site oficial:

```text
https://nodejs.org/
```

Escolha a versão LTS 22.x, abra um novo terminal e confirme:

```bash
node -v
npm -v
```

### Windows

No Windows, a forma mais simples é instalar pelo site oficial do Node.js. Se quiser gerenciar versões, use `nvm-windows`:

```text
https://github.com/coreybutler/nvm-windows
```

Depois de instalar, abra um terminal novo dentro da pasta do projeto e rode os comandos de verificação:

```bash
node -v
npm -v
```

## Como Rodar Localmente

1. Confirme que está usando a versão correta do Node.js:

```bash
node -v
```

O resultado esperado começa com:

```text
v22.12.0
```

2. Instale as dependências:

```bash
npm install
```

3. Crie ou atualize o snapshot local de ambiente:

```bash
cp .env.example .env.docker-local
```

4. Ative o ambiente local:

```bash
npm run env:local
```

5. Suba o PostgreSQL local:

```bash
npm run db:up
```

Esse comando sobe:

- `postgres` na porta `5433`;
- `storage` local na porta `9323`;
- `adminer` na porta `8081`.

6. Aplique as migrations e gere o Prisma Client:

```bash
npm run db:setup
```

7. Popule o banco local com os dados estruturais do RPG:

```bash
npm run db:seed
```

8. Inicie a aplicação:

```bash
npm run dev
```

9. Acesse:

```text
http://localhost:3000
```

## Infra Local e Acessos

### PostgreSQL

- Host no seu computador: `localhost`
- Porta: `5433`
- Database: `meg_pocket`
- Usuário: `meg`
- Senha: `meg`

String de conexão local:

```text
postgresql://meg:meg@localhost:5433/meg_pocket
```

### Adminer

Para acessar o banco pelo navegador:

```text
http://localhost:8081
```

Preencha assim na tela inicial do Adminer:

- Sistema: `PostgreSQL`
- Servidor: `postgres`
- Usuário: `meg`
- Senha: `meg`
- Base de dados: `meg_pocket`

Observações:

- dentro do Docker, o hostname correto é `postgres`;
- se você tentar `localhost` dentro do Adminer, a conexão pode falhar.

### Storage Local de Imagens

As imagens enviadas no fluxo de ficha são salvas localmente e servidas por um container nginx.

- URL base pública: `http://localhost:9323`
- Pasta local: `storage/local/public`

Exemplo de arquivo servido:

```text
http://localhost:9323/personagens/personagens/2026/04/arquivo.webp
```

Essa pasta está no `.gitignore` e existe apenas para desenvolvimento local.

### Storage de Produção

Em produção, o upload de imagem usa um bucket S3 compatível via `@aws-sdk/client-s3`.

Variáveis esperadas:

- `STORAGE_DRIVER="s3"`
- `STORAGE_BUCKET`
- `STORAGE_ENDPOINT`
- `STORAGE_REGION`
- `STORAGE_PUBLIC_URL`
- `STORAGE_ACCESS_ID`
- `STORAGE_ACCESS_KEY`
- `STORAGE_FORCE_PATH_STYLE`

Observações:

- `STORAGE_PUBLIC_URL` é a base pública usada para montar a URL final da imagem;
- `STORAGE_FORCE_PATH_STYLE="true"` costuma ser o ajuste certo para provedores S3 compatíveis;
- o projeto ainda aceita o alias legado `STIRAGE_ACCESS_ID`, mas o nome correto é `STORAGE_ACCESS_ID`.

## Seeds e Dados Fictícios

Os seeds incluem dados estruturais e fictícios para funcionamento do sistema de RPG:

- classes;
- raças;
- magias;
- itens;
- campanhas;
- personagens de exemplo;
- usuários locais de teste.

Esses dados existem para desenvolvimento, demonstração e uso em mesas próprias. Eles não representam pessoas reais.

Os comandos de seed podem apagar dados existentes nas tabelas alvo antes de recriar os dados. Use seeds apenas em ambientes locais ou de desenvolvimento.

## Ambientes

O arquivo ativo da aplicação é `.env.local`.

Snapshots usados pelo projeto:

- `.env.example`: template local.
- `.env.docker-local`: snapshot local persistido.
- `.env.prod.example`: template remoto.
- `.env.prod`: snapshot remoto, quando existir.
- `.env.local`: ambiente ativo lido pela aplicação.

Comandos:

```bash
npm run env:local
npm run env:prod
```

Use `env:prod` com cuidado. Seeds e comandos de banco podem ser destrutivos.

## Proteção Contra Seed em Banco Errado

Por segurança, o script de seed bloqueia execução em bancos que não sejam locais.

Por padrão, seeds só podem rodar quando `DATABASE_URL` ou `DIRECT_URL` apontam para:

- `localhost`
- `127.0.0.1`
- `::1`

Para um override consciente, é necessário definir:

```bash
ALLOW_NON_LOCAL_DB_SEED=1
```

Esse override deve ser usado com extrema cautela.

## Testes

O projeto possui duas camadas principais:

- testes unitários e de componentes com `Vitest`;
- testes end-to-end com `Playwright`.

Instale o navegador do Playwright uma vez:

```bash
npm run test:e2e:install
```

Rode os unitários:

```bash
npm run test
```

Rode os e2e:

```bash
npm run test:e2e
```

Rode tudo:

```bash
npm run test:all
```

Os e2e sempre forçam ambiente local, reseedam o banco local antes e depois da suíte, e não reutilizam servidor existente durante a execução segura.

## Scripts Disponíveis

- `npm run dev`: inicia o servidor Next.js em desenvolvimento.
- `npm run build`: gera o Prisma Client e cria o build de produção.
- `npm run start`: inicia a aplicação buildada.
- `npm run lint`: executa ESLint.
- `npm run test`: executa testes unitários.
- `npm run test:watch`: executa Vitest em modo observação.
- `npm run test:e2e:install`: instala o Chromium do Playwright.
- `npm run test:e2e`: executa e2e com ambiente local protegido.
- `npm run test:all`: executa unitários e e2e.
- `npm run db:up`: sobe PostgreSQL, storage local e Adminer.
- `npm run db:down`: derruba o Docker Compose local.
- `npm run db:logs`: mostra logs de PostgreSQL, storage e Adminer.
- `npm run db:generate`: gera Prisma Client.
- `npm run db:migrate`: cria ou aplica migrations no banco ativo.
- `npm run db:deploy`: aplica migrations existentes no banco ativo.
- `npm run db:setup`: roda `db:generate` e `db:deploy`.
- `npm run db:seed`: executa seed SQL no banco ativo, com proteção contra banco não local.
- `npm run env:local`: copia snapshot local para `.env.local`.
- `npm run env:prod`: copia snapshot remoto para `.env.local`.
