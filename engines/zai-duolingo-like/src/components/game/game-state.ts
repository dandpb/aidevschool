// Vertical Protocol — client side of the game-state seam.
// Types are derived from the server module (import type crosses the boundary;
// nothing runtime is imported), so client/server drift is a compile error.

import type { GameSnapshot, Notice } from "@/lib/game-state";

export type { GameSnapshot, Notice };

/** The one-line read: fetch the current game snapshot. */
export async function fetchSnapshot(): Promise<GameSnapshot> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (!res.ok) throw new Error("state fetch failed");
  return res.json();
}
