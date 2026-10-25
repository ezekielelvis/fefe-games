// Types for the global Fefe helper loaded from public/fefe.js.

export interface LeaderboardEntry {
  rank: number
  player_id: string
  username?: string
  score: number
}

export interface RunResult {
  status: "guest" | "offline" | "kept" | "saved" | "error"
  board: string | null
  /** null when the standings couldn't be loaded. */
  entries: LeaderboardEntry[] | null
  me: LeaderboardEntry | null
  best: number
}

interface FefeHelper {
  isSignedIn(): boolean
  playerId(): string | null
  localBest(): number
  finishRun(score: number, metadata?: Record<string, unknown>): Promise<RunResult>
}

declare global {
  interface Window {
    Fefe?: FefeHelper
  }
}

// Outside Fefe (e.g. fefe.js failed to load) the game still plays as a guest.
const fallback: FefeHelper = {
  isSignedIn: () => false,
  playerId: () => null,
  localBest: () => 0,
  finishRun: async () => ({ status: "offline", board: null, entries: null, me: null, best: 0 }),
}

export const fefe: FefeHelper = window.Fefe ?? fallback
