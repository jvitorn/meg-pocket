# Seeds

Os seeds deste projeto contêm dados estruturais e fictícios necessários para demonstrar e usar o sistema de RPG localmente.

Eles incluem classes, raças, campanhas, magias, itens, personagens de exemplo e usuários locais de teste.

Esses dados não representam pessoas reais.

## Aviso Importante

Os comandos de seed podem apagar dados existentes nas tabelas alvo antes de inserir os dados novamente.

Use seeds apenas em ambientes locais ou de desenvolvimento.

O script `run-sql-file.mjs` bloqueia seeds contra bancos não locais por padrão. Para executar uma seed fora de ambiente local, é necessário passar a flag explícita `--prod` ou usar `npm run db:seed:prod`.

Antes de rodar qualquer seed, confirme que `.env.local` aponta para o banco correto.
