// Helpers compartilhados entre CustomShortcuts e ShortcutEditorModal.

import type { Command } from "@/lib/commands";

export const COMMAND_LABEL: Record<Command, string> = {
  Up: "Cima",
  Down: "Baixo",
  Left: "Esquerda",
  Right: "Direita",
  Ok: "OK / Selecionar",
  Select: "OK / Selecionar",
  Back: "Voltar",
  Home: "Início",
  Play: "Play",
  Pause: "Pausar",
  PlayPause: "Play / Pause",
  VolumeUp: "Volume +",
  VolumeDown: "Volume −",
  Mute: "Mudo",
  VolumeMute: "Mudo",
  ChannelUp: "Canal +",
  ChannelDown: "Canal −",
  Power: "Liga / Desliga",
  PowerOff: "Liga / Desliga",
  Info: "Info",
  Rev: "Voltar (mídia)",
  Fwd: "Avançar (mídia)",
  InstantReplay: "Replay",
  InputTuner: "TV (antena)",
  InputHDMI1: "HDMI 1",
  InputHDMI2: "HDMI 2",
  InputHDMI3: "HDMI 3",
  InputHDMI4: "HDMI 4",
};

/** Combo "ctrl+shift+KeyN" → "Ctrl + Shift + N" pra exibição amigável. */
export function prettyCombo(c: string): string {
  return c
    .split("+")
    .map((p) => {
      const key = p.trim();
      if (key === "ctrl") return "Ctrl";
      if (key === "meta") return "⌘";
      if (key === "alt") return "Alt";
      if (key === "shift") return "Shift";
      if (key.startsWith("Key")) return key.slice(3);
      if (key.startsWith("Digit")) return key.slice(5);
      return key;
    })
    .join(" + ");
}
