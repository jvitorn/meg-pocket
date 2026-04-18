# Meg Pocket

Meg Pocket e uma aplicacao web open source de apoio ao sistema de RPG **Magos & Grimorios**.

O projeto ajuda jogadores e mesas a criar contas, montar fichas, consultar classes/racas/campanhas, gerenciar recursos do personagem, anotacoes, magias, inventario e outros dados estruturais do jogo.

## O Que Este Projeto Inclui

- Aplicacao `Next.js` com App Router.
- Autenticacao com `NextAuth`, login por credenciais e Google.
- Banco `PostgreSQL` acessado via `Prisma`.
- Ambiente local com Docker Compose.
- Seeds com dados estruturais e ficticios do RPG.
- Testes unitarios com `Vitest`.
- Testes e2e com `Playwright`.
- Fluxos de ficha, campanha, inventario, anotacoes e recuperacao de senha.

## Licencas

Este repositorio separa codigo-fonte e conteudo narrativo/estrutural.

- **Codigo-fonte:** licenciado sob MIT. Veja [LICENSE](./LICENSE).
- **Conteudo de RPG:** licenciado sob CC BY-NC 4.0, salvo indicacao em contrario. Veja [CONTENT_LICENSE.md](./CONTENT_LICENSE.md).

Na pratica:

- voce pode usar, estudar, modificar e criar forks do codigo conforme a licenca MIT;
- voce pode usar e adaptar o conteudo de RPG para mesas, campanhas e forks nao comerciais, mantendo atribuicao;
- voce nao pode usar comercialmente o conteudo narrativo/estrutural de Magos & Grimorios incluido neste repositorio sem autorizacao previa.

Assets de terceiros, imagens, fontes, icones ou marcas podem possuir licencas proprias.

## Aviso Sobre Seeds e Dados Ficticios

Este projeto inclui seeds com dados estruturais e ficticios para funcionamento do sistema de RPG, incluindo:

- classes;
- racas;
- magias;
- itens;
- campanhas;
- personagens de exemplo;
- usuarios locais de teste.

Esses dados existem para desenvolvimento, demonstracao e uso em mesas/campanhas proprias. Eles nao representam pessoas reais.

Os comandos de seed podem apagar dados existentes nas tabelas alvo antes de recriar os dados. Use seeds apenas em ambientes locais ou de desenvolvimento.

## Privacidade e Uso Local

Ao executar este projeto localmente, em um fork ou em uma instancia propria, voce e responsavel pelos dados inseridos nessa instalacao.

O mantenedor original do projeto nao tem acesso, controle ou responsabilidade sobre dados cadastrados em instalacoes locais, forks ou deploys de terceiros.

Evite inserir dados pessoais sensiveis ou informacoes reais de terceiros em campos livres como nomes, descricoes, anotacoes e URLs de imagem.

Caso voce hospede uma instancia para outras pessoas, e sua responsabilidade informar os usuarios sobre o tratamento de dados pessoais, definir uma politica de privacidade adequada e cumprir a legislacao aplicavel, incluindo a LGPD quando aplicavel.

Consulte tambem:

- [Politica de Privacidade](./PRIVACY.md)
- [Termos de Uso](./TERMS.md)

## Requisitos

- Node.js compativel com o projeto.
- npm.
- Docker e Docker Compose.
- PostgreSQL local via Docker, usando a porta `5433`.
- Playwright Chromium, caso rode os e2e.

## Como Rodar Localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie ou atualize o snapshot local de ambiente:

```bash
cp .env.example .env.docker-local
```

3. Ative o ambiente local:

```bash
npm run env:local
```

4. Suba o PostgreSQL local:

```bash
npm run db:up
```

5. Aplique as migrations e gere o Prisma Client:

```bash
npm run db:setup
```

6. Popule o banco local com os dados estruturais do RPG:

```bash
npm run db:seed
```

7. Inicie a aplicacao:

```bash
npm run dev
```

8. Acesse:

```text
http://localhost:3000
```

O banco local fica disponivel em:

```text
postgresql://meg:meg@localhost:5433/meg_pocket
```

## Usuarios Locais de Seed

Os seeds incluem usuarios ficticios para teste local. Eles existem apenas para facilitar desenvolvimento e testes automatizados.

Consulte os arquivos em `prisma/seeds/generated` para ver os dados exatos usados no ambiente local.

## Ambientes

O arquivo ativo da aplicacao e `.env.local`.

Snapshots usados pelo projeto:

- `.env.example`: template local.
- `.env.docker-local`: snapshot local persistido.
- `.env.prod.example`: template remoto.
- `.env.prod`: snapshot remoto, quando existir.
- `.env.local`: ambiente ativo lido pela aplicacao.

Comandos:

```bash
npm run env:local
npm run env:prod
```

Use `env:prod` com cuidado. Seeds e comandos de banco podem ser destrutivos.

## Protecao Contra Seed em Banco Errado

Por seguranca, o script de seed bloqueia execucao em bancos que nao sejam locais.

Por padrao, seeds so podem rodar quando `DATABASE_URL` ou `DIRECT_URL` apontam para:

- `localhost`
- `127.0.0.1`
- `::1`

Para um override consciente, e necessario definir:

```bash
ALLOW_NON_LOCAL_DB_SEED=1
```

Esse override deve ser usado com extrema cautela.

## Testes

O projeto possui duas camadas principais:

- testes unitarios e de componentes com `Vitest`;
- testes end-to-end com `Playwright`.

Instale o navegador do Playwright uma vez:

```bash
npm run test:e2e:install
```

Rode os unitarios:

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

Os e2e sempre forcam ambiente local, reseedam o banco local antes e depois da suite, e nao reutilizam servidor existente durante a execucao segura.

## Scripts Disponiveis

- `npm run dev`: inicia o servidor Next.js em desenvolvimento.
- `npm run build`: gera o Prisma Client e cria o build de producao.
- `npm run start`: inicia a aplicacao buildada.
- `npm run lint`: executa ESLint.
- `npm run test`: executa testes unitarios.
- `npm run test:watch`: executa Vitest em modo observacao.
- `npm run test:e2e:install`: instala o Chromium do Playwright.
- `npm run test:e2e`: executa e2e com ambiente local protegido.
- `npm run test:all`: executa unitarios e e2e.
- `npm run db:up`: sobe o PostgreSQL local.
- `npm run db:down`: derruba o Docker Compose local.
- `npm run db:logs`: mostra logs do PostgreSQL local.
- `npm run db:generate`: gera Prisma Client.
- `npm run db:migrate`: cria/aplica migrations no banco ativo.
- `npm run db:deploy`: aplica migrations existentes no banco ativo.
- `npm run db:setup`: roda `db:generate` e `db:deploy`.
- `npm run db:seed`: executa seed SQL no banco ativo, com protecao contra banco nao local.
- `npm run env:local`: copia snapshot local para `.env.local`.
- `npm run env:prod`: copia snapshot remoto para `.env.local`.

## Estrutura Principal

```text
src/app                  Rotas e paginas Next.js
src/components           Componentes de UI e dominio
src/lib                  Regras, auth, prisma e utilitarios
src/services             Chamadas client-side para APIs
prisma/schema.prisma     Schema do banco
prisma/migrations        Migrations Prisma
prisma/seeds/generated   Seeds SQL gerados
tests/unit               Testes unitarios
tests/e2e                Testes Playwright
scripts                  Scripts de ambiente, seed e e2e
```

## Reportar Problemas

Abra issues, sugestoes ou discussoes no repositorio oficial:

https://github.com/jvitorn/meg-pocket

## Aviso Final

Meg Pocket e uma ferramenta de RPG fornecida no estado atual, sem garantias.

Use com cuidado ao rodar migrations, seeds e comandos de banco de dados.
