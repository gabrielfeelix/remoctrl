// Aplica os atalhos customizados — escuta keydown global e dispara
// o command/macro associado.

import { useEffect } from "react";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useMacrosStore } from "@/stores/macrosStore";
import { useTvStore } from "@/stores/tvStore";
import { useIsPro } from "@/stores/licenseStore";
import { sendCommand, sendText } from "@/lib/commands";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri";

/**
 * Normaliza um KeyboardEvent num combo string ("ctrl+shift+f1") pra comparar
 * com o que o usuário gravou.
 */
function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.metaKey) parts.push("meta");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  // Tecla principal — usamos `code` pra ser consistente entre layouts.
  // Ex.: "KeyN", "F1", "Digit1", "ArrowUp".
  parts.push(e.code);
  return parts.join("+").toLowerCase();
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    t.isContentEditable
  );
}

export function useCustomShortcuts() {
  const isPro = useIsPro();
  const items = useShortcutsStore((s) => s.items);
  const macros = useMacrosStore((s) => s.macros);
  const tv = useTvStore((s) => s.selected());

  useEffect(() => {
    if (!isPro || !tv) return;
    const handler = async (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const combo = eventToCombo(e);
      const sc = items.find(
        (i) => i.enabled && i.combo.toLowerCase() === combo,
      );
      if (!sc) return;
      e.preventDefault();

      try {
        if (sc.target.kind === "command") {
          await sendCommand(tv, sc.target.command);
          return;
        }
        const macroId = sc.target.macroId;
        const macro = macros.find((m) => m.id === macroId);
        if (!macro) return;
        for (const step of macro.steps) {
          if (step.type === "command") await sendCommand(tv, step.command);
          else if (step.type === "text") await sendText(tv, step.text);
          else if (step.type === "delay")
            await new Promise((r) => setTimeout(r, step.ms));
          else if (step.type === "app" && isTauri()) {
            if (step.brand === "roku") {
              await invoke("roku_launch_app", { host: tv.host, appId: step.appId });
            } else if (step.brand === "lg" && tv.auth_token) {
              await invoke("lg_launch_app", {
                host: tv.host,
                clientKey: tv.auth_token,
                appId: step.appId,
              });
            }
          }
        }
      } catch {
        /* silencioso — atalho fail não atrapalha o resto */
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPro, items, macros, tv]);
}
