// Adapter Roku — protocolo ECP (External Control Protocol).
// Doc oficial: https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md
//
// Endpoints usados:
//   POST /keypress/<KEY>                    — manda uma tecla (Up/Down/Select/...)
//   POST /keypress/Lit_<URL_ENCODED_CHAR>   — digita um caractere
//   POST /launch/<APP_ID>?contentId=&...    — abre um app, opcional content
//   POST /search/browse?keyword=&...        — abre busca
//   GET  /query/device-info                 — info do device (XML)
//   GET  /query/apps                        — lista de apps (XML)
//
// Roku NÃO usa autenticação — qualquer um na LAN pode controlar.
// O usuário precisa habilitar "Permissive Mode" em Configurações > Sistema > Controle.

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::time::Duration;

const ECP_PORT: u16 = 8060;
/// Timeout curto — em LAN, qualquer coisa acima disso é a TV não respondendo.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(3);

/// App instalado na Roku (vem do /query/apps).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RokuApp {
    pub id: String,
    pub name: String,
    /// Tipo: "appl" pra apps normais, "tvin" pra inputs (HDMI/TV)
    #[serde(default)]
    pub kind: String,
    pub version: Option<String>,
    /// URL do ícone (servida pela própria TV em /query/icon/<id>)
    pub icon_url: String,
}

/// Info básica do device (vem do /query/device-info).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RokuDeviceInfo {
    pub friendly_name: Option<String>,
    pub model_name: Option<String>,
    pub model_number: Option<String>,
    pub serial_number: Option<String>,
    pub network_type: Option<String>,
    pub power_mode: Option<String>,
}

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .expect("falha ao criar reqwest client")
}

fn base(host: &str) -> String {
    format!("http://{}:{}", host, ECP_PORT)
}

/// Envia uma tecla simples — equivalente a apertar o botão no remote físico.
/// Lista canônica: Home, Rev, Fwd, Play, Select, Left, Right, Down, Up, Back,
/// InstantReplay, Info, Backspace, Search, Enter, VolumeDown, VolumeMute,
/// VolumeUp, PowerOff, ChannelUp, ChannelDown, InputTuner, InputHDMI1..4, InputAV1.
pub async fn send_key(host: &str, key: &str) -> Result<()> {
    let url = format!("{}/keypress/{}", base(host), urlencode(key));
    let res = http()
        .post(&url)
        .send()
        .await
        .with_context(|| format!("POST {} falhou", url))?;
    if !res.status().is_success() {
        return Err(anyhow!("ECP {} respondeu {}", url, res.status()));
    }
    Ok(())
}

/// Digita um texto char-por-char usando os comandos `Lit_<char>`.
/// Útil quando aparece o teclado virtual da TV (busca, login, etc.).
pub async fn type_text(host: &str, text: &str) -> Result<()> {
    let client = http();
    for ch in text.chars() {
        // Cada caractere vira um POST /keypress/Lit_<urlencode(ch)>.
        // A TV consome um por vez — no ref roku.html há 10ms de delay entre eles
        // pra não atropelar o handler. Mantemos a mesma cadência aqui.
        let mut buf = [0u8; 4];
        let s = ch.encode_utf8(&mut buf);
        let url = format!("{}/keypress/Lit_{}", base(host), urlencode(s));
        client
            .post(&url)
            .send()
            .await
            .with_context(|| format!("POST {} falhou", url))?;
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    Ok(())
}

/// Lança um app — opcionalmente passando contentId/mediaType pra abrir
/// direto num filme/série específico (Netflix/YouTube/etc.).
///
/// Roku ECP espera o app_id CRU no path: /launch/<id>. Não pode ser
/// URL-encoded (encoder mete %0A etc.). Trim espaços defensivamente.
pub async fn launch_app(
    host: &str,
    app_id: &str,
    content_id: Option<&str>,
    media_type: Option<&str>,
) -> Result<()> {
    let id = app_id.trim();
    let mut url = format!("{}/launch/{}", base(host), id);
    let mut params: Vec<(&str, &str)> = Vec::new();
    if let Some(c) = content_id.filter(|s| !s.is_empty()) {
        params.push(("contentId", c));
    }
    if let Some(m) = media_type.filter(|s| !s.is_empty()) {
        params.push(("mediaType", m));
    }
    if !params.is_empty() {
        let qs: Vec<String> = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, urlencode(v)))
            .collect();
        url = format!("{}?{}", url, qs.join("&"));
    }
    tracing::info!("Roku launch POST → {}", url);
    let res = http().post(&url).send().await?;
    if !res.status().is_success() {
        return Err(anyhow!(
            "launch respondeu {} (URL: {} · app_id={:?})",
            res.status(),
            url,
            id
        ));
    }
    Ok(())
}

/// Abre a tela de busca universal da Roku com `query` preenchida.
/// `launch=true` faz a Roku auto-abrir o melhor resultado quando há match
/// exato (Netflix, Crunchyroll, Globoplay, Prime, etc. todos indexam aqui).
/// Quando não há match perfeito, a tela de resultados fica aberta.
pub async fn search(host: &str, query: &str) -> Result<()> {
    let mut url =
        url::Url::parse(&format!("{}/search/browse", base(host))).context("URL inválida")?;
    url.query_pairs_mut()
        .append_pair("keyword", query)
        .append_pair("match-any", "true")
        .append_pair("launch", "true");
    let res = http().post(url.as_str()).send().await?;
    if !res.status().is_success() {
        return Err(anyhow!("search respondeu {}", res.status()));
    }
    Ok(())
}

/// Lista os apps instalados. Resposta XML:
/// <apps>
///   <app id="..." type="appl" version="...">Netflix</app>
///   ...
/// </apps>
pub async fn list_apps(host: &str) -> Result<Vec<RokuApp>> {
    let url = format!("{}/query/apps", base(host));
    let body = http().get(&url).send().await?.text().await?;
    parse_apps_xml(&body, host)
}

/// Pega info do device. XML com vários elementos — pegamos os mais úteis.
pub async fn device_info(host: &str) -> Result<RokuDeviceInfo> {
    let url = format!("{}/query/device-info", base(host));
    let body = http().get(&url).send().await?.text().await?;
    parse_device_info_xml(&body)
}

/// Ping rápido — usado pelo indicador de conexão (verde/vermelho).
pub async fn is_reachable(host: &str) -> bool {
    let url = format!("{}/query/device-info", base(host));
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .unwrap();
    matches!(client.get(&url).send().await, Ok(r) if r.status().is_success())
}

// ---------- helpers ----------

fn urlencode(s: &str) -> String {
    // Encoder leve só pra path components do ECP. `url::form_urlencoded` é overkill
    // mas garante consistência com caracteres exóticos no Lit_*.
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

fn parse_apps_xml(xml: &str, host: &str) -> Result<Vec<RokuApp>> {
    use quick_xml::events::Event;
    use quick_xml::reader::Reader;

    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut apps = Vec::new();
    let mut buf = Vec::new();

    let mut current: Option<RokuApp> = None;
    let mut in_app = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) if e.name().as_ref() == b"app" => {
                let mut id = String::new();
                let mut kind = String::new();
                let mut version = None;
                for attr in e.attributes().flatten() {
                    match attr.key.as_ref() {
                        b"id" => {
                            id = attr.unescape_value().unwrap_or_default().trim().to_string()
                        }
                        b"type" => {
                            kind = attr.unescape_value().unwrap_or_default().trim().to_string()
                        }
                        b"version" => {
                            version = Some(
                                attr.unescape_value().unwrap_or_default().trim().to_string(),
                            )
                        }
                        _ => {}
                    }
                }
                // Icon URL: id RAW (não encoded — Roku usa path direto)
                let icon_url = format!("http://{}:{}/query/icon/{}", host, ECP_PORT, id);
                current = Some(RokuApp {
                    id,
                    name: String::new(),
                    kind,
                    version,
                    icon_url,
                });
                in_app = true;
            }
            Ok(Event::Text(e)) if in_app => {
                if let Some(app) = current.as_mut() {
                    app.name.push_str(&e.unescape().unwrap_or_default());
                }
            }
            Ok(Event::End(e)) if e.name().as_ref() == b"app" => {
                if let Some(app) = current.take() {
                    apps.push(app);
                }
                in_app = false;
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(anyhow!("XML inválido em /query/apps: {e}")),
            _ => {}
        }
        buf.clear();
    }
    Ok(apps)
}

fn parse_device_info_xml(xml: &str) -> Result<RokuDeviceInfo> {
    use quick_xml::events::Event;
    use quick_xml::reader::Reader;

    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut info = RokuDeviceInfo::default();
    let mut buf = Vec::new();
    let mut current_tag: Option<String> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                current_tag = Some(String::from_utf8_lossy(e.name().as_ref()).into_owned());
            }
            Ok(Event::Text(e)) => {
                let val = e.unescape().unwrap_or_default().to_string();
                if let Some(tag) = current_tag.as_deref() {
                    match tag {
                        "friendly-device-name" | "user-device-name" => {
                            info.friendly_name.get_or_insert(val);
                        }
                        "model-name" => info.model_name = Some(val),
                        "model-number" => info.model_number = Some(val),
                        "serial-number" => info.serial_number = Some(val),
                        "network-type" => info.network_type = Some(val),
                        "power-mode" => info.power_mode = Some(val),
                        _ => {}
                    }
                }
            }
            Ok(Event::End(_)) => current_tag = None,
            Ok(Event::Eof) => break,
            Err(e) => return Err(anyhow!("XML inválido em /query/device-info: {e}")),
            _ => {}
        }
        buf.clear();
    }
    Ok(info)
}
