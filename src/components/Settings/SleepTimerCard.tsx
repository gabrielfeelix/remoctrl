// Sleep timer card — entra na lista de "Aparência / Plano / Atalhos" em Ajustes.
// Layout: linha simples com botões de duração + countdown enquanto ativo.

import { useEffect, useState } from "react";
import { Moon, X } from "lucide-react";
import { useSleepTimerStore } from "@/stores/sleepTimerStore";

const PRESETS = [15, 30, 60] as const;

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SleepTimerCard() {
  const { fireAt, durationMin, start, cancel } = useSleepTimerStore();
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!fireAt) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, fireAt - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [fireAt]);

  const active = !!fireAt && remaining > 0;

  return (
    <div className="rounded-xl border p-3
                    bg-white border-gray-200
                    dark:bg-black/25 dark:border-white/[0.06]">
      <div className="flex items-start gap-2 mb-2">
        <Moon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Sleep timer</div>
          <div className="text-[11px] leading-snug text-gray-500 dark:text-white/55">
            {active
              ? `Desligando em ${formatRemaining(remaining)} (${durationMin}min)`
              : "Desliga a TV automaticamente depois de X minutos."}
          </div>
        </div>
        {active && (
          <button
            onClick={cancel}
            title="Cancelar"
            className="p-1 text-gray-400 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        {PRESETS.map((m) => {
          const isCurrent = active && durationMin === m;
          return (
            <button
              key={m}
              onClick={() => (isCurrent ? cancel() : start(m))}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors
                ${isCurrent
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-black/30 dark:text-white/60 dark:hover:bg-black/40 dark:hover:text-white"}`}
            >
              {m}min
            </button>
          );
        })}
      </div>
    </div>
  );
}
