// Modal de criar/editar atalho — concentra TODA a complexidade num lugar.
// Lista principal fica só com pílulas "tecla → ação · editar".

import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";
import {
  useShortcutsStore,
  type CustomShortcut,
} from "@/stores/shortcutsStore";
import { useMacrosStore } from "@/stores/macrosStore";
import { Select, type SelectOption } from "@/components/Select";
import type { Command } from "@/lib/commands";
import { prettyCombo } from "./shortcutUtils";

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

interface Props {
  /** Atalho sendo editado; null = criar novo. */
  editing: CustomShortcut | null;
  onClose: () => void;
}

export function ShortcutEditorModal({ editing, onClose }: Props) {
  const { add, update } = useShortcutsStore();
  const macros = useMacrosStore((s) => s.macros);

  const [combo, setCombo] = useState(editing?.combo ?? "");
  const [recording, setRecording] = useState(false);
  const [targetType, setTargetType] = useState<"command" | "macro">(
    editing?.target.kind === "macro" ? "macro" : "command",
  );
  const [commandTarget, setCommandTarget] = useState<Command>(
    editing?.target.kind === "command" ? editing.target.command : "Up",
  );
  const [macroTarget, setMacroTarget] = useState<string>(
    editing?.target.kind === "macro" ? editing.target.macroId : macros[0]?.id ?? "",
  );

  // Esc fecha
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !recording) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, recording]);

  const startRecording = () => {
    setRecording(true);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Ignora teclas isoladas de modificador
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

  const canSave =
    !!combo &&
    (targetType === "command" ||
      (targetType === "macro" && !!macroTarget));

  const onSave = () => {
    if (!canSave) return;
    const target =
      targetType === "command"
        ? { kind: "command" as const, command: commandTarget }
        : { kind: "macro" as const, macroId: macroTarget };
    if (editing) {
      update(editing.id, { combo, target });
    } else {
      add({ combo, enabled: true, target });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center px-5 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] rounded-2xl p-5 shadow-2xl
                   bg-white border border-gray-200
                   dark:bg-[#15181d] dark:border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
            {editing ? "Editar atalho" : "Novo atalho"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100
                       dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TECLA */}
        <label className="block text-[10px] uppercase tracking-[0.08em] font-bold mb-1.5
                          text-gray-500 dark:text-white/50">
          Tecla
        </label>
        <button
          onClick={startRecording}
          className={`w-full mb-3 px-3 py-2.5 rounded-lg border text-sm font-mono text-center transition-colors
            ${recording
              ? "border-primary bg-primary/10 text-primary animate-pulse"
              : combo
                ? "border-primary/40 bg-primary/[0.06] text-gray-900 dark:text-white"
                : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 dark:border-white/[0.08] dark:bg-black/30 dark:text-white/40 dark:hover:border-white/15"}`}
        >
          {recording ? (
            <span className="inline-flex items-center gap-2">
              <Keyboard className="w-4 h-4" /> Aperte uma combinação…
            </span>
          ) : combo ? (
            prettyCombo(combo)
          ) : (
            "Clique pra gravar"
          )}
        </button>

        {/* AÇÃO */}
        <label className="block text-[10px] uppercase tracking-[0.08em] font-bold mb-1.5
                          text-gray-500 dark:text-white/50">
          Ação
        </label>
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => setTargetType("command")}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors
              ${targetType === "command"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-black/30 dark:text-white/50 dark:hover:bg-black/40 dark:hover:text-white"}`}
          >
            Comando
          </button>
          <button
            onClick={() => setTargetType("macro")}
            disabled={macros.length === 0}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-colors disabled:opacity-30
              ${targetType === "macro"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-black/30 dark:text-white/50 dark:hover:bg-black/40 dark:hover:text-white"}`}
          >
            Macro
          </button>
        </div>

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

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold
                       bg-gray-100 text-gray-700 hover:bg-gray-200
                       dark:bg-[#2a2f37] dark:text-white dark:hover:bg-[#3d4350]"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold
                       bg-primary text-white hover:bg-sky-400
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {editing ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
