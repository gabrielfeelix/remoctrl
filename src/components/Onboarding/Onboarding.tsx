// Dispatch de tutorial baseado na marca da TV selecionada.
// Mostra Roku/Samsung/LG conforme contexto.

import { useTvStore } from "@/stores/tvStore";
import { useUiStore } from "@/stores/uiStore";
import { RokuTutorial } from "./RokuTutorial";
import { SamsungTutorial } from "./SamsungTutorial";
import { LgTutorial } from "./LgTutorial";
import { SonyTutorial } from "./SonyTutorial";
import { AndroidTvTutorial } from "./AndroidTvTutorial";
import { PhilipsTutorial } from "./PhilipsTutorial";

export function Onboarding() {
  const tv = useTvStore((s) => s.selected());
  const open = useUiStore((s) => s.tutorialOpen);
  if (!open) return null;

  // Sem TV selecionada → padrão é Roku (a mais comum no Brasil)
  const brand = tv?.brand ?? "roku";

  switch (brand) {
    case "samsung":
      return <SamsungTutorial />;
    case "lg":
      return <LgTutorial />;
    case "sony":
      return <SonyTutorial />;
    case "androidtv":
      return <AndroidTvTutorial />;
    case "philips":
      return <PhilipsTutorial />;
    default:
      return <RokuTutorial />;
  }
}
