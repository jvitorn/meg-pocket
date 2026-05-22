# Guia de build do M&G Pocket Launcher

Este guia descreve a validação local e o empacotamento do launcher Tauri.

Rust e Cargo são necessários apenas para desenvolver ou compilar o launcher. Usuários finais não precisam instalar Rust/Cargo para usar o M&G Pocket pelo launcher.

## Requisitos

- Node.js 22 ou superior.
- npm.
- Rust estável com Cargo, somente para desenvolvimento/build do launcher.
- Dependências Linux do Tauri quando estiver gerando AppImage, `.deb` ou `.rpm`.

No Ubuntu 22.04, use:

```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  file \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libssl-dev \
  libwebkit2gtk-4.1-dev \
  libxdo-dev \
  patchelf \
  rpm \
  wget
```

## Validação local

```bash
cd launcher
npm ci
npm run fix:icons
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm test
```

O comando `npm run fix:icons` converte o ícone fonte para PNG RGBA e regenera os ícones esperados pelo Tauri:

```text
launcher/src-tauri/icons/32x32.png
launcher/src-tauri/icons/128x128.png
launcher/src-tauri/icons/128x128@2x.png
launcher/src-tauri/icons/icon.png
launcher/src-tauri/icons/icon.ico
launcher/src-tauri/icons/icon.icns
```

## Build local

```bash
cd launcher
npm run build:launcher
```

Os artefatos ficam em:

```text
launcher/src-tauri/target/release/bundle/
```

Para testar o AppImage no Linux:

```bash
cd launcher
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage
```

## Linux — AppImage Abriu Em Branco

Em alguns ambientes Linux com Wayland/WebKitGTK, o AppImage pode abrir em branco por falha de EGL/DMABUF. O launcher já aplica workarounds antes de criar o WebView, mas estes comandos ajudam a diagnosticar o ambiente:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 ./mg-pocket-launcher_1.1.0_amd64.AppImage
```

Se continuar:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./mg-pocket-launcher_1.1.0_amd64.AppImage
```

Ou:

```bash
GDK_BACKEND=x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 ./mg-pocket-launcher_1.1.0_amd64.AppImage
```

No Arch Linux, garanta as dependências comuns:

```bash
sudo pacman -S webkit2gtk-4.1 gtk3 glib2 libayatana-appindicator librsvg fuse2
```

## Resources empacotados

O bundle inclui a pasta `installers/` como resource Tauri mapeado para `$RESOURCE/installers/`. Em execução empacotada, o launcher copia esses scripts para:

```text
~/.local/share/mg-pocket-launcher/installers/
```

No modo de desenvolvimento, o launcher usa a pasta `installers/` do próprio repositório.

## GitHub Actions

- `.github/workflows/launcher-ci.yml` valida ícones, frontend, backend Rust e testes do launcher em PR/push.
- `.github/workflows/launcher-prerelease.yml` gera builds Linux e Windows via `tauri-apps/tauri-action`, roda testes antes do build e anexa artefatos com nomes amigáveis ao release.

macOS não é gerado nem publicado por enquanto, porque não há validação local disponível para esses artefatos.

O workflow de pre-release é manual e pede uma versão como:

```text
v1.1.0-beta.1
```

Artefatos esperados:

```text
MG-Pocket-Launcher-Linux.AppImage
MG-Pocket-Launcher-Windows-Setup.exe
MG-Pocket-Launcher-Linux.deb
MG-Pocket-Launcher-Linux.rpm
```
