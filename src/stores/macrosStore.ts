// Macros — sequências de comandos com 1 click.
// Cada macro tem um nome + lista de passos (comando, texto, app, delay).
// Persiste local. Pro feature.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Command } from "@/lib/commands";

export type MacroStep =
  | { type: "command"; command: Command }
  | { type: "text"; text: string }
  | { type: "app"; appId: string; brand: "roku" | "lg" | "sony" | "androidtv" }
  | { type: "delay"; ms: number };

export interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
  /** Atalho de teclado opcional (ex.: "ctrl+shift+1"). */
  hotkey?: string;
}

interface MacrosState {
  macros: Macro[];
  add: (m: Omit<Macro, "id">) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Macro>) => void;
}

export const useMacrosStore = create<MacrosState>()(
  persist(
    (set) => ({
      macros: [],
      add: (m) =>
        set((s) => ({
          macros: [...s.macros, { ...m, id: crypto.randomUUID() }],
        })),
      remove: (id) =>
        set((s) => ({ macros: s.macros.filter((m) => m.id !== id) })),
      update: (id, patch) =>
        set((s) => ({
          macros: s.macros.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
    }),
    {
      name: "remoctrl.macros",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
