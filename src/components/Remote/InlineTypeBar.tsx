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

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!tv || !supportsType) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onClear();
      return;
    }
    // Enter → COMPORTAMENTO POR MARCA:
    //   Roku: dispara busca UNIVERSAL (funciona em todo app — Netflix, Crunchyroll,
    //         Globoplay, etc. Roku procura o conteúdo em todos os apps instalados).
    //   LG  : insere o texto no campo focado (insertText via SSAP — funciona em
    //         teclados nativos do webOS).
    if (e.key === "Enter") {
      const text = inputRef.current?.value ?? "";
      if (!text) return;
      e.preventDefault();
      try {
        if (supportsSearch) {
          // Roku busca UNIVERSAL com launch=true — abre o melhor resultado
          // automaticamente (Netflix, Crunchyroll, Globoplay, Disney+ etc.
          // todos indexam na busca da Roku). Quando o nome não bate exato,
          // a tela de resultados abre pro usuário escolher.
          await openSearch(tv, text);
          showToast(`Buscando "${text}" na Roku — abre o resultado direto`);
        } else {
          await sendText(tv, text);
        }
        onClear();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Falhou", "err");
      }
      return;
    }
    // Roku char-by-char: forward letras pra TV em tempo real. Funciona em
    // teclados NATIVOS da Roku (Netflix, Roku Search, formulários). Apps com
    // teclado próprio (Crunchyroll, alguns games) ignoram — use Enter pra busca.
    if (charByChar && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      try {
        await sendText(tv, e.key);
      } catch {
        /* silencioso */
      }
    }
    // Backspace deleta caractere na keyboard da TV (Roku key "Backspace",
    // distinta de "Back" navegação).
    if (charByChar && e.key === "Backspace") {
      const len = inputRef.current?.value.length ?? 0;
      if (len === 0) return;
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
                    ? "border-gray-300 focus-within:border-primary dark:border-white/15"
                    : "border-gray-200 dark:border-white/[0.06] opacity-50"}`}
    >
      <Search className="w-4 h-4 shrink-0 text-gray-400 dark:text-white/40" />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar…"
        disabled={!supportsType}
        onChange={(e) => setHasText(e.target.value.length > 0)}
        onKeyDown={onKeyDown}
        className="search-pure flex-1 min-w-0 bg-transparent text-[13px] font-medium disabled:cursor-not-allowed border-0 outline-none focus:ring-0 focus:outline-none focus:border-0 focus:shadow-none p-0
                   text-gray-900 placeholder:text-gray-400
                   dark:text-white dark:placeholder:text-white/40"
      />
      {hasText && (
        <button
          type="button"
          onClick={onClear}
          title="Limpar (Esc)"
          className="p-0.5 rounded shrink-0 text-gray-400 hover:text-primary dark:text-white/40 dark:hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
