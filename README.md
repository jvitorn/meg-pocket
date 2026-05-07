# Meg Pocket

Meg Pocket é uma aplicação web open source para apoiar mesas e campanhas do sistema de RPG **Magos & Grimórios**.

O projeto reúne criação de contas, fichas de personagens, campanhas, anotações, inventário, magias, perícias e consultas de classes e raças em uma experiência pensada para jogadores e mestres.

## Status

Este repositório está em fase de refinamento para uma versão 1.0 funcional. A base atual já cobre os principais fluxos de ficha e campanha, com foco em polimento visual, consistência de tema, documentação e estabilidade.

## Principais Recursos

- App `Next.js` com App Router.
- Autenticação com `NextAuth`, credenciais e Google.
- Banco `PostgreSQL` via `Prisma`.
- Ambiente local com Docker Compose.
- Upload local de imagens em desenvolvimento e suporte a storage S3 compatível em produção.
- Seeds com dados estruturais e fictícios do RPG.
- Testes unitários com `Vitest` e e2e com `Playwright`.

## Documentação

A documentação de uso, ambiente e políticas fica concentrada em `docs/`:

- [Guia de instalação fácil](./docs/GUIA_INSTALACAO_FACIL.md)
- [Guia de desenvolvimento](./docs/development.md)
- [Termos de Uso](./docs/TERMS.md)
- [Política de Privacidade](./docs/PRIVACY.md)
- [Licença de Conteúdo](./docs/CONTENT_LICENSE.md)

## Instalação Fácil

Para rodar o M&G Pocket localmente sem instalar Node.js, npm ou PostgreSQL no computador, use o guia fácil com Docker:

```text
docs/GUIA_INSTALACAO_FACIL.md
```

Os scripts ficam em:

```text
installers/
```

## Início Rápido Para Desenvolvimento

Versão recomendada:

```text
Node.js 22.12.0
npm 10 ou superior
```

```bash
npm install
cp .env.example .env.docker-local
npm run env:local
npm run db:up
npm run db:setup
npm run db:seed
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Licenças

Este repositório separa código-fonte e conteúdo narrativo/estrutural.

- **Código-fonte:** MIT. Veja [LICENSE](./LICENSE).
- **Conteúdo e regras homebrew:** CC BY-NC 4.0, salvo indicação em contrário. Veja [docs/CONTENT_LICENSE.md](./docs/CONTENT_LICENSE.md).

Na prática, você pode usar, estudar, modificar e criar forks do código conforme a licença MIT. O conteúdo de RPG pode ser usado e adaptado para mesas, campanhas, forks e bases próprias não comerciais, mantendo atribuição ao projeto original.

O projeto foi pensado para ser simples de modificar: você pode trocar seeds, banco de dados, classes, raças, magias, itens e campanhas para rodar sua própria mesa ou seu próprio cenário.

## Estrutura Principal

```text
src/app                  Rotas e páginas Next.js
src/components           Componentes de UI e domínio
src/lib                  Regras, auth, prisma e utilitários
src/services             Chamadas client-side para APIs
prisma/schema.prisma     Schema do banco
prisma/migrations        Migrations Prisma
prisma/seeds/generated   Seeds SQL gerados
tests/unit               Testes unitários
tests/e2e                Testes Playwright
scripts                  Scripts de ambiente, seed e e2e
docs                     Documentação de uso, legal e operação
```

## Reportar Problemas

Abra issues, sugestões ou discussões no repositório oficial:

https://github.com/jvitorn/meg-pocket

Meg Pocket é uma ferramenta de RPG fornecida no estado atual, sem garantias. Use com cuidado ao rodar migrations, seeds e comandos de banco de dados.
