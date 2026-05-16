// Apps abertos recentemente — persiste localmente.
// Usado pra sugerir os 6 apps mais recentes na tela inicial de Apps.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface RecentApp {
  /** ID nativo da TV (Roku id ou LG launchPoint id). */
  appId: string;
  /** Marca da TV onde foi aberto — recents é por marca. */
  brand: "roku" | "lg" | "samsung" | "sony" | "androidtv";
  name: string;
  iconUrl?: string;
  lastOpenedAt: number;
}

interface RecentsState {
  items: RecentApp[];
  push: (app: RecentApp) => void;
  clear: () => void;
}

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      items: [],
      push: (app) =>
        set((s) => {
          // Move o app pro topo (ou adiciona se novo). Limita a 12 entradas
          // pra não inflar o storage.
          const filtered = s.items.filter(
            (i) => !(i.appId === app.appId && i.brand === app.brand),
          );
          return { items: [app, ...filtered].slice(0, 12) };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "remoctrl.recents",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
