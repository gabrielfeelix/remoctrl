// Android TV / Google TV — controle via ADB sobre TCP/IP.
//
// Cobre TCL, Hisense (Google TV), Xiaomi/Mi TV, Sharp, AOC, Multilaser,
// Philips Android, Sony Google TV (como fallback), e qualquer outra TV com
// Android TV / Google TV 7+.
//
// Como funciona:
//   - User ativa "Depuração sem fio" na TV (Configs → Sistema → Sobre →
//     toca 7x no Build pra liberar Opções de Desenvolvedor → Opções de
//     desenvolvedor → Depuração sem fio).
//   - User pega IP + porta dinâmica que a TV mostra (porta NÃO é 5555 nas
//     versões modernas — é aleatória).
//   - Primeira conexão: a TV mostra "Permitir depuração USB deste
//     computador?" — usuário aceita + marca "Sempre permitir".
//   - Depois disso, conexões futuras são silenciosas.
//
// Limitação: adb_client é síncrono — usamos spawn_blocking pros comandos
// não bloquearem o async runtime.

use anyhow::{anyhow, Context, Result};
use std::net::SocketAddr;
use std::str::FromStr;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

/// Mapeia comando lógico → Android keycode (https://developer.android.com/reference/android/view/KeyEvent).
pub fn key_for(command: &str) -> Option<u32> {
    Some(match command {
        "Up" => 19,                                     // KEYCODE_DPAD_UP
        "Down" => 20,                                   // KEYCODE_DPAD_DOWN
        "Left" => 21,                                   // KEYCODE_DPAD_LEFT
        "Right" => 22,                                  // KEYCODE_DPAD_RIGHT
        "Ok" | "Select" => 23,                          // KEYCODE_DPAD_CENTER
        "Back" => 4,                                    // KEYCODE_BACK
        "Home" => 3,                                    // KEYCODE_HOME
        "Play" => 126,                                  // KEYCODE_MEDIA_PLAY
        "Pause" => 127,                                 // KEYCODE_MEDIA_PAUSE
        "PlayPause" => 85,                              // KEYCODE_MEDIA_PLAY_PAUSE
        "Rev" => 89,                                    // KEYCODE_MEDIA_REWIND
        "Fwd" => 90,                                    // KEYCODE_MEDIA_FAST_FORWARD
        "InstantReplay" => 89,                          // (sem replay dedicado — usa REW)
        "Info" => 165,                                  // KEYCODE_INFO
        "VolumeUp" => 24,                               // KEYCODE_VOLUME_UP
        "VolumeDown" => 25,                             // KEYCODE_VOLUME_DOWN
        "Mute" | "VolumeMute" => 164,                   // KEYCODE_VOLUME_MUTE
        "ChannelUp" => 166,                             // KEYCODE_CHANNEL_UP
        "ChannelDown" => 167,                           // KEYCODE_CHANNEL_DOWN
        "Power" | "PowerOff" => 26,                     // KEYCODE_POWER
        // Inputs HDMI — Android TV não tem códigos padrão pra HDMI 1/2/3.
        // KEYCODE_TV_INPUT = 178 abre o menu de fontes; o usuário escolhe.
        "InputTuner" | "InputHDMI1" | "InputHDMI2" | "InputHDMI3" | "InputHDMI4" => 178,
        _ => return None,
    })
}

const REACHABILITY_TIMEOUT: Duration = Duration::from_secs(2);

/// Parseia "192.168.0.10:5555" ou "192.168.0.10" (com porta default).
fn parse_addr(host: &str, default_port: u16) -> Result<SocketAddr> {
    if let Ok(a) = SocketAddr::from_str(host) {
        return Ok(a);
    }
    // host pode ser só "192.168.0.10" — adicionamos a porta default.
    let with_port = format!("{}:{}", host, default_port);
    SocketAddr::from_str(&with_port)
        .with_context(|| format!("endereço Android TV inválido: '{host}'"))
}

/// Manda um keycode via ADB shell. Re-conecta a cada comando — overhead
/// aceitável (~100ms) e evita gerenciar conexão long-lived com tokio sync/async.
pub async fn send_key(host: &str, port: u16, command: &str) -> Result<()> {
    let code = key_for(command)
        .ok_or_else(|| anyhow!("Comando '{command}' não suportado em Android TV"))?;
    let addr = parse_addr(host, port)?;

    // adb_client é sync — empurra pra blocking pool.
    let cmd = format!("input keyevent {}", code);
    tokio::task::spawn_blocking(move || -> Result<()> {
        use adb_client::{tcp::ADBTcpDevice, ADBDeviceExt};
        let mut device = ADBTcpDevice::new(addr)
            .with_context(|| format!("Não conectei na TV em {addr}. Wireless debug ativo? Aceitou a chave?"))?;
        device
            .shell_command(&cmd, None, None)
            .with_context(|| format!("shell '{cmd}' falhou — verifique se a TV ainda está pareada"))?;
        Ok(())
    })
    .await??;
    Ok(())
}

/// Insere texto no campo focado da TV via `input text "X"`. Funciona em
/// teclados nativos (search bar, formulários). Apps com teclado próprio
/// (Crunchyroll etc.) ignoram — o usuário usa o Enter pra busca global.
pub async fn send_text(host: &str, port: u16, text: &str) -> Result<()> {
    if text.is_empty() {
        return Ok(());
    }
    let addr = parse_addr(host, port)?;
    // Escapa: ADB shell precisa de espaços como %s; vírgulas, parênteses,
    // aspas viram pesadelo. Substituímos espaço → %s; restante mandamos cru
    // e protegemos com aspas duplas no comando.
    let escaped = text.replace(' ', "%s").replace('"', "\\\"");
    let cmd = format!("input text \"{}\"", escaped);
    tokio::task::spawn_blocking(move || -> Result<()> {
        use adb_client::{tcp::ADBTcpDevice, ADBDeviceExt};
        let mut device = ADBTcpDevice::new(addr)
            .with_context(|| format!("Não conectei na TV em {addr}"))?;
        device
            .shell_command(&cmd, None, None)
            .with_context(|| format!("shell '{cmd}' falhou"))?;
        Ok(())
    })
    .await??;
    Ok(())
}

/// TCP probe — só verifica se a porta ADB responde.
/// NÃO valida que o pareamento ainda é válido; isso só descobrimos ao
/// tentar mandar um comando.
pub async fn is_reachable(host: &str, port: u16) -> bool {
    let Ok(addr) = parse_addr(host, port) else {
        return false;
    };
    matches!(
        timeout(REACHABILITY_TIMEOUT, TcpStream::connect(addr)).await,
        Ok(Ok(_))
    )
}

/// Lança um app via `am start`. `component` é do formato
/// `package.name/.MainActivity` ou `package.name/package.name.SomeActivity`.
pub async fn launch_app(host: &str, port: u16, component: &str) -> Result<()> {
    let addr = parse_addr(host, port)?;
    // Sanity: evita injection. Component só pode ter chars válidos.
    if !component
        .chars()
        .all(|c| c.is_alphanumeric() || matches!(c, '.' | '/' | '_'))
    {
        return Err(anyhow!("Component inválido: '{component}'"));
    }
    let cmd = format!("am start -n {}", component);
    tokio::task::spawn_blocking(move || -> Result<()> {
        use adb_client::{tcp::ADBTcpDevice, ADBDeviceExt};
        let mut device = ADBTcpDevice::new(addr)
            .with_context(|| format!("Não conectei na TV em {addr}"))?;
        device
            .shell_command(&cmd, None, None)
            .with_context(|| format!("'{cmd}' falhou — app instalado? Component certo?"))?;
        Ok(())
    })
    .await??;
    Ok(())
}
