#[cfg(target_os = "linux")]
fn apply_linux_webkit_workarounds() {
    // Precisa rodar antes do WebView para evitar tela branca em alguns stacks Wayland/EGL.
    if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg(not(target_os = "linux"))]
fn apply_linux_webkit_workarounds() {}

fn main() {
    apply_linux_webkit_workarounds();
    mg_pocket_launcher_lib::run();
}
