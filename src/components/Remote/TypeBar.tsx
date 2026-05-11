// Type-on-TV — input que envia caracteres pra TV em tempo real.
// Atalhos:
//   - Enter       → manda o texto inteiro pra TV (e limpa)
//   - Ctrl+Enter  → abre busca da Roku (só Roku)
//   - Esc         → limpa
//
// Sprint 2: dispatch por marca via `lib/commands.ts`.
//   - Roku: type char-por-char (Lit_<char>)
//   - LG:   acumula texto e manda por insertText (SSAP)
//   - Samsung: não suportado — input bloqueia.

import { Search, X, Keyboard } from "lucide-react";
import { useRef } from "react";
import { useTvStore } from "@/stores/tvStore";
import { useToast } from "@/components/Toast";
import { sendCommand, sendText, openSearch } from "@/lib/commands";

export function TypeBar() {
  const tv = useTvStore((s) => s.selected());
  const inputRef = useRef<HTMLInputElement>(null);
  const showToast = useToast((s) => s.show);

  const supportsType = !!tv && (tv.brand === "roku" || tv.brand === "lg");
  const supportsSearch = !!tv && tv.brand === "roku";
  const charByChar = !!tv && tv.brand === "roku";

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

  const onClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!tv || !supportsType) return;

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
    // Em Roku, mandamos cada caractere assim que digitado pra UX em tempo real.
    // Em LG, esperamos o Enter pra mandar tudo de uma vez (insertText é atômico).
    if (charByChar && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      try {
        await sendText(tv, e.key);
      } catch {
        /* silencioso */
      }
    }
    if (charByChar && e.key === "Backspace") {
      try {
        await sendCommand(tv, "Back");
      } catch {
        /* noop */
      }
    }
  };

  const placeholder = !tv
    ? "Selecione uma TV primeiro"
    : tv.brand === "samsung"
    ? "Type-on-TV não suportado em Samsung"
    : tv.brand === "lg"
    ? "Digite e Enter envia ao campo da TV…"
    : "Digite — vai pro campo aberto na TV…";

  return (
    <div
      className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-2xl
                 border transition-colors
                 ${supportsType
                   ? "border-primary/25 bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(14,165,233,0.18)]"
                   : "border-white/[0.06] bg-white/[0.02] opacity-60"}`}
    >
      <Keyboard className="w-5 h-5 text-primary/80 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        disabled={!supportsType}
        onKeyDown={onKeyDown}
        className="flex-1 min-w-0 bg-transparent text-white text-sm font-medium outline-none placeholder:text-white/40 disabled:cursor-not-allowed"
      />
      {supportsSearch && (
        <button
          type="button"
          onClick={onSearch}
          title="Abrir Busca da Roku (Ctrl+Enter)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-primary bg-primary/15 hover:bg-primary/25 hover:text-white"
        >
          <Search className="w-3.5 h-3.5" />
          Buscar
        </button>
      )}
      <button
        type="button"
        onClick={onClear}
        title="Limpar"
        className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
