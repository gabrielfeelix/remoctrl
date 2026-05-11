// Toast — notificação flutuante temporária. Some sozinho.
// Usado pra feedback de "Conectado", "Comando falhou", etc.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { create } from "zustand";

interface ToastState {
  message: string | null;
  variant: "ok" | "err";
  show: (msg: string, variant?: "ok" | "err") => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  variant: "ok",
  show: (msg, variant = "ok") => set({ message: msg, variant }),
  hide: () => set({ message: null }),
}));

export function ToastViewport() {
  const { message, variant, hide } = useToast();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      hide();
      setTick((n) => n + 1);
    }, 2200);
    return () => clearTimeout(t);
  }, [message, hide]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            rounded-full px-4 py-2 text-xs font-semibold backdrop-blur
            border shadow-2xl whitespace-nowrap
            ${variant === "err"
              ? "bg-black/85 border-red-500/60 text-red-400"
              : "bg-black/85 border-white/10 text-white"}`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
