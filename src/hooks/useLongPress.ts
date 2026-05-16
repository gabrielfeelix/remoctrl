// useLongPress — handlers pra fire-once + repeat-while-held.
// Pensado pros botões de Volume/Canal: um clique = 1 comando, segurar = repete.
//
// Comportamento:
//   - mousedown/touchstart: dispara onAction() IMEDIATAMENTE (responsividade)
//   - depois de `initialDelay` ms segurando, começa intervalos de `repeatRate` ms
//   - mouseup/leave/touchend/cancel: para tudo
//
// Devolve handlers prontos pra spread: `<button {...handlers}>`.

import { useCallback, useEffect, useRef } from "react";

interface Options {
  /** Disparado a cada "tick" (clique inicial + cada repeat). */
  onAction: () => void;
  /** Tempo antes do primeiro repeat (ms). Default: 350. */
  initialDelay?: number;
  /** Intervalo entre repeats (ms). Default: 100. */
  repeatRate?: number;
}

export function useLongPress({ onAction, initialDelay = 350, repeatRate = 100 }: Options) {
  const startTimer = useRef<number | null>(null);
  const intervalTimer = useRef<number | null>(null);
  // Usamos ref pra que o handler sempre veja a callback mais recente
  // sem precisar re-criar os handlers (que invalidaria os listeners).
  const actionRef = useRef(onAction);
  useEffect(() => {
    actionRef.current = onAction;
  }, [onAction]);

  const stop = useCallback(() => {
    if (startTimer.current !== null) {
      window.clearTimeout(startTimer.current);
      startTimer.current = null;
    }
    if (intervalTimer.current !== null) {
      window.clearInterval(intervalTimer.current);
      intervalTimer.current = null;
    }
  }, []);

  // Cleanup garantido se o componente desmontar enquanto botão estiver pressionado
  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    stop();
    // Fire-once imediato
    actionRef.current();
    // Agenda o primeiro repeat
    startTimer.current = window.setTimeout(() => {
      intervalTimer.current = window.setInterval(() => {
        actionRef.current();
      }, repeatRate);
    }, initialDelay);
  }, [initialDelay, repeatRate, stop]);

  return {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      start();
    },
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      start();
    },
    onTouchEnd: stop,
    onTouchCancel: stop,
  };
}
