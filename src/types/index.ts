// Tipos espelhando os structs do Rust em src-tauri/src/tv/.
// Mantenha em sincronia com mod.rs e roku.rs.

export type TvBrand = "roku" | "samsung" | "lg" | "sony" | "unknown";

export interface TvDevice {
  id: string;
  label: string;
  brand: TvBrand;
  host: string;
  auth_token?: string | null;
  /** MAC address pra Wake-on-LAN (formato AA:BB:CC:DD:EE:FF). Opcional. */
  mac?: string | null;
}

export interface RokuApp {
  id: string;
  name: string;
  kind: string;
  version?: string | null;
  icon_url: string;
}

/** App listado pelo LG webOS (`launchPoints`). */
export interface LgApp {
  id: string;
  title: string;
  icon_url: string;
}

export interface RokuDeviceInfo {
  friendly_name?: string | null;
  model_name?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  network_type?: string | null;
  power_mode?: string | null;
}

/**
 * Teclas que a Roku ECP aceita.
 * Não vira enum por escolha — passamos string crua pro backend e fica fácil
 * adicionar novas sem mexer em 4 arquivos.
 */
export type RokuKey =
  | "Up" | "Down" | "Left" | "Right" | "Select"
  | "Back" | "Home"
  | "Play" | "Rev" | "Fwd" | "InstantReplay" | "Info"
  | "VolumeUp" | "VolumeDown" | "VolumeMute"
  | "ChannelUp" | "ChannelDown"
  | "PowerOff"
  | "InputTuner" | "InputHDMI1" | "InputHDMI2" | "InputHDMI3" | "InputHDMI4" | "InputAV1"
  | "Search" | "Enter" | "Backspace";
