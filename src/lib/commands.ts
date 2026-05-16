// Dispatch de comandos por marca de TV.
// O frontend só conhece comandos de alto nível (Up, Down, OK, Home, ...)
// — aqui traduzimos pro IPC certo (Roku ECP / Samsung WSS / LG webOS).

import { invoke as rawInvoke, type InvokeArgs } from "@tauri-apps/api/core";
import type { RokuKey, TvDevice } from "@/types";
import { isTauri } from "@/lib/tauri";

/**
 * Wrapper em volta de `invoke` que SEMPRE devolve `Error` em rejeição.
 * Tauri 2 rejeita comandos com `Result::Err(String)` direto — sem isso,
 * o callsite recebe uma string crua e os toasts ficam mostrando "Falhou"
 * genérico em vez da mensagem real.
 */
async function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  try {
    return await rawInvoke<T>(cmd, args);
  } catch (e) {
    if (e instanceof Error) throw e;
    if (typeof e === "string") throw new Error(e);
    throw new Error(`${cmd}: erro desconhecido`);
  }
}

/** Comandos lógicos cross-brand. */
export type Command =
  | "Up" | "Down" | "Left" | "Right" | "Ok" | "Select"
  | "Back" | "Home"
  | "Play" | "Pause" | "PlayPause"
  | "VolumeUp" | "VolumeDown" | "Mute" | "VolumeMute"
  | "ChannelUp" | "ChannelDown"
  | "Power" | "PowerOff"
  | "Info" | "Rev" | "Fwd" | "InstantReplay"
  | "InputTuner" | "InputHDMI1" | "InputHDMI2" | "InputHDMI3" | "InputHDMI4";

/** Traduz Command lógico → tecla nativa Roku (sobreposição quase 1:1). */
function rokuKeyFor(c: Command): RokuKey | null {
  const map: Partial<Record<Command, RokuKey>> = {
    Up: "Up",
    Down: "Down",
    Left: "Left",
    Right: "Right",
    Ok: "Select",
    Select: "Select",
    Back: "Back",
    Home: "Home",
    Play: "Play",
    Pause: "Play",
    PlayPause: "Play",
    VolumeUp: "VolumeUp",
    VolumeDown: "VolumeDown",
    Mute: "VolumeMute",
    VolumeMute: "VolumeMute",
    ChannelUp: "ChannelUp",
    ChannelDown: "ChannelDown",
    Power: "PowerOff",
    PowerOff: "PowerOff",
    Info: "Info",
    Rev: "Rev",
    Fwd: "Fwd",
    InstantReplay: "InstantReplay",
    InputTuner: "InputTuner",
    InputHDMI1: "InputHDMI1",
    InputHDMI2: "InputHDMI2",
    InputHDMI3: "InputHDMI3",
    InputHDMI4: "InputHDMI4",
  };
  return map[c] ?? null;
}

/** Manda um comando lógico pra TV apropriada. Sem-op em browser puro. */
export async function sendCommand(tv: TvDevice, cmd: Command): Promise<void> {
  if (!isTauri()) return;
  switch (tv.brand) {
    case "roku": {
      const key = rokuKeyFor(cmd);
      if (!key) throw new Error(`Comando ${cmd} sem mapping para Roku`);
      await invoke("roku_send_key", { host: tv.host, key });
      return;
    }
    case "samsung": {
      await invoke("samsung_send_key", {
        host: tv.host,
        token: tv.auth_token ?? null,
        command: cmd,
      });
      return;
    }
    case "lg": {
      if (!tv.auth_token) {
        throw new Error("LG não pareada — abra o pareamento no menu '?'");
      }
      await invoke("lg_send_key", {
        host: tv.host,
        clientKey: tv.auth_token,
        command: cmd,
      });
      return;
    }
    case "sony": {
      // PSK opcional — Sony aceita sem auth se IP Control estiver "Normal" (sem chave).
      await invoke("sony_send_key", {
        host: tv.host,
        psk: tv.auth_token ?? null,
        command: cmd,
      });
      return;
    }
    case "androidtv": {
      await invoke("androidtv_send_key", {
        host: tv.host,
        port: tv.port ?? 5555,
        command: cmd,
      });
      return;
    }
    case "philips": {
      await invoke("philips_send_key", { host: tv.host, command: cmd });
      return;
    }
    default:
      throw new Error(`Marca '${tv.brand}' não suportada`);
  }
}

/** Digitar texto: cada marca tem caminho próprio. */
export async function sendText(tv: TvDevice, text: string): Promise<void> {
  if (!isTauri() || !text) return;
  switch (tv.brand) {
    case "roku":
      await invoke("roku_type_text", { host: tv.host, text });
      return;
    case "lg":
      if (!tv.auth_token) throw new Error("LG não pareada");
      await invoke("lg_type_text", {
        host: tv.host,
        clientKey: tv.auth_token,
        text,
      });
      return;
    case "androidtv":
      await invoke("androidtv_type_text", {
        host: tv.host,
        port: tv.port ?? 5555,
        text,
      });
      return;
    case "samsung":
    case "sony":
    case "philips":
      throw new Error(`Type-on-TV não suportado em ${tv.brand}`);
    default:
      throw new Error(`Marca '${tv.brand}' não suportada`);
  }
}

/** Ping de conectividade — usado pelo dot verde/vermelho. */
export async function probeReachability(tv: TvDevice): Promise<boolean> {
  if (!isTauri()) return false;
  if (tv.brand === "androidtv") {
    // ADB tem porta dinâmica; passamos junto pra TCP probe.
    return invoke<boolean>("androidtv_is_reachable", {
      host: tv.host,
      port: tv.port ?? 5555,
    });
  }
  const cmd =
    tv.brand === "roku"
      ? "roku_is_reachable"
      : tv.brand === "samsung"
      ? "samsung_is_reachable"
      : tv.brand === "lg"
      ? "lg_is_reachable"
      : tv.brand === "sony"
      ? "sony_is_reachable"
      : tv.brand === "philips"
      ? "philips_is_reachable"
      : null;
  if (!cmd) return false;
  return invoke<boolean>(cmd, { host: tv.host });
}

/** Abre busca/launch app — só Roku no Sprint 2. */
export async function openSearch(tv: TvDevice, query: string): Promise<void> {
  if (!isTauri() || !query) return;
  if (tv.brand === "roku") {
    await invoke("roku_search", { host: tv.host, query });
    return;
  }
  throw new Error("Busca direta só está pronta para Roku no Sprint 2");
}

/** Lança um app por marca. `appId` é o identificador no formato esperado
 * pela marca (Roku channel id, LG appId, package/.Activity em Android TV,
 * URI sony/appControl em Sony). */
export async function launchApp(tv: TvDevice, appId: string): Promise<void> {
  if (!isTauri()) return;
  switch (tv.brand) {
    case "roku":
      await invoke("roku_launch_app", { host: tv.host, appId });
      return;
    case "lg":
      if (!tv.auth_token) throw new Error("LG não pareada");
      await invoke("lg_launch_app", {
        host: tv.host,
        clientKey: tv.auth_token,
        appId,
      });
      return;
    case "androidtv":
      await invoke("androidtv_launch_app", {
        host: tv.host,
        port: tv.port ?? 5555,
        component: appId,
      });
      return;
    case "sony":
      await invoke("sony_launch_app", {
        host: tv.host,
        psk: tv.auth_token ?? null,
        uri: appId,
      });
      return;
    default:
      throw new Error(`Launch direto de app não suportado em ${tv.brand}`);
  }
}

/** Pareamento — só faz sentido em Samsung/LG (Roku usa Modo Permissivo). */
export async function pairTv(tv: TvDevice): Promise<{ token?: string }> {
  if (!isTauri()) throw new Error("Disponível só no app desktop");
  if (tv.brand === "samsung") {
    const r = await invoke<{ token: string | null; device_name: string }>(
      "samsung_pair",
      { host: tv.host, prevToken: tv.auth_token ?? null },
    );
    return { token: r.token ?? undefined };
  }
  if (tv.brand === "lg") {
    const key = await invoke<string>("lg_pair", {
      host: tv.host,
      prevKey: tv.auth_token ?? null,
    });
    return { token: key };
  }
  throw new Error("Roku não usa pareamento — ative Modo Permissivo nas configs da TV");
}

/** Map de Command → RokuKey, exportado pra atalhos de teclado. */
export function commandFromRokuKey(k: RokuKey): Command {
  // O hook useKeyboard atualmente devolve RokuKey — convertemos pra Command lógico.
  const map: Record<RokuKey, Command> = {
    Up: "Up",
    Down: "Down",
    Left: "Left",
    Right: "Right",
    Select: "Ok",
    Back: "Back",
    Home: "Home",
    Play: "PlayPause",
    Rev: "Rev",
    Fwd: "Fwd",
    InstantReplay: "InstantReplay",
    Info: "Info",
    VolumeUp: "VolumeUp",
    VolumeDown: "VolumeDown",
    VolumeMute: "Mute",
    ChannelUp: "ChannelUp",
    ChannelDown: "ChannelDown",
    PowerOff: "PowerOff",
    PowerOn: "PowerOff",
    Power: "PowerOff",
    InputTuner: "InputTuner",
    InputHDMI1: "InputHDMI1",
    InputHDMI2: "InputHDMI2",
    InputHDMI3: "InputHDMI3",
    InputHDMI4: "InputHDMI4",
    InputAV1: "InputHDMI1",
    Search: "Ok",
    Enter: "Ok",
    Backspace: "Back",
  };
  return map[k];
}
