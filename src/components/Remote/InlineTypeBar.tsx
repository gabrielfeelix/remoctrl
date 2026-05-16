// Versão compacta do TypeBar — fica DENTRO do remote, entre Power e Mute.
// Sem botão de buscar (Ctrl+Enter ainda dispara busca no Roku).
// Só X quando há texto pra limpar.
//
// Backspace correto: manda a tecla `Backspace` do ECP Roku (deleta na keyboard
// da TV), NÃO `Back` (que navegaria pra trás na home).

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { sendText, openSearch } from "@/lib/commands";
import { isTauri } from "@/lib/tauri";

export function InlineTypeBar() {
  const tv = useTvStore((s) => s.selected());
  const inputRef = useRef<HTMLInputElement>(null);
  const showToast = useToast((s) => s.show);
  const [hasText, setHasText] = useState(false);

  const supportsType = !!tv && (tv.brand === "roku" || tv.brand === "lg");
  const supportsSearch = !!tv && tv.brand === "roku";
  const charByChar = !!tv && tv.brand === "roku";

  const onClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setHasText(false);
    inputRef.current?.focus();
  };

  const onSearch = async () => {
    if (!tv || !inputRef.current) return;
    const q = inputRef.current.value.trim();
    if (!q) return;
    try {
      await openSearch(tv, q);
      showToast(`Buscando "${q}"`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falhou", "err");
    }
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!tv || !supportsType) return;

    // Ctrl+Enter → busca (apenas Roku)
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && supportsSearch) {
      e.preventDefault();
      onSearch();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClear();
      return;
    }
    // Enter → manda tudo de uma vez e limpa
    if (e.key === "Enter") {
      const text = inputRef.current?.value ?? "";
      if (!text) return;
      e.preventDefault();
      try {
        await sendText(tv, text);
        onClear();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Falhou", "err");
      }
      return;
    }
    // Roku char-by-char: forward letras pra TV em tempo real
    if (charByChar && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      try {
        await sendText(tv, e.key);
      } catch {
        /* silencioso */
      }
    }
    // FIX: Backspace deve deletar caractere na keyboard da TV, NÃO navegar atrás.
    // Roku ECP tem uma tecla "Backspace" separada de "Back". Bypassa o dispatcher
    // pra mandar a tecla certa direto.
    if (charByChar && e.key === "Backspace") {
      const len = inputRef.current?.value.length ?? 0;
      if (len === 0) return; // input vazio? não envia nada — evita ruído
      try {
        if (isTauri()) {
          await invoke("roku_send_key", { host: tv.host, key: "Backspace" });
        }
      } catch {
        /* silencioso */
      }
    }
  };

  // Visual minimalista: sem container/retângulo. Só a lupa + input com
  // underline sutil que ganha cor primary no focus. Funciona em dark
  // (sobre o gradiente do remote) e claro (sobre painel branco).
  return (
    <div
      className={`flex-1 min-w-0 flex items-center gap-2 h-11
                  border-b transition-colors
                  ${supportsType
                    ? "border-white/15 focus-within:border-primary"
                    : "border-white/[0.06] opacity-50"}`}
    >
      <Search className="w-4 h-4 text-white/40 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar…"
        disabled={!supportsType}
        onChange={(e) => setHasText(e.target.value.length > 0)}
        onKeyDown={onKeyDown}
        className="flex-1 min-w-0 bg-transparent text-white text-[13px] font-medium outline-none placeholder:text-white/40 disabled:cursor-not-allowed"
      />
      {hasText && (
        <button
          type="button"
          onClick={onClear}
          title="Limpar (Esc)"
          className="p-0.5 rounded text-white/40 hover:text-white shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
