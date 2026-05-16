// Sony Bravia — IRCC-IP (Infrared Remote Control over IP) via HTTP+SOAP.
//
// Modelos: Bravia 2013+ (incluindo os atuais com Google TV — Sony manteve
// o endpoint legacy).
//
// Endpoint: POST http://<ip>/sony/IRCC
// Headers:
//   Content-Type: text/xml; charset=UTF-8
//   SOAPACTION: "urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"
//   X-Auth-PSK: <psk>           (se PSK ativado na TV)
//
// Body (SOAP envelope) contém o código IRCC base64 da tecla a enviar.
//
// Setup do usuário (uma vez por TV):
//   Configurações → Rede → Configurações Home Network → IP Control →
//   Autenticação → "Normal e Chave Pré-Compartilhada" → digite uma chave
//   (ex: 0000). Essa chave vira o `auth_token` da TV no Remoctrl.

use anyhow::{anyhow, Context, Result};
use reqwest::Client;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

/// Códigos IRCC base64 — mantenha em sincronia com `key_for()` no frontend.
/// Lista canônica: https://pro-bravia.sony.net/develop/integrate/ircc-ip/ircc-codes/
fn ircc_code(command: &str) -> Option<&'static str> {
    Some(match command {
        "Up" => "AAAAAQAAAAEAAAB0Aw==",
        "Down" => "AAAAAQAAAAEAAAB1Aw==",
        "Left" => "AAAAAQAAAAEAAAA0Aw==",
        "Right" => "AAAAAQAAAAEAAAAzAw==",
        "Ok" | "Select" => "AAAAAQAAAAEAAABlAw==",
        "Back" => "AAAAAgAAAJcAAAAjAw==",
        "Home" => "AAAAAQAAAAEAAABgAw==",
        "Play" => "AAAAAgAAAJcAAAAaAw==",
        "Pause" => "AAAAAgAAAJcAAAAZAw==",
        // Sony não tem Play/Pause toggle nativo confiável — Play funciona em quase tudo
        "PlayPause" => "AAAAAgAAAJcAAAAaAw==",
        "Rev" => "AAAAAgAAAJcAAAAbAw==",
        "Fwd" => "AAAAAgAAAJcAAAAcAw==",
        "InstantReplay" => "AAAAAgAAAJcAAAAbAw==", // sem replay dedicado — usa Rev
        "Info" => "AAAAAQAAAAEAAAA6Aw==",          // DisplayInfo
        "VolumeUp" => "AAAAAQAAAAEAAAASAw==",
        "VolumeDown" => "AAAAAQAAAAEAAAATAw==",
        "Mute" | "VolumeMute" => "AAAAAQAAAAEAAAAUAw==",
        "ChannelUp" => "AAAAAQAAAAEAAAAQAw==",
        "ChannelDown" => "AAAAAQAAAAEAAAARAw==",
        "Power" | "PowerOff" => "AAAAAQAAAAEAAAAVAw==",
        "InputTuner" => "AAAAAQAAAAEAAAAkAw==", // TV (sintonizador)
        "InputHDMI1" => "AAAAAgAAABoAAABaAw==",
        "InputHDMI2" => "AAAAAgAAABoAAABbAw==",
        "InputHDMI3" => "AAAAAgAAABoAAABcAw==",
        "InputHDMI4" => "AAAAAgAAABoAAABdAw==",
        _ => return None,
    })
}

const PORT: u16 = 80;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);
const REACHABILITY_TIMEOUT: Duration = Duration::from_secs(2);

fn client() -> Client {
    Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .expect("reqwest client build")
}

/// Envelope SOAP que a Sony espera. `code` é o IRCC base64.
fn soap_envelope(code: &str) -> String {
    format!(
        r#"<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
      <IRCCCode>{}</IRCCCode>
    </u:X_SendIRCC>
  </s:Body>
</s:Envelope>"#,
        code
    )
}

/// Manda uma tecla lógica pra TV. `psk` é a Pre-Shared Key (opcional).
pub async fn send_key(host: &str, psk: Option<&str>, command: &str) -> Result<()> {
    let code = ircc_code(command)
        .ok_or_else(|| anyhow!("Comando '{command}' não suportado em Sony Bravia"))?;
    let url = format!("http://{}/sony/IRCC", host);
    let mut req = client()
        .post(&url)
        .header("Content-Type", "text/xml; charset=UTF-8")
        .header(
            "SOAPACTION",
            "\"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC\"",
        )
        .body(soap_envelope(code));
    if let Some(k) = psk.filter(|s| !s.is_empty()) {
        req = req.header("X-Auth-PSK", k);
    }
    let res = req
        .send()
        .await
        .with_context(|| format!("POST {url} falhou"))?;
    if !res.status().is_success() {
        // 403 normalmente é PSK errado/desativado; 200 mesmo com erro às vezes vem
        return Err(anyhow!(
            "Sony respondeu {} — verifique IP e PSK em Configs → Rede → IP Control",
            res.status()
        ));
    }
    Ok(())
}

/// Ping rápido na porta 80 — alimenta o dot verde/vermelho.
pub async fn is_reachable(host: &str) -> bool {
    matches!(
        timeout(REACHABILITY_TIMEOUT, TcpStream::connect((host, PORT))).await,
        Ok(Ok(_))
    )
}
