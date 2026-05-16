// EditTvModal — edição rápida de campos da TV existente.
// Especialmente útil pra adicionar o MAC (Wake-on-LAN) numa TV que foi
// adicionada sem ele. Também ajusta apelido, PSK Sony, porta ADB.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";

const BRAND_LABEL = {
  roku: "Roku",
  samsung: "Samsung",
  lg: "LG",
  sony: "Sony",
  androidtv: "Android TV",
  philips: "Philips",
  unknown: "TV",
} as const;

export function EditTvModal() {
  const id = useUiStore((s) => s.editTvId);
  const close = useUiStore((s) => s.closeEditTv);
  const { saved, updateTv } = useTvStore();
  const showToast = useToast((s) => s.show);
  const tv = saved.find((t) => t.id === id) ?? null;

  const [label, setLabel] = useState("");
  const [mac, setMac] = useState("");
  const [psk, setPsk] = useState("");
  const [port, setPort] = useState("");

  useEffect(() => {
    if (!tv) return;
    setLabel(tv.label);
    setMac(tv.mac ?? "");
    setPsk(tv.brand === "sony" ? tv.auth_token ?? "" : "");
    setPort(tv.brand === "androidtv" ? String(tv.port ?? "") : "");
  }, [tv]);

  if (!tv) return null;

  const save = () => {
    const macClean = mac.trim();
    if (macClean) {
      const hex = macClean.replace(/[^0-9a-fA-F]/g, "");
      if (hex.length !== 12) {
        showToast("MAC inválido — formato esperado: AA:BB:CC:DD:EE:FF", "err");
        return;
      }
    }
    const patch: Partial<typeof tv> = {
      label: label.trim() || `${BRAND_LABEL[tv.brand]} (${tv.host})`,
      mac: macClean || null,
    };
    if (tv.brand === "sony") {
      patch.auth_token = psk.trim() || null;
    }
    if (tv.brand === "androidtv") {
      const p = parseInt(port.trim(), 10);
      patch.port = Number.isFinite(p) && p > 0 && p < 65536 ? p : 5555;
    }
    updateTv(tv.id, patch);
    showToast("TV atualizada");
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center px-5 bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl p-5 shadow-2xl border
                   bg-white border-gray-200
                   dark:bg-[#15181d] dark:border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
            Editar TV
          </h3>
          <button
            onClick={close}
            className="p-1 text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
              Apelido
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full mt-1 text-sm rounded-lg border px-3 py-2 outline-none transition-colors
                         bg-white border-gray-200 text-gray-900 focus:border-primary
                         dark:bg-black/30 dark:border-white/[0.08] dark:text-white"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
              IP
            </label>
            <input
              type="text"
              value={tv.host}
              disabled
              title="Pra mudar o IP, remova e adicione a TV de novo"
              className="w-full mt-1 text-sm font-mono rounded-lg border px-3 py-2
                         bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed
                         dark:bg-black/40 dark:border-white/[0.06] dark:text-white/40"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
              MAC (pra Wake-on-LAN)
            </label>
            <input
              type="text"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="w-full mt-1 text-[12px] font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                         bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                         dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
            />
            <p className="text-[10px] mt-1 text-gray-500 dark:text-white/40">
              Com MAC, o botão Power consegue <strong className="text-primary">ligar a TV de volta</strong> mesmo desligada.
            </p>
          </div>

          {tv.brand === "sony" && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
                PSK Sony
              </label>
              <input
                type="text"
                value={psk}
                onChange={(e) => setPsk(e.target.value)}
                placeholder="ex: 0000"
                className="w-full mt-1 text-[12px] font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                           bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                           dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
              />
            </div>
          )}

          {tv.brand === "androidtv" && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
                Porta ADB
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="5555 ou porta da depuração sem fio"
                className="w-full mt-1 text-[12px] font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                           bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                           dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={close}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold
                       bg-gray-100 text-gray-700 hover:bg-gray-200
                       dark:bg-[#2a2f37] dark:text-white dark:hover:bg-[#3d4350]"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold
                       bg-primary text-white hover:bg-sky-400"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
