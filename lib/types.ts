// ────────────────────────────────────────────────────────────────────────────
// Core Types
// ────────────────────────────────────────────────────────────────────────────

export interface ScoreHalf {
  first: number | null;
}

export interface MatchScore {
  home: ScoreHalf;
  away: ScoreHalf;
  extraTime?: { home: number; away: number } | null;
  penalties?: { home: number; away: number } | null;
  hasExtraTime: boolean;
  hasPenalties: boolean;
  isDefinitive?: boolean;
}

export interface Match {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  score: MatchScore;
  played: boolean;
  // For group stage matches
  groupId?: string;
  matchday?: number;
  date?: string;
  time?: string;
  location?: string;
}

export interface GroupStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface GroupState {
  id: string;
  matches: Match[];
  standings: GroupStanding[];
}

export interface KnockoutMatch extends Match {
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
  matchNumber: number;
  // Which matches feed into this one
  homeFromMatch?: number;
  awayFromMatch?: number;
  homeFromWinner?: boolean; // true = winner, false = loser (for 3rd place)
  awayFromWinner?: boolean;
  // Labels shown when team not yet determined
  homeLabel?: string;
  awayLabel?: string;
}

export interface TournamentState {
  version: number;
  groups: Record<string, GroupState>;
  knockout: Record<number, KnockoutMatch>;
  bestThirds: string[]; // up to 8 team IDs
}
