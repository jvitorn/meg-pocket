# M&G Pocket Portable Runtime

O launcher escolhe automaticamente o runtime:

- Linux: Docker.
- Windows com Docker instalado, rodando e saudável: Docker.
- Windows sem Docker saudável: Portátil.

No modo portátil, o launcher usa `AppData/Local/MG Pocket` para `runtime/`,
`app/`, `prisma/`, `scripts/`, `data/`, `config/`, `logs/`, `backups/`,
`downloads/` e `tmp/`. As pastas `data/postgres`, `data/uploads`,
`backups` e `config/runtime.json` não são apagadas por reparo/update.

## Fluxo De Preparação No Launcher

A tela principal do launcher mostra cinco etapas de preparação:

1. Diagnóstico
2. Runtime
3. Banco local
4. Sistema
5. Acesso

O modo portátil não mostra Docker na visão principal. Detalhes como Docker,
portas, paths, logs, diagnóstico completo e arquivos locais ficam no painel
`Detalhes técnicos`.

O progresso global é mapeado assim:

- Diagnóstico: 0-10.
- Runtime: 10-35.
- Banco local: 35-60.
- Sistema: 60-85.
- Acesso: 85-100.

Quando o usuário cancela uma preparação, o job e a etapa atual ficam em estado
`cancelled`, a barra mantém o progresso real onde parou e a mensagem exibida é
`Cancelado pelo usuário.`. O cancelamento não deve emitir 100% nem aparência de
sucesso.

## PostgreSQL Portátil

O start do banco local usa `pg_ctl.exe` como comando de serviço, sem capturar
stdout/stderr por pipe. Isso evita travamento quando o `postgres.exe` iniciado
em background herda handles de saída. O comando usado segue este formato:

```text
pg_ctl.exe start -D <data_dir> -l <postgres.log> -o "-p <porta> -h 127.0.0.1" -w -t 30
```

Depois do `pg_ctl`, o launcher valida readiness com `psql` e `SELECT 1` por até
60 segundos. Antes de chamar `pg_ctl start`, o launcher também testa se
`meg_pocket` já responde na porta configurada; se responder, o start é tratado
como idempotente e `pg_ctl` não é chamado. Se `pg_ctl start` falhar, o launcher
testa `psql SELECT 1` imediatamente e considera sucesso quando o banco já está
pronto mesmo assim.

O controle do start fica em `logs/postgres-control.log`, com comando executado,
exit code, stdout/stderr do `pg_ctl` e as últimas linhas de
`logs/postgres.log`. Se o start falhar e o readiness também falhar, a mensagem
amigável é `Não foi possível iniciar o banco local.` e os detalhes técnicos
apontam para `postgres.log` e `postgres-control.log`.

Antes de iniciar, o launcher verifica os binários principais:

- `runtime/postgres/bin/postgres.exe`
- `runtime/postgres/bin/pg_ctl.exe`
- `runtime/postgres/bin/initdb.exe`
- `runtime/postgres/bin/psql.exe`
- `runtime/postgres/bin/createdb.exe`

Se `data/postgres/postmaster.pid` existir, o launcher verifica se o processo
ainda está vivo. PIDs stale são removidos com cuidado; PIDs ativos são
reutilizados quando o PostgreSQL responde, ou parados antes de uma nova
tentativa quando não há readiness.

### Teste Manual No Windows PowerShell

Use PowerShell, não CMD:

```powershell
$root = Join-Path $env:LOCALAPPDATA "MG Pocket"
$pgbin = Join-Path $root "runtime\postgres\bin"
$data = Join-Path $root "data\postgres"
$log = Join-Path $root "logs\postgres-manual.log"

& "$pgbin\postgres.exe" --version
& "$pgbin\pg_ctl.exe" --version
& "$pgbin\initdb.exe" --version
& "$pgbin\psql.exe" --version
Test-Path "$data\PG_VERSION"
& "$pgbin\pg_ctl.exe" start -D "$data" -l "$log" -o "-p 54321 -h 127.0.0.1" -w -t 30
```

Para parar o PostgreSQL iniciado manualmente:

```powershell
& "$pgbin\pg_ctl.exe" stop -D "$data" -m fast
```

## Artefatos

Existem três artefatos separados:

- Docker: publicado no GitHub Packages/GHCR, por exemplo
  `ghcr.io/jvitorn/meg-pocket-app` e
  `ghcr.io/jvitorn/meg-pocket-maintenance`.
- Portable Runtime: ZIP técnico consumido pelo launcher no Windows. Ele é
  publicado como asset de uma release técnica do runtime, por exemplo
  `portable-runtime-v1.1.0`.
- Launcher Tauri: publicado pelo workflow próprio do launcher. Esta é a
  release/pre-release do usuário final, por exemplo `v1.1.0`, com instaladores
  `.exe`, `.msi`, `.AppImage` e demais bundles gerados pelo Tauri.

O ZIP portátil não vai para GHCR agora. Como ele é baixado diretamente pelo
launcher e validado por SHA-256, Release Asset é o caminho mais simples.

## Separação De Responsabilidades

O build do runtime portátil tem dois fluxos separados:

- Local: `scripts/build-portable-runtime-windows.ps1` é um wrapper amigável e
  chama `scripts/portable-runtime/build-core-windows.ps1`.
- GitHub Actions: `.github/workflows/build-portable-runtime-windows.yml` é
  autônomo e não chama scripts PowerShell do repositório. Ele instala
  dependências, roda o build do Next, monta `portable-runtime/`, baixa Node.js,
  baixa Nginx, instala PostgreSQL 16 pelo MSYS2, valida os arquivos
  obrigatórios, gera o ZIP, calcula SHA-256, escreve `portable-manifest.json`,
  publica artifact e cria/atualiza a release técnica.

Os scripts PowerShell continuam existindo para o build local. O workflow não
depende deles.

## Release Técnica

O workflow `.github/workflows/build-portable-runtime-windows.yml` publica a
release técnica do runtime. Para a versão `v1.1.0`, a tag técnica padrão é:

```text
portable-runtime-v1.1.0
```

Assets esperados:

```text
portable-manifest.json
meg-pocket-portable-runtime-windows-x64-v1.1.0.zip
```

O `portable-manifest.json` aponta para o ZIP dentro dessa mesma release técnica
e inclui `sha256` e `sizeBytes`. Na primeira instalação ou reparo portátil, o
launcher consulta a lista de releases do GitHub, filtra as tags técnicas
`portable-runtime-v...`, escolhe a release runtime mais recente e baixa o asset
`portable-manifest.json` dela:

```text
https://api.github.com/repos/jvitorn/meg-pocket/releases?per_page=100
```

Para testes, o launcher ainda aceita override por ambiente:

```text
MG_POCKET_PORTABLE_MANIFEST_URL
MG_POCKET_PORTABLE_MANIFEST_FILE
```

## Build Local

Use o script local para montar o runtime sem gastar minutos do GitHub Actions:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-portable-runtime-windows.ps1 -Version v1.1.0
```

Saídas locais:

```text
portable-runtime/
portable-runtime-dist/portable-manifest.json
portable-runtime-dist/meg-pocket-portable-runtime-windows-x64-v1.1.0.zip
.local-cache/portable-runtime/
```

O cache `.local-cache/portable-runtime/` guarda os ZIPs baixados de Node.js,
Nginx e PostgreSQL. Depois de popular o cache uma vez, rode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-portable-runtime-windows.ps1 -Version v1.1.0 -SkipBuild -SkipDownload
```

Parâmetros principais:

- `Version`: versão do app/runtime, com ou sem `v`.
- `OutputDir`: pasta dos artefatos finais, padrão `portable-runtime-dist`.
- `PostgresZipUrl`: URL opcional para substituir o ZIP PostgreSQL padrão.
- `SkipBuild`: reutiliza o build existente em `.next/standalone`.
- `SkipDownload`: usa apenas binários já presentes no cache local.
- `SkipPublish`: aceito pelo wrapper local por compatibilidade; o wrapper nunca
  publica assets e não repassa publicação ao core.
- `RuntimeTagPrefix`: prefixo da release técnica, padrão `portable-runtime`.

Por padrão, o script local usa PostgreSQL 16.14 Windows x64 publicado pela EDB.
No GitHub Actions, o workflow usa o pacote MSYS2
`mingw-w64-ucrt-x86_64-postgresql-16` para evitar bloqueios de download da EDB
nos runners. Se precisar trocar a origem no workflow, informe explicitamente o
input `postgres_zip_url`.

A fonte do PostgreSQL precisa entregar `bin/postgres.exe`, `pg_ctl.exe`,
`initdb.exe`, `psql.exe`, `pg_dump.exe`, `pg_restore.exe`, `createdb.exe` e as
DLLs necessárias.

## Publicação No GitHub

Rode o workflow `Build Portable Runtime Windows` apenas quando quiser publicar
ou atualizar a release técnica do runtime.

No `workflow_dispatch`, informe:

```text
version: v1.1.0
runtime_tag_prefix: portable-runtime
```

O workflow monta o runtime no próprio YAML, sem chamar scripts PowerShell do
repositório. Depois faz upload dos artefatos como artifact do job e publica os
assets na release `portable-runtime-v1.1.0`.

O workflow também roda em push de tags técnicas:

```text
portable-runtime-v*.*.*
```

Ele não roda mais em tags principais `v*.*.*`; essas ficam reservadas para o
workflow de release/pre-release do launcher.

## TODOs Intencionais

- Validar o ZIP portátil em uma máquina Windows real.
- Revalidar e atualizar a URL dos binários EDB quando subir a versão do
  PostgreSQL portátil.
- Implementar rollback completo de update portátil.
- Implementar assinatura de código do launcher/instalador Windows.
- Dividir o grande módulo Docker em submódulos menores depois da primeira
  versão com dispatcher Docker/Portátil.
