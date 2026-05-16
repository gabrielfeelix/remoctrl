// WidgetRemote — modo "pocket" REALMENTE pequeno.
// Janela 160×220, posicionada top-left via App.tsx.
// Layout micro:
//   - header 18px (status + sair-widget Tv2 + fechar)
//   - top row 22px (Power | Home)
//   - DPad 100×100
//   - bottom row 22px (Voltar | Vol− | Vol+ | Play/Pause)
// Total ≈ 180px + paddings, cabe em 220 com folga.
// Ícone "sair-widget" usa Tv2 (NÃO Maximize2, que é fullscreen na TitleBar).

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Power, Volume1, Volume2, Tv2, X, Home, ChevronLeft, Play, Pause,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
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

  // Power inteligente — mesma estratégia do remote completo:
  // Roku ECP PowerOn primeiro, depois WoL, depois PowerOff normal.
  const onPower = async () => {
    setFlash("PowerOff");
    setTimeout(() => setFlash(null), 120);
    if (!tv) return;
    if (status === "down" && isTauri()) {
      if (tv.brand === "roku") {
        try {
          await invoke("roku_send_key", { host: tv.host, key: "PowerOn" });
          showToast(`Ligando ${tv.label}…`);
          return;
        } catch { /* cai pra WoL */ }
      }
      if (tv.mac) {
        try {
          await wakeOnLan(tv.mac);
          showToast(`Ligando ${tv.label}… (WoL)`);
          return;
        } catch (e) {
          showToast(e instanceof Error ? e.message : "WoL falhou", "err");
          return;
        }
      }
      showToast("TV offline — adicione o MAC no modo normal");
      return;
    }
    try {
      await sendCommand(tv, "PowerOff");
    } catch {
      if (tv.brand === "roku" && isTauri()) {
        try {
          await invoke("roku_send_key", { host: tv.host, key: "PowerOn" });
          showToast(`Ligando ${tv.label}…`);
          return;
        } catch { /* segue */ }
      }
      if (tv.mac && isTauri()) {
        try {
          await wakeOnLan(tv.mac);
          showToast(`Ligando ${tv.label}…`);
          return;
        } catch { /* noop */ }
      }
      showToast("Power falhou", "err");
    }
  };

  const volUp = useLongPress({ onAction: () => dispatch("VolumeUp", true) });
  const volDown = useLongPress({ onAction: () => dispatch("VolumeDown", true) });

  const onMouseDownDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input")) return;
    if (!isTauri()) return;
    getCurrentWindow().startDragging().catch(() => {});
  };

  const exitWidget = () => setWidgetMode(false);

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
        className="flex-1 flex flex-col select-none overflow-hidden rounded-xl
                   bg-gradient-to-b from-[#1a1d23] to-[#0f1115]
                   border border-[#2a2f37]
                   shadow-[0_18px_48px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
      >
        {/* Header 18px: status dot + label + Tv2 (sair) + X (fechar) */}
        <header
          data-tauri-drag-region
          onMouseDown={onMouseDownDrag}
          className="flex items-center gap-0.5 h-[18px] px-1 border-b border-white/[0.04]"
          style={{ cursor: "grab" }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0 ml-0.5`} />
          <span data-tauri-drag-region className="text-[9px] font-bold text-white/80 truncate flex-1 min-w-0 px-1">
            {tv?.label ?? "Sem TV"}
          </span>
          <button
            onClick={exitWidget}
            title="Voltar pro Remoctrl normal (Esc)"
            className="p-0.5 rounded text-white/50 hover:text-primary hover:bg-white/5"
          >
            <Tv2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onClose}
            title="Fechar"
            className="p-0.5 rounded text-white/50 hover:text-white hover:bg-red-500/20 hover:!text-red-400"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </header>

        {/* Top row 22px: Power | Home */}
        <div className="grid grid-cols-2 gap-1 px-1.5 pt-1.5">
          <button
            onClick={onPower}
            title={status === "down" ? "Ligar TV" : "Liga/Desliga"}
            className={`h-[22px] rounded-md bg-[#2a2f37] border border-white/5 grid place-items-center hover:bg-red-500/20 ${armed("PowerOff") ? "!bg-primary text-white" : "text-red-400/80"}`}
          >
            <Power className="w-3 h-3" />
          </button>
          <button
            onClick={() => dispatch("Home")}
            title="Home"
            className={`h-[22px] rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("Home")}`}
          >
            <Home className="w-3 h-3" />
          </button>
        </div>

        {/* DPad 100x100 centralizado */}
        <div className="flex-1 flex items-center justify-center px-1.5 py-1">
          <div className="relative w-[100px] h-[100px]">
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Up")}
              aria-label="Cima"
              className={`absolute top-0 left-[35px] w-[30px] h-[30px] rounded-t-[18px] rounded-b-[6px] bg-[#2a2f37] border border-white/5 text-white text-xs flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Up")}`}
            >▲</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Left")}
              aria-label="Esquerda"
              className={`absolute top-[35px] left-0 w-[30px] h-[30px] rounded-l-[18px] rounded-r-[6px] bg-[#2a2f37] border border-white/5 text-white text-xs flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Left")}`}
            >◀</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Ok")}
              aria-label="OK"
              className={`absolute top-[32px] left-[32px] w-[36px] h-[36px] rounded-full text-white font-extrabold text-[10px] bg-gradient-to-br from-sky-400 to-primary shadow-[0_3px_8px_rgba(14,165,233,0.45)] hover:brightness-110 ${armed("Ok")}`}
            >OK</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Right")}
              aria-label="Direita"
              className={`absolute top-[35px] right-0 w-[30px] h-[30px] rounded-r-[18px] rounded-l-[6px] bg-[#2a2f37] border border-white/5 text-white text-xs flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Right")}`}
            >▶</motion.button>
            <motion.button
              whileTap={PRESS}
              onClick={() => dispatch("Down")}
              aria-label="Baixo"
              className={`absolute bottom-0 left-[35px] w-[30px] h-[30px] rounded-b-[18px] rounded-t-[6px] bg-[#2a2f37] border border-white/5 text-white text-xs flex items-center justify-center hover:bg-[#3d4350] active:bg-primary ${armed("Down")}`}
            >▼</motion.button>
          </div>
        </div>

        {/* Bottom row 22px: Voltar | Vol− | Vol+ | Play/Pause */}
        <div className="grid grid-cols-4 gap-1 px-1.5 pb-1.5">
          <button
            onClick={() => dispatch("Back")}
            title="Voltar"
            className={`h-[22px] rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("Back")}`}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            {...volDown}
            title="Volume − (segure)"
            className={`h-[22px] rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("VolumeDown")}`}
          >
            <Volume1 className="w-3 h-3" />
          </button>
          <button
            {...volUp}
            title="Volume + (segure)"
            className={`h-[22px] rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("VolumeUp")}`}
          >
            <Volume2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => dispatch("PlayPause")}
            title="Play / Pause"
            className={`h-[22px] rounded-md bg-[#2a2f37] border border-white/5 text-white grid place-items-center hover:bg-[#3d4350] active:bg-primary ${armed("PlayPause")}`}
          >
            <Play className="w-2.5 h-2.5" fill="currentColor" />
            <Pause className="w-2.5 h-2.5 -ml-0.5" fill="currentColor" />
          </button>
        </div>
      </main>
    </div>
  );
}
