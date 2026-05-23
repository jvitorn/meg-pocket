# Guia de Instalação Fácil — M&G Pocket

Este guia é para quem quer usar o M&G Pocket no próprio computador sem configurar ambiente de programação.

## Caminho Recomendado: Launcher Visual

1. Baixe o M&G Pocket Launcher na página de Releases.
2. Abra o launcher.
3. Clique em **Preparar Ambiente**.
4. Aguarde enquanto o launcher baixa a versão pronta do M&G Pocket e configura os dados iniciais.
5. Quando aparecer **Ambiente pronto**, clique em **Abrir M&G Pocket**.
6. Ao terminar de usar, clique em **Parar**.

O launcher evita compilar o sistema no seu computador. Isso deixa a preparação mais leve em máquinas simples.

## Linux Com Download Rápido

```bash
curl -fsSL https://raw.githubusercontent.com/jvitorn/meg-pocket/master/installers/bootstrap/linux.sh | bash
```

Esse comando baixa e abre o launcher. A preparação do M&G Pocket acontece dentro da interface visual.

## Windows

Baixe o instalador `.exe` do M&G Pocket Launcher pela página de Releases.

No Windows, mantenha o Docker Desktop instalado e aberto. Se o launcher oferecer instalação guiada de dependências, confirme apenas se quiser que ele prepare essas ferramentas automaticamente.

## O Que Cada Botão Faz

**Preparar Ambiente** prepara o M&G Pocket neste computador.

**Iniciar M&G Pocket** liga os serviços locais e abre o sistema no navegador quando estiver pronto.

**Abrir M&G Pocket** abre o sistema no navegador.

**Parar** encerra os serviços locais quando você terminar de usar.

**Backup** salva uma cópia dos dados do banco.

**Restaurar backup** recupera os dados a partir de uma cópia anterior.

**Reparar instalação** baixa novamente a versão pronta e tenta corrigir uma instalação com problema.

**Diagnóstico** ajuda a entender o que aconteceu se algo não abrir corretamente.

## Backups

Os backups ficam, por padrão, em:

```text
~/Documentos/MG Pocket/backups
```

Se essa pasta não existir, o launcher tenta:

```text
~/Documents/MG Pocket/backups
~/.local/share/mg-pocket/backups
```

No Windows, os backups ficam em:

```text
Documentos/MG Pocket/backups
```

O backup salva apenas os dados do banco do M&G Pocket.

## Se Algo Não Abrir

1. Aguarde alguns segundos e clique em **Abrir M&G Pocket**.
2. Se ainda não abrir, clique em **Iniciar M&G Pocket**.
3. Se continuar com problema, clique em **Reparar instalação**.
4. Use **Ajuda > Detalhes técnicos** somente se precisar investigar o erro.
