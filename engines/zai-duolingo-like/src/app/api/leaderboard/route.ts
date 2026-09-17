import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner, leagueForXp, LEAGUE_META } from "@/lib/game";

export const dynamic = "force-dynamic";

// GET /api/leaderboard — league standings (player + rivals)
export async function GET() {
  const me = await getCurrentLearner();
  const league = leagueForXp(me.xp);

  // fetch all learners in the same league tier (rivals + me)
  const peers = await db.learner.findMany({
    where: { league: league },
    orderBy: { leagueXp: "desc" },
  });

  // make sure 'me' is represented with current xp/leagueXp
  const standings = peers.map((p) => {
    const isMe = p.id === me.id;
    return {
      id: p.id,
      name: isMe ? `${p.name} (você)` : p.name,
      leagueXp: isMe ? me.leagueXp : p.leagueXp,
      isMe,
      isRival: p.id.startsWith("rival-"),
    };
  });

  // sort desc
  standings.sort((a, b) => b.leagueXp - a.leagueXp);

  // ranks
  const ranked = standings.map((s, i) => ({ ...s, rank: i + 1 }));

  // promotion/demotion zone info (top 3 promote, bottom 3 demote — cozy flavor)
  const promoteZone = 3;
  const demoteZone = 3;

  return NextResponse.json({
    league,
    leagueMeta: LEAGUE_META[league],
    standings: ranked,
    total: ranked.length,
    promoteZone,
    demoteZone,
  });
}
