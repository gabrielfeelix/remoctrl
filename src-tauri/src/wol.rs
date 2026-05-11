// Wake-on-LAN — manda o magic packet pra ligar a TV.
//
// Magic packet = 6 bytes 0xFF + 16 cópias do MAC (96 bytes total).
// Enviado em UDP broadcast 255.255.255.255:9.
//
// Funciona pra qualquer device com WoL habilitado na BIOS/firmware
// (LG: Settings → Network → Mobile TV On → On via LAN).

use anyhow::{anyhow, Context, Result};
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};

/// Envia magic packet pra `mac` (formato "AA:BB:CC:DD:EE:FF" ou "AA-BB...").
pub fn wake(mac: &str) -> Result<()> {
    let bytes = parse_mac(mac)?;
    let mut packet = Vec::with_capacity(102);
    packet.extend_from_slice(&[0xFFu8; 6]);
    for _ in 0..16 {
        packet.extend_from_slice(&bytes);
    }

    let socket = UdpSocket::bind(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0))
        .context("não consegui abrir socket UDP")?;
    socket.set_broadcast(true).context("ativar broadcast")?;
    let target = SocketAddrV4::new(Ipv4Addr::BROADCAST, 9);
    socket
        .send_to(&packet, target)
        .with_context(|| format!("send_to {target} falhou"))?;
    // Manda 3x — pacote UDP é unreliable, melhorar a chance de chegar
    let _ = socket.send_to(&packet, target);
    let _ = socket.send_to(&packet, target);
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
