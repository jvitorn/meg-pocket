# Guia do Launcher — M&G Pocket

O M&G Pocket Launcher é a forma recomendada de preparar, abrir, parar, reparar e fazer backup do M&G Pocket localmente.

## Primeiros Passos

1. Abra o launcher.
2. Clique em **Preparar Ambiente**.
3. Aguarde a preparação terminar.
4. Clique em **Abrir M&G Pocket**.
5. Ao final da sessão, clique em **Parar**.

Na primeira abertura, o launcher mostra a tela **Primeiros passos**. Você pode marcar **Não mostrar novamente** e reabrir depois em **Ajuda > Primeiros passos**.

## Modo Padrão

O modo padrão é **Baixar versão pronta**.

Ele é recomendado porque baixa uma versão já preparada do M&G Pocket e evita compilar o sistema no seu computador.

## Opções Avançadas

Em **Opções avançadas**, existe o modo **Construir localmente**.

Use apenas para desenvolvimento ou reparo avançado. Essa opção pode demorar bastante em computadores mais fracos.

## Ajuda

A área **Ajuda** tem:

- Primeiros passos
- Problemas comuns
- Backup e restauração
- Detalhes técnicos
- Sobre o M&G Pocket

## Diagnóstico

A primeira visão do diagnóstico usa textos simples:

- Docker: OK, precisa abrir ou não encontrado
- Projeto: preparado ou não preparado
- Banco de dados: tudo pronto, aguardando ou precisa de atenção
- Aplicativo: tudo pronto, aguardando ou precisa de atenção
- Acesso local: tudo pronto, aguardando ou precisa de atenção
- Backup: disponível ou não disponível

Os detalhes técnicos ficam escondidos por padrão e aparecem ao expandir **Detalhes técnicos**.

## Backup E Restauração

O backup salva apenas os dados do banco do M&G Pocket.

Nome esperado:

```text
meg-pocket-db-YYYY-MM-DD-HHmm.sql
```

Ao restaurar, o launcher mostra uma confirmação porque a restauração substitui os dados atuais pelos dados salvos naquela cópia.

## Reparar Instalação

No modo padrão, **Reparar instalação** baixa novamente a versão pronta e reinicia os serviços locais.

No modo avançado, **Reconstruir localmente** recompila o M&G Pocket neste computador.

## Abrir No Navegador

Ao clicar em **Iniciar M&G Pocket**, o launcher aguarda o sistema ficar online e abre o navegador automaticamente.

O botão **Abrir M&G Pocket** fica pronto para uso quando o sistema local responder.
