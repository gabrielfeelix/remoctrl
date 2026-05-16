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
  /**
   * Gera uma chave válida e ativa Pro automaticamente — usado no primeiro boot
   * pra "dev preview" deste build (build interno). Sem efeito se já há licença.
   */
  ensureActivated: () => void;
}

/** Gera uma chave válida do formato REMOCTRL-XXXX-XXXX-XXXX (cripto-safe). */
function generateLicenseKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const block = (start: number) =>
    Array.from(bytes.slice(start, start + 4))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `REMOCTRL-${block(0)}-${block(4)}-${block(8)}`;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
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
      ensureActivated: () => {
        const { tier, licenseKey } = get();
        if (tier === "pro" && licenseKey) return;
        const key = generateLicenseKey();
        // Sanity: a chave gerada precisa passar pelo mesmo validador.
        if (!/^REMOCTRL-[A-Z0-9-]{8,}$/i.test(key)) return;
        set({ tier: "pro", licenseKey: key, activatedAt: Date.now() });
      },
    }),
    {
      name: "remoctrl.license",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Helper hook — `const isPro = useIsPro();`. */
export const useIsPro = () => useLicenseStore((s) => s.tier === "pro");
