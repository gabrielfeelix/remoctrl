// Linha sutil de atalhos pra os 3 apps mais usados.
// Aparece DENTRO do remote, entre Home/Voltar e o D-pad.
// Não aparece se ainda não tem recents (não polui a UI vazia).
//
// Click → lança o app sem precisar trocar de tab.

import { invoke } from "@tauri-apps/api/core";
import { useTvStore } from "@/stores/tvStore";
import { useRecentsStore } from "@/stores/recentsStore";
import { useToast } from "@/components/Toast";
import { isTauri } from "@/lib/tauri";

export function AppShortcutsRow() {
  const tv = useTvStore((s) => s.selected());
  const recents = useRecentsStore((s) => s.items);
  const pushRecent = useRecentsStore((s) => s.push);
  const showToast = useToast((s) => s.show);

  if (!tv) return null;

  // Top 3 do brand atual, ordenado por lastOpenedAt desc
  const top = recents
    .filter((r) => r.brand === tv.brand)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, 3);

  if (top.length === 0) return null;

  const launch = async (r: (typeof top)[number]) => {
    // No preview do navegador comandos não saem da janela — não polui com toast.
    if (!isTauri()) return;
    try {
      if (tv.brand === "roku") {
        await invoke("roku_launch_app", { host: tv.host, appId: r.appId });
      } else if (tv.brand === "lg") {
        if (!tv.auth_token) {
          showToast("LG não pareada", "err");
          return;
        }
        await invoke("lg_launch_app", {
          host: tv.host,
          clientKey: tv.auth_token,
          appId: r.appId,
        });
      } else {
        showToast("Atalho de app não disponível pra Samsung", "err");
        return;
      }
      pushRecent({ ...r, lastOpenedAt: Date.now() });
      showToast(`Abrindo ${r.name}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : `${r.name} falhou`, "err");
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mb-2.5">
      {top.map((r) => (
        <button
          key={r.appId}
          onClick={() => launch(r)}
          title={r.name}
          className="group flex items-center gap-1.5 h-7 px-2 rounded-full bg-white/[0.04] border border-white/[0.05] hover:border-primary/40 hover:bg-primary/10 transition-colors"
        >
          {r.iconUrl ? (
            <img
              src={r.iconUrl}
              alt=""
              className="w-4 h-4 rounded-sm object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="w-4 h-4 rounded-sm bg-white/10 grid place-items-center text-[8px] font-bold text-white/60">
              {r.name.slice(0, 1)}
            </span>
          )}
          <span className="text-[10px] font-semibold text-white/70 group-hover:text-white truncate max-w-[60px]">
            {r.name}
          </span>
        </button>
      ))}
    </div>
  );
}
