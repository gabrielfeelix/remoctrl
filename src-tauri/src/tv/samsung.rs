// Samsung Tizen 2016+ — protocolo WebSocket Secure.
//
// Endpoint: wss://<ip>:8002/api/v2/channels/samsung.remote.control?name=<b64>&token=<token>
// (porta 8001 sem TLS em modelos antigos — não suportamos no Sprint 2)
//
// Fluxo de pareamento:
//   1) Conectamos sem token (ou com o token salvo)
//   2) Server manda JSON `ms.channel.connect` — se for primeira vez,
//      a TV mostra um popup. Usuário aceita → server inclui `data.token`.
//   3) Salvamos esse token e usamos nas próximas conexões.
//
// O cert TLS da TV é auto-assinado — desabilitamos validação porque o tráfego
// é LAN-only e o protocolo não tem outra forma de identificar a TV.

#![allow(dead_code)]

use anyhow::{anyhow, Context, Result};
use base64::Engine as _;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::Uri;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::Connector;

const SECURE_PORT: u16 = 8002;
const APP_NAME: &str = "Remoctrl";
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(35);
const COMMAND_TIMEOUT: Duration = Duration::from_secs(8);

/// Mapeia comando lógico → tecla nativa Samsung (KEY_*).
pub fn key_for(command: &str) -> Option<&'static str> {
    Some(match command {
        "Up" => "KEY_UP",
        "Down" => "KEY_DOWN",
        "Left" => "KEY_LEFT",
        "Right" => "KEY_RIGHT",
        "Ok" | "Select" => "KEY_ENTER",
        "Back" => "KEY_RETURN",
        "Home" => "KEY_HOME",
        "VolumeUp" => "KEY_VOLUP",
        "VolumeDown" => "KEY_VOLDOWN",
        "Mute" | "VolumeMute" => "KEY_MUTE",
        "Play" => "KEY_PLAY",
        "Pause" => "KEY_PAUSE",
        "PlayPause" => "KEY_PLAY", // sem toggle nativo confiável; Play é o padrão
        "Power" | "PowerOff" => "KEY_POWER",
        "ChannelUp" => "KEY_CHUP",
        "ChannelDown" => "KEY_CHDOWN",
        "Info" => "KEY_INFO",
        "Rev" => "KEY_REWIND",
        "Fwd" => "KEY_FF",
        "Stop" => "KEY_STOP",
        "InstantReplay" => "KEY_REWIND_",
        "Source" | "InputTuner" => "KEY_SOURCE",
        "InputHDMI1" | "InputHDMI2" | "InputHDMI3" | "InputHDMI4" => "KEY_HDMI",
        _ => return None,
    })
}

/// Resultado do pareamento: o token persiste no `tvStore` do frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairResult {
    pub token: Option<String>,
    pub device_name: String,
}

/// Pinga a porta TLS pra alimentar o indicador verde/vermelho.
pub async fn is_reachable(host: &str) -> bool {
    use tokio::net::TcpStream;
    use tokio::time::timeout;
    matches!(
        timeout(Duration::from_secs(2), TcpStream::connect((host, SECURE_PORT))).await,
        Ok(Ok(_))
    )
}

/// Conecta + espera o `ms.channel.connect`. Se for primeira vez, a TV
/// mostra popup de pareamento — o handshake pode demorar ~30s até o usuário aceitar.
/// Retorna o token novo (ou o mesmo recebido) e o nome do device.
pub async fn pair(host: &str, prev_token: Option<&str>) -> Result<PairResult> {
    let device_name = APP_NAME.to_string();
    let (mut ws, _) = connect_ws(host, &device_name, prev_token).await?;

    let token = tokio::time::timeout(HANDSHAKE_TIMEOUT, async {
        loop {
            let msg = ws
                .next()
                .await
                .ok_or_else(|| anyhow!("WS fechou sem resposta"))??;
            if let Message::Text(t) = msg {
                tracing::debug!("samsung handshake msg: {t}");
                let v: serde_json::Value = serde_json::from_str(&t)
                    .context("resposta Samsung não é JSON")?;
                if v.get("event").and_then(|e| e.as_str()) == Some("ms.channel.connect") {
                    let new_token = v
                        .get("data")
                        .and_then(|d| d.get("token"))
                        .and_then(|t| t.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| prev_token.map(|s| s.to_string()));
                    return Ok::<_, anyhow::Error>(new_token);
                }
                if v.get("event").and_then(|e| e.as_str()) == Some("ms.channel.unauthorized") {
                    return Err(anyhow!("Pareamento negado pelo usuário"));
                }
            }
        }
    })
    .await
    .map_err(|_| anyhow!("Tempo esgotado esperando o pareamento (TV mostrou popup?)"))??;

    let _ = ws.close(None).await;
    Ok(PairResult { token, device_name })
}

/// Manda uma tecla. Conecta, espera connect, dispara o Click, fecha.
pub async fn send_key(host: &str, token: Option<&str>, key: &str) -> Result<()> {
    let (mut ws, _) = connect_ws(host, APP_NAME, token).await?;

    // Espera o evento `ms.channel.connect` com timeout curto — token salvo
    // não dispara popup, então é instantâneo.
    tokio::time::timeout(COMMAND_TIMEOUT, async {
        loop {
            let msg = ws
                .next()
                .await
                .ok_or_else(|| anyhow!("WS fechou sem connect"))??;
            if let Message::Text(t) = msg {
                let v: serde_json::Value = serde_json::from_str(&t)?;
                if v.get("event").and_then(|e| e.as_str()) == Some("ms.channel.connect") {
                    return Ok::<_, anyhow::Error>(());
                }
            }
        }
    })
    .await
    .map_err(|_| anyhow!("Tempo esgotado no connect"))??;

    let payload = serde_json::json!({
        "method": "ms.remote.control",
        "params": {
            "Cmd": "Click",
            "DataOfCmd": key,
            "Option": "false",
            "TypeOfRemote": "SendRemoteKey",
        }
    });
    ws.send(Message::Text(payload.to_string())).await?;
    let _ = ws.close(None).await;
    Ok(())
}

// ─────────────────────────── WS connect helper ───────────────────────────

type WsStream = tokio_tungstenite::WebSocketStream<
    tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
>;

async fn connect_ws(
    host: &str,
    name: &str,
    token: Option<&str>,
) -> Result<(WsStream, tokio_tungstenite::tungstenite::handshake::client::Response)> {
    let name_b64 = base64::engine::general_purpose::STANDARD.encode(name.as_bytes());
    let mut url = format!(
        "wss://{}:{}/api/v2/channels/samsung.remote.control?name={}",
        host, SECURE_PORT, name_b64
    );
    if let Some(t) = token.filter(|s| !s.is_empty()) {
        url.push_str(&format!("&token={}", t));
    }
    let uri: Uri = url.parse().context("URL Samsung inválida")?;
    let req = uri.into_client_request().context("falha req WS")?;

    let connector = Connector::Rustls(Arc::new(insecure_tls_config()));
    tokio_tungstenite::connect_async_tls_with_config(req, None, false, Some(connector))
        .await
        .with_context(|| format!("connect Samsung {} falhou", host))
        .map(|(ws, resp)| (ws, resp))
}

fn insecure_tls_config() -> rustls::ClientConfig {
    // Aceita qualquer cert — TVs Samsung têm cert auto-assinado e não há
    // forma de validar fora do par TV+app. Tráfego é LAN.
    use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
    use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
    use rustls::{DigitallySignedStruct, SignatureScheme};

    #[derive(Debug)]
    struct NoVerify;
    impl ServerCertVerifier for NoVerify {
        fn verify_server_cert(
            &self,
            _ee: &CertificateDer<'_>,
            _intermediates: &[CertificateDer<'_>],
            _server_name: &ServerName<'_>,
            _ocsp_response: &[u8],
            _now: UnixTime,
        ) -> Result<ServerCertVerified, rustls::Error> {
            Ok(ServerCertVerified::assertion())
        }
        fn verify_tls12_signature(
            &self,
            _: &[u8],
            _: &CertificateDer<'_>,
            _: &DigitallySignedStruct,
        ) -> Result<HandshakeSignatureValid, rustls::Error> {
            Ok(HandshakeSignatureValid::assertion())
        }
        fn verify_tls13_signature(
            &self,
            _: &[u8],
            _: &CertificateDer<'_>,
            _: &DigitallySignedStruct,
        ) -> Result<HandshakeSignatureValid, rustls::Error> {
            Ok(HandshakeSignatureValid::assertion())
        }
        fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
            vec![
                SignatureScheme::RSA_PKCS1_SHA256,
                SignatureScheme::RSA_PKCS1_SHA384,
                SignatureScheme::RSA_PKCS1_SHA512,
                SignatureScheme::RSA_PSS_SHA256,
                SignatureScheme::RSA_PSS_SHA384,
                SignatureScheme::RSA_PSS_SHA512,
                SignatureScheme::ECDSA_NISTP256_SHA256,
                SignatureScheme::ECDSA_NISTP384_SHA384,
                SignatureScheme::ED25519,
            ]
        }
    }

    rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(NoVerify))
        .with_no_client_auth()
}
