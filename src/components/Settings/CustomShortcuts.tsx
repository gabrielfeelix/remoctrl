// Atalhos customizados — view PRINCIPAL é uma lista simples.
// Criar/editar acontece num modal — não polui a Ajustes com formulário aberto.

import { useState } from "react";
import { Plus, Pencil, Trash2, Sparkles, Keyboard } from "lucide-react";
import { useShortcutsStore, type CustomShortcut } from "@/stores/shortcutsStore";
import { useMacrosStore } from "@/stores/macrosStore";
import { useIsPro } from "@/stores/licenseStore";
import { useUiStore } from "@/stores/uiStore";
import { ShortcutEditorModal } from "./ShortcutEditorModal";
import { COMMAND_LABEL, prettyCombo } from "./shortcutUtils";

export function CustomShortcuts() {
  const isPro = useIsPro();
  const openUpgrade = useUiStore((s) => s.openUpgrade);
  const { items, remove, toggle } = useShortcutsStore();
  const macros = useMacrosStore((s) => s.macros);

  const [editing, setEditing] = useState<CustomShortcut | null>(null);
  const [creating, setCreating] = useState(false);

  if (!isPro) {
    return (
      <div className="text-center py-6 px-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 grid place-items-center mx-auto mb-2">
          <Keyboard className="w-5 h-5 text-primary" />
        </div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Atalhos é Pro</h4>
        <p className="text-xs text-gray-500 dark:text-white/60 mt-1">
          Mapeie qualquer tecla pra um comando ou macro.
        </p>
        <button
          onClick={openUpgrade}
          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-sky-400 text-white text-xs font-semibold"
        >
          <Sparkles className="w-3 h-3" /> Ver Pro
        </button>
      </div>
    );
  }

  const labelFor = (sc: CustomShortcut): string => {
    const t = sc.target;
    if (t.kind === "command") return COMMAND_LABEL[t.command] ?? t.command;
    const m = macros.find((mm) => mm.id === t.macroId);
    return `Macro: ${m?.name ?? "removida"}`;
  };

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/[0.08] p-4 text-center">
          <div className="text-[12px] text-gray-500 dark:text-white/50 mb-2">
            Nenhum atalho ainda.
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-sky-400 text-white text-xs font-semibold"
          >
            <Plus className="w-3 h-3" /> Criar primeiro atalho
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {items.map((sc) => (
              <div
                key={sc.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                  bg-gray-50 border-gray-200 hover:border-gray-300
                  dark:bg-black/25 dark:border-white/[0.06] dark:hover:border-white/[0.12]
                  ${sc.enabled ? "" : "opacity-50"}`}
              >
                <input
                  type="checkbox"
                  checked={sc.enabled}
                  onChange={() => toggle(sc.id)}
                  className="accent-primary cursor-pointer"
                  title={sc.enabled ? "Desativar" : "Ativar"}
                />
                <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 rounded px-2 py-0.5 shrink-0">
                  {prettyCombo(sc.combo)}
                </span>
                <span className="text-gray-400 dark:text-white/30 text-xs shrink-0">→</span>
                <span className="flex-1 text-xs text-gray-700 dark:text-white truncate">
                  {labelFor(sc)}
                </span>
                <button
                  onClick={() => setEditing(sc)}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100
                             dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(sc.id)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50
                             dark:text-white/40 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                  title="Apagar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCreating(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                       border border-dashed text-xs font-semibold transition-colors
                       border-gray-300 text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5
                       dark:border-white/[0.08] dark:text-white/50 dark:hover:border-primary dark:hover:text-primary dark:hover:bg-primary/5"
          >
            <Plus className="w-3 h-3" /> Novo atalho
          </button>
        </>
      )}

      {(creating || editing) && (
        <ShortcutEditorModal
          editing={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
