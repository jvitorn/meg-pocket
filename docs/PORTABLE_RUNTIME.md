# M&G Pocket Portable Runtime

O launcher agora escolhe automaticamente o runtime:

- Linux: Docker.
- Windows com Docker instalado, rodando e saudável: Docker.
- Windows sem Docker saudável: Portátil.

No modo portátil, o launcher usa `AppData/Local/MG Pocket` para `runtime/`,
`app/`, `prisma/`, `scripts/`, `data/`, `config/`, `logs/`, `backups/`,
`downloads/` e `tmp/`. As pastas `data/postgres`, `data/uploads`,
`backups` e `config/runtime.json` não são apagadas por reparo/update.

## Publicação do Runtime

O workflow `.github/workflows/build-portable-runtime-windows.yml` monta o ZIP
Windows x64 e o `portable-manifest.json`. Por padrão, ele baixa os binários
Windows x64 do PostgreSQL 16.14 publicados pela EDB. Se precisar trocar a
origem, informe uma URL alternativa em:

- input `postgres_zip_url`, ou
- variável de repositório `POSTGRES_WINDOWS_ZIP_URL`.

Essa fonte precisa entregar `bin/postgres.exe`, `pg_ctl.exe`, `initdb.exe`,
`psql.exe`, `pg_dump.exe`, `pg_restore.exe`, `createdb.exe` e DLLs necessárias.

## TODOs Intencionais

- Revalidar e atualizar a URL dos binários EDB quando subir a versão do
  PostgreSQL portátil.
- Validar o ZIP portátil em uma máquina Windows real.
- Implementar rollback completo de update portátil.
- Implementar assinatura de código do launcher/instalador Windows.
- Dividir o grande módulo Docker em submódulos menores depois da primeira
  versão com dispatcher Docker/Portátil.
