# Seeds

Os seeds deste projeto contem dados estruturais e ficticios necessarios para demonstrar e usar o sistema de RPG localmente.

Eles incluem classes, racas, campanhas, magias, itens, personagens de exemplo e usuarios locais de teste.

Esses dados nao representam pessoas reais.

## Aviso Importante

Os comandos de seed podem apagar dados existentes nas tabelas alvo antes de inserir os dados novamente.

Use seeds apenas em ambientes locais ou de desenvolvimento.

O script `run-sql-file.mjs` bloqueia seeds contra bancos nao locais por padrao. Para executar uma seed fora de ambiente local, e necessario passar a flag explicita `--prod` ou usar `npm run db:seed:prod`.

Antes de rodar qualquer seed, confirme que `.env.local` aponta para o banco correto.
