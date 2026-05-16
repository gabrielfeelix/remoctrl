// Custom titlebar — substitui a barra cinza do sistema.
//
// Estratégia de drag dupla pra cobrir Linux/Windows/macOS:
//   1. `data-tauri-drag-region` — interceptado pelo runtime nativo do Tauri
//   2. onMouseDown → `startDragging()` — fallback JS quando (1) falha
//      em compositors instáveis (Wayland/WSLg)
//
// `pointer-events-none` foi REMOVIDO dos elementos internos — estava bloqueando
// o handler de mousedown pros eventos não chegarem ao header.

import { Pin, PinOff, HelpCircle, Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useUiStore } from "@/stores/uiStore";
import { useToast } from "@/components/Toast";
import { setAlwaysOnTop, isTauri } from "@/lib/tauri";
import { Logo } from "./Logo";

export function TitleBar() {
  const { alwaysOnTop, setAlwaysOnTop: setAotInStore, openTutorial } = useUiStore();
  const showToast = useToast((s) => s.show);

  /** Fallback JS pro drag — fire-and-forget no mesmo tick do mousedown.
   * NÃO usamos await aqui: o IPC precisa ser disparado sincronamente
   * dentro do handler do mouse pra o GTK aceitar o move. */
  const onMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return; // só botão esquerdo
    const target = e.target as HTMLElement;
    // Não arrastar quando clica em controles
    if (target.closest("button, a, input, textarea")) return;
    if (!isTauri()) return;
    // Fire-and-forget. Sem await: o request precisa entrar na fila IPC
    // imediatamente, antes do browser liberar o evento de mouse.
    getCurrentWindow().startDragging().catch(() => {});
  };

  const onToggleAot = async () => {
    if (!isTauri()) {
      showToast("Disponível só no app desktop", "err");
      return;
    }
    const next = !alwaysOnTop;
    try {
      await setAlwaysOnTop(next);
      setAotInStore(next);
      showToast(next ? "Sempre no topo" : "Modo normal");
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), "err");
    }
  };

  const onMinimize = async () => {
    if (!isTauri()) return;
    try {
      await getCurrentWindow().minimize();
    } catch {
      /* noop */
    }
  };

  const onClose = async () => {
    if (!isTauri()) return;
    try {
      await getCurrentWindow().close();
    } catch {
      /* noop */
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={onMouseDown}
      className="flex items-center gap-2 h-9 px-2.5 select-none border-b backdrop-blur-md
                 border-gray-200 bg-gray-50/95
                 dark:border-white/[0.06] dark:bg-[#0a0c10]/90"
      style={{ cursor: "grab" }}
    >
      {/* Brand — área arrastável; cada filho marcado pra o runtime entender */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-1.5 flex-1 min-w-0"
      >
        <span data-tauri-drag-region className="contents">
          <Logo size={18} />
        </span>
        <span
          data-tauri-drag-region
          className="text-[12px] font-bold tracking-tight text-gray-800 dark:text-white/90"
        >
          Remoctrl
        </span>
        <span
          data-tauri-drag-region
          className="text-[9px] font-mono ml-1 text-gray-400 dark:text-white/30"
        >
          v0.0.1
        </span>
      </div>

      {/* Controles */}
      <button
        type="button"
        onClick={onToggleAot}
        title={alwaysOnTop ? "Desativar sempre-no-topo" : "Ativar sempre-no-topo"}
        className={`p-1 rounded-md transition-colors ${
          alwaysOnTop
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-white/50 hover:text-white hover:bg-white/5"
        }`}
      >
        {alwaysOnTop ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={openTutorial}
        title="Ajuda"
        className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onMinimize}
        title="Minimizar"
        className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        title="Fechar (vai pra tray)"
        className="p-1 rounded-md text-white/50 hover:text-white hover:bg-red-500/20 hover:!text-red-400"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </header>
  );
}
