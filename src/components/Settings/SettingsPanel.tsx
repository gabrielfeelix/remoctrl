// Painel de Configurações — agrupa Aparência, Mídia, Plano, Atalhos, Ajuda, Sobre.
// Todas as superfícies têm variantes light + dark (WCAG AA em ambas).

import { Sun, Moon, Sparkles, ExternalLink, RotateCcw, Keyboard } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useLicenseStore, useIsPro } from "@/stores/licenseStore";
import { useToast } from "@/components/Toast";
import { CustomShortcuts } from "./CustomShortcuts";
import { SleepTimerCard } from "./SleepTimerCard";

// Classes compartilhadas — declaradas uma vez pra manter consistência visual.
const SECTION_HEADER =
  "text-[10px] uppercase tracking-[0.08em] font-bold mb-2 text-gray-500 dark:text-white/50";
const CARD_BASE =
  "rounded-xl border p-3 transition-colors " +
  "bg-white border-gray-200 " +
  "dark:bg-black/25 dark:border-white/[0.06]";
const TEXT_TITLE = "text-sm font-semibold text-gray-900 dark:text-white";
const TEXT_HINT = "text-[11px] text-gray-500 dark:text-white/55 leading-snug";

export function SettingsPanel() {
  const {
    theme,
    toggleTheme,
    openUpgrade,
    openTutorial,
    globalShortcutEnabled,
    setGlobalShortcutEnabled,
  } = useUiStore();
  const isPro = useIsPro();
  const license = useLicenseStore();
  const showToast = useToast((s) => s.show);

  const toggleGlobalShortcut = () => {
    const next = !globalShortcutEnabled;
    setGlobalShortcutEnabled(next);
    if (next) {
      showToast("Ctrl+Shift+N ativo — foca o Remoctrl de qualquer lugar");
    } else {
      showToast("Atalho global desligado");
    }
  };

  return (
    <div className="space-y-4">
      {/* Aparência */}
      <section>
        <h3 className={SECTION_HEADER}>Aparência</h3>
        <div className={`${CARD_BASE} flex items-center justify-between`}>
          <div>
            <div className={TEXT_TITLE}>Tema</div>
            <div className={TEXT_HINT}>
              {theme === "dark" ? "Escuro" : "Claro"} (beta)
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-gray-100 text-gray-800 hover:bg-gray-200
                       dark:bg-[#2a2f37] dark:text-white dark:hover:bg-[#3d4350]"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>
        </div>
      </section>

      {/* Sleep timer */}
      <section>
        <h3 className={SECTION_HEADER}>Mídia</h3>
        <SleepTimerCard />
      </section>

      {/* Pro */}
      <section>
        <h3 className={SECTION_HEADER}>Plano</h3>
        {isPro ? (
          <div className="rounded-xl border p-3 flex items-center justify-between
                          bg-primary/[0.06] border-primary/30
                          dark:bg-primary/10 dark:border-primary/30">
            <div>
              <div className={`${TEXT_TITLE} flex items-center gap-1.5`}>
                <Sparkles className="w-4 h-4 text-primary" />
                Pro ativo
              </div>
              <div className="text-[11px] font-mono text-gray-600 dark:text-white/60">
                {license.licenseKey?.slice(0, 12)}…
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Voltar pra Free? A licença será removida desta máquina.")) {
                  license.reset();
                }
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500
                         dark:text-white/50 dark:hover:text-red-400"
              title="Resetar licença"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className={CARD_BASE}>
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className={TEXT_TITLE}>Plano Free</div>
                <div className={TEXT_HINT}>
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
        <h3 className={SECTION_HEADER}>Atalhos de teclado</h3>

        {/* Atalho global do SO — opt-in, default OFF.
            Pro: ativa Ctrl+Shift+N pra trazer o Remoctrl pra frente
            de qualquer lugar do desktop. */}
        <div className={`${CARD_BASE} flex items-center justify-between mb-2`}>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Keyboard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className={TEXT_TITLE}>Atalho global do SO</div>
              <div className={TEXT_HINT}>
                <kbd className="px-1 rounded border bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10 font-mono text-[10px]">Ctrl</kbd>
                {" + "}
                <kbd className="px-1 rounded border bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10 font-mono text-[10px]">Shift</kbd>
                {" + "}
                <kbd className="px-1 rounded border bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10 font-mono text-[10px]">N</kbd>
                {" "}foca o app em qualquer tela. Só ativa enquanto ligado aqui.
              </div>
            </div>
          </div>
          <button
            onClick={toggleGlobalShortcut}
            disabled={!isPro}
            title={isPro ? "" : "Pro: ative pra usar atalhos globais"}
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0
              ${globalShortcutEnabled ? "bg-primary" : "bg-gray-300 dark:bg-white/15"}
              ${!isPro ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                ${globalShortcutEnabled ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        <CustomShortcuts />
      </section>

      {/* Ajuda */}
      <section>
        <h3 className={SECTION_HEADER}>Ajuda</h3>
        <button
          onClick={openTutorial}
          className={`w-full text-left ${CARD_BASE} hover:border-primary/40 flex items-center justify-between`}
        >
          <div>
            <div className={TEXT_TITLE}>Como conectar</div>
            <div className={TEXT_HINT}>Tutorial por marca (Roku, Samsung, LG)</div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" />
        </button>
      </section>

      <section>
        <h3 className={SECTION_HEADER}>Sobre</h3>
        <div className={`${CARD_BASE}`}>
          <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            Remoctrl 0.0.1
          </div>
          <p className={TEXT_HINT}>
            Controle remoto universal pra Smart TVs. Não afiliado a Roku, Samsung, LG ou outros fabricantes.
          </p>
        </div>
      </section>
    </div>
  );
}
