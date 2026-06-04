# M&G Pocket Portable Runtime

O launcher escolhe automaticamente o runtime:

- Linux: Docker.
- Windows com Docker instalado, rodando e saudável: Docker.
- Windows sem Docker saudável: Portátil.

No modo portátil, o launcher usa `AppData/Local/MG Pocket` para `runtime/`,
`app/`, `prisma/`, `scripts/`, `data/`, `config/`, `logs/`, `backups/`,
`downloads/` e `tmp/`. As pastas `data/postgres`, `data/uploads`,
`backups` e `config/runtime.json` não são apagadas por reparo/update.

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
  Nginx e PostgreSQL, valida os arquivos obrigatórios, gera o ZIP, calcula
  SHA-256, escreve `portable-manifest.json`, publica artifact e cria/atualiza a
  release técnica.

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
e inclui `sha256` e `sizeBytes`. O launcher baixa esse manifest pela tag técnica
baseada na própria versão do launcher:

```text
https://github.com/jvitorn/meg-pocket/releases/download/portable-runtime-v1.1.0/portable-manifest.json
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

Por padrão, o script usa PostgreSQL 16.14 Windows x64 publicado pela EDB. Se
precisar trocar a origem, informe `PostgresZipUrl` no script, o input
`postgres_zip_url` no workflow, ou a variável de repositório
`POSTGRES_WINDOWS_ZIP_URL`.

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
