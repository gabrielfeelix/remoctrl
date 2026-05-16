// Módulo `tv` — adapters por marca de TV.
//
// Sprint 1: só Roku está implementado de verdade.
// Sprint 2 vai introduzir a trait `TvController` + Samsung + LG.
//
// Mantemos os módulos `samsung` e `lg` aqui já como stubs por organização —
// quando a Sprint 2 chegar, é só preencher.

use serde::{Deserialize, Serialize};

pub mod roku;
#[allow(dead_code)]
pub mod samsung;
#[allow(dead_code)]
pub mod lg;
#[allow(dead_code)]
pub mod sony;
#[allow(dead_code)]
pub mod androidtv;

/// Identificação de uma TV — usado tanto pra TVs descobertas via SSDP
/// quanto pras TVs que o usuário já adicionou.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TvDevice {
    pub id: String,
    pub label: String,
    pub brand: TvBrand,
    pub host: String,
    /// Token / client_key (Samsung / LG). Roku não usa.
    #[serde(default)]
    pub auth_token: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TvBrand {
    Roku,
    Samsung,
    Lg,
    /// Sony Bravia — IRCC-IP via HTTP+SOAP. Auth_token = PSK opcional.
    Sony,
    /// Android TV / Google TV — ADB sobre TCP/IP. Cobre TCL, Hisense, Xiaomi,
    /// Sharp, AOC, Multilaser, Philips Android, Sony Google TV. Auth_token =
    /// "porta:porta" da depuração sem fio (porta dinâmica em Android 11+).
    #[serde(rename = "androidtv")]
    AndroidTv,
    /// Marca desconhecida (descoberta SSDP que não casou com nenhum padrão).
    Unknown,
}
