// LG webOS — protocolo WebSocket SSAP (Service Stack Access Protocol).
//
// Endpoint principal:  ws://<ip>:3000/
// Endpoint pointer:    ws://<ip>:<porta>/resources/.../netinput.pointer.sock/web
//                      (URI vem do response a `ssap://com.webos.service.networkinput/getPointerInputSocket`)
//
// Fluxo:
//   1) Conecta no main → manda `register` com manifesto + client-key (se já tiver)
//   2) Primeira vez: TV mostra prompt → usuário aceita → server retorna `client-key`
//   3) Pra teclas direcionais: requisitar pointer input socket → conectar nele →
//      enviar `button NAME\n\n` (newline-terminated)
//   4) Pra power off / app launch / type text: requests SSAP no main socket
//
// O manifesto + signature embaixo são os públicos do `pylgtv` (sem segredo).

#![allow(dead_code)]

use anyhow::{anyhow, Context, Result};
use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tokio_tungstenite::tungstenite::Message;

const MAIN_PORT: u16 = 3000;
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(35);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

/// Mapeia comando lógico → nome do botão no pointer socket.
pub fn pointer_button(command: &str) -> Option<&'static str> {
    Some(match command {
        "Up" => "UP",
        "Down" => "DOWN",
        "Left" => "LEFT",
        "Right" => "RIGHT",
        "Ok" | "Select" => "ENTER",
        "Back" => "BACK",
        "Home" => "HOME",
        "VolumeUp" => "VOLUMEUP",
        "VolumeDown" => "VOLUMEDOWN",
        "Mute" | "VolumeMute" => "MUTE",
        "Play" => "PLAY",
        "Pause" => "PAUSE",
        "PlayPause" => "PLAY",
        "ChannelUp" => "CHANNELUP",
        "ChannelDown" => "CHANNELDOWN",
        "Info" => "INFO",
        "Rev" => "REWIND",
        "Fwd" => "FASTFORWARD",
        "Stop" => "STOP",
        _ => return None,
    })
}

/// Power, type-text e launch são SSAP requests, não buttons.
pub enum LgAction<'a> {
    Button(&'a str),
    PowerOff,
    LaunchApp(&'a str),
    InsertText(&'a str),
}

/// Decide o tipo de ação dado um comando.
pub fn route<'a>(command: &'a str) -> Option<LgAction<'a>> {
    if let Some(b) = pointer_button(command) {
        return Some(LgAction::Button(b));
    }
    match command {
        "Power" | "PowerOff" => Some(LgAction::PowerOff),
        _ => None,
    }
}

pub async fn is_reachable(host: &str) -> bool {
    use tokio::net::TcpStream;
    use tokio::time::timeout;
    matches!(
        timeout(Duration::from_secs(2), TcpStream::connect((host, MAIN_PORT))).await,
        Ok(Ok(_))
    )
}

/// Pareia. Retorna o `client-key` que deve ser persistido.
pub async fn pair(host: &str, prev_key: Option<&str>) -> Result<String> {
    let (mut ws, _) = connect_main(host).await?;

    let manifest = manifest_payload(prev_key);
    ws.send(Message::Text(manifest.to_string())).await?;

    // Esperamos até a TV responder. Em primeiro pareamento isso pode demorar
    // (usuário precisa aceitar no controle físico).
    let key = tokio::time::timeout(HANDSHAKE_TIMEOUT, async {
        loop {
            let msg = ws
                .next()
                .await
                .ok_or_else(|| anyhow!("WS LG fechou no register"))??;
            if let Message::Text(t) = msg {
                tracing::debug!("lg register msg: {t}");
                let v: serde_json::Value = serde_json::from_str(&t)?;
                let typ = v.get("type").and_then(|s| s.as_str()).unwrap_or("");
                if typ == "registered" {
                    let key = v
                        .get("payload")
                        .and_then(|p| p.get("client-key"))
                        .and_then(|k| k.as_str())
                        .ok_or_else(|| anyhow!("registered sem client-key"))?
                        .to_string();
                    return Ok::<_, anyhow::Error>(key);
                }
                if typ == "error" {
                    return Err(anyhow!(
                        "TV recusou pareamento: {}",
                        v.get("error")
                            .and_then(|e| e.as_str())
                            .unwrap_or("erro desconhecido")
                    ));
                }
                // type=response sem registered -> seguimos esperando
            }
        }
    })
    .await
    .map_err(|_| anyhow!("Tempo esgotado — você aceitou o pareamento na TV?"))??;

    let _ = ws.close(None).await;
    Ok(key)
}

/// Envia um botão (tecla) via pointer socket.
pub async fn send_button(host: &str, client_key: &str, button: &str) -> Result<()> {
    let (mut main, _) = connect_main(host).await?;
    register(&mut main, client_key).await?;
    let pointer_uri = request_pointer_socket(&mut main).await?;
    let _ = main.close(None).await;

    let (mut pointer, _) =
        tokio_tungstenite::connect_async(&pointer_uri).await.with_context(
            || format!("falha conectando pointer socket {pointer_uri}"),
        )?;
    let payload = format!("type:button\nname:{button}\n\n");
    pointer.send(Message::Text(payload)).await?;
    let _ = pointer.close(None).await;
    Ok(())
}

/// Desliga a TV via SSAP.
pub async fn power_off(host: &str, client_key: &str) -> Result<()> {
    request(host, client_key, "ssap://system/turnOff", serde_json::json!({})).await
}

/// Abre um app pelo id (ex.: "youtube.leanback.v4", "netflix").
pub async fn launch_app(host: &str, client_key: &str, app_id: &str) -> Result<()> {
    request(
        host,
        client_key,
        "ssap://system.launcher/launch",
        serde_json::json!({ "id": app_id }),
    )
    .await
}

/// Digita texto no campo de input ativo.
pub async fn insert_text(host: &str, client_key: &str, text: &str) -> Result<()> {
    request(
        host,
        client_key,
        "ssap://com.webos.service.ime/insertText",
        serde_json::json!({ "text": text, "replace": 0 }),
    )
    .await
}

/// App listado na grade (vem do listLaunchPoints).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LgApp {
    pub id: String,
    pub title: String,
    pub icon_url: String,
}

/// Lista os apps "lançáveis" (launch points) da TV — para a grade de atalhos.
pub async fn list_apps(host: &str, client_key: &str) -> Result<Vec<LgApp>> {
    let (mut ws, _) = connect_main(host).await?;
    register(&mut ws, client_key).await?;

    let id = uuid::Uuid::new_v4().to_string();
    let req = serde_json::json!({
        "type": "request",
        "id": id,
        "uri": "ssap://com.webos.applicationManager/listLaunchPoints",
    });
    ws.send(Message::Text(req.to_string())).await?;

    let apps = tokio::time::timeout(REQUEST_TIMEOUT, async {
        loop {
            let msg = ws.next().await.ok_or_else(|| anyhow!("WS fechou"))??;
            if let Message::Text(t) = msg {
                let v: serde_json::Value = serde_json::from_str(&t)?;
                if v.get("id").and_then(|i| i.as_str()) == Some(id.as_str()) {
                    let arr = v
                        .get("payload")
                        .and_then(|p| p.get("launchPoints"))
                        .and_then(|a| a.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let apps: Vec<LgApp> = arr
                        .into_iter()
                        .filter_map(|item| {
                            Some(LgApp {
                                id: item.get("id")?.as_str()?.to_string(),
                                title: item
                                    .get("title")
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                icon_url: item
                                    .get("icon")
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                            })
                        })
                        .collect();
                    return Ok::<_, anyhow::Error>(apps);
                }
            }
        }
    })
    .await
    .map_err(|_| anyhow!("Tempo esgotado em listLaunchPoints"))??;

    let _ = ws.close(None).await;
    Ok(apps)
}

// ─────────────────────── helpers internos ───────────────────────

type WsStream = tokio_tungstenite::WebSocketStream<
    tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
>;

async fn connect_main(host: &str) -> Result<(WsStream, tokio_tungstenite::tungstenite::handshake::client::Response)> {
    let url = format!("ws://{}:{}/", host, MAIN_PORT);
    tokio_tungstenite::connect_async(&url)
        .await
        .with_context(|| format!("connect LG main {} falhou", url))
}

/// Faz register no main socket usando o client_key existente.
async fn register(ws: &mut WsStream, client_key: &str) -> Result<()> {
    let payload = manifest_payload(Some(client_key));
    ws.send(Message::Text(payload.to_string())).await?;

    tokio::time::timeout(REQUEST_TIMEOUT, async {
        loop {
            let msg = ws.next().await.ok_or_else(|| anyhow!("WS LG fechou no register"))??;
            if let Message::Text(t) = msg {
                let v: serde_json::Value = serde_json::from_str(&t)?;
                if v.get("type").and_then(|s| s.as_str()) == Some("registered") {
                    return Ok::<_, anyhow::Error>(());
                }
                if v.get("type").and_then(|s| s.as_str()) == Some("error") {
                    return Err(anyhow!(
                        "register falhou: {}",
                        v.get("error").and_then(|e| e.as_str()).unwrap_or("?")
                    ));
                }
            }
        }
    })
    .await
    .map_err(|_| anyhow!("Tempo esgotado no register LG"))?
}

async fn request_pointer_socket(ws: &mut WsStream) -> Result<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let payload = serde_json::json!({
        "type": "request",
        "id": id,
        "uri": "ssap://com.webos.service.networkinput/getPointerInputSocket",
    });
    ws.send(Message::Text(payload.to_string())).await?;

    tokio::time::timeout(REQUEST_TIMEOUT, async {
        loop {
            let msg = ws.next().await.ok_or_else(|| anyhow!("WS fechou"))??;
            if let Message::Text(t) = msg {
                let v: serde_json::Value = serde_json::from_str(&t)?;
                if v.get("id").and_then(|i| i.as_str()) == Some(id.as_str()) {
                    if let Some(uri) = v
                        .get("payload")
                        .and_then(|p| p.get("socketPath"))
                        .and_then(|s| s.as_str())
                    {
                        return Ok::<_, anyhow::Error>(uri.to_string());
                    }
                    return Err(anyhow!("response sem socketPath"));
                }
            }
        }
    })
    .await
    .map_err(|_| anyhow!("Tempo esgotado pedindo pointer socket"))?
}

/// Faz uma request SSAP simples (sem esperar streaming) e fecha.
async fn request(
    host: &str,
    client_key: &str,
    uri: &str,
    payload: serde_json::Value,
) -> Result<()> {
    let (mut ws, _) = connect_main(host).await?;
    register(&mut ws, client_key).await?;

    let id = uuid::Uuid::new_v4().to_string();
    let req = serde_json::json!({
        "type": "request",
        "id": id,
        "uri": uri,
        "payload": payload,
    });
    ws.send(Message::Text(req.to_string())).await?;

    // Espera a primeira response que casa com o id (ou timeout — o request
    // pode não retornar, e tá tudo bem pra fire-and-forget).
    let _ = tokio::time::timeout(REQUEST_TIMEOUT, async {
        loop {
            let msg = ws.next().await.ok_or_else(|| anyhow!("WS fechou"))??;
            if let Message::Text(t) = msg {
                let v: serde_json::Value = serde_json::from_str(&t)?;
                if v.get("id").and_then(|i| i.as_str()) == Some(id.as_str()) {
                    return Ok::<_, anyhow::Error>(());
                }
            }
        }
    })
    .await;

    let _ = ws.close(None).await;
    Ok(())
}

/// Manifesto público do pylgtv — funciona em todos os webOS.
fn manifest_payload(client_key: Option<&str>) -> serde_json::Value {
    let manifest = serde_json::json!({
        "manifestVersion": 1,
        "appVersion": "1.1",
        "signed": {
            "created": "20140509",
            "appId": "com.lge.test",
            "vendorId": "com.lge",
            "localizedAppNames": { "": "LG Remote App" },
            "localizedVendorNames": { "": "LG Electronics" },
            "permissions": [
                "TEST_SECURE","CONTROL_INPUT_TEXT","CONTROL_MOUSE_AND_KEYBOARD",
                "READ_INSTALLED_APPS","READ_LGE_SDX","READ_NOTIFICATIONS",
                "SEARCH","WRITE_SETTINGS","WRITE_NOTIFICATION_ALERT",
                "CONTROL_POWER","READ_CURRENT_CHANNEL","READ_RUNNING_APPS",
                "READ_UPDATE_INFO","UPDATE_FROM_REMOTE_APP",
                "READ_LGE_TV_INPUT_EVENTS","READ_TV_CURRENT_TIME"
            ],
            "serial": "2f930e2d2cfe083771f68e4fe7bb07",
            "serviceName": "remoctrl"
        },
        "permissions": [
            "LAUNCH","LAUNCH_WEBAPP","APP_TO_APP","CLOSE","TEST_OPEN","TEST_PROTECTED",
            "CONTROL_AUDIO","CONTROL_DISPLAY","CONTROL_INPUT_JOYSTICK",
            "CONTROL_INPUT_MEDIA_RECORDING","CONTROL_INPUT_MEDIA_PLAYBACK",
            "CONTROL_INPUT_TV","CONTROL_POWER","READ_APP_STATUS","READ_CURRENT_CHANNEL",
            "READ_INPUT_DEVICE_LIST","READ_NETWORK_STATE","READ_RUNNING_APPS",
            "READ_TV_CHANNEL_LIST","WRITE_NOTIFICATION_TOAST","READ_POWER_STATE",
            "READ_COUNTRY_INFO","READ_SETTINGS"
        ],
        "signatures": [{
            "signatureVersion": 1,
            "signature": "eyJhbGdvcml0aG0iOiJSU0EtU0hBMjU2Iiwia2V5SWQiOiJ0ZXN0LXNpZ25pbmctY2VydCIsInNpZ25hdHVyZVZlcnNpb24iOjF9.hrVRgjCwXVvE2OOSpDZ58hR+59aFNwYDyjQgKk3auukd7pcegmE2CzPCa0bJ0ZsRAcKkCTJrWo5iDzNhMBWRyaMOv5zWSrthlf7G128qvIlpMT0YNY+n/FaOHE73uLrS/g7swl3/qH/BGFG2Hu4RlL48eb3lLKqTt2xKHdCs6Cd4RMfJPYnzgvI4BNrFUKsjkcu+WD4OO2A27Pq1n50cMchmcaXadJhGrOqH5YmHdOCj5NSHzJYrsW0HPlpuAx/ECMeIZYDh6RMqaFM2DXzdKX9NmmyqzJ3o/0lkk/N97gfVRLW5hA29yeAwaCViZNCP8iC9aO0q9fQojoa7NQnAtw=="
        }]
    });

    let mut payload = serde_json::json!({
        "forcePairing": false,
        "pairingType": "PROMPT",
        "manifest": manifest,
    });
    if let Some(key) = client_key.filter(|s| !s.is_empty()) {
        payload["client-key"] = serde_json::Value::String(key.to_string());
    }

    serde_json::json!({
        "type": "register",
        "id": "register_0",
        "payload": payload,
    })
}
