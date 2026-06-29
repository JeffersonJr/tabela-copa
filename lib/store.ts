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

  const slotsAllowedGroups = [
    ['A', 'B', 'C', 'D', 'F'], // Match 4 (1E)
    ['C', 'D', 'F', 'G', 'H'], // Match 5 (1I)
    ['A', 'E', 'H', 'I', 'J'], // Match 6 (1G)
    ['B', 'E', 'F', 'I', 'J'], // Match 7 (1D)
    ['C', 'E', 'F', 'H', 'I'], // Match 11 (1A)
    ['E', 'H', 'I', 'J', 'K'], // Match 12 (1L)
    ['E', 'F', 'G', 'I', 'J'], // Match 13 (1B)
    ['D', 'E', 'I', 'J', 'L'], // Match 14 (1K)
  ];

  let assignedThirds: (string | null)[] = Array(8).fill(null);
  
  if (best8thirds.length === 8) {
    // Import the official FIFA Annex C mapping
    const { annexCMapping } = require('./annexC');
    
    // The keys in annexCMapping are the 8 group letters sorted alphabetically (e.g. 'BDEFIJKL')
    const sortedGroups = best8thirds.map(t => t.groupId).sort().join('');
    const assignment = annexCMapping[sortedGroups];
    
    if (assignment) {
      // We map the official assignments (which are group letters) back to the teamId.
      const teamForGroup = (grp: string) => best8thirds.find(t => t.groupId === grp)?.teamId ?? null;
      
      // The order of our assignedThirds matches the official match slots:
      // assignedThirds[0] -> Match 3 (1E)
      // assignedThirds[1] -> Match 4 (1I)
      // assignedThirds[2] -> Match 5 (1G)
      // assignedThirds[3] -> Match 6 (1D)
      // assignedThirds[4] -> Match 11 (1A)
      // assignedThirds[5] -> Match 12 (1L)
      // assignedThirds[6] -> Match 13 (1B)
      // assignedThirds[7] -> Match 14 (1K)
      assignedThirds[0] = teamForGroup(assignment['1E']);
      assignedThirds[1] = teamForGroup(assignment['1I']);
      assignedThirds[2] = teamForGroup(assignment['1G']);
      assignedThirds[3] = teamForGroup(assignment['1D']);
      assignedThirds[4] = teamForGroup(assignment['1A']);
      assignedThirds[5] = teamForGroup(assignment['1L']);
      assignedThirds[6] = teamForGroup(assignment['1B']);
      assignedThirds[7] = teamForGroup(assignment['1K']);
    } else {
      // Fallback if not found (shouldn't happen with 495 complete mappings)
      for (let i = 0; i < 8; i++) {
        assignedThirds[i] = best8thirds[i].teamId;
      }
    }
  } else {
    for (let i = 0; i < best8thirds.length; i++) {
      assignedThirds[i] = best8thirds[i].teamId;
    }
  }

  // R32 qualifications (official bracket mappings)
  setHome(1, q['A']?.second ?? null);   setAway(1, q['B']?.second ?? null);
  setHome(2, q['F']?.first ?? null);    setAway(2, q['C']?.second ?? null);
  setHome(3, q['E']?.first ?? null);    setAway(3, assignedThirds[0]);
  setHome(4, q['I']?.first ?? null);    setAway(4, assignedThirds[1]);
  setHome(5, q['G']?.first ?? null);    setAway(5, assignedThirds[2]);
  setHome(6, q['D']?.first ?? null);    setAway(6, assignedThirds[3]);
  setHome(7, q['H']?.first ?? null);    setAway(7, q['J']?.second ?? null);
  setHome(8, q['K']?.second ?? null);   setAway(8, q['L']?.second ?? null);
  setHome(9, q['C']?.first ?? null);    setAway(9, q['F']?.second ?? null);
  setHome(10, q['E']?.second ?? null);  setAway(10, q['I']?.second ?? null);
  setHome(11, q['A']?.first ?? null);   setAway(11, assignedThirds[4]);
  setHome(12, q['L']?.first ?? null);   setAway(12, assignedThirds[5]);
  setHome(13, q['B']?.first ?? null);   setAway(13, assignedThirds[6]);
  setHome(14, q['K']?.first ?? null);   setAway(14, assignedThirds[7]);
  setHome(15, q['D']?.second ?? null);  setAway(15, q['G']?.second ?? null);
  setHome(16, q['J']?.first ?? null);   setAway(16, q['H']?.second ?? null);

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
    set(state => {
      const groups = { ...state.tournament.groups };
      for (const groupId in groups) {
        const group = groups[groupId];
        const matches = group.matches.map(m => {
          if (m.score.isDefinitive) return m;
          return {
            ...m,
            played: false,
            score: {
              home: { first: null, second: null },
              away: { first: null, second: null },
              hasExtraTime: false,
              hasPenalties: false,
            }
          };
        });
        const teamIds = GROUPS.find(g => g.id === groupId)!.teams.map(t => t.id);
        const standings = calculateGroupStandings(teamIds, matches);
        groups[groupId] = { ...group, matches, standings };
      }

      let knockout = { ...state.tournament.knockout };
      for (const matchNum in knockout) {
        const m = knockout[matchNum];
        if (m.score.isDefinitive) continue;
        knockout[matchNum] = {
          ...m,
          played: false,
          score: {
            home: { first: null, second: null },
            away: { first: null, second: null },
            hasExtraTime: false,
            hasPenalties: false,
          }
        };
      }

      knockout = propagateGroupsToR32(knockout, { ...state.tournament, groups });
      knockout = propagateKnockout(knockout);

      return {
        tournament: { ...state.tournament, groups, knockout },
        isDirty: true,
      };
    });
  },
}));
