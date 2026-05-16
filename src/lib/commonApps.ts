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

// Para Android TV o ID é `package/.Activity` ou `package/package.Activity`
// (formato esperado por `am start -n <component>`).
// Para Sony, é a "URI" do appControl (`com.sony.dtv.<package>.<activity>`).
export const COMMON_APPS: CommonApp[] = [
  {
    slug: "netflix",
    name: "Netflix",
    color: "#E50914",
    ids: {
      roku: "12",
      lg: "netflix",
      androidtv: "com.netflix.ninja/.MainActivity",
      sony: "com.sony.dtv.com.netflix.ninja.com.netflix.ninja.NetflixActivity",
    },
  },
  {
    slug: "youtube",
    name: "YouTube",
    color: "#FF0000",
    ids: {
      roku: "837",
      lg: "youtube.leanback.v4",
      androidtv: "com.google.android.youtube.tv/.MainActivity",
      sony: "com.sony.dtv.com.google.android.youtube.tv.com.google.android.apps.youtube.tv.activity.ShellActivity",
    },
  },
  {
    slug: "prime",
    name: "Prime Video",
    color: "#00A8E1",
    ids: {
      roku: "13",
      lg: "amazon",
      androidtv:
        "com.amazon.amazonvideo.livingroom/com.amazon.ignition.IgnitionActivity",
      sony: "com.sony.dtv.com.amazon.amazonvideo.livingroom.com.amazon.ignition.IgnitionActivity",
    },
  },
  {
    slug: "disney",
    name: "Disney+",
    color: "#113CCF",
    ids: {
      roku: "291097",
      lg: "com.disney.disneyplus-prod",
      androidtv: "com.disney.disneyplus/.MainActivity",
      sony: "com.sony.dtv.com.disney.disneyplus.com.disney.disneyplus.MainActivity",
    },
  },
  {
    slug: "spotify",
    name: "Spotify",
    color: "#1DB954",
    ids: {
      roku: "22297",
      lg: "spotify-beehive",
      androidtv: "com.spotify.tv.android/.SpotifyTVActivity",
      sony: "com.sony.dtv.com.spotify.tv.android.com.spotify.tv.android.SpotifyTVActivity",
    },
  },
  {
    slug: "globoplay",
    name: "Globoplay",
    color: "#EE323C",
    ids: {
      roku: "98203",
      lg: "globoplay",
      androidtv: "com.globo.globotv/.MainActivity",
      // Globoplay raramente vem pré-instalado em Sony Bravia BR; ID provisório.
      sony: "com.sony.dtv.com.globo.globotv.com.globo.globotv.MainActivity",
    },
  },
];
