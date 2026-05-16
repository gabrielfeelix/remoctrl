// BackgroundDiscovery — Pro feature.
// A cada N minutos roda um SSDP em background. Se descobre uma TV que
// não está nas "saved", mostra um toast com botão "Adicionar".
//
// Cuidados:
//   - Não roda em browser puro (depende de Tauri + SSDP).
//   - Suprime alertas repetidos pra mesma TV em sessões curtas.
//   - Intervalo conservador (8 min) pra não criar tráfego desnecessário.

import { useEffect, useRef } from "react";
import { useIsPro } from "@/stores/licenseStore";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { useUiStore } from "@/stores/uiStore";
import { discoverTvs, isTauri } from "@/lib/tauri";

const INTERVAL_MS = 8 * 60 * 1000; // 8 minutos

export function BackgroundDiscovery() {
  const isPro = useIsPro();
  const saved = useTvStore((s) => s.saved);
  const openAddTv = useUiStore((s) => s.openAddTv);
  const showToast = useToast((s) => s.show);
  // Dedupe: já alertamos sobre essa TV nesta sessão? Não floda toast.
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPro || !isTauri()) return;

    let cancelled = false;

    const scan = async () => {
      if (cancelled) return;
      try {
        const found = await discoverTvs(3000);
        if (cancelled) return;
        for (const tv of found) {
          const key = `${tv.brand}:${tv.host}`;
          // Já salva ou já alertada → skip
          const alreadySaved = saved.some(
            (s) => s.host === tv.host && s.brand === tv.brand,
          );
          if (alreadySaved || alerted.current.has(key)) continue;
          alerted.current.add(key);
          showToast(`Nova TV detectada: ${tv.label} — abra o + TV pra adicionar`);
          // Convidativo, sem ser intrusivo: 1 toast, usuário decide.
          // Se ele quiser, abre o modal e a TV já aparece nos resultados.
          break; // 1 toast por scan; evita avalanche se muitas TVs novas
        }
      } catch {
        // Silencioso — background scan não pode "incomodar" se rede flap
      }
    };

    // Primeira execução depois de 30s (deixa o app assentar)
    const t0 = window.setTimeout(scan, 30_000);
    const t1 = window.setInterval(scan, INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearInterval(t1);
    };
  }, [isPro, saved, openAddTv, showToast]);

  return null;
}
