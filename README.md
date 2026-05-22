# M&G Pocket

M&G Pocket é uma aplicação web open source para apoiar mesas e campanhas do sistema de RPG **Magos & Grimórios**.

O projeto reúne contas, fichas de personagens, campanhas, anotações, inventário, magias, perícias e consultas de classes e raças em uma experiência pensada para jogadores e mestres.

## Instalação Recomendada

A forma mais simples de usar no próprio computador é pelo **M&G Pocket Launcher**.

1. Baixe o launcher na página de Releases.
2. Abra o launcher.
3. Clique em **Preparar Ambiente**.
4. Aguarde a preparação terminar.
5. Clique em **Abrir M&G Pocket**.

O launcher baixa uma versão pronta do M&G Pocket, configura os dados iniciais e abre o sistema no navegador. Você não precisa compilar o sistema no seu computador.

Linux, download rápido:

```bash
curl -fsSL https://raw.githubusercontent.com/jvitorn/meg-pocket/master/installers/bootstrap/linux.sh | bash
```

## Documentação

Para usuários:

- [Guia de instalação fácil](./docs/GUIA_INSTALACAO_FACIL.md)
- [Guia do launcher](./docs/GUIA_LAUNCHER.md)

Para instalação manual e desenvolvimento:

- [Guia de instalação manual](./docs/GUIA_INSTALACAO_MANUAL.md)
- [Guia técnico Docker](./docs/GUIA_TECNICO_DOCKER.md)
- [Guia de desenvolvimento](./docs/development.md)
- [Guia de build do launcher](./docs/GUIA_LAUNCHER_BUILD.md)

Políticas:

- [Termos de Uso](./docs/TERMS.md)
- [Política de Privacidade](./docs/PRIVACY.md)
- [Licença de Conteúdo](./docs/CONTENT_LICENSE.md)

## Desenvolvimento

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

- **Código-fonte:** MIT. Veja [LICENSE](./LICENSE).
- **Conteúdo e regras homebrew:** CC BY-NC 4.0, salvo indicação em contrário. Veja [docs/CONTENT_LICENSE.md](./docs/CONTENT_LICENSE.md).

Você pode usar, estudar, modificar e criar forks do código conforme a licença MIT. O conteúdo de RPG pode ser usado e adaptado para mesas, campanhas, forks e bases próprias não comerciais, mantendo atribuição ao projeto original.

## Reportar Problemas

Abra issues, sugestões ou discussões no repositório oficial:

https://github.com/jvitorn/meg-pocket
