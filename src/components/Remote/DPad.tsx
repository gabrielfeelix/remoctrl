// D-pad — controle direcional + botão OK central.
// Layout idêntico ao roku.html (linhas 596-635), mas em React/Tailwind.

import { motion } from "framer-motion";
import type { RokuKey } from "@/types";

interface Props {
  /** Disparado quando uma direção/OK é apertado. */
  onPress: (key: RokuKey) => void;
  /** Tecla destacada visualmente (feedback de keyboard shortcut). */
  flashKey?: RokuKey | null;
}

const PRESS = { scale: 0.94 };

export function DPad({ onPress, flashKey }: Props) {
  const flash = (key: RokuKey, base: string) =>
    flashKey === key ? `${base} bg-primary !text-white !border-primary` : base;

  return (
    <div className="flex justify-center my-4">
      <div className="relative w-[220px] h-[220px]">
        {/* UP */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Up")}
          aria-label="Cima"
          className={flash(
            "Up",
            "absolute top-0 left-[70px] w-20 h-[70px] rounded-t-[40px] rounded-b-[14px] bg-[#2a2f37] border border-white/5 text-white text-2xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          ▲
        </motion.button>
        {/* LEFT */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Left")}
          aria-label="Esquerda"
          className={flash(
            "Left",
            "absolute top-[70px] left-0 w-[70px] h-20 rounded-l-[40px] rounded-r-[14px] bg-[#2a2f37] border border-white/5 text-white text-2xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          ◀
        </motion.button>
        {/* OK */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Select")}
          aria-label="OK"
          className={flash(
            "Select",
            "absolute top-[70px] left-[70px] w-20 h-20 rounded-full text-white font-extrabold text-base tracking-[0.06em] bg-gradient-to-br from-sky-400 to-primary shadow-[0_6px_20px_rgba(14,165,233,0.45),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.2)] border-0 hover:brightness-110 active:brightness-95",
          )}
        >
          OK
        </motion.button>
        {/* RIGHT */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Right")}
          aria-label="Direita"
          className={flash(
            "Right",
            "absolute top-[70px] right-0 w-[70px] h-20 rounded-r-[40px] rounded-l-[14px] bg-[#2a2f37] border border-white/5 text-white text-2xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          ▶
        </motion.button>
        {/* DOWN */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Down")}
          aria-label="Baixo"
          className={flash(
            "Down",
            "absolute bottom-0 left-[70px] w-20 h-[70px] rounded-b-[40px] rounded-t-[14px] bg-[#2a2f37] border border-white/5 text-white text-2xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          ▼
        </motion.button>
      </div>
    </div>
  );
}
