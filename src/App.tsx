// Layout principal — TitleBar custom + tabs + overlays.
// Janela tem `transparent: true` no Tauri: o <main> abaixo provê o fundo real
// com cantos arredondados (rounded-2xl).

import { useEffect } from "react";
import { TitleBar } from "@/components/TitleBar";
import { TvChips } from "@/components/TVList/Chips";
import { RemoteShell } from "@/components/Remote/RemoteShell";
import { AppsGrid } from "@/components/AppsGrid";
import { MacroList } from "@/components/Macros/MacroList";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { TabBar } from "@/components/TabBar";
import { AddTVModal } from "@/components/TVList/AddTVModal";
import { EditTvModal } from "@/components/TVList/EditTvModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Onboarding } from "@/components/Onboarding/Onboarding";
import { ToastViewport } from "@/components/Toast";
import { SleepTimerRunner } from "@/components/SleepTimerRunner";
import { BackgroundDiscovery } from "@/components/BackgroundDiscovery";
import { WidgetRemote } from "@/components/WidgetRemote";
import { useUiStore } from "@/stores/uiStore";
import { useTvStore } from "@/stores/tvStore";
import { useLicenseStore } from "@/stores/licenseStore";
import { useTheme } from "@/hooks/useTheme";
import { useCustomShortcuts } from "@/hooks/useCustomShortcuts";
import {
  isTauri,
  setAlwaysOnTop as setAotBackend,
  registerShowShortcut,
  unregisterShowShortcut,
} from "@/lib/tauri";

function App() {
  const { tab, onboardingDone, openTutorial, openAddTv, alwaysOnTop, setAlwaysOnTop, widgetMode, globalShortcutEnabled } =
    useUiStore();
  const savedCount = useTvStore((s) => s.saved.length);
  const ensureLicensed = useLicenseStore((s) => s.ensureActivated);

  useTheme();
  useCustomShortcuts();

  // Atalho global Ctrl+Shift+N — registra SÓ se o usuário ativou em Ajustes.
  // Reage a mudanças do toggle (on/off) e ao boot (rehidrata da localStorage).
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      try {
        if (globalShortcutEnabled) {
          await registerShowShortcut("CommandOrControl+Shift+N");
        } else {
          await unregisterShowShortcut();
        }
      } catch {
        /* silencioso — combo ocupado pelo SO ou WM exótico; UI mostra erro
           se vier do toggle direto via try/catch no SettingsPanel */
      }
    })();
  }, [globalShortcutEnabled]);

  useEffect(() => {
    // Build interno: garante Pro ativo já no boot.
    ensureLicensed();

    if (!onboardingDone) openTutorial();
    else if (savedCount === 0) openAddTv();

    // Janela vem `alwaysOnTop: true` da config — sincroniza com o store.
    // Também aplica se o store já tinha valor diferente (persistido).
    if (isTauri()) {
      setAotBackend(alwaysOnTop).catch(() => {});
      if (!alwaysOnTop) setAlwaysOnTop(true); // default = on

      // Posiciona à ESQUERDA, parte SUPERIOR (não vertical-center, não bottom).
      // LogicalPosition em vez de PhysicalPosition — respeita o DPI scaling do
      // Windows (com 150% scale, PhysicalPosition(24,24) ficava praticamente
      // colado no canto; LogicalPosition dá margem visual consistente).
      // y=60 garante "topo da tela com respiro", não colado no topo.
      (async () => {
        try {
          const { LogicalPosition } = await import("@tauri-apps/api/dpi");
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const win = getCurrentWindow();
          await win.setPosition(new LogicalPosition(24, 60));
        } catch {
          /* noop — sem janela pra reposicionar (modo browser ou erro) */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redimensiona a janela quando entra/sai do widget mode.
  // Widget = mini-window no canto superior esquerdo, only the essentials.
  //
  // BUG histórico: setSize sozinho era ignorado pelo Windows — a janela
  // mantinha a altura anterior e o flex-1 esticava o conteúdo. Solução:
  // PINAR a janela com setMaxSize == setSize. Aí o Windows é obrigado a
  // respeitar (não há outra hipótese de tamanho).
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      try {
        const { LogicalSize, LogicalPosition } = await import("@tauri-apps/api/dpi");
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        if (widgetMode) {
          const W = 160, H = 220;
          // Ordem importa:
          //   1. Limpa maxSize (caso tenha ficado de algum estado anterior)
          //   2. Aperta min DOWN pro tamanho que queremos
          //   3. setSize pro tamanho exato
          //   4. PIN com maxSize igual ao size — força Windows a respeitar
          await win.setMaxSize(null).catch(() => {});
          await win.setMinSize(new LogicalSize(W, H));
          await win.setSize(new LogicalSize(W, H));
          await win.setMaxSize(new LogicalSize(W, H));
          await win.setAlwaysOnTop(true);
          await win.setPosition(new LogicalPosition(24, 60));
        } else {
          const W = 480, H = 760;
          // Volta pro modo normal: libera max, devolve min, set size, posiciona
          await win.setMaxSize(null).catch(() => {});
          await win.setMinSize(new LogicalSize(360, 600));
          await win.setSize(new LogicalSize(W, H));
          await win.setPosition(new LogicalPosition(24, 60));
        }
      } catch {
        /* noop */
      }
    })();
  }, [widgetMode]);

  if (widgetMode) {
    return <WidgetRemote />;
  }

  return (
    // Wrapper full-screen transparente — necessário pra cantos arredondados
    // (a janela Tauri é transparent; só a borda do <main> aparece).
    <div className="h-screen w-screen flex items-stretch justify-stretch p-0 bg-transparent">
      <main
        className="flex-1 flex flex-col select-none overflow-hidden rounded-2xl
                   bg-white text-gray-900
                   dark:bg-[#0a0c10] dark:text-white
                   shadow-[0_24px_64px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.06)]
                   dark:shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]"
      >
        {/* TitleBar custom — drag + controles */}
        <TitleBar />

        {/* Header sticky: chips ficam visíveis mesmo com scroll abaixo */}
        <div className="sticky top-0 z-10 px-3 pt-2.5 bg-white dark:bg-[#0a0c10]">
          <TvChips />
        </div>

        {/* Conteúdo principal */}
        <div className="w-full max-w-[440px] mx-auto flex-1 flex flex-col px-3 overflow-y-auto scrollbar-none">
          <div className="flex-1 flex flex-col">
            {tab === "remote" && <RemoteShell />}
            {tab === "apps" && <AppsGrid />}
            {tab === "macros" && <MacroList />}
            {tab === "settings" && <SettingsPanel />}
          </div>

          {tab === "remote" && (
            <div className="mt-3 mb-2 text-[10px] text-center leading-relaxed px-2 text-gray-400 dark:text-white/30">
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">↑↓←→</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">Enter</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">Esc</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">Espaço</kbd>
              {" • "}
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">H</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">M</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border font-mono bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">P</kbd>
            </div>
          )}
        </div>

        <TabBar />

        <AddTVModal />
        <EditTvModal />
        <Onboarding />
        <UpgradeModal />
        <ToastViewport />

        {/* Background runners — não renderizam UI */}
        <SleepTimerRunner />
        <BackgroundDiscovery />
      </main>
    </div>
  );
}

export default App;
