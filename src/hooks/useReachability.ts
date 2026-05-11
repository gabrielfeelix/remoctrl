// Hook que mantém o "dot" verde/vermelho atualizado — pinga a TV em loop.
//
// Cadência: a cada 5s. Em movimento curto (depois de mandar comando) não
// muda nada — só polling de fundo. Backoff: se 3 fails seguidos, espera 15s.
//
// Sprint 2: brand-aware via probeReachability.

import { useEffect, useState } from "react";
import { isTauri } from "@/lib/tauri";
import { probeReachability } from "@/lib/commands";
import type { TvDevice } from "@/types";

type Status = "unknown" | "ok" | "down";

export function useReachability(tv: TvDevice | null | undefined) {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    if (!tv || !isTauri()) {
      setStatus("unknown");
      return;
    }

    let cancelled = false;
    let consecutiveFails = 0;

    const tick = async () => {
      if (cancelled) return;
      try {
        const ok = await probeReachability(tv);
        if (cancelled) return;
        setStatus(ok ? "ok" : "down");
        consecutiveFails = ok ? 0 : consecutiveFails + 1;
      } catch {
        if (cancelled) return;
        setStatus("down");
        consecutiveFails++;
      }
      const delay = consecutiveFails >= 3 ? 15000 : 5000;
      setTimeout(tick, delay);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [tv?.id, tv?.host, tv?.brand]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
