// Botão "k" do remote — base reutilizada por Power, Mute, Vol, Play, etc.
// Tem dois modos:
//   - icon: square 60px, só ícone (Power, Mute)
//   - default: flex-1 com label + ícone

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  onClick?: () => void;
  title?: string;
  /** Ícone à esquerda (lucide-react). */
  icon?: ReactNode;
  children?: ReactNode;
  variant?: "default" | "icon" | "danger";
  /** Visual de "tecla pressionada" — ativada por keyboard shortcut. */
  flash?: boolean;
  /** Handlers de pointer/mouse pra long-press (vol/canal). Repasse via spread. */
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onTouchCancel?: (e: React.TouchEvent) => void;
}

export function RemoteButton({
  onClick,
  title,
  icon,
  children,
  variant = "default",
  flash,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
}: Props) {
  // Tema claro: fundo cinza-claro elegante, accent azul no hover (sky-50),
  // texto cinza-escuro pra contraste sem ser pesado. Tema escuro mantém
  // o look original `#2a2f37`.
  const base =
    "min-h-[44px] flex items-center justify-center gap-1.5 rounded-2xl border text-[13px] font-semibold transition-colors " +
    "bg-gray-100 border-gray-200 text-gray-800 hover:bg-sky-50 hover:border-sky-200 hover:text-primary active:bg-primary active:border-primary active:text-white " +
    "dark:bg-[#2a2f37] dark:border-white/5 dark:text-white dark:hover:bg-[#3d4350] dark:hover:text-white dark:hover:border-white/5 " +
    "shadow-[0_1px_0_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]";
  const variantClass =
    variant === "icon"
      ? "flex-none w-[44px] h-[44px] p-2.5"
      : variant === "danger"
      ? `${base} hover:!text-red-500 hover:!border-red-300 hover:!bg-red-50 dark:hover:!text-red-400 dark:hover:!border-red-500/30 dark:hover:!bg-[#3d4350]`
      : "flex-1 px-3 py-2.5";
  const flashClass = flash ? "!bg-primary !border-primary !text-white" : "";

  return (
    <motion.button
      whileTap={{ scale: 0.97, y: 1 }}
      onClick={onClick}
      title={title}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className={`${variant === "icon" || variant === "danger" ? "" : base} ${variantClass} ${flashClass}`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
