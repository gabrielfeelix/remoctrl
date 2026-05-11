// Atalhos customizados — bind tecla a Command/Macro.
// Pro feature.

import { useState } from "react";
import { Plus, Trash2, Sparkles, Keyboard } from "lucide-react";
import { useShortcutsStore, type CustomShortcut } from "@/stores/shortcutsStore";
import { useMacrosStore } from "@/stores/macrosStore";
import { useIsPro } from "@/stores/licenseStore";
import { useUiStore } from "@/stores/uiStore";
import type { Command } from "@/lib/commands";

const COMMAND_OPTIONS: Command[] = [
  "Up", "Down", "Left", "Right", "Ok", "Back", "Home",
  "PlayPause", "VolumeUp", "VolumeDown", "Mute",
  "ChannelUp", "ChannelDown", "PowerOff",
];

export function CustomShortcuts() {
  const isPro = useIsPro();
  const openUpgrade = useUiStore((s) => s.openUpgrade);
  const { items, add, remove, toggle } = useShortcutsStore();
  const macros = useMacrosStore((s) => s.macros);

  const [recording, setRecording] = useState(false);
  const [combo, setCombo] = useState("");
  const [target, setTarget] = useState<string>("Up");
  const [targetType, setTargetType] = useState<"command" | "macro">("command");

  if (!isPro) {
    return (
      <div className="text-center py-6 px-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 grid place-items-center mx-auto mb-2">
          <Keyboard className="w-5 h-5 text-primary" />
        </div>
        <h4 className="text-sm font-bold text-white">Atalhos é Pro</h4>
        <p className="text-xs text-white/60 mt-1">
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

  const onRecord = () => {
    setRecording(true);
    setCombo("");
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("ctrl");
      if (e.metaKey) parts.push("meta");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");
      parts.push(e.code);
      setCombo(parts.join("+").toLowerCase());
      setRecording(false);
      window.removeEventListener("keydown", handler, true);
    };
    window.addEventListener("keydown", handler, true);
  };

  const onAdd = () => {
    if (!combo) return;
    const sc: Omit<CustomShortcut, "id"> = {
      combo,
      enabled: true,
      target:
        targetType === "command"
          ? { kind: "command", command: target as Command }
          : { kind: "macro", macroId: target },
    };
    add(sc);
    setCombo("");
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Novo atalho
        </h4>
        <div className="space-y-2">
          <button
            onClick={onRecord}
            className={`w-full px-3 py-2 rounded-lg border text-sm font-mono transition-colors
              ${combo
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/[0.08] bg-black/30 text-white/60"}`}
          >
            {recording ? "Aperte uma tecla…" : combo || "Clique e aperte uma tecla"}
          </button>

          <div className="flex gap-1.5">
            <button
              onClick={() => setTargetType("command")}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold ${
                targetType === "command"
                  ? "bg-primary text-white"
                  : "bg-black/30 text-white/50"
              }`}
            >
              Comando
            </button>
            <button
              onClick={() => setTargetType("macro")}
              disabled={macros.length === 0}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold disabled:opacity-30 ${
                targetType === "macro"
                  ? "bg-primary text-white"
                  : "bg-black/30 text-white/50"
              }`}
            >
              Macro
            </button>
          </div>

          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-black/30 text-white text-sm rounded-lg border border-white/[0.08] px-3 py-2 outline-none focus:border-primary"
          >
            {targetType === "command"
              ? COMMAND_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              : macros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
          </select>

          <button
            onClick={onAdd}
            disabled={!combo}
            className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary hover:bg-sky-400 disabled:opacity-40 text-white text-sm font-semibold"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-2">
          Salvos · {items.length}
        </h4>
        {items.length === 0 ? (
          <div className="text-xs text-white/40 px-2 py-3 text-center bg-black/20 rounded-lg">
            Nenhum atalho ainda.
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/25 border border-white/[0.06]"
              >
                <input
                  type="checkbox"
                  checked={sc.enabled}
                  onChange={() => toggle(sc.id)}
                  className="accent-primary"
                />
                <span className="font-mono text-[11px] text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  {sc.combo}
                </span>
                <span className="flex-1 text-xs text-white truncate">
                  {(() => {
                    if (sc.target.kind === "command") return sc.target.command;
                    const id = sc.target.macroId;
                    const m = macros.find((mm) => mm.id === id);
                    return `Macro: ${m?.name ?? "?"}`;
                  })()}
                </span>
                <button
                  onClick={() => remove(sc.id)}
                  className="text-white/40 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
