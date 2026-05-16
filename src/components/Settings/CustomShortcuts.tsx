// Atalhos customizados — bind tecla a Command/Macro.
// Layout compacto: criar e listar lado a lado, sem stretch desnecessário.
// Usa o <Select /> próprio do app pra não cair no chrome do SO.

import { useState } from "react";
import { Plus, Trash2, Sparkles, Keyboard } from "lucide-react";
import { useShortcutsStore, type CustomShortcut } from "@/stores/shortcutsStore";
import { useMacrosStore } from "@/stores/macrosStore";
import { useIsPro } from "@/stores/licenseStore";
import { useUiStore } from "@/stores/uiStore";
import { Select, type SelectOption } from "@/components/Select";
import type { Command } from "@/lib/commands";

// Comandos rotulados em português (o <select> nativo mostrava só "Up", "Down" etc.)
const COMMAND_OPTIONS: SelectOption<Command>[] = [
  { value: "Up", label: "Cima" },
  { value: "Down", label: "Baixo" },
  { value: "Left", label: "Esquerda" },
  { value: "Right", label: "Direita" },
  { value: "Ok", label: "OK / Selecionar" },
  { value: "Back", label: "Voltar" },
  { value: "Home", label: "Início (Home)" },
  { value: "PlayPause", label: "Play / Pause" },
  { value: "VolumeUp", label: "Volume +" },
  { value: "VolumeDown", label: "Volume −" },
  { value: "Mute", label: "Mudo" },
  { value: "ChannelUp", label: "Canal +" },
  { value: "ChannelDown", label: "Canal −" },
  { value: "PowerOff", label: "Liga / Desliga" },
];

/** Combo "ctrl+shift+KeyN" → "Ctrl + Shift + N" pra exibição amigável. */
function prettyCombo(c: string): string {
  return c
    .split("+")
    .map((p) => {
      const key = p.trim();
      if (key === "ctrl") return "Ctrl";
      if (key === "meta") return "⌘";
      if (key === "alt") return "Alt";
      if (key === "shift") return "Shift";
      if (key.startsWith("Key")) return key.slice(3);
      if (key.startsWith("Digit")) return key.slice(5);
      return key;
    })
    .join(" + ");
}

export function CustomShortcuts() {
  const isPro = useIsPro();
  const openUpgrade = useUiStore((s) => s.openUpgrade);
  const { items, add, remove, toggle } = useShortcutsStore();
  const macros = useMacrosStore((s) => s.macros);

  const [recording, setRecording] = useState(false);
  const [combo, setCombo] = useState("");
  const [targetType, setTargetType] = useState<"command" | "macro">("command");
  const [commandTarget, setCommandTarget] = useState<Command>("Up");
  const [macroTarget, setMacroTarget] = useState<string>(macros[0]?.id ?? "");

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

  const startRecording = () => {
    setRecording(true);
    setCombo("");
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      // Ignora teclas isoladas (sem nada modificador nem letra real)
      if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) return;
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
    const target =
      targetType === "command"
        ? { kind: "command" as const, command: commandTarget }
        : { kind: "macro" as const, macroId: macroTarget };
    if (targetType === "macro" && !macroTarget) return;
    const sc: Omit<CustomShortcut, "id"> = { combo, enabled: true, target };
    add(sc);
    setCombo("");
  };

  return (
    <div className="space-y-3">
      {/* Compositor — uma linha mental: tecla → ação */}
      <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold w-12 shrink-0">
            Tecla
          </span>
          <button
            onClick={startRecording}
            className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono text-left transition-colors
              ${recording
                ? "border-primary bg-primary/10 text-primary animate-pulse"
                : combo
                  ? "border-primary/40 bg-primary/[0.06] text-white"
                  : "border-white/[0.08] bg-black/30 text-white/50 hover:border-white/15"}`}
          >
            {recording ? "Aperte uma tecla…" : combo ? prettyCombo(combo) : "Clique pra gravar"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold w-12 shrink-0">
            Ação
          </span>
          <div className="flex-1 flex gap-1.5">
            <button
              onClick={() => setTargetType("command")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors
                ${targetType === "command"
                  ? "bg-primary text-white"
                  : "bg-black/30 text-white/50 hover:text-white"}`}
            >
              Comando
            </button>
            <button
              onClick={() => setTargetType("macro")}
              disabled={macros.length === 0}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold disabled:opacity-30 transition-colors
                ${targetType === "macro"
                  ? "bg-primary text-white"
                  : "bg-black/30 text-white/50 hover:text-white"}`}
            >
              Macro
            </button>
            <div className="flex-1 min-w-0">
              {targetType === "command" ? (
                <Select
                  options={COMMAND_OPTIONS}
                  value={commandTarget}
                  onChange={setCommandTarget}
                />
              ) : (
                <Select
                  options={macros.map((m) => ({ value: m.id, label: m.name }))}
                  value={macroTarget}
                  onChange={setMacroTarget}
                  placeholder="Crie uma macro primeiro"
                />
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onAdd}
          disabled={!combo || (targetType === "macro" && !macroTarget)}
          className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-sky-400 disabled:opacity-40 text-white text-xs font-semibold"
        >
          <Plus className="w-3 h-3" /> Adicionar atalho
        </button>
      </div>

      {/* Lista — sem header redundante se não há itens */}
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((sc) => {
            const t = sc.target;
            const label =
              t.kind === "command"
                ? COMMAND_OPTIONS.find((o) => o.value === t.command)?.label ?? t.command
                : `Macro: ${macros.find((m) => m.id === t.macroId)?.name ?? "?"}`;
            return (
              <div
                key={sc.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/25 border border-white/[0.06]"
              >
                <input
                  type="checkbox"
                  checked={sc.enabled}
                  onChange={() => toggle(sc.id)}
                  className="accent-primary cursor-pointer"
                />
                <span className="font-mono text-[11px] text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  {prettyCombo(sc.combo)}
                </span>
                <span className="flex-1 text-xs text-white truncate">
                  → {label}
                </span>
                <button
                  onClick={() => remove(sc.id)}
                  className="text-white/40 hover:text-red-400 p-1"
                  title="Apagar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
