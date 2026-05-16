// Bottom tab bar — alterna entre Remote / Apps / Macros / Settings.

import { Tv2, AppWindow, Zap, Settings as SettingsIcon } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import type { Tab } from "@/stores/uiStore";

const TABS: Array<{ id: Tab; label: string; Icon: typeof Tv2 }> = [
  { id: "remote", label: "Remote", Icon: Tv2 },
  { id: "apps", label: "Apps", Icon: AppWindow },
  { id: "macros", label: "Macros", Icon: Zap },
  { id: "settings", label: "Ajustes", Icon: SettingsIcon },
];

export function TabBar() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);

  return (
    <nav className="flex justify-around items-stretch border-t backdrop-blur-md mt-3
                    border-gray-200 bg-gray-50/95
                    dark:border-white/[0.06] dark:bg-[#0a0c10]/95">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
              active
                ? "text-primary"
                : "text-gray-400 hover:text-gray-900 dark:text-white/40 dark:hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={active ? 2.4 : 1.8} />
            <span className="text-[10px] font-semibold">{label}</span>
            {active && (
              <span className="w-1 h-1 rounded-full bg-primary -mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
