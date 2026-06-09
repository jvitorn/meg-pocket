use std::process::Command;

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
pub const WINDOWS_CREATE_NO_WINDOW: u32 = 0x08000000;
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
pub const WINDOWS_GRAPHICAL_OPENER: &str = "explorer.exe";

#[cfg(target_os = "windows")]
pub fn hide_child_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;

    command.creation_flags(WINDOWS_CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
pub fn hide_child_window(command: &mut Command) {
    let _ = command;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_no_window_flag_uses_windows_api_value() {
        assert_eq!(WINDOWS_CREATE_NO_WINDOW, 0x08000000);
    }

    #[test]
    fn windows_graphical_opener_does_not_use_cmd_shell() {
        assert_eq!(WINDOWS_GRAPHICAL_OPENER, "explorer.exe");
        assert_ne!(WINDOWS_GRAPHICAL_OPENER, "cmd");
    }
}
