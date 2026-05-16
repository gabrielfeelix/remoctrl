// Casca do remote — engloba D-pad, botões e inputs.
// Visual idêntico ao roku.html: gradiente vertical, cantos 36px, sombra forte.
//
// Sprint 2: comandos passam pelo dispatcher por marca em `lib/commands.ts`.

import {
  Home, ChevronLeft, Volume2, VolumeX, Volume1,
  Power, Play, Rewind, FastForward, RotateCcw, Info as InfoIcon,
} from "lucide-react";
import { useState } from "react";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { useKeyboard } from "@/hooks/useKeyboard";
import type { RokuKey } from "@/types";
import { sendCommand, commandFromRokuKey, type Command } from "@/lib/commands";
import { DPad } from "./DPad";
import { RemoteButton } from "./RemoteButton";
import { InlineTypeBar } from "./InlineTypeBar";

export function RemoteShell() {
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);
  const [flashKey, setFlashKey] = useState<RokuKey | null>(null);

  /** Dispara um comando lógico — backend dispatch por marca. */
  const dispatch = async (cmd: Command, flashAs?: RokuKey) => {
    const flashRokuKey = flashAs ?? rokuKeyFromCommand(cmd);
    if (flashRokuKey) {
      setFlashKey(flashRokuKey);
      setTimeout(() => setFlashKey(null), 140);
    }

    if (!tv) {
      showToast("Selecione uma TV primeiro", "err");
      return;
    }
    try {
      await sendCommand(tv, cmd);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Comando falhou", "err");
    }
  };

  // Atalho de teclado devolve RokuKey — converte pra Command lógico
  useKeyboard({
    onKey: (rk) => dispatch(commandFromRokuKey(rk), rk),
    onSlash: () => {
      const el = document.querySelector<HTMLInputElement>("input[placeholder*='Digite']");
      el?.focus();
    },
    disabled: !tv,
  });

  const flash = (k: RokuKey) => flashKey === k;

  return (
    <div
      className="relative rounded-[36px] p-5 pt-6 pb-7
                 bg-gradient-to-b from-[#1a1d23] to-[#0f1115]
                 border border-[#2a2f37]
                 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/[0.04] rounded-full" />

      {/* Top row: Power · Inline search (Type-on-TV) · Mute */}
      <div className="flex items-center gap-2 mb-2.5">
        <RemoteButton
          variant="icon"
          onClick={() => dispatch("PowerOff", "PowerOff")}
          title="Liga/Desliga (P)"
          flash={flash("PowerOff")}
        >
          <Power className={`w-5 h-5 ${flash("PowerOff") ? "" : "text-red-400/80"}`} />
        </RemoteButton>
        <InlineTypeBar />
        <RemoteButton
          variant="icon"
          onClick={() => dispatch("Mute", "VolumeMute")}
          title="Mudo (M)"
          flash={flash("VolumeMute")}
        >
          <VolumeX className="w-5 h-5" />
        </RemoteButton>
      </div>

      <div className="flex gap-2.5 mb-2.5">
        <RemoteButton onClick={() => dispatch("Back", "Back")} flash={flash("Back")} title="Voltar (Backspace)">
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("Home", "Home")} flash={flash("Home")} title="Início (H)">
          <Home className="w-4 h-4" />
          Home
        </RemoteButton>
      </div>

      <DPad
        onPress={(rk) => dispatch(commandFromRokuKey(rk), rk)}
        flashKey={flashKey}
      />

      <div className="flex gap-2.5 mb-2.5">
        <RemoteButton onClick={() => dispatch("InstantReplay", "InstantReplay")} flash={flash("InstantReplay")} title="Replay (R)">
          <RotateCcw className="w-4 h-4" />
          Replay
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("Info", "Info")} flash={flash("Info")} title="Opções (I)">
          <InfoIcon className="w-4 h-4" />
          Opções
        </RemoteButton>
      </div>

      <div className="flex gap-2.5 mb-2.5">
        <RemoteButton onClick={() => dispatch("Rev", "Rev")} flash={flash("Rev")} title="Voltar (J)">
          <Rewind className="w-4 h-4" />
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("PlayPause", "Play")} flash={flash("Play")} title="Play/Pause (Espaço)">
          <Play className="w-4 h-4" fill="currentColor" />
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("Fwd", "Fwd")} flash={flash("Fwd")} title="Avançar (L)">
          <FastForward className="w-4 h-4" />
        </RemoteButton>
      </div>

      <div className="flex gap-2.5 mb-2.5">
        <RemoteButton onClick={() => dispatch("VolumeDown", "VolumeDown")} flash={flash("VolumeDown")} title="Volume − (-)">
          <Volume1 className="w-4 h-4" />
          Vol −
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("VolumeUp", "VolumeUp")} flash={flash("VolumeUp")} title="Volume + (+)">
          <Volume2 className="w-4 h-4" />
          Vol +
        </RemoteButton>
      </div>

      <div className="flex gap-2.5 mb-3">
        <RemoteButton onClick={() => dispatch("ChannelDown", "ChannelDown")} flash={flash("ChannelDown")} title="Canal − (PgDn)">
          CH −
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("ChannelUp", "ChannelUp")} flash={flash("ChannelUp")} title="Canal + (PgUp)">
          CH +
        </RemoteButton>
      </div>

      <div className="h-px bg-white/5 mx-1 my-3" />

      {/* Inputs (TV/HDMI). Disponível só em Roku no Sprint 2 — Samsung tem KEY_HDMI mas não distingue 1/2/3. */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { cmd: "InputTuner", flashAs: "InputTuner" as RokuKey, label: "TV" },
          { cmd: "InputHDMI1", flashAs: "InputHDMI1" as RokuKey, label: "HDMI 1" },
          { cmd: "InputHDMI2", flashAs: "InputHDMI2" as RokuKey, label: "HDMI 2" },
          { cmd: "InputHDMI3", flashAs: "InputHDMI3" as RokuKey, label: "HDMI 3" },
        ].map((b) => (
          <button
            key={b.cmd}
            onClick={() => dispatch(b.cmd as Command, b.flashAs)}
            className={`min-h-[38px] rounded-lg border border-white/5 bg-[#2a2f37] text-white/60 text-[11px] font-semibold py-2.5 transition-colors hover:bg-[#3d4350] hover:text-white active:scale-95 active:bg-primary active:text-white
              ${flashKey === b.flashAs ? "!bg-primary !text-white" : ""}`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Helper inverso pra animar o flash quando o clique vem de botão. */
function rokuKeyFromCommand(c: Command): RokuKey | null {
  const map: Partial<Record<Command, RokuKey>> = {
    Up: "Up",
    Down: "Down",
    Left: "Left",
    Right: "Right",
    Ok: "Select",
    Back: "Back",
    Home: "Home",
    PlayPause: "Play",
    Rev: "Rev",
    Fwd: "Fwd",
    InstantReplay: "InstantReplay",
    Info: "Info",
    VolumeUp: "VolumeUp",
    VolumeDown: "VolumeDown",
    Mute: "VolumeMute",
    VolumeMute: "VolumeMute",
    ChannelUp: "ChannelUp",
    ChannelDown: "ChannelDown",
    Power: "PowerOff",
    PowerOff: "PowerOff",
    InputTuner: "InputTuner",
    InputHDMI1: "InputHDMI1",
    InputHDMI2: "InputHDMI2",
    InputHDMI3: "InputHDMI3",
  };
  return map[c] ?? null;
}
