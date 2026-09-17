// Guards the league-metadata fold: the client presentation table must stay
// consistent with the single shared league table.

import { describe, expect, it } from "vitest";
import { LEAGUES, LEAGUE_META, leagueForXp, nextLeagueThreshold } from "@/lib/league-meta";
import { LEAGUES_INFO, LEAGUE_ORDER } from "@/components/game/leagues";

describe("league-meta", () => {
  it("orders leagues by ascending threshold", () => {
    const thresholds = LEAGUES.map((l) => LEAGUE_META[l].threshold);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
  });

  it("maps xp to the right league at every boundary", () => {
    expect(leagueForXp(0)).toBe("bronze");
    expect(leagueForXp(149)).toBe("bronze");
    expect(leagueForXp(150)).toBe("silver");
    expect(leagueForXp(399)).toBe("silver");
    expect(leagueForXp(400)).toBe("gold");
    expect(leagueForXp(799)).toBe("gold");
    expect(leagueForXp(800)).toBe("platinum");
    expect(leagueForXp(1499)).toBe("platinum");
    expect(leagueForXp(1500)).toBe("diamond");
    expect(leagueForXp(999999)).toBe("diamond");
  });

  it("reports the next threshold until diamond, then null", () => {
    expect(nextLeagueThreshold(0)).toBe(150);
    expect(nextLeagueThreshold(150)).toBe(400);
    expect(nextLeagueThreshold(400)).toBe(800);
    expect(nextLeagueThreshold(800)).toBe(1500);
    expect(nextLeagueThreshold(1500)).toBeNull();
  });

  it("keeps client LEAGUES_INFO consistent with the shared table", () => {
    expect(LEAGUE_ORDER).toEqual([...LEAGUES]);
    for (const league of LEAGUES) {
      const { blurb: _blurb, ...clientRest } = LEAGUES_INFO[league];
      expect(clientRest).toEqual(LEAGUE_META[league]);
      expect(LEAGUES_INFO[league].blurb.length).toBeGreaterThan(0);
    }
  });
});
