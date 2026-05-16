// Grid de apps — Roku busca a lista real via /query/apps; LG via launchPoints;
// Samsung mostra os apps comuns (não tem listagem confiável).

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTvStore } from "@/stores/tvStore";
import { useRecentsStore } from "@/stores/recentsStore";
import { useToast } from "@/components/Toast";
import { isTauri } from "@/lib/tauri";
import { COMMON_APPS } from "@/lib/commonApps";
import type { RokuApp } from "@/types";
import type { LgApp } from "@/types";
import { AppIcon } from "./AppIcon";
import { Loader2, RefreshCw } from "lucide-react";

interface UnifiedApp {
  id: string;
  name: string;
  iconUrl?: string;
  color?: string;
}

// Nome amigável da marca pra usar em mensagens de erro/aviso.
const BRAND_HOME_HINT: Record<string, string> = {
  samsung: "Samsung",
  sony: "Sony",
  androidtv: "Android TV",
};

export function AppsGrid() {
  const tv = useTvStore((s) => s.selected());
  const showToast = useToast((s) => s.show);
  const pushRecent = useRecentsStore((s) => s.push);
  const recents = useRecentsStore((s) => s.items);

  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<UnifiedApp[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadApps = async () => {
    if (!tv || !isTauri()) {
      setApps([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (tv.brand === "roku") {
        const res = await invoke<RokuApp[]>("roku_list_apps", { host: tv.host });
        // Filtra só `appl` (apps reais), descarta inputs HDMI/TV
        setApps(
          res
            .filter((a) => a.kind === "appl")
            .map((a) => ({ id: a.id, name: a.name, iconUrl: a.icon_url })),
        );
      } else if (tv.brand === "lg") {
        if (!tv.auth_token) {
          setError("LG não pareada — pareie primeiro.");
          setApps([]);
          return;
        }
        const res = await invoke<LgApp[]>("lg_list_apps", {
          host: tv.host,
          clientKey: tv.auth_token,
        });
        setApps(
          res.map((a) => ({ id: a.id, name: a.title, iconUrl: a.icon_url })),
        );
      } else {
        // Samsung / Sony — sem listagem confiável via protocolo do remoto.
        // Mostra a lista de "comuns" que tenham mapping pra essa marca.
        setApps(
          COMMON_APPS.filter((c) => c.ids[tv.brand]).map((c) => ({
            id: c.ids[tv.brand]!,
            name: c.name,
            color: c.color,
          })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falhou ao carregar apps");
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tv?.id]);

  const launch = async (app: UnifiedApp) => {
    if (!tv) {
      showToast("Selecione uma TV primeiro", "err");
      return;
    }
    // No preview do navegador o launch nem sai — silencia em vez de poluir.
    if (!isTauri()) return;
    try {
      if (tv.brand === "roku") {
        await invoke("roku_launch_app", { host: tv.host, appId: app.id });
      } else if (tv.brand === "lg") {
        if (!tv.auth_token) {
          showToast("LG não pareada — pareie em '+ TV'", "err");
          return;
        }
        await invoke("lg_launch_app", {
          host: tv.host,
          clientKey: tv.auth_token,
          appId: app.id,
        });
      } else if (tv.brand === "androidtv") {
        await invoke("androidtv_launch_app", {
          host: tv.host,
          port: tv.port ?? 5555,
          component: app.id,
        });
      } else if (tv.brand === "sony") {
        await invoke("sony_launch_app", {
          host: tv.host,
          psk: tv.auth_token ?? null,
          uri: app.id,
        });
      } else {
        // Samsung: protocolo do remoto não tem "launch app" universal.
        showToast(
          `${BRAND_HOME_HINT[tv.brand] ?? "Esta TV"} não tem atalho direto pra apps — use Home + setas.`,
          "err",
        );
        return;
      }
      pushRecent({
        appId: app.id,
        brand: tv.brand as "roku" | "lg" | "samsung" | "sony" | "androidtv",
        name: app.name,
        iconUrl: app.iconUrl,
        lastOpenedAt: Date.now(),
      });
      showToast(`Abrindo ${app.name}`);
    } catch (e) {
      // Tauri rejeita comandos com `String` direto (não `Error`).
      // Cobrimos os 2 casos pra mostrar a mensagem real, não "Falhou" genérico.
      const rawMsg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "";
      const status = rawMsg.match(/respondeu (\d+)/)?.[1];
      // Mensagens específicas pelos status mais comuns do ECP
      let friendly: string;
      if (status === "404") {
        friendly = `${app.name} não está instalado nesta TV.`;
      } else if (status === "403") {
        friendly = `Ative o Modo Permissivo no Roku (Ajustes › Sistema › Avançado).`;
      } else if (rawMsg.toLowerCase().includes("timeout") || rawMsg.toLowerCase().includes("timed out")) {
        friendly = `${app.name}: TV demorou demais — tente de novo.`;
      } else if (rawMsg.toLowerCase().includes("connection refused") || rawMsg.toLowerCase().includes("unreachable")) {
        friendly = `TV offline ou IP errado.`;
      } else if (rawMsg) {
        friendly = `${app.name}: ${rawMsg}`;
      } else {
        friendly = `${app.name} não pôde abrir — TV alcançável?`;
      }
      showToast(friendly, "err");
    }
  };

  if (!tv) {
    return (
      <div className="text-center text-sm py-12 text-gray-400 dark:text-white/40">
        Selecione uma TV pra ver os apps.
      </div>
    );
  }

  // Recents do mesmo brand
  const myRecents = recents.filter((r) => r.brand === tv.brand);

  return (
    <div className="flex flex-col gap-3">
      {/* Recents */}
      {myRecents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] uppercase tracking-[0.08em] font-bold text-gray-500 dark:text-white/50">
              Recentes
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {myRecents.slice(0, 6).map((r) => (
              <AppIcon
                key={r.appId}
                name={r.name}
                iconUrl={r.iconUrl}
                onClick={() =>
                  launch({ id: r.appId, name: r.name, iconUrl: r.iconUrl })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Lista completa */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-bold">
            Apps {!loading && `· ${apps.length}`}
          </h3>
          <button
            onClick={loadApps}
            disabled={loading}
            className="text-[11px] font-semibold text-primary hover:text-sky-300 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {loading ? "Carregando…" : "Atualizar"}
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-400 px-2 py-3 text-center">{error}</div>
        )}

        {!loading && !error && apps.length === 0 && (
          <div className="text-xs text-white/40 px-2 py-3 text-center">
            Nenhum app listado.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {apps.map((app) => (
            <AppIcon
              key={app.id}
              name={app.name}
              iconUrl={app.iconUrl}
              fallbackColor={app.color}
              onClick={() => launch(app)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
