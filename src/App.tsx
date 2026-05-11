// Layout principal — TitleBar custom + tabs + overlays.
// Janela tem `transparent: true` no Tauri: o <main> abaixo provê o fundo real
// com cantos arredondados (rounded-2xl).

import { useEffect } from "react";
import { TitleBar } from "@/components/TitleBar";
import { TvChips } from "@/components/TVList/Chips";
import { TypeBar } from "@/components/Remote/TypeBar";
import { RemoteShell } from "@/components/Remote/RemoteShell";
import { AppsGrid } from "@/components/AppsGrid";
import { MacroList } from "@/components/Macros/MacroList";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { TabBar } from "@/components/TabBar";
import { AddTVModal } from "@/components/TVList/AddTVModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Onboarding } from "@/components/Onboarding/Onboarding";
import { ToastViewport } from "@/components/Toast";
import { useUiStore } from "@/stores/uiStore";
import { useTvStore } from "@/stores/tvStore";
import { useTheme } from "@/hooks/useTheme";
import { useCustomShortcuts } from "@/hooks/useCustomShortcuts";
import { isTauri, setAlwaysOnTop as setAotBackend } from "@/lib/tauri";

function App() {
  const { tab, onboardingDone, openTutorial, openAddTv, alwaysOnTop, setAlwaysOnTop } =
    useUiStore();
  const savedCount = useTvStore((s) => s.saved.length);

  useTheme();
  useCustomShortcuts();

  useEffect(() => {
    if (!onboardingDone) openTutorial();
    else if (savedCount === 0) openAddTv();

    // Janela vem `alwaysOnTop: true` da config — sincroniza com o store.
    // Também aplica se o store já tinha valor diferente (persistido).
    if (isTauri()) {
      setAotBackend(alwaysOnTop).catch(() => {});
      if (!alwaysOnTop) setAlwaysOnTop(true); // default = on
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Wrapper full-screen transparente — necessário pra cantos arredondados
    // (a janela Tauri é transparent; só a borda do <main> aparece).
    <div className="h-screen w-screen flex items-stretch justify-stretch p-0 bg-transparent">
      <main
        className="flex-1 flex flex-col bg-[#0a0c10] text-white select-none overflow-hidden
                   rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]"
      >
        {/* TitleBar custom — drag + controles */}
        <TitleBar />

        {/* Header sticky: chips ficam visíveis mesmo com scroll abaixo */}
        <div className="sticky top-0 z-10 px-3 pt-2.5 bg-[#0a0c10]">
          <TvChips />
        </div>

        {/* Conteúdo principal */}
        <div className="w-full max-w-[380px] mx-auto flex-1 flex flex-col px-3 overflow-y-auto scrollbar-none">
          <div className="flex-1 flex flex-col">
            {tab === "remote" && (
              <>
                <TypeBar />
                <RemoteShell />
              </>
            )}
            {tab === "apps" && <AppsGrid />}
            {tab === "macros" && <MacroList />}
            {tab === "settings" && <SettingsPanel />}
          </div>

          {tab === "remote" && (
            <div className="mt-3 mb-2 text-[10px] text-white/30 text-center leading-relaxed px-2">
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">↑↓←→</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Enter</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Esc</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Espaço</kbd>
              {" • "}
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">H</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">M</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">P</kbd>
            </div>
          )}
        </div>

        <TabBar />

        <AddTVModal />
        <Onboarding />
        <UpgradeModal />
        <ToastViewport />
      </main>
    </div>
  );
}

export default App;
