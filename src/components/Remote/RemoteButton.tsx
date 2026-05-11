// Botão "k" do remote — base reutilizada por Power, Mute, Vol, Play, etc.
// Tem dois modos:
//   - icon: square 60px, só ícone (Power, Mute)
//   - default: flex-1 com label + ícone

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  onClick: () => void;
  title?: string;
  /** Ícone à esquerda (lucide-react). */
  icon?: ReactNode;
  children?: ReactNode;
  variant?: "default" | "icon" | "danger";
  /** Visual de "tecla pressionada" — ativada por keyboard shortcut. */
  flash?: boolean;
}

export function RemoteButton({
  onClick,
  title,
  icon,
  children,
  variant = "default",
  flash,
}: Props) {
  const base =
    "min-h-[48px] flex items-center justify-center gap-1.5 rounded-2xl border border-white/5 bg-[#2a2f37] text-white text-sm font-semibold transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]";
  const variantClass =
    variant === "icon"
      ? "flex-none w-[60px] p-3"
      : variant === "danger"
      ? `${base} hover:!text-red-400 hover:!border-red-500/30`
      : "flex-1 px-4 py-3";
  const flashClass = flash ? "!bg-primary !border-primary !text-white" : "";

  return (
    <motion.button
      whileTap={{ scale: 0.97, y: 1 }}
      onClick={onClick}
      title={title}
      className={`${variant === "icon" || variant === "danger" ? "" : base} ${variantClass} ${flashClass}`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
