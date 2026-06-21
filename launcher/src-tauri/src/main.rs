#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
    let args = std::env::args().collect::<Vec<_>>();
    if args.iter().any(|arg| arg == "--uninstall-cleanup") {
        let remove_user_data = args.iter().any(|arg| arg == "--remove-user-data");
        std::process::exit(mg_pocket_launcher_lib::run_uninstall_cleanup(
            remove_user_data,
        ));
    }

    apply_linux_webkit_workarounds();
    mg_pocket_launcher_lib::run();
}
