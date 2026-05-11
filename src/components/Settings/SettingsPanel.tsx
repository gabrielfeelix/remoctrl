// Painel de Configurações — agrupa Aparência, Atalhos custom, Pro/Licença.

import { Sun, Moon, Sparkles, ExternalLink, RotateCcw } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useLicenseStore, useIsPro } from "@/stores/licenseStore";
import { CustomShortcuts } from "./CustomShortcuts";

export function SettingsPanel() {
  const { theme, toggleTheme, openUpgrade, openTutorial } = useUiStore();
  const isPro = useIsPro();
  const license = useLicenseStore();

  return (
    <div className="space-y-4">
      {/* Aparência */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Aparência
        </h3>
        <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Tema</div>
            <div className="text-[11px] text-white/50">
              {theme === "dark" ? "Escuro" : "Claro"} (beta)
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2f37] hover:bg-[#3d4350] text-white text-xs font-semibold"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>
        </div>
      </section>

      {/* Pro */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Plano
        </h3>
        {isPro ? (
          <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                Pro ativo
              </div>
              <div className="text-[11px] text-white/60 font-mono">
                {license.licenseKey?.slice(0, 12)}…
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Voltar pra Free? A licença será removida desta máquina.")) {
                  license.reset();
                }
              }}
              className="text-white/50 hover:text-red-400 p-1.5"
              title="Resetar licença"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">Plano Free</div>
                <div className="text-[11px] text-white/60 leading-snug">
                  1 TV, sem macros, sem atalhos custom, sem modal flutuante.
                </div>
              </div>
            </div>
            <button
              onClick={openUpgrade}
              className="w-full mt-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-sky-400 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Ver Pro · R$ 14,90
            </button>
          </div>
        )}
      </section>

      {/* Atalhos */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Atalhos de teclado
        </h3>
        <CustomShortcuts />
      </section>

      {/* Ajuda */}
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Ajuda
        </h3>
        <button
          onClick={openTutorial}
          className="w-full text-left rounded-xl bg-black/25 border border-white/[0.06] p-3 hover:border-primary/30 transition-colors flex items-center justify-between"
        >
          <div>
            <div className="text-sm font-semibold text-white">Como conectar</div>
            <div className="text-[11px] text-white/50">
              Tutorial por marca (Roku, Samsung, LG)
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-white/40" />
        </button>
      </section>

      <section>
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Sobre
        </h3>
        <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3 text-[11px] text-white/60 leading-snug">
          <div className="text-sm font-bold text-white mb-1">Remoctrl 0.0.1</div>
          <p>
            Controle remoto universal pra Smart TVs. Não afiliado a Roku, Samsung, LG ou outros fabricantes.
          </p>
        </div>
      </section>
    </div>
  );
}
