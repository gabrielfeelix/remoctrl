// Hook de discovery — varre a LAN via SSDP, devolve a lista de TVs achadas.
//
// Não persiste resultado: o objetivo é alimentar o modal "Adicionar TV"
// com sugestões. Quem persiste é o tvStore via addTv().

import { useCallback, useState } from "react";
import { discoverTvs, isTauri } from "@/lib/tauri";
import type { TvDevice } from "@/types";

export function useDiscovery() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<TvDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (timeoutMs = 3000) => {
    if (!isTauri()) {
      setError("Discovery só funciona no app desktop (Tauri).");
      return [];
    }
    setScanning(true);
    setError(null);
    try {
      const found = await discoverTvs(timeoutMs);
      setResults(found);
      return found;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return [];
    } finally {
      setScanning(false);
    }
  }, []);

  return { scan, scanning, results, error };
}
