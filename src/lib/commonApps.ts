// Mapeamento de apps comuns por marca — pra o caso de a TV não retornar
// lista (Samsung) ou retornar só vazia (LG offline).
// IDs reais; o launch falha silenciosamente se o app não estiver instalado.

import type { TvBrand } from "@/types";

export interface CommonApp {
  /** Slug interno usado pelo Remoctrl. */
  slug: string;
  /** Nome exibido. */
  name: string;
  /** Cor do tile fallback (hex). */
  color: string;
  /** ID por marca pra launch. */
  ids: Partial<Record<TvBrand, string>>;
}

export const COMMON_APPS: CommonApp[] = [
  {
    slug: "netflix",
    name: "Netflix",
    color: "#E50914",
    ids: { roku: "12", lg: "netflix" },
  },
  {
    slug: "youtube",
    name: "YouTube",
    color: "#FF0000",
    ids: { roku: "837", lg: "youtube.leanback.v4" },
  },
  {
    slug: "prime",
    name: "Prime Video",
    color: "#00A8E1",
    ids: { roku: "13", lg: "amazon" },
  },
  {
    slug: "disney",
    name: "Disney+",
    color: "#113CCF",
    ids: { roku: "291097", lg: "com.disney.disneyplus-prod" },
  },
  {
    slug: "spotify",
    name: "Spotify",
    color: "#1DB954",
    ids: { roku: "22297", lg: "spotify-beehive" },
  },
  {
    slug: "globoplay",
    name: "Globoplay",
    color: "#EE323C",
    ids: { roku: "98203", lg: "globoplay" },
  },
];
