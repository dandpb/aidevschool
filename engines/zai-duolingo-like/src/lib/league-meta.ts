// Vertical Protocol — league metadata shared by server logic and client UI.
// Pure data and pure functions: no imports, safe for both server and client bundles.

export const LEAGUES = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
] as const;
export type League = (typeof LEAGUES)[number];

export type LeagueColor = "amber" | "zinc" | "yellow" | "teal" | "rose";

export interface LeagueMeta {
  label: string;
  color: LeagueColor;
  emoji: string;
  threshold: number;
}

export const LEAGUE_META: Record<League, LeagueMeta> = {
  bronze: { label: "Bronze", color: "amber", emoji: "🥉", threshold: 0 },
  silver: { label: "Prata", color: "zinc", emoji: "🥈", threshold: 150 },
  gold: { label: "Ouro", color: "yellow", emoji: "🥇", threshold: 400 },
  platinum: { label: "Platina", color: "teal", emoji: "💠", threshold: 800 },
  diamond: { label: "Diamante", color: "rose", emoji: "💎", threshold: 1500 },
};

export function leagueForXp(xp: number): League {
  let result: League = "bronze";
  for (const l of LEAGUES) {
    if (xp >= LEAGUE_META[l].threshold) result = l;
  }
  return result;
}

// XP needed to reach next league
export function nextLeagueThreshold(xp: number): number | null {
  for (const l of LEAGUES) {
    if (xp < LEAGUE_META[l].threshold) return LEAGUE_META[l].threshold;
  }
  return null;
}
