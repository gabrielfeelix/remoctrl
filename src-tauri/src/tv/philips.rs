// Philips JointSpace — API v1 (HTTP simples na porta 1925, sem auth).
//
// Cobre Philips com SAPHI OS, NetTV e os primeiros modelos com Android TV
// que mantiveram o endpoint v1 ativo. Modelos mais novos (2019+) só
// expõem v6 (HTTPS 1926 com Digest auth + pairing HMAC-SHA256 com
// PIN). Esses, por enquanto, devem usar a marca "Android TV" via ADB —
// é o caminho mais consistente.
//
// Endpoint: POST http://<ip>:1925/1/input/key  com body {"key": "Home"}
//
// Spec: https://jointspace.sourceforge.net/projectdata/documentation/jasonApi/1/

use anyhow::{anyhow, Context, Result};
use reqwest::Client;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

const PORT: u16 = 1925;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);
const REACHABILITY_TIMEOUT: Duration = Duration::from_secs(2);

/// Mapeia comando lógico → nome de tecla JointSpace.
fn key_for(command: &str) -> Option<&'static str> {
    Some(match command {
        "Up" => "CursorUp",
        "Down" => "CursorDown",
        "Left" => "CursorLeft",
        "Right" => "CursorRight",
        "Ok" | "Select" => "Confirm",
        "Back" => "Back",
        "Home" => "Home",
        "Play" | "Pause" | "PlayPause" => "PlayPause",
        "Rev" => "Rewind",
        "Fwd" => "FastForward",
        "InstantReplay" => "Rewind", // sem replay dedicado
        "Info" => "Info",
        "VolumeUp" => "VolumeUp",
        "VolumeDown" => "VolumeDown",
        "Mute" | "VolumeMute" => "Mute",
        "ChannelUp" => "ChannelStepUp",
        "ChannelDown" => "ChannelStepDown",
        "Power" | "PowerOff" => "Standby",
        // Sem mapeamento de inputs HDMI no JointSpace v1 — abre o menu Source.
        "InputTuner" | "InputHDMI1" | "InputHDMI2" | "InputHDMI3" | "InputHDMI4" => "Source",
        _ => return None,
    })
}

fn client() -> Client {
    Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .expect("reqwest client build")
}

pub async fn send_key(host: &str, command: &str) -> Result<()> {
    let key = key_for(command)
        .ok_or_else(|| anyhow!("Comando '{command}' não suportado em Philips"))?;
    let url = format!("http://{}:{}/1/input/key", host, PORT);
    let body = serde_json::json!({ "key": key });
    let res = client()
        .post(&url)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .with_context(|| format!("POST {url} falhou"))?;
    if !res.status().is_success() {
        return Err(anyhow!(
            "Philips respondeu {} — JointSpace ativo? Modelo Android TV recente? Tente a marca 'Android TV' em vez disso.",
            res.status()
        ));
    }
    Ok(())
}

pub async fn is_reachable(host: &str) -> bool {
    matches!(
        timeout(REACHABILITY_TIMEOUT, TcpStream::connect((host, PORT))).await,
        Ok(Ok(_))
    )
}
