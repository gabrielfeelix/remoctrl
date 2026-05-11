// Aplica o tema (claro/escuro) na tag <html>.
// Tailwind usa darkMode: "class" — adicionar/remover `.dark`.

import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);
}
