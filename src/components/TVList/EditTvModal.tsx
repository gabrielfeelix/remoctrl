// EditTvModal — edição rápida de campos da TV existente.
// Especialmente útil pra adicionar o MAC (Wake-on-LAN) numa TV que foi
// adicionada sem ele. Também ajusta apelido, PSK Sony, porta ADB.
//
// Guia "Como achar o MAC?" é por-marca, mostra só os passos da TV atual,
// em cards numerados (sem wall-of-text).

import { useEffect, useState } from "react";
import { X, HelpCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import type { TvBrand } from "@/types";

const BRAND_LABEL: Record<TvBrand, string> = {
  roku: "Roku",
  samsung: "Samsung",
  lg: "LG",
  sony: "Sony",
  androidtv: "Android TV",
  philips: "Philips",
  unknown: "TV",
};

/** Guia por marca: 1) onde achar o MAC; 2) onde ativar WoL.
 * Confiança do passo + caveats vem direto da pesquisa de protocolos por
 * marca (alguns modelos descontinuaram WoL — vale avisar). */
interface BrandGuide {
  reliable: "high" | "medium" | "low" | "none";
  reliabilityNote?: string;
  macSteps: string[];
  wolSteps: string[];
  wolName: string;
}

const GUIDES: Partial<Record<TvBrand, BrandGuide>> = {
  roku: {
    reliable: "medium",
    reliabilityNote:
      "Roku TV: WoL é instável. O Remoctrl prioriza um wake via ECP (mais confiável) e cai pra WoL se falhar.",
    macSteps: [
      "No controle, aperte Home e abra Configurações",
      "Sistema → Sobre",
      "Role até o fim e clique em 'Detalhes' (More info)",
      "Procure 'Endereço Wi-Fi' (ou Ethernet, se for cabo)",
    ],
    wolName: "Início Rápido da TV",
    wolSteps: [
      "Configurações → Sistema → Energia",
      "Ative 'Início Rápido da TV' (mantém o ECP vivo — chave pro Power-On)",
      "(opcional) Procure 'Standby de rede' / 'Network standby' se existir",
    ],
  },
  samsung: {
    reliable: "low",
    reliabilityNote:
      "Samsung 2020+: vários modelos removeram WoL por Wi-Fi. Funciona melhor via cabo Ethernet.",
    macSteps: [
      "Configurações → Suporte → Sobre esta TV",
      "Encontre 'Endereço MAC' (ou 'MAC sem fio' / 'MAC Ethernet')",
      "Em modelos antigos: Rede → Status da Rede → Configurações de IP",
    ],
    wolName: "Ligar com celular",
    wolSteps: [
      "Configurações → Geral → Rede → Configurações de Especialistas",
      "Ative 'Ligar com Mobile' (ou 'Power On with Mobile')",
      "Conecte a TV à conta Samsung / SmartThings se aparecer",
    ],
  },
  lg: {
    reliable: "high",
    macSteps: [
      "Configurações → Tudo (engrenagem grande)",
      "Geral → Sobre esta TV → Informações",
      "MAC aparece em 'Endereço MAC com fio' / 'sem fio'",
    ],
    wolName: "Ligar TV pelo Celular",
    wolSteps: [
      "Configurações → Tudo → Geral → 'Ligar TV pelo Celular'",
      "Escolha 'Ligar via Wi-Fi' (ou Ethernet)",
      "Em webOS 6+: pode estar em Geral → Dispositivos → Dispositivos externos",
    ],
  },
  sony: {
    reliable: "medium",
    reliabilityNote: "Sony Bravia: 'Remote Start' funciona melhor via cabo Ethernet.",
    macSteps: [
      "Configurações → Sistema → Sobre → Status",
      "MAC aparece separado pra Wi-Fi e Ethernet",
    ],
    wolName: "Remote Start",
    wolSteps: [
      "Configurações → Rede e Internet → 'Remote Start' = ON",
      "Em Android TV antigo: Configurações → Rede → Remote start",
    ],
  },
  androidtv: {
    reliable: "low",
    reliabilityNote:
      "Android TV varia muito por fabricante. Xiaomi/AOC/Multilaser geralmente não suportam WoL.",
    macSteps: [
      "Configurações → Sistema → Sobre → Status",
      "Ou: Configurações → Rede e Internet → (sua conexão) → role até o fim",
    ],
    wolName: "Wake on Network / Networked Standby",
    wolSteps: [
      "Configurações → Rede e Internet → procure 'Wake on Network'",
      "Em TCL/Hisense: pode estar em 'Networked Standby'",
      "Se não tem opção, a TV provavelmente não suporta WoL",
    ],
  },
  philips: {
    reliable: "high",
    macSteps: [
      "Configurações → Sem fio e redes → Com fio/Wi-Fi",
      "Ver configurações de rede → MAC Address",
      "Android TV Philips: Configurações → Sistema → Sobre → Status",
    ],
    wolName: "Wake on LAN / Wake with Wi-Fi",
    wolSteps: [
      "Configurações → Sem fio e redes → Com fio/Wi-Fi",
      "Ative 'Wake with LAN' ou 'Wake with Wi-Fi' (Philips chama explícito)",
    ],
  },
};

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
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!tv) return;
    setLabel(tv.label);
    setMac(tv.mac ?? "");
    setPsk(tv.brand === "sony" ? tv.auth_token ?? "" : "");
    setPort(tv.brand === "androidtv" ? String(tv.port ?? "") : "");
    setShowGuide(false);
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

  const guide = GUIDES[tv.brand];

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center px-5 bg-black/60 backdrop-blur-sm overflow-y-auto py-6"
      onClick={close}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl p-5 shadow-2xl border my-auto
                   bg-white border-gray-200
                   dark:bg-[#15181d] dark:border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
            Editar {BRAND_LABEL[tv.brand]}
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
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
                MAC (pra ligar a TV)
              </label>
              {guide && (
                <button
                  type="button"
                  onClick={() => setShowGuide((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-sky-600 dark:hover:text-sky-300"
                >
                  <HelpCircle className="w-3 h-3" />
                  {showGuide ? "Ocultar" : "Como achar?"}
                </button>
              )}
            </div>
            <input
              type="text"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="w-full mt-1 text-[12px] font-mono rounded-lg border px-3 py-2 outline-none transition-colors
                         bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                         dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
            />

            {showGuide && guide && (
              <BrandGuideCard guide={guide} brand={tv.brand} />
            )}
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

/** Card visual com 2 etapas (achar MAC, ativar WoL) e um aviso de
 * confiabilidade quando aplicável. Só renderiza quando aberto. */
function BrandGuideCard({ guide, brand }: { guide: BrandGuide; brand: TvBrand }) {
  const reliabilityColor =
    guide.reliable === "high"
      ? "text-green-600 dark:text-green-400"
      : guide.reliable === "medium"
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-500 dark:text-red-400";
  const ReliabilityIcon = guide.reliable === "high" ? CheckCircle2 : AlertCircle;

  return (
    <div className="mt-2 rounded-lg border p-3 space-y-3
                    bg-gray-50 border-gray-200
                    dark:bg-black/30 dark:border-white/[0.06]">
      {/* Confiabilidade */}
      <div className={`flex items-start gap-1.5 text-[11px] leading-snug ${reliabilityColor}`}>
        <ReliabilityIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          {guide.reliable === "high" && "Wake-on-LAN costuma funcionar bem nessa marca."}
          {guide.reliable === "medium" && guide.reliabilityNote}
          {guide.reliable === "low" && guide.reliabilityNote}
        </span>
      </div>

      {/* Achar MAC */}
      <Section title={`1. Onde achar o MAC na ${BRAND_LABEL[brand]}`} steps={guide.macSteps} />

      {/* Ativar WoL */}
      <Section title={`2. Ativar "${guide.wolName}"`} steps={guide.wolSteps} />

      <p className="text-[10px] text-gray-500 dark:text-white/40 leading-snug">
        <strong>Atalho:</strong> o MAC também aparece no seu roteador, na lista de "dispositivos conectados" — costuma ser o caminho mais rápido.
      </p>
    </div>
  );
}

function Section({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-600 dark:text-white/60 mb-1.5">
        {title}
      </div>
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex gap-2 text-[11px] leading-snug text-gray-700 dark:text-white/70"
          >
            <span className="w-[14px] h-[14px] rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
