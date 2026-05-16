// WidgetRemote — modo "pocket" da janela.
// Layout MUITO minimalista pra caber numa janela pequena (~220x340):
//   - top: brand + sair-do-widget + fechar
//   - D-pad compacto (140x140)
//   - vol-/vol+ + mute + power
//
// Janela é redimensionada em main.tsx via Tauri ao entrar/sair do modo.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Power, VolumeX, Volume1, Volume2, Maximize2, X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { useReachability } from "@/hooks/useReachability";
import { useLongPress } from "@/hooks/useLongPress";
import { sendCommand } from "@/lib/commands";
import { useUiStore } from "@/stores/uiStore";
import { wakeOnLan, isTauri } from "@/lib/tauri";

const PRESS = { scale: 0.95 };

export function WidgetRemote() {
  const tv = useTvStore((s) => s.selected());
  const status = useReachability(tv);
  const showToast = useToast((s) => s.show);
  const setWidgetMode = useUiStore((s) => s.setWidgetMode);
  const [flash, setFlash] = useState<string | null>(null);

  const dispatch = async (cmd: Parameters<typeof sendCommand>[1], silent = false) => {
    setFlash(cmd);
    setTimeout(() => setFlash(null), 120);
    if (!tv) {
      if (!silent) showToast("Selecione uma TV", "err");
      return;
    }
    try {
      await sendCommand(tv, cmd);
    } catch (e) {
      if (!silent) {
        showToast(e instanceof Error ? e.message : "Falhou", "err");
      }
    }
  };

  const onPower = async () => {
    setFlash("PowerOff");
    setTimeout(() => setFlash(null), 120);
    if (!tv) return;
    if (status === "down" && tv.mac && isTauri()) {
      try {
        await wakeOnLan(tv.mac);
        showToast(`Ligando ${tv.label}…`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "WoL falhou", "err");
      }
      return;
    }
    try {
      await sendCommand(tv, "PowerOff");
    } catch (e) {
      if (tv.mac && isTauri()) {
        try {
          await wakeOnLan(tv.mac);
          showToast(`Ligando ${tv.label}…`);
          return;
        } catch { /* noop */ }
      }
      showToast(e instanceof Error ? e.message : "Power falhou", "err");
    }
  };

  // Hold pra Vol +/−
  const volUp = useLongPress({ onAction: () => dispatch("VolumeUp", true) });
  const volDown = useLongPress({ onAction: () => dispatch("VolumeDown", true) });

  // Drag da janela inteira pela área "top bar" do widget
  const onMouseDownDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input")) return;
    if (!isTauri()) return;
    getCurrentWindow().startDragging().catch(() => {});
  };

  const exitWidget = async () => {
    setWidgetMode(false);
    // O App.tsx detecta mudança e restaura tamanho via useEffect.
  };

  const onClose = async () => {
    if (!isTauri()) return;
    try { await getCurrentWindow().close(); } catch { /* noop */ }
  };

  // Esc sai do widget mode
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitWidget();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dot =
    status === "ok" ? "bg-green-500"
    : status === "down" ? "bg-red-500"
    : "bg-white/30";

  const armed = (k: string) => flash === k ? "!bg-primary !border-primary !text-white" : "";

  return (
    <div className="h-screen w-screen flex items-stretch justify-stretch bg-transparent">
      <main
        className="flex-1 flex flex-col select-none overflow-hidden rounded-2xl
                   bg-gradient-to-b from-[#1a1d23] to-[#0f1115]
                   border border-[#2a2f37]
                   shadow-[0_24px_64px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
      >
        {/* Top: drag area + sair widget + fechar */}
        <header
          data-tauri-drag-region
          onMouseDown={onMouseDownDrag}
          className="flex items-center gap-1.5 h-7 px-2 border-b border-white/[0.04]"
          style={{ cursor: "grab" }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <span data-tauri-drag-region className="text-[10px] font-bold text-white/80 truncate flex-1 min-w-0">
            {tv?.label ?? "Sem TV"}
          </span>
          <button
            onClick={exitWidget}
            title="Voltar pro modo normal (Esc)"
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-white/5"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            title="Fechar"
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-red-500/20 hover:!text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </header>

        {/* DPad compacto (140x140), centralizado */}
        <div className="flex-1 flex items-center justify-center p-3">
          <div className="relative w-[160px] h-[160px]">
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Up")}
              aria-label="Cima"
              className={`absolute top-0 left-[55px] w-12 h-12 rounded-t-[28px] rounded-b-[10px] bg-[#2a2f37] border border-white/5 text-white text-lg flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Up")}`}
            >▲</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Left")}
              aria-label="Esquerda"
              className={`absolute top-[55px] left-0 w-12 h-12 rounded-l-[28px] rounded-r-[10px] bg-[#2a2f37] border border-white/5 text-white text-lg flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Left")}`}
            >◀</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Ok")}
              aria-label="OK"
              className={`absolute top-[51px] left-[51px] w-[58px] h-[58px] rounded-full text-white font-extrabold text-sm bg-gradient-to-br from-sky-400 to-primary shadow-[0_4px_14px_rgba(14,165,233,0.5)] hover:brightness-110 ${armed("Ok")}`}
            >OK</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Right")}
              aria-label="Direita"
              className={`absolute top-[55px] right-0 w-12 h-12 rounded-r-[28px] rounded-l-[10px] bg-[#2a2f37] border border-white/5 text-white text-lg flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Right")}`}
            >▶</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Down")}
              aria-label="Baixo"
              className={`absolute bottom-0 left-[55px] w-12 h-12 rounded-b-[28px] rounded-t-[10px] bg-[#2a2f37] border border-white/5 text-white text-lg flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Down")}`}
            >▼</motion.button>
          </div>
        </div>

        {/* Vol-/vol+/mute/power */}
        <div className="grid grid-cols-4 gap-1.5 p-2.5 pt-0">
          <button
            {...volDown}
            title="Volume −"
            className={`h-10 rounded-lg bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("VolumeDown")}`}
          >
            <Volume1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch("Mute")}
            title="Mudo"
            className={`h-10 rounded-lg bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("Mute")}`}
          >
            <VolumeX className="w-4 h-4" />
          </button>
          <button
            {...volUp}
            title="Volume +"
            className={`h-10 rounded-lg bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("VolumeUp")}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={onPower}
            title={status === "down" && tv?.mac ? "Ligar TV (WoL)" : "Liga/Desliga"}
            className={`h-10 rounded-lg bg-[#2a2f37] border border-white/5 grid place-items-center hover:bg-red-500/20 ${armed("PowerOff") ? "!bg-primary text-white" : "text-red-400/80"}`}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
