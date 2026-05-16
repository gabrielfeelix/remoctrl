// Preview — modo "trackpad" alternativo ao D-pad.
// Movimento contínuo do dedo/mouse vira pulses de Up/Down/Left/Right.
// Cliques curtos viram OK (Select).
//
// Threshold em pixels: cada vez que o cursor anda >= GRID_PX numa direção,
// dispara o comando correspondente e reseta o anchor.

import { useRef, useState } from "react";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { sendCommand } from "@/lib/commands";

const GRID_PX = 40; // sensibilidade — menor = mais sensível

export function TrackpadMode({ onExit }: { onExit?: () => void }) {
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [active, setActive] = useState(false);

  const fire = async (cmd: "Up" | "Down" | "Left" | "Right" | "Ok") => {
    if (!tv) return;
    try {
      await sendCommand(tv, cmd);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falhou", "err");
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!tv) {
      showToast("Selecione uma TV primeiro", "err");
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    anchor.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setActive(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!anchor.current) return;
    const dx = e.clientX - anchor.current.x;
    const dy = e.clientY - anchor.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < GRID_PX) return;

    moved.current = true;
    // Direção dominante: H ou V
    if (absX > absY) {
      fire(dx > 0 ? "Right" : "Left");
      anchor.current = { x: e.clientX, y: anchor.current.y };
    } else {
      fire(dy > 0 ? "Down" : "Up");
      anchor.current = { x: anchor.current.x, y: e.clientY };
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!moved.current) {
      // Tap = OK
      fire("Ok");
    }
    anchor.current = null;
    setActive(false);
  };

  return (
    <div className="my-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold">
          Trackpad (preview)
        </span>
        {onExit && (
          <button
            onClick={onExit}
            className="text-[10px] font-semibold text-primary hover:text-sky-300"
          >
            Voltar pro D-pad
          </button>
        )}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative h-44 rounded-2xl border-2 border-dashed touch-none cursor-grab active:cursor-grabbing transition-colors
          ${active
            ? "border-primary bg-primary/10"
            : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 pointer-events-none">
          <div className="text-[11px] font-semibold mb-0.5">
            {active ? "Deslize…" : "Arraste pra navegar · Tap = OK"}
          </div>
          <div className="text-[9px] text-white/30">
            ↑ ↓ ← → automático
          </div>
        </div>
      </div>
    </div>
  );
}
