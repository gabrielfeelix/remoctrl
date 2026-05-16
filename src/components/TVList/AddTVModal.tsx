// Modal "Adicionar TV" — redesenhado pra ser óbvio:
//   1. Hero: "Buscando suas TVs..." com pulse animation
//   2. Resultados aparecem prontos pra click
//   3. "Adicionar manualmente" é um caminho secundário, recolhido por padrão
//
// Sprint 2: para Samsung/LG, dispara o pareamento automaticamente após
// adicionar e salva o token/client-key recebido.

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Tv2, Wifi, X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useTvStore } from "@/stores/tvStore";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useToast } from "@/components/Toast";
import { pairTv } from "@/lib/commands";
import type { TvDevice, TvBrand } from "@/types";

const BRAND_LABEL: Record<TvBrand, string> = {
  roku: "Roku",
  samsung: "Samsung",
  lg: "LG",
  sony: "Sony",
  unknown: "Outra",
};

const MANUAL_BRANDS: Array<{ value: TvBrand; label: string }> = [
  { value: "roku", label: "Roku" },
  { value: "samsung", label: "Samsung" },
  { value: "lg", label: "LG" },
  { value: "sony", label: "Sony" },
];

export function AddTVModal() {
  const open = useUiStore((s) => s.addTvModalOpen);
  const close = useUiStore((s) => s.closeAddTv);
  const { addTv, updateTv } = useTvStore();
  const { scan, scanning, results } = useDiscovery();
  const showToast = useToast((s) => s.show);

  const [label, setLabel] = useState("");
  const [host, setHost] = useState("");
  const [mac, setMac] = useState("");
  const [psk, setPsk] = useState(""); // Sony Bravia: Pre-Shared Key (opcional)
  const [brand, setBrand] = useState<TvBrand>("roku");
  const [pairing, setPairing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel("");
      setHost("");
      setMac("");
      setPsk("");
      setBrand("roku");
      setManualOpen(false);
      scan(4000);
    }
  }, [open, scan]);

  if (!open) return null;

  /**
   * Para Samsung/LG, depois de adicionar precisamos parear (popup na TV).
   * Roku não exige nada (Modo Permissivo já habilitado pelo usuário).
   */
  const maybePair = async (tv: TvDevice) => {
    if (tv.brand !== "samsung" && tv.brand !== "lg") return;
    setPairing(true);
    showToast(
      tv.brand === "samsung"
        ? "Aceite o pareamento na TV (popup)…"
        : "Aceite o pareamento na TV (controle físico)…",
    );
    try {
      const res = await pairTv(tv);
      if (res.token) {
        updateTv(tv.id, { auth_token: res.token });
        showToast("Pareada com sucesso");
      } else {
        showToast("Pareada (sem token novo)");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Pareamento falhou", "err");
    } finally {
      setPairing(false);
    }
  };

  const onAddManual = async () => {
    const ip = host.trim();
    if (!ip) {
      showToast("Digite o IP da TV", "err");
      return;
    }
    const macClean = mac.trim();
    if (macClean) {
      // Aceita AA:BB:CC:DD:EE:FF, AA-BB-..., ou só 12 hex digits
      const hex = macClean.replace(/[^0-9a-fA-F]/g, "");
      if (hex.length !== 12) {
        showToast("MAC inválido — formato esperado: AA:BB:CC:DD:EE:FF", "err");
        return;
      }
    }
    const tv: TvDevice = {
      id: `manual-${brand}-${ip}`,
      label: label.trim() || `${BRAND_LABEL[brand]} (${ip})`,
      brand,
      host: ip,
      mac: macClean || null,
      // Sony usa o auth_token pra PSK (não tem pareamento — chave vem da TV)
      auth_token: brand === "sony" ? psk.trim() || null : null,
    };
    addTv(tv);
    showToast("TV adicionada");
    close();
    await maybePair(tv);
  };

  const onPickFromScan = async (tv: TvDevice) => {
    addTv(tv);
    showToast(`${tv.label} adicionada`);
    close();
    await maybePair(tv);
  };

  const hasResults = results.length > 0;
  const showEmpty = !scanning && !hasResults;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-5 py-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl my-auto shadow-2xl overflow-hidden border
                   bg-white border-gray-200
                   dark:bg-[#15181d] dark:border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header simples */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Adicionar TV</h3>
          <button
            onClick={close}
            className="p-1 text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* HERO — Busca automática */}
        <div className="px-5 pt-4 pb-5">
          {scanning && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 grid place-items-center">
                  <Wifi className="w-7 h-7 text-primary animate-pulse" />
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Procurando suas TVs</div>
              <div className="text-[11px] text-gray-500 dark:text-white/55 mt-1">
                Olhando a rede local…
              </div>
            </div>
          )}

          {!scanning && hasResults && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
                  {results.length === 1
                    ? "1 TV encontrada"
                    : `${results.length} TVs encontradas`}
                </div>
                <button
                  onClick={() => scan(4000)}
                  disabled={pairing}
                  className="text-[11px] font-semibold text-primary hover:text-sky-600 dark:hover:text-sky-300 inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  Procurar de novo
                </button>
              </div>
              {results.map((tv) => (
                <button
                  key={tv.id}
                  onClick={() => onPickFromScan(tv)}
                  disabled={pairing}
                  className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl transition-all disabled:opacity-50
                             bg-primary/[0.06] border border-primary/25 hover:border-primary hover:bg-primary/10"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/15 grid place-items-center text-primary shrink-0">
                    <Tv2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                      {tv.label}
                    </div>
                    <div className="text-[11px] font-mono truncate text-gray-500 dark:text-white/50">
                      {tv.host}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    {BRAND_LABEL[tv.brand]}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center text-center py-6 px-2">
              <div className="w-12 h-12 rounded-full grid place-items-center mb-2
                              bg-gray-100 dark:bg-white/[0.04]">
                <Tv2 className="w-5 h-5 text-gray-400 dark:text-white/40" />
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Nenhuma TV encontrada
              </div>
              <div className="text-[11px] mt-1 leading-snug max-w-[280px] text-gray-600 dark:text-white/55">
                A TV precisa estar <strong className="text-gray-900 dark:text-white">ligada</strong>{" "}
                e na <strong className="text-gray-900 dark:text-white">mesma rede Wi-Fi</strong> do PC.
              </div>
              <button
                onClick={() => scan(4000)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold"
              >
                <RefreshCw className="w-3 h-3" />
                Procurar de novo
              </button>

              {/* Dica de permissão — alguns modelos exigem aprovação na TV. */}
              <details className="mt-3 max-w-[300px] text-left group">
                <summary className="text-[10px] uppercase tracking-[0.08em] font-bold cursor-pointer list-none flex items-center gap-1
                                    text-gray-500 hover:text-gray-700
                                    dark:text-white/40 dark:hover:text-white/60">
                  <span className="group-open:rotate-90 inline-block transition-transform">›</span>
                  Não aparece nada?
                </summary>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-snug pl-2 text-gray-600 dark:text-white/55">
                  <li>
                    <strong className="text-gray-900 dark:text-white/80">Samsung / LG:</strong> no primeiro uso
                    a TV mostra um pop-up pedindo permissão — aceite no controle físico.
                    Se você já recusou antes, ative em
                    <span className="text-gray-700 dark:text-white/70"> Configurações → Externo → Gerenciador de dispositivos</span>.
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white/80">Roku:</strong> ative
                    <span className="text-gray-700 dark:text-white/70"> Modo Permissivo</span> em
                    Ajustes → Sistema → Avançado → Controle por outros aparelhos.
                  </li>
                  <li>
                    Se o problema persistir, use <strong className="text-gray-900 dark:text-white/80">Adicionar manualmente</strong> abaixo
                    com o IP da TV.
                  </li>
                </ul>
              </details>
            </div>
          )}
        </div>

        {/* Footer: Manual — escondido por padrão */}
        <div className="border-t bg-gray-50 border-gray-200
                        dark:bg-black/20 dark:border-white/[0.06]">
          <button
            onClick={() => setManualOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left
                       hover:bg-gray-100 dark:hover:bg-white/[0.02]"
          >
            <div>
              <div className="text-[12px] font-bold text-gray-800 dark:text-white/80">
                Adicionar manualmente
              </div>
              <div className="text-[10px] text-gray-500 dark:text-white/40">
                Se você já sabe o IP da TV
              </div>
            </div>
            {manualOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400 dark:text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-white/40" />
            )}
          </button>

          {manualOpen && (
            <div className="px-5 pb-4 pt-1 space-y-2">
              {/* Marca */}
              <div className="flex gap-1.5">
                {MANUAL_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setBrand(b.value)}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors
                      ${brand === b.value
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-black/30 dark:text-white/50 dark:hover:bg-black/40 dark:hover:text-white"}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Apelido (ex: Sala)"
                className="w-full text-sm rounded-lg border px-3 py-2 outline-none transition-colors
                           bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                           dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
              />
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="IP da TV (ex: 192.168.0.10)"
                className="w-full text-sm font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                           bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                           dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
              />
              <input
                type="text"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="MAC opcional pra ligar TV (AA:BB:CC:DD:EE:FF)"
                className="w-full text-[12px] font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                           bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                           dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
              />
              {brand === "sony" && (
                <input
                  type="text"
                  value={psk}
                  onChange={(e) => setPsk(e.target.value)}
                  placeholder="PSK Sony (opcional, ex: 0000)"
                  className="w-full text-[12px] font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                             bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                             dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
                />
              )}
              <p className="text-[10px] leading-snug text-gray-500 dark:text-white/40">
                IP: Na TV em <strong className="text-gray-700 dark:text-white/60">Configurações → Rede → Sobre</strong>.
                MAC ativa <strong className="text-primary">Wake-on-LAN</strong> (liga a TV mesmo desligada).
                {brand === "sony" && (
                  <>
                    {" "}PSK ativa o controle IP: <strong className="text-gray-700 dark:text-white/60">Config → Rede → IP Control → Autenticação → "Normal e Chave Pré-Compartilhada"</strong>.
                  </>
                )}
              </p>

              <button
                onClick={onAddManual}
                disabled={pairing || !host.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
                           bg-primary text-white text-sm font-semibold
                           hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pairing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Pareando…
                  </>
                ) : (
                  "Adicionar TV"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
