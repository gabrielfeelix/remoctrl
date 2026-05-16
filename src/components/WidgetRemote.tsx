// WidgetRemote — modo "pocket" da janela.
// Janela ~190x260, posicionada no canto superior esquerdo via App.tsx.
// Layout MÍNIMO — só o essencial:
//   - top: 22px (brand + sair + fechar)
//   - D-pad compacto 130×130
//   - bottom: 28px com Vol−/Mute/Vol+/Power
// Tudo cabe sem scroll mesmo com chrome do SO.

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
        {/* Top: drag + sair widget + fechar — 22px de altura */}
        <header
          data-tauri-drag-region
          onMouseDown={onMouseDownDrag}
          className="flex items-center gap-1 h-[22px] px-1.5 border-b border-white/[0.04]"
          style={{ cursor: "grab" }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
          <span data-tauri-drag-region className="text-[9px] font-bold text-white/80 truncate flex-1 min-w-0">
            {tv?.label ?? "Sem TV"}
          </span>
          <button
            onClick={exitWidget}
            title="Voltar pro modo normal (Esc)"
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-white/5"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onClose}
            title="Fechar"
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-red-500/20 hover:!text-red-400"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </header>

        {/* DPad compacto 130x130, centralizado */}
        <div className="flex-1 flex items-center justify-center p-1.5">
          <div className="relative w-[130px] h-[130px]">
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Up")}
              aria-label="Cima"
              className={`absolute top-0 left-[44px] w-10 h-10 rounded-t-[22px] rounded-b-[8px] bg-[#2a2f37] border border-white/5 text-white text-sm flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Up")}`}
            >▲</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Left")}
              aria-label="Esquerda"
              className={`absolute top-[45px] left-0 w-10 h-10 rounded-l-[22px] rounded-r-[8px] bg-[#2a2f37] border border-white/5 text-white text-sm flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Left")}`}
            >◀</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Ok")}
              aria-label="OK"
              className={`absolute top-[41px] left-[41px] w-[48px] h-[48px] rounded-full text-white font-extrabold text-[12px] bg-gradient-to-br from-sky-400 to-primary shadow-[0_3px_10px_rgba(14,165,233,0.45)] hover:brightness-110 ${armed("Ok")}`}
            >OK</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Right")}
              aria-label="Direita"
              className={`absolute top-[45px] right-0 w-10 h-10 rounded-r-[22px] rounded-l-[8px] bg-[#2a2f37] border border-white/5 text-white text-sm flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Right")}`}
            >▶</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Down")}
              aria-label="Baixo"
              className={`absolute bottom-0 left-[44px] w-10 h-10 rounded-b-[22px] rounded-t-[8px] bg-[#2a2f37] border border-white/5 text-white text-sm flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Down")}`}
            >▼</motion.button>
          </div>
        </div>

        {/* Vol-/mute/vol+/power — 28px de altura */}
        <div className="grid grid-cols-4 gap-1 p-1.5 pt-0">
          <button
            {...volDown}
            title="Volume −"
            className={`h-7 rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("VolumeDown")}`}
          >
            <Volume1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => dispatch("Mute")}
            title="Mudo"
            className={`h-7 rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("Mute")}`}
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
          <button
            {...volUp}
            title="Volume +"
            className={`h-7 rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("VolumeUp")}`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onPower}
            title={status === "down" && tv?.mac ? "Ligar TV (WoL)" : "Liga/Desliga"}
            className={`h-7 rounded-md bg-[#2a2f37] border border-white/5 grid place-items-center hover:bg-red-500/20 ${armed("PowerOff") ? "!bg-primary text-white" : "text-red-400/80"}`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>
    </div>
  );
}
