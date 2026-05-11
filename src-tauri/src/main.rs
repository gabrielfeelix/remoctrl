// Em release no Windows, esconde o console terminal.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // A lógica vive em lib.rs pra ser compartilhada com mobile (Android/iOS).
    remoctrl_lib::run();
}
