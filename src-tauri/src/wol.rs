// Wake-on-LAN — manda o magic packet pra ligar a TV.
//
// Magic packet = 6 bytes 0xFF + 16 cópias do MAC (96 bytes total).
//
// Estratégia "shotgun" (igual ao app oficial da Roku): manda pro broadcast
// LIMITADO (255.255.255.255) E pro broadcast DIRECIONADO da subnet da TV
// (ex: 192.168.0.255 quando a TV tá em 192.168.0.X), nas portas 9 E 7,
// 5x cada. Muitos roteadores domésticos descartam 255.255.255.255 mas
// roteiam o broadcast direcionado normalmente — sem isso o pacote nem
// chega à TV em WPA2/WPA3 com APs Wi-Fi modernos.
//
// Pra Roku/Samsung/LG/Sony funcionar, o equivalente de "Network Standby"
// precisa estar ON: Roku=Fast TV Start, Samsung=WiseLink/Network Standby,
// LG=Mobile TV On, Sony=Remote Start.

use anyhow::{anyhow, Context, Result};
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};
use std::time::Duration;

/// Envia magic packet pra `mac`. Se `host_ip` for `Some`, também manda pro
/// broadcast direcionado da subnet /24 (mais confiável que o limitado).
pub fn wake(mac: &str, host_ip: Option<&str>) -> Result<()> {
    let bytes = parse_mac(mac)?;
    let mut packet = Vec::with_capacity(102);
    packet.extend_from_slice(&[0xFFu8; 6]);
    for _ in 0..16 {
        packet.extend_from_slice(&bytes);
    }

    let socket = UdpSocket::bind(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0))
        .context("não consegui abrir socket UDP")?;
    socket.set_broadcast(true).context("ativar broadcast")?;

    // Lista de destinos: broadcast limitado + (se tivermos IP) broadcast
    // direcionado da subnet /24.
    let mut targets: Vec<Ipv4Addr> = vec![Ipv4Addr::BROADCAST];
    if let Some(ip) = host_ip.and_then(|s| s.parse::<Ipv4Addr>().ok()) {
        let oct = ip.octets();
        // Subnet /24 — assume máscara 255.255.255.0 (cobre 99% das redes
        // domésticas). Mesmo se a real for /16, esse broadcast direcionado
        // ainda funciona pra TVs na mesma /24.
        targets.push(Ipv4Addr::new(oct[0], oct[1], oct[2], 255));
    }

    // Portas WoL clássicas: 9 (discard, padrão) e 7 (echo, alguns devices)
    let ports: [u16; 2] = [9, 7];

    // 5 bursts por par (target, port) com 80ms de delay — UDP é unreliable
    // e Wi-Fi tem jitter; bursts melhoram drasticamente a chance de chegar.
    for _ in 0..5 {
        for t in &targets {
            for p in &ports {
                let _ = socket.send_to(&packet, SocketAddrV4::new(*t, *p));
            }
        }
        std::thread::sleep(Duration::from_millis(80));
    }

    Ok(())
}

fn parse_mac(s: &str) -> Result<[u8; 6]> {
    let cleaned: String = s.chars().filter(|c| c.is_ascii_hexdigit()).collect();
    if cleaned.len() != 12 {
        return Err(anyhow!("MAC inválido — esperava 12 hex digits, recebi {cleaned}"));
    }
    let mut out = [0u8; 6];
    for i in 0..6 {
        out[i] = u8::from_str_radix(&cleaned[i * 2..i * 2 + 2], 16)
            .with_context(|| format!("MAC byte {i} inválido"))?;
    }
    Ok(out)
}
