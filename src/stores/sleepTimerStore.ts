// Sleep timer — armazena o "vai desligar a TV em X" e o timestamp alvo.
// O componente <SleepTimerRunner /> roda em background no App.tsx e dispara
// o PowerOff quando bate o tempo.
//
// Persistido pra sobreviver a reloads do dev server. Em prod a janela vive
// muito mais e isso continua útil pra cenário "ativei 30min antes de dormir,
// fechei a janela, voltei e o app ainda dispara".

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SleepTimerState {
  /** Timestamp em ms quando deve disparar. null = desligado. */
  fireAt: number | null;
  /** Minutos originais — só pra UI mostrar "15min", "30min" etc. */
  durationMin: number | null;
  start: (minutes: number) => void;
  cancel: () => void;
}

export const useSleepTimerStore = create<SleepTimerState>()(
  persist(
    (set) => ({
      fireAt: null,
      durationMin: null,
      start: (minutes) =>
        set({
          fireAt: Date.now() + minutes * 60_000,
          durationMin: minutes,
        }),
      cancel: () => set({ fireAt: null, durationMin: null }),
    }),
    {
      name: "remoctrl.sleep-timer",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
