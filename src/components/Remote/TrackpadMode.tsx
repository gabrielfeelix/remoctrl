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

// Sensibilidade: precisa percorrer GRID_PX pra disparar 1 comando, E esperar
// COOLDOWN ms antes do próximo. Sem cooldown, segurar o mouse parado
// disparava dezenas de comandos por segundo. Com 280ms entre disparos,
// chega a ~3.5 comandos/s no máximo — confortável de usar.
const GRID_PX = 60;
const COOLDOWN_MS = 280;

export function TrackpadMode({ onExit }: { onExit?: () => void }) {
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastFire = useRef(0);
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
    lastFire.current = 0;
    setActive(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!anchor.current) return;

    // Throttle: ignora moves muito próximos no tempo
    const now = performance.now();
    if (now - lastFire.current < COOLDOWN_MS) return;

    const dx = e.clientX - anchor.current.x;
    const dy = e.clientY - anchor.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < GRID_PX) return;

    moved.current = true;
    lastFire.current = now;

    // Direção dominante: H ou V. Reseta o anchor pra exigir nova distância
    // completa antes de outro disparo (combina com o cooldown).
    if (absX > absY) {
      fire(dx > 0 ? "Right" : "Left");
    } else {
      fire(dy > 0 ? "Down" : "Up");
    }
    anchor.current = { x: e.clientX, y: e.clientY };
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
