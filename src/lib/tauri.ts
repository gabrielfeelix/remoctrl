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

/** Detecta se estamos dentro do shell Tauri (vs. browser puro do `npm run dev`). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
