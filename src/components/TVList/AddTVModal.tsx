// Modal "Adicionar TV".
// 2 caminhos:
//   1) Auto-discovery via SSDP (botão "Procurar na rede") — sugere TVs achadas
//   2) Manual — usuário digita label + IP + escolhe a marca
//
// Sprint 2: para TVs Samsung/LG, dispara o pareamento automaticamente após
// adicionar e salva o token/client-key recebido.

import { useEffect, useState } from "react";
import { Search, Wifi, X } from "lucide-react";
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
  unknown: "Outra",
};

const MANUAL_BRANDS: Array<{ value: TvBrand; label: string }> = [
  { value: "roku", label: "Roku" },
  { value: "samsung", label: "Samsung" },
  { value: "lg", label: "LG" },
];

export function AddTVModal() {
  const open = useUiStore((s) => s.addTvModalOpen);
  const close = useUiStore((s) => s.closeAddTv);
  const { addTv, updateTv } = useTvStore();
  const { scan, scanning, results, error } = useDiscovery();
  const showToast = useToast((s) => s.show);

  const [label, setLabel] = useState("");
  const [host, setHost] = useState("");
  const [brand, setBrand] = useState<TvBrand>("roku");
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel("");
      setHost("");
      setBrand("roku");
      scan(3000);
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
    const tv: TvDevice = {
      id: `manual-${brand}-${ip}`,
      label: label.trim() || `${BRAND_LABEL[brand]} (${ip})`,
      brand,
      host: ip,
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-5 py-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[380px] bg-[#15181d] border border-white/[0.06] rounded-2xl p-5 my-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold">Adicionar TV</h3>
          <button onClick={close} className="text-white/50 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-discovery */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold">
              Encontradas na rede
            </label>
            <button
              onClick={() => scan(3000)}
              disabled={scanning || pairing}
              className="text-[11px] font-semibold text-primary hover:text-sky-300 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {scanning ? (
                <>
                  <Wifi className="w-3 h-3 animate-pulse" /> Procurando…
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" /> Procurar
                </>
              )}
            </button>
          </div>

          {results.length === 0 && !scanning && (
            <div className="text-xs text-white/40 px-2 py-3 text-center">
              {error ?? "Nenhuma TV detectada. Adicione manualmente abaixo."}
            </div>
          )}

          <div className="space-y-1.5">
            {results.map((tv) => (
              <button
                key={tv.id}
                onClick={() => onPickFromScan(tv)}
                disabled={pairing}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-black/20 border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{tv.label}</div>
                  <div className="text-[11px] text-white/40 font-mono">{tv.host}</div>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                  {BRAND_LABEL[tv.brand]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divisor + entrada manual */}
        <div className="h-px bg-white/[0.06] my-4" />
        <label className="block text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-1.5">
          Adicionar manualmente
        </label>

        {/* Marca */}
        <div className="flex gap-1.5 mb-2">
          {MANUAL_BRANDS.map((b) => (
            <button
              key={b.value}
              onClick={() => setBrand(b.value)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors
                ${brand === b.value
                  ? "bg-primary text-white"
                  : "bg-black/30 text-white/50 hover:bg-black/40 hover:text-white"}`}
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
          className="w-full bg-black/30 text-white text-sm rounded-lg border border-white/[0.08] px-3 py-2 mb-2 outline-none focus:border-primary"
        />
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="IP (ex: 192.168.0.10)"
          className="w-full bg-black/30 text-white text-sm font-mono rounded-lg border border-white/[0.08] px-3 py-2 outline-none focus:border-primary"
        />
        <p className="text-[11px] text-white/40 mt-2 leading-snug">
          Não sabe o IP? Abra na TV: Configurações → Rede → Sobre.
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={close}
            disabled={pairing}
            className="px-4 py-2 rounded-lg bg-[#2a2f37] hover:bg-[#3d4350] text-white text-sm font-semibold disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onAddManual}
            disabled={pairing}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-sky-400 text-white text-sm font-semibold disabled:opacity-50"
          >
            {pairing ? "Pareando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
