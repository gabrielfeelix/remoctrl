// Store das TVs — lista salva + qual está selecionada agora.
//
// Persistência: tauri-plugin-store (JSON em app data dir).
// Em modo browser puro (npm run dev) cai pra localStorage.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TvDevice } from "@/types";

interface TvState {
  /** TVs que o usuário já adicionou (manualmente ou via discovery). */
  saved: TvDevice[];
  /** ID da TV selecionada (a que recebe os comandos do remote). */
  selectedId: string | null;

  addTv: (tv: TvDevice) => void;
  removeTv: (id: string) => void;
  selectTv: (id: string | null) => void;
  /** Atualiza label/host/token de uma TV existente. */
  updateTv: (id: string, patch: Partial<TvDevice>) => void;
  /** Pega a TV selecionada (helper, evita repetir find). */
  selected: () => TvDevice | null;
}

export const useTvStore = create<TvState>()(
  persist(
    (set, get) => ({
      saved: [],
      selectedId: null,

      addTv: (tv) =>
        set((s) => {
          // Se já existe pelo host+brand, atualiza ao invés de duplicar
          const existing = s.saved.find(
            (t) => t.host === tv.host && t.brand === tv.brand,
          );
          if (existing) {
            return {
              saved: s.saved.map((t) =>
                t.id === existing.id ? { ...t, ...tv, id: existing.id } : t,
              ),
              selectedId: s.selectedId ?? existing.id,
            };
          }
          return {
            saved: [...s.saved, tv],
            // Auto-seleciona se for a primeira TV adicionada
            selectedId: s.selectedId ?? tv.id,
          };
        }),

      removeTv: (id) =>
        set((s) => {
          const next = s.saved.filter((t) => t.id !== id);
          return {
            saved: next,
            selectedId:
              s.selectedId === id ? next[0]?.id ?? null : s.selectedId,
          };
        }),

      selectTv: (id) => set({ selectedId: id }),

      updateTv: (id, patch) =>
        set((s) => ({
          saved: s.saved.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      selected: () => {
        const { saved, selectedId } = get();
        return saved.find((t) => t.id === selectedId) ?? null;
      },
    }),
    {
      name: "remoctrl.tvs",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ saved: s.saved, selectedId: s.selectedId }),
    },
  ),
);
