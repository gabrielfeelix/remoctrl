// Atalhos de teclado customizáveis.
// Mapeia uma combinação (ex.: "F1", "ctrl+1") pra um Command lógico ou Macro id.
// Pro feature.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Command } from "@/lib/commands";

export interface CustomShortcut {
  id: string;
  combo: string; // ex.: "F1", "ctrl+1", "shift+m"
  /** Tipo do alvo. Comando = simples; macro = roda toda a sequência. */
  target:
    | { kind: "command"; command: Command }
    | { kind: "macro"; macroId: string };
  enabled: boolean;
}

interface ShortcutsState {
  items: CustomShortcut[];
  add: (s: Omit<CustomShortcut, "id">) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<CustomShortcut>) => void;
  toggle: (id: string) => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set) => ({
      items: [],
      add: (s) =>
        set((st) => ({ items: [...st.items, { ...s, id: crypto.randomUUID() }] })),
      remove: (id) =>
        set((st) => ({ items: st.items.filter((i) => i.id !== id) })),
      update: (id, patch) =>
        set((st) => ({
          items: st.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      toggle: (id) =>
        set((st) => ({
          items: st.items.map((i) =>
            i.id === id ? { ...i, enabled: !i.enabled } : i,
          ),
        })),
    }),
    {
      name: "remoctrl.shortcuts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
