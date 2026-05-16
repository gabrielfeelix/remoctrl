// Chips de TVs — barra horizontal com dot de status inline (sem barra separada).
// Click = seleciona TV. X no hover remove. "+ TV" abre modal.

import { Plus, X, Pencil } from "lucide-react";
import { useTvStore } from "@/stores/tvStore";
import { useUiStore } from "@/stores/uiStore";
import { useReachability } from "@/hooks/useReachability";

export function TvChips() {
  const { saved, selectedId, selectTv, removeTv } = useTvStore();
  const selectedTv = useTvStore((s) => s.selected());
  const openAddTv = useUiStore((s) => s.openAddTv);
  const openEditTv = useUiStore((s) => s.openEditTv);
  const status = useReachability(selectedTv);

  const dotColor =
    status === "ok"
      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
      : status === "down"
      ? "bg-red-500"
      : "bg-white/30";

  return (
    <div className="flex gap-1.5 mb-2.5 pb-0.5 overflow-x-auto scrollbar-none">
      {saved.map((tv) => {
        const active = tv.id === selectedId;
        return (
          <div
            key={tv.id}
            onClick={() => selectTv(tv.id)}
            className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors border
              ${active
                ? "bg-primary/10 border-primary/50 text-gray-900 dark:bg-primary/15 dark:text-white"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"}`}
          >
            {/* Dot de status só na TV ativa — economia visual */}
            {active && (
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${dotColor}`}
              />
            )}
            <span>{tv.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditTv(tv.id);
              }}
              className="opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:text-primary transition-opacity p-0 leading-none"
              title="Editar TV (MAC, apelido, etc.)"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTv(tv.id);
              }}
              className="opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:text-red-400 transition-opacity p-0 leading-none"
              title="Remover esta TV"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={openAddTv}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold border border-dashed transition-colors shrink-0
                   text-gray-500 border-gray-300 hover:text-primary hover:border-primary hover:bg-primary/5
                   dark:text-white/50 dark:border-white/15 dark:hover:text-white dark:hover:border-primary dark:hover:bg-primary/5"
      >
        <Plus className="w-3 h-3" />
        TV
      </button>
    </div>
  );
}
