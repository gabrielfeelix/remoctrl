// Tutorial "Como ativar o Modo Permissivo na Roku"
// Por padrão a Roku BLOQUEIA comandos ECP externos por segurança.
// O usuário precisa ativar "Permissive Mode" pra o app funcionar.

import { Info, X } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: "Abra Configurações na Roku",
    text: "No menu Home da TV, vá em Configurações → Sistema.",
  },
  {
    title: "Encontre Controle por dispositivos móveis",
    text: "Busque por 'Controle por aplicativos móveis' ou 'External Control'. Em Roku TVs do Brasil, geralmente está em Sistema → Controle por dispositivos móveis.",
  },
  {
    title: "Ative o modo permissivo",
    text: "Selecione 'Modo de rede' → 'Permissivo' (ou em inglês: Network access → 'Permissive'). Isso libera o Remoctrl pra controlar a TV.",
  },
  {
    title: "Pronto",
    text: "Agora abra a tela de adicionar TV no Remoctrl e selecione sua TV.",
  },
];

export function RokuTutorial() {
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
          <h3 className="text-base font-bold">Bem-vindo ao Remoctrl</h3>
          <button onClick={dismiss} className="text-white/50 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-[11.5px] text-white">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            Pra controlar uma <b>Roku</b>, você precisa ativar o "Modo Permissivo" uma vez:
          </span>
        </div>

        <div className="space-y-1.5">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex gap-2.5 px-3 py-2 rounded-xl bg-black/25 border border-white/[0.06]"
            >
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

        <div className="flex justify-end gap-2 mt-4">
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
