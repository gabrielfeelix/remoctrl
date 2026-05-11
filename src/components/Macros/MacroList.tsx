// Tab de macros — lista + criar/editar/rodar.
// Macros são Pro. Se Free, mostra paywall.

import { useState } from "react";
import { Trash2, Play, Plus, Sparkles, Zap } from "lucide-react";
import { useMacrosStore } from "@/stores/macrosStore";
import { useTvStore } from "@/stores/tvStore";
import { useIsPro } from "@/stores/licenseStore";
import { useUiStore } from "@/stores/uiStore";
import { useToast } from "@/components/Toast";
import { sendCommand, sendText } from "@/lib/commands";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri";
import { MacroEditor } from "./MacroEditor";
import type { Macro } from "@/stores/macrosStore";

export function MacroList() {
  const isPro = useIsPro();
  const { macros, remove } = useMacrosStore();
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);
  const openUpgrade = useUiStore((s) => s.openUpgrade);

  const [editing, setEditing] = useState<Macro | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const run = async (m: Macro) => {
    if (!tv) {
      showToast("Selecione uma TV primeiro", "err");
      return;
    }
    showToast(`Rodando "${m.name}"…`);
    for (const step of m.steps) {
      try {
        if (step.type === "command") await sendCommand(tv, step.command);
        else if (step.type === "text") await sendText(tv, step.text);
        else if (step.type === "delay")
          await new Promise((r) => setTimeout(r, step.ms));
        else if (step.type === "app" && isTauri()) {
          if (step.brand === "roku") {
            await invoke("roku_launch_app", { host: tv.host, appId: step.appId });
          } else if (step.brand === "lg" && tv.auth_token) {
            await invoke("lg_launch_app", {
              host: tv.host,
              clientKey: tv.auth_token,
              appId: step.appId,
            });
          }
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Macro falhou", "err");
        return;
      }
    }
    showToast(`"${m.name}" concluída`);
  };

  // Free → paywall
  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/40 grid place-items-center mb-3">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-bold text-white">Macros é Pro</h3>
        <p className="text-sm text-white/60 max-w-xs mt-1 leading-snug">
          Crie sequências de comandos com 1 clique — abrir Netflix, ajustar volume e jogar a próxima série.
        </p>
        <button
          onClick={openUpgrade}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-sky-400 text-white text-sm font-semibold"
        >
          <Sparkles className="w-4 h-4" />
          Ver Pro
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold">
          Suas macros · {macros.length}
        </h3>
        <button
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-sky-300"
        >
          <Plus className="w-3 h-3" />
          Nova
        </button>
      </div>

      {macros.length === 0 ? (
        <div className="text-xs text-white/40 px-2 py-6 text-center">
          Nenhuma macro ainda. Toque em "Nova" pra começar.
        </div>
      ) : (
        <div className="space-y-1.5">
          {macros.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/25 border border-white/[0.06] hover:border-primary/30 transition-colors"
            >
              <button
                onClick={() => run(m)}
                className="w-9 h-9 rounded-lg bg-primary/15 hover:bg-primary/25 grid place-items-center text-primary"
                title="Rodar"
              >
                <Play className="w-4 h-4" fill="currentColor" />
              </button>
              <button
                onClick={() => setEditing(m)}
                className="flex-1 text-left"
              >
                <div className="text-sm font-semibold text-white">{m.name}</div>
                <div className="text-[11px] text-white/50">{m.steps.length} passos</div>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Apagar "${m.name}"?`)) remove(m.id);
                }}
                className="text-white/40 hover:text-red-400 p-1"
                title="Apagar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(newOpen || editing) && (
        <MacroEditor
          macro={editing}
          onClose={() => {
            setNewOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
