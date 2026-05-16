// Bootstrap compartilhado entre desktop (main.rs) e mobile (geração via tauri-cli).
// Aqui ficam:
//   - registro dos plugins (shell, global-shortcut, store)
//   - registro de TODOS os comandos chamados pelo frontend
//   - setup do system tray
//   - registro do atalho global (Ctrl+Shift+N pra mostrar/esconder a janela)

mod discovery;
mod tray;
mod tv;
mod wol;

use crate::tv::lg::LgApp;
use crate::tv::roku::{RokuApp, RokuDeviceInfo};
use crate::tv::samsung::PairResult as SamsungPair;
use crate::tv::TvDevice;
use tauri::{AppHandle, Emitter, Manager};

// ────────────────────────────── COMANDOS ──────────────────────────────
//
// Cada `#[tauri::command]` vira uma função invocável pelo frontend via
// `invoke("nome_da_funcao", { args })`. Mantemos todos aqui pra ficar
// fácil de auditar a superfície de IPC.

/// Sanity-check do bridge JS↔Rust.
#[tauri::command]
fn ping() -> String {
    "pong from rust".to_string()
}

/// Descobre TVs na LAN via SSDP. Frontend deve chamar com `timeoutMs: 3000`.
#[tauri::command]
async fn discover_tvs(timeout_ms: Option<u64>) -> Result<Vec<TvDevice>, String> {
    discovery::discover(timeout_ms.unwrap_or(3000))
        .await
        .map_err(|e| e.to_string())
}

/// Envia uma tecla pra Roku (Up, Down, Select, Home, etc.).
#[tauri::command]
async fn roku_send_key(host: String, key: String) -> Result<(), String> {
    tv::roku::send_key(&host, &key)
        .await
        .map_err(|e| e.to_string())
}

/// Digita texto char-por-char no campo de busca/login da Roku.
#[tauri::command]
async fn roku_type_text(host: String, text: String) -> Result<(), String> {
    tv::roku::type_text(&host, &text)
        .await
        .map_err(|e| e.to_string())
}

/// Abre um app, opcionalmente direto num conteúdo (filme/série).
#[tauri::command]
async fn roku_launch_app(
    host: String,
    app_id: String,
    content_id: Option<String>,
    media_type: Option<String>,
) -> Result<(), String> {
    tv::roku::launch_app(
        &host,
        &app_id,
        content_id.as_deref(),
        media_type.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())
}

/// Abre a busca da Roku já com `query` preenchida.
#[tauri::command]
async fn roku_search(host: String, query: String) -> Result<(), String> {
    tv::roku::search(&host, &query)
        .await
        .map_err(|e| e.to_string())
}

/// Lista apps instalados (pra grade de atalhos rápidos).
#[tauri::command]
async fn roku_list_apps(host: String) -> Result<Vec<RokuApp>, String> {
    tv::roku::list_apps(&host).await.map_err(|e| e.to_string())
}

/// Pega info do device — usada pra mostrar nome/modelo na status bar.
#[tauri::command]
async fn roku_device_info(host: String) -> Result<RokuDeviceInfo, String> {
    tv::roku::device_info(&host)
        .await
        .map_err(|e| e.to_string())
}

/// Ping rápido — sustenta o indicador verde/vermelho.
#[tauri::command]
async fn roku_is_reachable(host: String) -> bool {
    tv::roku::is_reachable(&host).await
}

// ───────────────── Samsung (Tizen 2016+) ─────────────────

/// Pareia com a TV — popup de aceite na primeira vez. Retorna o token
/// que o frontend deve persistir em `tvStore.auth_token`.
#[tauri::command]
async fn samsung_pair(host: String, prev_token: Option<String>) -> Result<SamsungPair, String> {
    tv::samsung::pair(&host, prev_token.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Manda uma tecla lógica (Up/Down/Select/...). O backend traduz pra KEY_*.
#[tauri::command]
async fn samsung_send_key(
    host: String,
    token: Option<String>,
    command: String,
) -> Result<(), String> {
    let key = tv::samsung::key_for(&command)
        .ok_or_else(|| format!("Comando '{command}' não suportado em Samsung"))?;
    tv::samsung::send_key(&host, token.as_deref(), key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn samsung_is_reachable(host: String) -> bool {
    tv::samsung::is_reachable(&host).await
}

// ───────────────── LG webOS ─────────────────

/// Pareia. Retorna `client-key` que persiste em `tvStore.auth_token`.
#[tauri::command]
async fn lg_pair(host: String, prev_key: Option<String>) -> Result<String, String> {
    tv::lg::pair(&host, prev_key.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn lg_send_key(
    host: String,
    client_key: String,
    command: String,
) -> Result<(), String> {
    use tv::lg::LgAction;
    let action = tv::lg::route(&command)
        .ok_or_else(|| format!("Comando '{command}' não suportado em LG"))?;
    let res = match action {
        LgAction::Button(btn) => tv::lg::send_button(&host, &client_key, btn).await,
        LgAction::PowerOff => tv::lg::power_off(&host, &client_key).await,
        LgAction::LaunchApp(id) => tv::lg::launch_app(&host, &client_key, id).await,
        LgAction::InsertText(t) => tv::lg::insert_text(&host, &client_key, t).await,
    };
    res.map_err(|e| e.to_string())
}

#[tauri::command]
async fn lg_launch_app(
    host: String,
    client_key: String,
    app_id: String,
) -> Result<(), String> {
    tv::lg::launch_app(&host, &client_key, &app_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn lg_type_text(
    host: String,
    client_key: String,
    text: String,
) -> Result<(), String> {
    tv::lg::insert_text(&host, &client_key, &text)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn lg_is_reachable(host: String) -> bool {
    tv::lg::is_reachable(&host).await
}

#[tauri::command]
async fn lg_list_apps(host: String, client_key: String) -> Result<Vec<LgApp>, String> {
    tv::lg::list_apps(&host, &client_key)
        .await
        .map_err(|e| e.to_string())
}

// ───────────────── Sony Bravia (IRCC-IP) ─────────────────

/// Manda uma tecla lógica pra TV Sony. `psk` é a Pre-Shared Key opcional
/// (se a TV tiver IP Control com autenticação habilitada).
#[tauri::command]
async fn sony_send_key(
    host: String,
    psk: Option<String>,
    command: String,
) -> Result<(), String> {
    tv::sony::send_key(&host, psk.as_deref(), &command)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn sony_is_reachable(host: String) -> bool {
    tv::sony::is_reachable(&host).await
}

// ───────────────── Wake-on-LAN ─────────────────

/// Liga uma TV (LG/Samsung com WoL ativado) via magic packet.
#[tauri::command]
fn wake_on_lan(mac: String) -> Result<(), String> {
    wol::wake(&mac).map_err(|e| e.to_string())
}

/// Define o estado "always on top". Frontend mantém o valor desejado (no store).
/// Razão: `is_always_on_top()` no Linux GTK retorna Err em alguns WMs,
/// então não dá pra confiar pra fazer toggle só no backend — o front sabe melhor.
#[tauri::command]
fn set_always_on_top(app: AppHandle, value: bool) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "janela main não encontrada".to_string())?;
    win.set_always_on_top(value).map_err(|e| e.to_string())
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn hide_main_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

// ───────────────────────────── BOOTSTRAP ─────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Logs estruturados — RUST_LOG=remoctrl_lib=debug,info pra detalhar
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init());

    // Single-instance: causa crash em WSLg/algumas distros Linux por conflito
    // com D-Bus session bus. Desabilitado temporariamente — focar janela
    // duplicada vamos resolver via tray click (já implementado) e ao receber
    // segundo launch o tauri dispara o BringToFront nativo de qualquer jeito.
    // TODO: investigar issue pra reabilitar com fallback Linux.
    // #[cfg(desktop)]
    // {
    //     builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
    //         if let Some(w) = app.get_webview_window("main") {
    //             let _ = w.show();
    //             let _ = w.unminimize();
    //             let _ = w.set_focus();
    //         }
    //     }));
    // }

    // Atalho global DESABILITADO temporariamente em todas as plataformas.
    // No WSLg/Windows com Ctrl+Shift+N ocupado pelo SO, o registro falha e
    // estoura assertion no GTK. Volta quando integrar lógica per-platform.
    #[cfg(all(desktop, feature = "enable-global-shortcut"))]
    {
        use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
        let toggle_shortcut = Shortcut::new(
            Some(Modifiers::CONTROL | Modifiers::SHIFT),
            Code::KeyN,
        );
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &toggle_shortcut {
                        if let Some(w) = app.get_webview_window("main") {
                            let visible = w.is_visible().unwrap_or(false);
                            if visible { let _ = w.hide(); }
                            else { let _ = w.show(); let _ = w.set_focus(); }
                            let _ = app.emit("window-toggled", !visible);
                        }
                    }
                })
                .build(),
        );
    }

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                // Tray DESABILITADO temporariamente — está causando Gtk-CRITICAL
                // assertion no WSLg que mata o app. Investigar em sessão Linux real.
                // TODO: habilitar com env-flag REMOCTRL_TRAY=1 pra ativar quando precisar.
                if std::env::var("REMOCTRL_TRAY").is_ok() {
                    if let Err(e) = tray::setup(app.handle()) {
                        tracing::warn!("tray setup falhou: {e}");
                    }
                }

                // Registro de Ctrl+Shift+N DESABILITADO (ver bloco acima).
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Ao fechar a janela, escondemos em vez de matar — app continua no tray.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            discover_tvs,
            // Roku
            roku_send_key,
            roku_type_text,
            roku_launch_app,
            roku_search,
            roku_list_apps,
            roku_device_info,
            roku_is_reachable,
            // Samsung
            samsung_pair,
            samsung_send_key,
            samsung_is_reachable,
            // LG
            lg_pair,
            lg_send_key,
            lg_launch_app,
            lg_type_text,
            lg_is_reachable,
            lg_list_apps,
            // Sony Bravia (IRCC-IP)
            sony_send_key,
            sony_is_reachable,
            // Wake-on-LAN
            wake_on_lan,
            // Window
            set_always_on_top,
            show_main_window,
            hide_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao rodar Remoctrl");
}
