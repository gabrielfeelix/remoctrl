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

  // Layout: 200x200 — OK = círculo central 72px em (64,64).
  // Setas têm 4px de "respiro" do OK (não encostam mais).
  return (
    <div className="flex justify-center my-3">
      <div className="relative w-[200px] h-[200px]">
        {/* UP — encurtada 4px na vertical pra abrir gap com o OK */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Up")}
          aria-label="Cima"
          className={flash(
            "Up",
            "absolute top-0 left-[68px] w-16 h-[60px] rounded-t-[36px] rounded-b-[12px] bg-[#2a2f37] border border-white/5 text-white text-xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          ▲
        </motion.button>
        {/* LEFT — encurtada 4px na horizontal */}
        <motion.button
          whileTap={PRESS}
          onClick={() => onPress("Left")}
          aria-label="Esquerda"
          className={flash(
            "Left",
            "absolute top-[68px] left-0 w-[60px] h-16 rounded-l-[36px] rounded-r-[12px] bg-[#2a2f37] border border-white/5 text-white text-xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
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
            "absolute top-[64px] left-[64px] w-[72px] h-[72px] rounded-full text-white font-extrabold text-[15px] tracking-[0.06em] bg-gradient-to-br from-sky-400 to-primary shadow-[0_6px_20px_rgba(14,165,233,0.45),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.2)] border-0 hover:brightness-110 active:brightness-95",
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
            "absolute top-[68px] right-0 w-[60px] h-16 rounded-r-[36px] rounded-l-[12px] bg-[#2a2f37] border border-white/5 text-white text-xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
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
            "absolute bottom-0 left-[68px] w-16 h-[60px] rounded-b-[36px] rounded-t-[12px] bg-[#2a2f37] border border-white/5 text-white text-xl flex items-center justify-center transition-colors hover:bg-[#3d4350] active:bg-primary active:border-primary shadow-[0_2px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          ▼
        </motion.button>
      </div>
    </div>
  );
}
