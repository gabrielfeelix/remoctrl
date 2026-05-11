// Modal de upgrade pra Pro.
// Em prod isso linka pra Lemon Squeezy. Aqui aceita uma chave local.

import { Sparkles, X, Check } from "lucide-react";
import { useState } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useLicenseStore } from "@/stores/licenseStore";
import { useToast } from "@/components/Toast";

const PRO_FEATURES = [
  "TVs ilimitadas (não só uma)",
  "Suporte completo a Samsung e LG",
  "Modal flutuante always-on-top",
  "Atalho global Ctrl+Shift+N",
  "Macros (sequências de 1 clique)",
  "Atalhos de teclado customizados",
  "Updates pra sempre",
];

export function UpgradeModal() {
  const open = useUiStore((s) => s.upgradeOpen);
  const close = useUiStore((s) => s.closeUpgrade);
  const activate = useLicenseStore((s) => s.activate);
  const showToast = useToast((s) => s.show);

  const [key, setKey] = useState("");
  const [showInput, setShowInput] = useState(false);

  if (!open) return null;

  const onActivate = () => {
    if (activate(key)) {
      showToast("Pro ativado — bem-vindo!");
      close();
    } else {
      showToast("Chave inválida — formato REMOCTRL-XXXX…", "err");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-5 py-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[420px] bg-[#15181d] border border-white/[0.06] rounded-2xl p-6 my-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 grid place-items-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-bold">Remoctrl Pro</h3>
          </div>
          <button onClick={close} className="text-white/50 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-white/70 mb-3 leading-snug">
          Tira o limite gratuito e libera tudo. Vitalício, sem assinatura.
        </p>

        <div className="space-y-1.5 mb-4">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-white">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-3 bg-primary/5 border border-primary/30 mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-white">R$ 14,90</span>
            <span className="text-xs text-white/50 line-through">R$ 24,90</span>
            <span className="text-[10px] uppercase tracking-wider text-primary font-bold ml-auto">
              Lançamento
            </span>
          </div>
          <p className="text-[11px] text-white/60 mt-0.5">Pagamento único · acesso vitalício</p>
        </div>

        {!showInput ? (
          <div className="flex flex-col gap-2">
            <button
              disabled
              title="Em breve — Lemon Squeezy"
              className="w-full px-4 py-2.5 rounded-lg bg-primary/40 text-white text-sm font-semibold disabled:cursor-not-allowed"
            >
              Comprar (em breve)
            </button>
            <button
              onClick={() => setShowInput(true)}
              className="w-full px-4 py-2 rounded-lg bg-[#2a2f37] hover:bg-[#3d4350] text-white text-sm font-semibold"
            >
              Já tenho uma chave
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="REMOCTRL-XXXX-XXXX-XXXX"
              className="w-full bg-black/30 text-white text-sm font-mono rounded-lg border border-white/[0.08] px-3 py-2 outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowInput(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-[#2a2f37] hover:bg-[#3d4350] text-white text-sm font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={onActivate}
                className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-sky-400 text-white text-sm font-semibold"
              >
                Ativar
              </button>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-1">
              Dica: qualquer chave começando com <code>REMOCTRL-</code> + 8 chars funciona (modo teste).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
