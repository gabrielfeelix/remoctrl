// Editor de macro — modal pra criar/editar uma macro.

import { useState } from "react";
import { X, ArrowDown, ArrowUp, ArrowLeft, ArrowRight,
  Play, Volume2, VolumeX, Home as HomeIcon, ChevronLeft,
  Power, Plus, Trash2 } from "lucide-react";
import { useMacrosStore, type Macro, type MacroStep } from "@/stores/macrosStore";
import type { Command } from "@/lib/commands";

const QUICK_COMMANDS: Array<{ command: Command; label: string; Icon: typeof Play }> = [
  { command: "Up", label: "Cima", Icon: ArrowUp },
  { command: "Down", label: "Baixo", Icon: ArrowDown },
  { command: "Left", label: "Esquerda", Icon: ArrowLeft },
  { command: "Right", label: "Direita", Icon: ArrowRight },
  { command: "Ok", label: "OK", Icon: Play },
  { command: "Back", label: "Voltar", Icon: ChevronLeft },
  { command: "Home", label: "Home", Icon: HomeIcon },
  { command: "VolumeUp", label: "Vol +", Icon: Volume2 },
  { command: "VolumeDown", label: "Vol -", Icon: Volume2 },
  { command: "Mute", label: "Mudo", Icon: VolumeX },
  { command: "PlayPause", label: "Play/Pause", Icon: Play },
  { command: "PowerOff", label: "Power", Icon: Power },
];

interface Props {
  macro: Macro | null;
  onClose: () => void;
}

export function MacroEditor({ macro, onClose }: Props) {
  const { add, update } = useMacrosStore();
  const [name, setName] = useState(macro?.name ?? "");
  const [steps, setSteps] = useState<MacroStep[]>(macro?.steps ?? []);
  const [textInput, setTextInput] = useState("");

  const save = () => {
    if (!name.trim()) return;
    if (macro) update(macro.id, { name: name.trim(), steps });
    else add({ name: name.trim(), steps });
    onClose();
  };

  const addCommand = (command: Command) => {
    setSteps((s) => [...s, { type: "command", command }]);
  };
  const addDelay = (ms: number) => {
    setSteps((s) => [...s, { type: "delay", ms }]);
  };
  const addText = () => {
    if (!textInput.trim()) return;
    setSteps((s) => [...s, { type: "text", text: textInput.trim() }]);
    setTextInput("");
  };
  const removeStep = (i: number) => {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  };

  const stepLabel = (s: MacroStep): string => {
    if (s.type === "command") return s.command;
    if (s.type === "text") return `Digitar "${s.text}"`;
    if (s.type === "delay") return `Esperar ${s.ms}ms`;
    return `App ${s.appId}`;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-5 py-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl p-5 my-auto shadow-2xl border
                   bg-white border-gray-200
                   dark:bg-[#15181d] dark:border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {macro ? "Editar macro" : "Nova macro"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex: Abrir Netflix HDR)"
          className="w-full text-sm rounded-lg border px-3 py-2 mb-3 outline-none transition-colors
                     bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                     dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
        />

        {/* Steps existentes */}
        <label className="block text-[10px] uppercase tracking-[0.08em] font-bold mb-1.5 text-gray-500 dark:text-white/50">
          Passos · {steps.length}
        </label>
        <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
          {steps.length === 0 ? (
            <div className="text-xs px-2 py-3 text-center rounded-lg
                            text-gray-400 bg-gray-50 dark:text-white/40 dark:bg-black/20">
              Nenhum passo — adicione abaixo.
            </div>
          ) : (
            steps.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border
                           bg-gray-50 border-gray-200
                           dark:bg-black/30 dark:border-white/[0.06]"
              >
                <span className="text-[10px] font-mono w-5 text-gray-400 dark:text-white/40">{i + 1}.</span>
                <span className="flex-1 text-xs text-gray-800 dark:text-white">{stepLabel(s)}</span>
                <button
                  onClick={() => removeStep(i)}
                  className="text-gray-400 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Adicionar comando */}
        <label className="block text-[10px] uppercase tracking-[0.08em] font-bold mb-1.5 text-gray-500 dark:text-white/50">
          Adicionar comando
        </label>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {QUICK_COMMANDS.map(({ command, label, Icon }) => (
            <button
              key={command}
              onClick={() => addCommand(command)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px]
                         bg-gray-100 text-gray-800 hover:bg-primary/15 hover:text-primary
                         dark:bg-[#2a2f37] dark:text-white dark:hover:bg-primary/20"
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Adicionar texto */}
        <label className="block text-[10px] uppercase tracking-[0.08em] font-bold mb-1.5 text-gray-500 dark:text-white/50">
          Digitar texto
        </label>
        <div className="flex gap-1.5 mb-3">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Texto a enviar"
            className="flex-1 text-xs rounded-md border px-2 py-1.5 outline-none transition-colors
                       bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-primary
                       dark:bg-black/30 dark:border-white/[0.08] dark:text-white dark:placeholder:text-white/40"
          />
          <button
            onClick={addText}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-sky-400 text-white text-xs font-semibold"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Adicionar delay */}
        <label className="block text-[10px] uppercase tracking-[0.08em] font-bold mb-1.5 text-gray-500 dark:text-white/50">
          Esperar
        </label>
        <div className="flex gap-1.5 mb-4">
          {[200, 500, 1000, 2000].map((ms) => (
            <button
              key={ms}
              onClick={() => addDelay(ms)}
              className="flex-1 px-2 py-1.5 rounded-md text-[11px]
                         bg-gray-100 text-gray-800 hover:bg-primary/15 hover:text-primary
                         dark:bg-[#2a2f37] dark:text-white dark:hover:bg-primary/20"
            >
              {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold
                       bg-gray-100 text-gray-800 hover:bg-gray-200
                       dark:bg-[#2a2f37] dark:text-white dark:hover:bg-[#3d4350]"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || steps.length === 0}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
