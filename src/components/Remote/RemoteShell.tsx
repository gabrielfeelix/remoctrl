// Casca do remote — engloba D-pad, botões e inputs.
// Visual idêntico ao roku.html: gradiente vertical, cantos 36px, sombra forte.
//
// Sprint 2: comandos passam pelo dispatcher por marca em `lib/commands.ts`.
// Sprint 3 features:
//   - Power button = PowerOff + fallback Wake-on-LAN se TV unreachable
//   - Vol/Canal mantém pressionado = repete o comando
//   - Linha sutil de atalhos de apps usados recentemente
//   - Ctrl+Z = manda Back (desfaz última navegação)

import {
  Home, ChevronLeft, Volume2, VolumeX, Volume1,
  Power, Play, Pause, Rewind, FastForward, RotateCcw, Info as InfoIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useLongPress } from "@/hooks/useLongPress";
import { useReachability } from "@/hooks/useReachability";
import type { RokuKey } from "@/types";
import { sendCommand, commandFromRokuKey, type Command } from "@/lib/commands";
import { wakeOnLan, isTauri } from "@/lib/tauri";
import { DPad } from "./DPad";
import { RemoteButton } from "./RemoteButton";
import { InlineTypeBar } from "./InlineTypeBar";
import { AppShortcutsRow } from "./AppShortcutsRow";
import { TrackpadMode } from "./TrackpadMode";
import { Gamepad2, Hand } from "lucide-react";

export function RemoteShell() {
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);
  const [flashKey, setFlashKey] = useState<RokuKey | null>(null);
  const status = useReachability(tv);
  const [trackpad, setTrackpad] = useState(false);
  // Ring buffer dos últimos 8 comandos navegacionais — pra "undo" (Ctrl+Z).
  const history = useRef<Command[]>([]);

  /** Dispara um comando lógico — backend dispatch por marca. */
  const dispatch = async (cmd: Command, flashAs?: RokuKey, silent = false) => {
    const flashRokuKey = flashAs ?? rokuKeyFromCommand(cmd);
    if (flashRokuKey) {
      setFlashKey(flashRokuKey);
      setTimeout(() => setFlashKey(null), 140);
    }
    if (!tv) {
      if (!silent) showToast("Selecione uma TV primeiro", "err");
      return;
    }
    // Track navigational commands pro undo
    if (isNavigational(cmd)) {
      history.current.push(cmd);
      if (history.current.length > 8) history.current.shift();
    }
    try {
      await sendCommand(tv, cmd);
    } catch (e) {
      if (!silent) {
        showToast(e instanceof Error ? e.message : "Comando falhou", "err");
      }
    }
  };

  /** Power inteligente — manda PowerOff. Se a TV está down e tem MAC, manda WoL. */
  const onPower = async () => {
    setFlashKey("PowerOff");
    setTimeout(() => setFlashKey(null), 140);
    if (!tv) {
      showToast("Selecione uma TV primeiro", "err");
      return;
    }
    // TV alcançável → toggle padrão (PowerOff). Não-alcançável + MAC → WoL.
    if (status === "down" && tv.mac && isTauri()) {
      try {
        await wakeOnLan(tv.mac);
        showToast(`Ligando ${tv.label}…`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "WoL falhou", "err");
      }
      return;
    }
    try {
      await sendCommand(tv, "PowerOff");
    } catch (e) {
      // Se a TV não respondeu E temos MAC, tenta WoL como fallback
      if (tv.mac && isTauri()) {
        try {
          await wakeOnLan(tv.mac);
          showToast(`Ligando ${tv.label}… (tentando WoL)`);
          return;
        } catch {
          /* cai pra o erro original abaixo */
        }
      }
      showToast(e instanceof Error ? e.message : "Power falhou", "err");
    }
  };

  // Atalho de teclado devolve RokuKey — converte pra Command lógico
  useKeyboard({
    onKey: (rk) => dispatch(commandFromRokuKey(rk), rk),
    onSlash: () => {
      const el = document.querySelector<HTMLInputElement>("input[placeholder*='Buscar']");
      el?.focus();
    },
    disabled: !tv,
  });

  // Ctrl+Z = undo = manda Back. Não conflita com inputs (skip se digitando).
  useEffect(() => {
    if (!tv) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      dispatch("Back", "Back");
      showToast("↶ Undo");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tv]);

  const flash = (k: RokuKey) => flashKey === k;

  // Long-press handlers — silenciosos pros toasts não spammar enquanto segurando
  const volUp = useLongPress({ onAction: () => dispatch("VolumeUp", "VolumeUp", true) });
  const volDown = useLongPress({ onAction: () => dispatch("VolumeDown", "VolumeDown", true) });
  const chUp = useLongPress({ onAction: () => dispatch("ChannelUp", "ChannelUp", true), initialDelay: 500, repeatRate: 250 });
  const chDown = useLongPress({ onAction: () => dispatch("ChannelDown", "ChannelDown", true), initialDelay: 500, repeatRate: 250 });

  return (
    <div
      className="relative rounded-[36px] p-5 pt-6 pb-7
                 bg-gradient-to-b from-[#1a1d23] to-[#0f1115]
                 border border-[#2a2f37]
                 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/[0.04] rounded-full" />

      {/* Top row: Power · Inline search · Mute */}
      <div className="flex items-center gap-2 mb-2.5">
        <RemoteButton
          variant="icon"
          onClick={onPower}
          title={
            status === "down" && tv?.mac
              ? "Ligar TV (Wake-on-LAN)"
              : "Liga/Desliga (P)"
          }
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

      {/* Atalhos sutis pros 3 apps mais usados — só aparece se há recents */}
      <AppShortcutsRow />

      <div className="flex gap-2.5 mb-2.5">
        <RemoteButton onClick={() => dispatch("Back", "Back")} flash={flash("Back")} title="Voltar (Backspace · Ctrl+Z = undo)">
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("Home", "Home")} flash={flash("Home")} title="Início (H)">
          <Home className="w-4 h-4" />
          Home
        </RemoteButton>
      </div>

      {/* Toggle pequeno entre D-pad clássico e Trackpad swipe (preview) */}
      <div className="flex items-center justify-end gap-1 -mb-1 mt-1">
        <button
          onClick={() => setTrackpad(false)}
          title="D-pad clássico"
          className={`p-1 rounded-md transition-colors ${
            !trackpad ? "text-primary bg-primary/10" : "text-white/30 hover:text-white/60"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTrackpad(true)}
          title="Trackpad (preview)"
          className={`p-1 rounded-md transition-colors ${
            trackpad ? "text-primary bg-primary/10" : "text-white/30 hover:text-white/60"
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>
      </div>

      {trackpad ? (
        <TrackpadMode onExit={() => setTrackpad(false)} />
      ) : (
        <DPad
          onPress={(rk) => dispatch(commandFromRokuKey(rk), rk)}
          flashKey={flashKey}
        />
      )}

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
          <Play className="w-3.5 h-3.5" fill="currentColor" />
          <Pause className="w-3.5 h-3.5 -ml-0.5" fill="currentColor" />
        </RemoteButton>
        <RemoteButton onClick={() => dispatch("Fwd", "Fwd")} flash={flash("Fwd")} title="Avançar (L)">
          <FastForward className="w-4 h-4" />
        </RemoteButton>
      </div>

      {/* Vol e Canal — segurar repete (perfeito pra mudar volume rapido) */}
      <div className="flex gap-2.5 mb-2.5">
        <RemoteButton {...volDown} onClick={() => {}} flash={flash("VolumeDown")} title="Volume − (-) · segure pra repetir">
          <Volume1 className="w-4 h-4" />
          Vol −
        </RemoteButton>
        <RemoteButton {...volUp} onClick={() => {}} flash={flash("VolumeUp")} title="Volume + (+) · segure pra repetir">
          <Volume2 className="w-4 h-4" />
          Vol +
        </RemoteButton>
      </div>

      <div className="flex gap-2.5 mb-3">
        <RemoteButton {...chDown} onClick={() => {}} flash={flash("ChannelDown")} title="Canal − (PgDn) · segure">
          CH −
        </RemoteButton>
        <RemoteButton {...chUp} onClick={() => {}} flash={flash("ChannelUp")} title="Canal + (PgUp) · segure">
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

/** Tipos de comando que contam pro "undo" — só navegação, não volume/playback. */
function isNavigational(c: Command): boolean {
  return ["Up", "Down", "Left", "Right", "Ok", "Select", "Home", "Back"].includes(c);
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
