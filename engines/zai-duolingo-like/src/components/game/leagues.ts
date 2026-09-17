// Cozy league presentation for the client: the shared league table from
// @/lib/league-meta plus client-only flavor blurbs.

import { LEAGUES, LEAGUE_META } from "@/lib/league-meta";
import type { League, LeagueMeta } from "@/lib/league-meta";

export interface LeagueInfo extends LeagueMeta {
  blurb: string;
}

const BLURBS: Record<League, string> = {
  bronze: "Recruta da névoa. O caminho começa aqui.",
  silver: "Compilador ativo. A cidade começa a notar.",
  gold: "Guardião dos padrões. Akihabara respira melhor.",
  platinum: "Sacerdote dos Kami digitais. Odaiba te saúda.",
  diamond: "Arquiteto do Vertical Protocol. Lenda viva.",
};

export const LEAGUES_INFO: Record<League, LeagueInfo> = Object.fromEntries(
  LEAGUES.map((league) => [
    league,
    { ...LEAGUE_META[league], blurb: BLURBS[league] },
  ])
) as Record<League, LeagueInfo>;

export const LEAGUE_ORDER: League[] = [...LEAGUES];
