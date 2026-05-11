// License store — flag Free/Pro.
//
// Sprint 6 lite: o pagamento real (Lemon Squeezy / Play Billing) entra na v1.0.
// Por ora, o usuário pode "ativar Pro" via license key local (sem validação online)
// — só pra exercitar a UI e gates de feature.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Tier = "free" | "pro";

interface LicenseState {
  tier: Tier;
  /** Licença local (offline). Em prod isso é validado no servidor. */
  licenseKey: string | null;
  activatedAt: number | null;

  /**
   * Mock de ativação. Aceita qualquer chave que comece com `REMOCTRL-` e
   * tenha pelo menos 16 chars. A validação real entra junto com Lemon Squeezy.
   */
  activate: (key: string) => boolean;
  reset: () => void;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set) => ({
      tier: "free",
      licenseKey: null,
      activatedAt: null,

      activate: (key) => {
        const ok = /^REMOCTRL-[A-Z0-9-]{8,}$/i.test(key.trim());
        if (!ok) return false;
        set({ tier: "pro", licenseKey: key.trim(), activatedAt: Date.now() });
        return true;
      },
      reset: () =>
        set({ tier: "free", licenseKey: null, activatedAt: null }),
    }),
    {
      name: "remoctrl.license",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Helper hook — `const isPro = useIsPro();`. */
export const useIsPro = () => useLicenseStore((s) => s.tier === "pro");
