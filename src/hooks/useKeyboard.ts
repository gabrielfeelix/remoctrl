// Atalhos de teclado — espelham o que tava no roku.html (linhas 1415+).
// Quando o foco está num <input>, ignoramos teclas de comando pra não
// disparar Up/Down enquanto o usuário digita.

import { useEffect } from "react";
import type { RokuKey } from "@/types";

interface Options {
  /** Chamado quando uma tecla de comando é detectada. */
  onKey: (key: RokuKey) => void;
  /** Chamado quando o usuário aperta `/` — abre/foca a busca. */
  onSlash?: () => void;
  /** Desabilita os atalhos (ex.: enquanto modal está aberto). */
  disabled?: boolean;
}

const KEY_MAP: Record<string, RokuKey> = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Enter: "Select",
  Backspace: "Back",
  Escape: "Back",
  " ": "Play",
  PageUp: "ChannelUp",
  PageDown: "ChannelDown",
};

const LETTER_MAP: Record<string, RokuKey> = {
  h: "Home",
  H: "Home",
  m: "VolumeMute",
  M: "VolumeMute",
  i: "Info",
  I: "Info",
  j: "Rev",
  J: "Rev",
  l: "Fwd",
  L: "Fwd",
  r: "InstantReplay",
  R: "InstantReplay",
  p: "PowerOff",
  P: "PowerOff",
  "+": "VolumeUp",
  "=": "VolumeUp", // Sem shift no =
  "-": "VolumeDown",
  _: "VolumeDown",
};

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  );
}

export function useKeyboard({ onKey, onSlash, disabled }: Options) {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      // Não interferir em digitação
      if (isTypingTarget(e.target)) return;
      // Ignorar combinações com Ctrl/Meta/Alt — deixa pra atalhos do sistema
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        onSlash?.();
        return;
      }

      const mapped = KEY_MAP[e.key] ?? LETTER_MAP[e.key];
      if (mapped) {
        e.preventDefault();
        onKey(mapped);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey, onSlash, disabled]);
}
