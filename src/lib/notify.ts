// Notificações nativas — wrapper em torno do plugin Tauri.
// Lida com permission flow: pede uma vez, cacheia o resultado, no-op em browser.

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { isTauri } from "@/lib/tauri";

let permissionCache: "granted" | "denied" | "default" | null = null;

async function ensurePermission(): Promise<boolean> {
  if (!isTauri()) return false;
  if (permissionCache === "granted") return true;
  if (permissionCache === "denied") return false;
  try {
    const granted = await isPermissionGranted();
    if (granted) {
      permissionCache = "granted";
      return true;
    }
    const result = await requestPermission();
    permissionCache = result;
    return result === "granted";
  } catch {
    return false;
  }
}

/**
 * Manda uma notificação nativa do SO. Silencioso (false) em browser
 * ou se o usuário não permitiu. Não throwa nunca — best-effort.
 */
export async function notify(title: string, body?: string): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;
  try {
    sendNotification({ title, body });
    return true;
  } catch {
    return false;
  }
}
