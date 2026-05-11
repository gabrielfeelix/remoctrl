// Store de UI — flags transversais à interface (tab atual, modais, tema, AOT).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Tab = "remote" | "apps" | "macros" | "settings";
export type Theme = "dark" | "light";

interface UiState {
  tab: Tab;
  theme: Theme;
  alwaysOnTop: boolean;
  /** True após o usuário fechar o tutorial inicial — não mostra de novo. */
  onboardingDone: boolean;
  /** Modal "Adicionar TV" aberto? */
  addTvModalOpen: boolean;
  /** Modal de tutorial Roku/Samsung/LG (Permissive Mode / pareamento) aberto? */
  tutorialOpen: boolean;
  /** Modal de upgrade pra Pro aberto? */
  upgradeOpen: boolean;

  setTab: (t: Tab) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setAlwaysOnTop: (v: boolean) => void;
  toggleAlwaysOnTop: () => void;
  finishOnboarding: () => void;
  openAddTv: () => void;
  closeAddTv: () => void;
  openTutorial: () => void;
  closeTutorial: () => void;
  openUpgrade: () => void;
  closeUpgrade: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      tab: "remote",
      theme: "dark",
      alwaysOnTop: false,
      onboardingDone: false,
      addTvModalOpen: false,
      tutorialOpen: false,
      upgradeOpen: false,

      setTab: (t) => set({ tab: t }),
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setAlwaysOnTop: (v) => set({ alwaysOnTop: v }),
      toggleAlwaysOnTop: () => set((s) => ({ alwaysOnTop: !s.alwaysOnTop })),
      finishOnboarding: () => set({ onboardingDone: true }),
      openAddTv: () => set({ addTvModalOpen: true }),
      closeAddTv: () => set({ addTvModalOpen: false }),
      openTutorial: () => set({ tutorialOpen: true }),
      closeTutorial: () => set({ tutorialOpen: false }),
      openUpgrade: () => set({ upgradeOpen: true }),
      closeUpgrade: () => set({ upgradeOpen: false }),
    }),
    {
      name: "remoctrl.ui",
      storage: createJSONStorage(() => localStorage),
      // Modais e tab atual não persistem (devem começar limpos)
      partialize: (s) => ({
        theme: s.theme,
        alwaysOnTop: s.alwaysOnTop,
        onboardingDone: s.onboardingDone,
      }),
    },
  ),
);
