// Limites do plano Free — gates pra Pro.

export const FREE_LIMITS = {
  /** Free permite 1 TV salva. Pro: ilimitado. */
  maxTvs: 1,
  /** Free só Roku. Pro: Samsung + LG + outras marcas. */
  brands: ["roku"] as const,
  /** Modal flutuante (always-on-top) é Pro. */
  alwaysOnTop: false,
  /** Atalho global Ctrl+Shift+N é Pro. */
  globalShortcut: false,
  /** Macros é Pro. */
  macros: false,
  /** Atalhos custom é Pro. */
  customShortcuts: false,
};

export type ProFeature =
  | "extraTv"
  | "samsungBrand"
  | "lgBrand"
  | "alwaysOnTop"
  | "globalShortcut"
  | "macros"
  | "customShortcuts";

export const FEATURE_DESCRIPTION: Record<ProFeature, string> = {
  extraTv: "Múltiplas TVs salvas",
  samsungBrand: "Controle de TVs Samsung",
  lgBrand: "Controle de TVs LG",
  alwaysOnTop: "Modal flutuante always-on-top",
  globalShortcut: "Atalho global Ctrl+Shift+N",
  macros: "Macros (sequências de 1 clique)",
  customShortcuts: "Atalhos de teclado customizados",
};
