// Tutorial pareamento Samsung Tizen.
// Diferente da Roku, aqui o usuário precisa aceitar um popup NA TV
// na primeira conexão.

import { Info, X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: "Adicione a TV no Remoctrl",
    text: "Toque em '+ TV' e selecione sua Samsung na lista da rede (ou digite o IP manualmente).",
  },
  {
    title: "Aceite o pareamento NA TELA DA TV",
    text: "Na primeira conexão, sua Samsung mostra um popup pedindo permissão pro 'Remoctrl'. Use o controle físico pra escolher 'Permitir'.",
  },
  {
    title: "Pronto",
    text: "O Remoctrl guarda um token e nas próximas vezes conecta direto, sem popup.",
  },
];

export function SamsungTutorial() {
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
        className="w-full max-w-[480px] bg-[#15181d] border border-white/[0.06] rounded-2xl p-6 my-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-bold">Conectando uma Samsung</h3>
          <button onClick={dismiss} className="text-white/50 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-[11.5px] text-white">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>Modelos <b>Tizen 2016+</b> (Smart Hub). Antigos (~2014) não são compatíveis.</span>
        </div>

        <div className="space-y-1.5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-2.5 px-3 py-2 rounded-xl bg-black/25 border border-white/[0.06]">
              <div className="w-[22px] h-[22px] rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] font-bold text-white">{s.title}</div>
                <div className="text-[11.5px] text-white/60 leading-snug mt-0.5">{s.text}</div>
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
