// Select customizado — dropdown leve com a linguagem visual do app.
// Substitui o <select> nativo (que renderiza com chrome do SO em listas longas).
//
// API: igual a um select básico — `options` + `value` + `onChange`. Suporta
// keyboard nav (↑↓ Enter Esc) e click-outside pra fechar.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Texto auxiliar (cinza, à direita) — útil pra mostrar marca ou atalho. */
  hint?: string;
}

interface Props<T extends string = string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Placeholder quando nada selecionado (raramente usado — sempre tem default). */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Selecionar…",
  disabled = false,
  className = "",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value);

  // Reset highlight quando abre e foca opção atual
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIdx(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Click-outside fecha
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const choose = (v: T) => {
    onChange(v);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const o = options[activeIdx];
      if (o) choose(o.value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
          bg-white border text-gray-900
          hover:border-gray-300
          focus:outline-none focus:border-primary
          dark:bg-black/30 dark:border-white/[0.08] dark:text-white
          dark:hover:border-white/15
          disabled:opacity-40 disabled:cursor-not-allowed
          ${open ? "!border-primary" : "border-gray-200"}`}
      >
        <span className={`flex-1 truncate ${current ? "" : "text-gray-400 dark:text-white/40"}`}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 dark:text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute z-50 mt-1 left-0 right-0 max-h-60 overflow-y-auto py-1
                     rounded-lg border shadow-xl
                     bg-white border-gray-200
                     dark:bg-[#15181d] dark:border-white/[0.08] dark:shadow-2xl"
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            const active = i === activeIdx;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.value)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left transition-colors
                  ${active
                    ? "bg-primary/10 text-gray-900 dark:bg-primary/15 dark:text-white"
                    : "text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {selected ? (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{o.label}</span>
                </span>
                {o.hint && (
                  <span className="text-[10px] font-mono text-gray-400 dark:text-white/40 shrink-0">
                    {o.hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
