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
        className="w-full max-w-[420px] bg-[#15181d] border border-white/[0.06] rounded-2xl p-5 my-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">
            {macro ? "Editar macro" : "Nova macro"}
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex: Abrir Netflix HDR)"
          className="w-full bg-black/30 text-white text-sm rounded-lg border border-white/[0.08] px-3 py-2 mb-3 outline-none focus:border-primary"
        />

        {/* Steps existentes */}
        <label className="block text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-1.5">
          Passos · {steps.length}
        </label>
        <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
          {steps.length === 0 ? (
            <div className="text-xs text-white/40 px-2 py-3 text-center bg-black/20 rounded-lg">
              Nenhum passo — adicione abaixo.
            </div>
          ) : (
            steps.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/30 border border-white/[0.06]"
              >
                <span className="text-[10px] text-white/40 font-mono w-5">{i + 1}.</span>
                <span className="flex-1 text-xs text-white">{stepLabel(s)}</span>
                <button
                  onClick={() => removeStep(i)}
                  className="text-white/40 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Adicionar comando */}
        <label className="block text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-1.5">
          Adicionar comando
        </label>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {QUICK_COMMANDS.map(({ command, label, Icon }) => (
            <button
              key={command}
              onClick={() => addCommand(command)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#2a2f37] hover:bg-primary/20 text-white text-[11px]"
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Adicionar texto */}
        <label className="block text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-1.5">
          Digitar texto
        </label>
        <div className="flex gap-1.5 mb-3">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Texto a enviar"
            className="flex-1 bg-black/30 text-white text-xs rounded-md border border-white/[0.08] px-2 py-1.5 outline-none focus:border-primary"
          />
          <button
            onClick={addText}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-sky-400 text-white text-xs font-semibold"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Adicionar delay */}
        <label className="block text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold mb-1.5">
          Esperar
        </label>
        <div className="flex gap-1.5 mb-4">
          {[200, 500, 1000, 2000].map((ms) => (
            <button
              key={ms}
              onClick={() => addDelay(ms)}
              className="flex-1 px-2 py-1.5 rounded-md bg-[#2a2f37] hover:bg-primary/20 text-white text-[11px]"
            >
              {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#2a2f37] hover:bg-[#3d4350] text-white text-sm font-semibold"
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
