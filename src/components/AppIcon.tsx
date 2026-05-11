// Tile com ícone do app. Tenta carregar imagem da TV; se falhar, mostra
// a primeira letra do nome com cor de fallback.

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  name: string;
  iconUrl?: string;
  fallbackColor?: string;
  onClick: () => void;
}

export function AppIcon({ name, iconUrl, fallbackColor = "#2a2f37", onClick }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="aspect-[16/12] rounded-xl overflow-hidden relative border border-white/[0.06]
                 bg-gradient-to-br from-[#1f242b] to-[#14171c]
                 hover:border-primary/40 hover:shadow-[0_4px_14px_rgba(14,165,233,0.18)]
                 hover:-translate-y-0.5 transition-all"
    >
      {iconUrl && !failed ? (
        <img
          src={iconUrl}
          alt={name}
          onError={() => setFailed(true)}
          className="w-full h-full object-contain p-1.5 rounded-2xl"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-extrabold text-center px-1 leading-tight"
          style={{
            background: `linear-gradient(135deg, ${fallbackColor}, ${fallbackColor}88)`,
          }}
        >
          {name}
        </div>
      )}
    </motion.button>
  );
}
