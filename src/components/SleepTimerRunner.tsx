// Componente "invisível" que vive no App e dispara PowerOff quando o
// sleep timer atinge zero. Não renderiza nada. Apenas usa hooks.
//
// Cadência: checa a cada 5s — preciso o suficiente, sem queimar CPU.

import { useEffect } from "react";
import { useSleepTimerStore } from "@/stores/sleepTimerStore";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { sendCommand } from "@/lib/commands";
import { notify } from "@/lib/notify";

export function SleepTimerRunner() {
  const fireAt = useSleepTimerStore((s) => s.fireAt);
  const cancel = useSleepTimerStore((s) => s.cancel);
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);

  useEffect(() => {
    if (!fireAt) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() >= fireAt) {
        cancel();
        if (!tv) return;
        try {
          await sendCommand(tv, "PowerOff");
          showToast(`Boa noite — ${tv.label} desligada`);
          notify("Sleep timer", `${tv.label} foi desligada. Boa noite!`);
        } catch {
          showToast("Sleep timer disparou, mas TV não respondeu", "err");
          notify("Sleep timer", "TV não respondeu — verifique se ainda está ligada.");
        }
        return;
      }
      setTimeout(tick, 5000);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [fireAt, cancel, tv, showToast]);

  return null;
}
