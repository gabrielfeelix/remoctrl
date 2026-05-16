// Discovery — encontra TVs na LAN sem o usuário precisar digitar IP.
//
// SSDP (Simple Service Discovery Protocol):
//   - mandamos um M-SEARCH multicast em UDP 239.255.255.250:1900
//   - cada TV responde com seus serviços
//   - pegamos o LOCATION (URL do device descriptor) + ST (service type)
//
// Critérios de identificação por marca:
//   Roku    → ST = "roku:ecp"
//   Samsung → ST/USN contendo "samsung" + "RemoteControlReceiver" ou "MediaRenderer"
//   LG      → USN contendo "lge" ou ST = "urn:lge-com:service:webos-second-screen:1"
//
// O timeout é curto: a meta de UX é "TV achada em ≤ 3s".

use crate::tv::{TvBrand, TvDevice};
use anyhow::Result;
use ssdp_client::SearchTarget;
use std::time::Duration;
use tracing::{debug, warn};

/// Descobre TVs na LAN via SSDP + mDNS rodados em paralelo.
/// `timeout_ms` controla quanto tempo escutamos.
pub async fn discover(timeout_ms: u64) -> Result<Vec<TvDevice>> {
    // SSDP e mDNS em paralelo — diferentes protocolos, sem dependência.
    let (ssdp_found, mdns_found) = tokio::join!(
        discover_ssdp(timeout_ms),
        discover_mdns(timeout_ms),
    );
    let mut found = ssdp_found.unwrap_or_default();
    for tv in mdns_found.unwrap_or_default() {
        // Dedupe por host+brand — SSDP e mDNS podem encontrar a mesma TV.
        if !found.iter().any(|d| d.host == tv.host && d.brand == tv.brand) {
            found.push(tv);
        }
    }
    Ok(found)
}

/// SSDP — pega Roku/Samsung/LG/Sony que anunciam via UPnP.
async fn discover_ssdp(timeout_ms: u64) -> Result<Vec<TvDevice>> {
    let mut found: Vec<TvDevice> = Vec::new();

    // Buscamos por todos os devices (`ssdp:all`). É mais barulhento mas captura
    // Roku, Samsung e LG numa única varredura.
    let timeout = Duration::from_millis(timeout_ms);
    let search_target = SearchTarget::All;

    let stream_result = ssdp_client::search(&search_target, timeout, 2, None).await;
    let mut stream = match stream_result {
        Ok(s) => s,
        Err(e) => {
            warn!("ssdp::search falhou: {e}");
            return Ok(found);
        }
    };

    use futures_util::StreamExt;
    while let Some(item) = stream.next().await {
        match item {
            Ok(resp) => {
                let st = resp.search_target().to_string();
                let usn = resp.usn().to_string();
                let location = resp.location().to_string();
                let host = host_from_location(&location);
                let brand = classify(&st, &usn);

                debug!("ssdp ST={st} USN={usn} LOC={location}");

                if brand == TvBrand::Unknown {
                    continue;
                }
                let host = match host {
                    Some(h) => h,
                    None => continue,
                };
                // Evita duplicatas por host+marca
                if found.iter().any(|d| d.host == host && d.brand == brand) {
                    continue;
                }
                found.push(TvDevice {
                    id: format!("{}-{}", brand_str(brand), host),
                    label: default_label(brand, &host),
                    brand,
                    host,
                    auth_token: None,
                });
            }
            Err(e) => warn!("ssdp item err: {e}"),
        }
    }

    Ok(found)
}

fn classify(st: &str, usn: &str) -> TvBrand {
    let s = format!("{} {}", st.to_ascii_lowercase(), usn.to_ascii_lowercase());
    if s.contains("roku:ecp") || s.contains("roku") {
        TvBrand::Roku
    } else if s.contains("samsung") {
        TvBrand::Samsung
    } else if s.contains("lge") || s.contains("webos") {
        TvBrand::Lg
    } else if s.contains("sony") || s.contains("schemas-sony-com") || s.contains("bravia") {
        TvBrand::Sony
    } else if s.contains("philips") || s.contains("jointspace") {
        TvBrand::Philips
    } else {
        TvBrand::Unknown
    }
}

fn brand_str(b: TvBrand) -> &'static str {
    match b {
        TvBrand::Roku => "roku",
        TvBrand::Samsung => "samsung",
        TvBrand::Lg => "lg",
        TvBrand::Sony => "sony",
        TvBrand::AndroidTv => "androidtv",
        TvBrand::Philips => "philips",
        TvBrand::Unknown => "unknown",
    }
}

fn default_label(brand: TvBrand, host: &str) -> String {
    match brand {
        TvBrand::Roku => format!("Roku ({host})"),
        TvBrand::Samsung => format!("Samsung ({host})"),
        TvBrand::Lg => format!("LG ({host})"),
        TvBrand::Sony => format!("Sony ({host})"),
        TvBrand::AndroidTv => format!("Android TV ({host})"),
        TvBrand::Philips => format!("Philips ({host})"),
        TvBrand::Unknown => format!("TV ({host})"),
    }
}

/// Extrai só o host (IP/hostname) de uma URL tipo "http://192.168.0.10:8060/...".
fn host_from_location(location: &str) -> Option<String> {
    let url = url::Url::parse(location).ok()?;
    url.host_str().map(|s| s.to_string())
}

/// mDNS — Android TV anuncia `_androidtvremote2._tcp` (Google TV Remote v2).
/// Também detectamos `_adb-tls-connect._tcp` (Wireless Debugging) e
/// `_androidtvremote._tcp` (Remote v1 / legacy) como sinais.
///
/// Capturamos só o IP — a porta ADB é diferente da do Remote v2 e é dinâmica;
/// usuário ainda precisa setar manualmente no AddTVModal. Mas o IP correto
/// já reduz pela metade o tempo de adicionar a TV.
async fn discover_mdns(timeout_ms: u64) -> Result<Vec<TvDevice>> {
    use mdns_sd::{ServiceDaemon, ServiceEvent};
    let mut found: Vec<TvDevice> = Vec::new();

    let daemon = match ServiceDaemon::new() {
        Ok(d) => d,
        Err(e) => {
            warn!("mDNS daemon falhou: {e}");
            return Ok(found);
        }
    };

    // Serviços que indicam Android TV / Google TV
    const SERVICES: &[&str] = &[
        "_androidtvremote2._tcp.local.",
        "_androidtvremote._tcp.local.",
        "_adb-tls-connect._tcp.local.",
    ];

    let mut receivers = Vec::with_capacity(SERVICES.len());
    for svc in SERVICES {
        match daemon.browse(svc) {
            Ok(rx) => receivers.push(rx),
            Err(e) => warn!("mDNS browse({svc}) falhou: {e}"),
        }
    }

    let deadline = tokio::time::Instant::now()
        + Duration::from_millis(timeout_ms.min(5000));

    loop {
        if tokio::time::Instant::now() >= deadline {
            break;
        }
        // Drena cada receiver até timeout curto (50ms) — round-robin barato.
        for rx in &receivers {
            if let Ok(ev) = rx.recv_timeout(Duration::from_millis(50)) {
                if let ServiceEvent::ServiceResolved(info) = ev {
                    let host = info
                        .get_addresses()
                        .iter()
                        .find(|a| a.is_ipv4())
                        .map(|a| a.to_string());
                    let Some(host) = host else { continue };
                    if found.iter().any(|d| d.host == host && d.brand == TvBrand::AndroidTv) {
                        continue;
                    }
                    debug!(
                        "mDNS resolved Android TV: {} @ {}",
                        info.get_fullname(),
                        host
                    );
                    found.push(TvDevice {
                        id: format!("{}-{}", brand_str(TvBrand::AndroidTv), host),
                        label: default_label(TvBrand::AndroidTv, &host),
                        brand: TvBrand::AndroidTv,
                        host,
                        auth_token: None,
                    });
                }
            }
        }
    }

    // Limpa: para o daemon (importante: senão fica vazando socket multicast).
    let _ = daemon.shutdown();
    Ok(found)
}


