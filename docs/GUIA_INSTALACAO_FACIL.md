# Instalação Fácil do M&G Pocket

Este guia é para quem quer rodar o M&G Pocket no próprio computador sem configurar ambiente de programação.

Você não precisa saber programar para seguir este passo a passo.

## O Que Será Instalado

Você instalará o Docker Desktop, que permite rodar o projeto em um ambiente pronto e isolado.

O Docker vai cuidar de preparar:

- o site do M&G Pocket;
- o banco de dados local;
- os arquivos locais necessários;
- os serviços internos do projeto.

## O Que É Docker

Docker é um aplicativo que roda sistemas dentro de ambientes isolados chamados containers.

Na prática, isso permite que o M&G Pocket funcione no seu computador sem que você precise instalar manualmente várias ferramentas técnicas.

Você não precisa instalar Node.js, npm, PostgreSQL ou ferramentas de desenvolvimento diretamente no computador. O projeto prepara tudo isso dentro do Docker.

## O Que Você Precisa Instalar

Obrigatório:

- Docker Desktop.

Opcional:

- Git.

Se o Git estiver instalado, o instalador baixa o projeto com `git clone`. Se o Git não estiver instalado, o instalador tenta baixar o projeto por ZIP da release `v1.0.0`.

Quando a versão da release mudar, a URL do ZIP nos instaladores também precisa ser atualizada.

## Onde O Projeto Será Instalado

O projeto será instalado dentro da pasta onde você executar o instalador.

Exemplo:

Se você colocar o instalador na Área de Trabalho e executar por lá, ele criará uma pasta chamada `meg-pocket` dentro da Área de Trabalho.

## Primeira Instalação

Na primeira instalação, o instalador irá:

- baixar o projeto;
- baixar as imagens necessárias do Docker;
- criar o banco de dados local;
- criar as tabelas;
- cadastrar os dados básicos do RPG, como raças, classes, magias e itens;
- iniciar o sistema.

O seed inicial roda apenas na instalação inicial. Depois disso, use somente os scripts de iniciar e parar.

## Instalação No Windows

1. Instale o Docker Desktop.
2. Abra o Docker Desktop.
3. Aguarde o Docker Desktop terminar de iniciar.
4. Baixe o arquivo `instalar-mg-pocket-windows.bat`.
5. Coloque o arquivo na pasta onde deseja instalar o projeto.
6. Dê dois cliques no instalador.
7. Aguarde a instalação terminar.
8. Acesse:

```text
http://localhost:3000
```

Se o Windows mostrar um alerta de segurança por ser um arquivo `.bat`, isso significa que ele reconheceu o arquivo como um script. O arquivo serve para automatizar a instalação do projeto com Docker.

## Instalação No Linux/macOS

1. Instale o Docker Desktop ou Docker Engine.
2. Baixe o arquivo `instalar-mg-pocket-linux-mac.sh`.
3. Coloque o arquivo na pasta onde deseja instalar o projeto.
4. Abra o terminal nessa pasta.
5. Dê permissão de execução:

```bash
chmod +x instalar-mg-pocket-linux-mac.sh
```

6. Rode o instalador:

```bash
./instalar-mg-pocket-linux-mac.sh
```

7. Aguarde a instalação terminar.
8. Acesse:

```text
http://localhost:3000
```

Se o Git não estiver instalado, o instalador usará o fallback por ZIP. Nesse caso, o computador precisa ter `curl` ou `wget`, além de `unzip`. Se algum deles estiver faltando, o instalador mostrará uma mensagem explicando o que instalar.

## Uso Normal Depois Da Instalação

Depois da primeira instalação, não rode o instalador novamente para usar o sistema.

Use o script de iniciar:

Windows:

```text
meg-pocket\installers\iniciar-mg-pocket-windows.bat
```

Linux/macOS:

```bash
./meg-pocket/installers/iniciar-mg-pocket-linux-mac.sh
```

Depois de iniciar, acesse:

```text
http://localhost:3000
```

## Como Parar

Use o script de parar:

Windows:

```text
meg-pocket\installers\parar-mg-pocket-windows.bat
```

Linux/macOS:

```bash
./meg-pocket/installers/parar-mg-pocket-linux-mac.sh
```

Parar o projeto não apaga seus dados locais.

Não use comandos que apagam volumes do Docker, como `docker compose down -v`, a menos que você queira apagar o banco local.

## Compartilhamento Online Opcional

O mestre pode compartilhar a sessão com os jogadores usando Cloudflare Quick Tunnel.

Isso cria um link público temporário apontando apenas para:

```text
http://localhost:3000
```

O túnel nunca inicia automaticamente. O mestre precisa ativar manualmente.

Para usar essa opção, instale o `cloudflared` seguindo as instruções oficiais da Cloudflare para o seu sistema operacional. A instalação principal do M&G Pocket não depende dele.

Depois de instalar o `cloudflared`, use:

Windows:

```text
meg-pocket\installers\iniciar-compartilhamento-online-windows.bat
```

Linux/macOS:

```bash
./meg-pocket/installers/iniciar-compartilhamento-online-linux-mac.sh
```

O comando técnico usado por esses scripts é:

```bash
cloudflared tunnel --url http://localhost:3000
```

Para desligar o compartilhamento:

Windows:

```text
meg-pocket\installers\parar-compartilhamento-online-windows.bat
```

Linux/macOS:

```bash
./meg-pocket/installers/parar-compartilhamento-online-linux-mac.sh
```

Ao desligar o túnel, o link temporário deixa de funcionar. Ao desligar o projeto, os jogadores também deixam de acessar a sessão.

## Segurança Do Link Público

O link público deve ser enviado apenas para pessoas da mesa.

Qualquer pessoa com o link pode tentar acessar o sistema enquanto o túnel estiver ligado. Use login dentro do sistema e desligue o compartilhamento quando a sessão acabar.

Os scripts expõem somente a aplicação web em `localhost:3000`.

Eles não expõem:

- banco de dados;
- Adminer;
- storage interno;
- portas administrativas.

Uma melhoria futura possível é adicionar um código temporário de sessão, como `NEBLINA-742`, antes da tela de login. Essa camada não faz parte da versão atual.

## Problemas Comuns

Se o instalador disser que o Docker não foi encontrado, instale o Docker Desktop e abra o aplicativo.

Se o instalador disser que o Docker não está rodando, abra o Docker Desktop e aguarde alguns instantes.

Se a página não abrir em `http://localhost:3000`, rode o script de iniciar novamente e aguarde alguns segundos.

Se a primeira instalação parar durante o download, verifique sua conexão e rode o instalador novamente.

Se estiver usando Linux/macOS e o fallback por ZIP falhar, instale `curl` ou `wget` e `unzip`.

Se quiser apagar tudo e começar do zero, faça backup antes. Apagar volumes do Docker pode apagar o banco local.

## Guia Fácil E Guia De Desenvolvimento

Este guia é para uso local simples com Docker.

O guia de desenvolvimento é diferente. Ele é voltado para quem vai programar no projeto, rodar testes, alterar código e trabalhar com Node.js, npm e Prisma fora do container.

Para desenvolvimento, use:

```text
docs/development.md
```
