import { create } from 'zustand';
import { TournamentState, Match, MatchScore, GroupState, KnockoutMatch } from './types';
import {
  calculateGroupStandings,
  createInitialTournamentState,
  getWinner,
  getBestThirds,
  getFinalScore,
  isMatchComplete,
} from './tournament';
import GROUPS from '../data/teams';

// ────────────────────────────────────────────────────────────────────────────
// Group 1st/2nd helpers
// ────────────────────────────────────────────────────────────────────────────

function getGroupQualifiers(state: TournamentState) {
  const result: Record<string, { first: string | null; second: string | null; thirds: string[] }> = {};
  for (const groupId of Object.keys(state.groups)) {
    const g = state.groups[groupId];
    result[groupId] = {
      first: g.standings[0]?.teamId ?? null,
      second: g.standings[1]?.teamId ?? null,
      thirds: g.standings.length >= 3 ? [g.standings[2].teamId] : [],
    };
  }
  return result;
}

function allGroupMatchesComplete(groups: Record<string, GroupState>): boolean {
  for (const g of Object.values(groups)) {
    for (const m of g.matches) {
      if (!m.played) return false;
    }
  }
  return true;
}

// Map group qualifiers into R32 slots
function propagateGroupsToR32(
  knockout: Record<number, KnockoutMatch>,
  state: TournamentState
): Record<number, KnockoutMatch> {
  const q = getGroupQualifiers(state);
  const best8thirds = getBestThirds(state.groups);

  const updated = { ...knockout };

  // Helper to set a team in a match
  function setHome(matchNum: number, teamId: string | null) {
    updated[matchNum] = { ...updated[matchNum], homeTeamId: teamId };
  }
  function setAway(matchNum: number, teamId: string | null) {
    updated[matchNum] = { ...updated[matchNum], awayTeamId: teamId };
  }

  // R32 qualifications (official bracket)
  setHome(1, q['A']?.second ?? null);   setAway(1, q['B']?.second ?? null);
  setHome(2, q['C']?.first ?? null);    setAway(2, q['F']?.second ?? null);
  setHome(3, q['E']?.first ?? null);    setAway(3, best8thirds[0] ?? null);
  setHome(4, q['F']?.first ?? null);    setAway(4, q['C']?.second ?? null);
  setHome(5, q['E']?.second ?? null);   setAway(5, q['I']?.second ?? null);
  setHome(6, q['I']?.first ?? null);    setAway(6, best8thirds[1] ?? null);
  setHome(7, q['A']?.first ?? null);    setAway(7, best8thirds[2] ?? null);
  setHome(8, q['L']?.first ?? null);    setAway(8, best8thirds[3] ?? null);
  setHome(9, q['G']?.first ?? null);    setAway(9, best8thirds[4] ?? null);
  setHome(10, q['D']?.first ?? null);   setAway(10, best8thirds[5] ?? null);
  setHome(11, q['H']?.first ?? null);   setAway(11, q['J']?.second ?? null);
  setHome(12, q['K']?.second ?? null);  setAway(12, q['L']?.second ?? null);
  setHome(13, q['B']?.first ?? null);   setAway(13, best8thirds[6] ?? null);
  setHome(14, q['D']?.second ?? null);  setAway(14, q['G']?.second ?? null);
  setHome(15, q['J']?.first ?? null);   setAway(15, q['H']?.second ?? null);
  setHome(16, q['K']?.first ?? null);   setAway(16, best8thirds[7] ?? null);

  return updated;
}

// Propagate knockout winners to next rounds
function propagateKnockout(
  knockout: Record<number, KnockoutMatch>
): Record<number, KnockoutMatch> {
  const updated = { ...knockout };

  for (const match of Object.values(updated)) {
    if (!match.homeFromMatch && !match.awayFromMatch) continue;

    const sourceMatches = {
      home: match.homeFromMatch ? updated[match.homeFromMatch] : null,
      away: match.awayFromMatch ? updated[match.awayFromMatch] : null,
    };

    const getTeam = (srcMatch: KnockoutMatch | null, wantWinner: boolean | undefined): string | null => {
      if (!srcMatch || !srcMatch.played) return null;
      const winner = getWinner(srcMatch);
      if (wantWinner) return winner;
      // Loser (for third place)
      if (!winner) return null;
      return winner === srcMatch.homeTeamId ? srcMatch.awayTeamId : srcMatch.homeTeamId;
    };

    const newHome = getTeam(sourceMatches.home, match.homeFromWinner);
    const newAway = getTeam(sourceMatches.away, match.awayFromWinner);

    updated[match.matchNumber] = {
      ...updated[match.matchNumber],
      homeTeamId: newHome,
      awayTeamId: newAway,
    };
  }

  return updated;
}

// ────────────────────────────────────────────────────────────────────────────
// Zustand Store
// ────────────────────────────────────────────────────────────────────────────

interface TournamentStore {
  tournament: TournamentState;
  sessionId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  user: { id: string; email?: string; is_anonymous?: boolean } | null;
  isReadOnly: boolean;
  ownerId: string | null;

  setUser: (user: { id: string; email?: string; is_anonymous?: boolean } | null) => void;
  setReadOnly: (isReadOnly: boolean) => void;
  setOwnerId: (ownerId: string | null) => void;
  setSessionId: (id: string | null) => void;
  updateGroupMatch: (groupId: string, matchId: string, score: Partial<MatchScore>) => void;
  markGroupMatchPlayed: (groupId: string, matchId: string, played: boolean) => void;
  updateKnockoutMatch: (matchNumber: number, score: Partial<MatchScore>) => void;
  markKnockoutPlayed: (matchNumber: number, played: boolean) => void;
  loadState: (state: TournamentState) => void;
  resetTournament: () => void;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournament: createInitialTournamentState(),
  sessionId: null,
  isDirty: false,
  isSaving: false,
  user: null,
  isReadOnly: false,
  ownerId: null,

  setUser: (user) => set({ user }),
  setReadOnly: (isReadOnly) => set({ isReadOnly }),
  setOwnerId: (ownerId) => set({ ownerId }),
  setSessionId: (id) => set({ sessionId: id }),

  updateGroupMatch: (groupId, matchId, scoreUpdate) => {
    if (get().isReadOnly) return;
    set(state => {
      const groups = { ...state.tournament.groups };
      const group = groups[groupId];
      if (!group) return state;

      const matches = group.matches.map(m => {
        if (m.id !== matchId) return m;
        const newScore = { ...m.score, ...scoreUpdate };
        const played = isMatchComplete({ ...m, score: newScore });
        return { ...m, score: newScore, played };
      });

      const teamIds = GROUPS.find(g => g.id === groupId)!.teams.map(t => t.id);
      const standings = calculateGroupStandings(teamIds, matches);

      groups[groupId] = { ...group, matches, standings };

      const newGroupState = { ...state.tournament, groups };

      // Propagate to knockout if all groups done
      let knockout = state.tournament.knockout;
      knockout = propagateGroupsToR32(knockout, newGroupState);
      knockout = propagateKnockout(knockout);

      return {
        tournament: { ...newGroupState, knockout },
        isDirty: true,
      };
    });
  },

  markGroupMatchPlayed: (groupId, matchId, played) => {
    if (get().isReadOnly) return;
    set(state => {
      const groups = { ...state.tournament.groups };
      const group = groups[groupId];
      if (!group) return state;
      const matches = group.matches.map(m => m.id === matchId ? { ...m, played } : m);
      const teamIds = GROUPS.find(g => g.id === groupId)!.teams.map(t => t.id);
      const standings = calculateGroupStandings(teamIds, matches);
      groups[groupId] = { ...group, matches, standings };
      const newGroupState = { ...state.tournament, groups };
      let knockout = propagateGroupsToR32(state.tournament.knockout, newGroupState);
      knockout = propagateKnockout(knockout);
      return { tournament: { ...newGroupState, knockout }, isDirty: true };
    });
  },

  updateKnockoutMatch: (matchNumber, scoreUpdate) => {
    if (get().isReadOnly) return;
    set(state => {
      const knockout = { ...state.tournament.knockout };
      const match = knockout[matchNumber];
      if (!match) return state;
      const newScore = { ...match.score, ...scoreUpdate };
      const played = isMatchComplete({ ...match, score: newScore });
      knockout[matchNumber] = { ...match, score: newScore, played };
      const propagated = propagateKnockout(knockout);
      return { tournament: { ...state.tournament, knockout: propagated }, isDirty: true };
    });
  },

  markKnockoutPlayed: (matchNumber, played) => {
    if (get().isReadOnly) return;
    set(state => {
      const knockout = { ...state.tournament.knockout };
      const match = knockout[matchNumber];
      if (!match) return state;
      knockout[matchNumber] = { ...match, played };
      const propagated = propagateKnockout(knockout);
      return { tournament: { ...state.tournament, knockout: propagated }, isDirty: true };
    });
  },

  loadState: (tournament) => set({ tournament, isDirty: false }),

  resetTournament: () => {
    if (get().isReadOnly) return;
    set({
      tournament: createInitialTournamentState(),
      isDirty: true,
    });
  },
}));
