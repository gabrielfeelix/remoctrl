// Wrapper tipado em torno do `invoke` do Tauri.
// Centraliza a superfície IPC pra:
//   - tipos checados (sem string mágica espalhada)
//   - tratamento uniforme de erro
//   - facilitar mock em testes futuros

import { invoke } from "@tauri-apps/api/core";
import type { RokuApp, RokuDeviceInfo, RokuKey, TvDevice } from "@/types";

export async function ping() {
  return invoke<string>("ping");
}

export async function discoverTvs(timeoutMs = 3000) {
  return invoke<TvDevice[]>("discover_tvs", { timeoutMs });
}

export async function rokuSendKey(host: string, key: RokuKey | string) {
  return invoke<void>("roku_send_key", { host, key });
}

export async function rokuTypeText(host: string, text: string) {
  return invoke<void>("roku_type_text", { host, text });
}

export async function rokuLaunchApp(
  host: string,
  appId: string,
  contentId?: string,
  mediaType?: string,
) {
  return invoke<void>("roku_launch_app", {
    host,
    appId,
    contentId,
    mediaType,
  });
}

export async function rokuSearch(host: string, query: string) {
  return invoke<void>("roku_search", { host, query });
}

export async function rokuListApps(host: string) {
  return invoke<RokuApp[]>("roku_list_apps", { host });
}

export async function rokuDeviceInfo(host: string) {
  return invoke<RokuDeviceInfo>("roku_device_info", { host });
}

export async function rokuIsReachable(host: string) {
  return invoke<boolean>("roku_is_reachable", { host });
}

export async function setAlwaysOnTop(value: boolean) {
  return invoke<void>("set_always_on_top", { value });
}

/** Manda magic packet pra ligar a TV (Wake-on-LAN). Requer MAC salvo. */
export async function wakeOnLan(mac: string) {
  return invoke<void>("wake_on_lan", { mac });
}

/** Registra um atalho global (foco/show da janela). Combo tipo "Ctrl+Shift+N". */
export async function registerShowShortcut(combo: string) {
  return invoke<void>("register_show_shortcut", { combo });
}

/** Cancela TODOS os atalhos globais do app. */
export async function unregisterShowShortcut() {
  return invoke<void>("unregister_show_shortcut");
}

/** Aplica tamanho + posição atomicamente via Rust. Bypassa o bug do
 * Windows com setSize quando decorations:false. Tamanhos em LOGICAL px. */
export async function setWindowBounds(width: number, height: number, x: number, y: number) {
  return invoke<void>("set_window_bounds", { width, height, x, y });
}

/** Detecta se estamos dentro do shell Tauri (vs. browser puro do `npm run dev`). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
