// Tutorial pareamento LG webOS.

import { Info, X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: "Conecte a TV à mesma Wi-Fi",
    text: "O Remoctrl precisa estar na mesma rede que a LG.",
  },
  {
    title: "Adicione a TV no Remoctrl",
    text: "Toque em '+ TV' e selecione sua LG na lista (ou digite o IP).",
  },
  {
    title: "Aceite o pareamento NA TELA DA TV",
    text: "Na primeira conexão a LG mostra um prompt 'Receber controle remoto?'. Use o controle físico pra confirmar.",
  },
  {
    title: "Pronto",
    text: "O Remoctrl guarda um client-key e reconecta sozinho nas próximas vezes.",
  },
];

export function LgTutorial() {
  const open = useUiStore((s) => s.tutorialOpen);
  const close = useUiStore((s) => s.closeTutorial);
  const finish = useUiStore((s) => s.finishOnboarding);

  if (!open) return null;
  const dismiss = () => {
    finish();
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-5 py-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl p-6 my-auto shadow-2xl border
                   bg-white border-gray-200
                   dark:bg-[#15181d] dark:border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Conectando uma LG webOS</h3>
          <button
            onClick={dismiss}
            className="p-1 text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl border text-[11.5px]
                        bg-primary/[0.06] border-primary/30 text-gray-800
                        dark:bg-primary/10 dark:text-white">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>Modelos com <b>webOS</b> (geralmente 2014+ com Magic Remote).</span>
        </div>

        <div className="space-y-1.5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-2.5 px-3 py-2 rounded-xl border
                                     bg-gray-50 border-gray-200
                                     dark:bg-black/25 dark:border-white/[0.06]">
              <div className="w-[22px] h-[22px] rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] font-bold text-gray-900 dark:text-white">{s.title}</div>
                <div className="text-[11.5px] leading-snug mt-0.5 text-gray-600 dark:text-white/60">{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={dismiss}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-sky-400 text-white text-sm font-semibold"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
