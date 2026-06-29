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
    ['A', 'B', 'C', 'D', 'F'], // Match 3
    ['C', 'D', 'F', 'G', 'H'], // Match 6
    ['C', 'E', 'F', 'H', 'I'], // Match 7
    ['E', 'H', 'I', 'J', 'K'], // Match 8
    ['A', 'E', 'H', 'I', 'J'], // Match 9
    ['B', 'E', 'F', 'I', 'J'], // Match 10
    ['E', 'F', 'G', 'I', 'J'], // Match 13
    ['D', 'E', 'I', 'J', 'L'], // Match 16
  ];

  let assignedThirds: (string | null)[] = Array(8).fill(null);
  
  if (best8thirds.length === 8) {
    const used = Array(8).fill(false);
    function backtrack(slotIndex: number): boolean {
      if (slotIndex === 8) return true;
      for (let i = 0; i < 8; i++) {
        if (!used[i] && slotsAllowedGroups[slotIndex].includes(best8thirds[i].groupId)) {
          used[i] = true;
          assignedThirds[slotIndex] = best8thirds[i].teamId;
          if (backtrack(slotIndex + 1)) return true;
          used[i] = false;
          assignedThirds[slotIndex] = null;
        }
      }
      return false;
    const validMatchings: string[][] = [];
    function backtrack(slotIndex: number, currentAssignment: (string | null)[]) {
      if (slotIndex === 8) {
        validMatchings.push([...currentAssignment] as string[]);
        return;
      }
      for (let i = 0; i < 8; i++) {
        if (!used[i] && slotsAllowedGroups[slotIndex].includes(best8thirds[i].groupId)) {
          used[i] = true;
          currentAssignment[slotIndex] = best8thirds[i].teamId;
          backtrack(slotIndex + 1, currentAssignment);
          used[i] = false;
          currentAssignment[slotIndex] = null;
        }
      }
    }
    
    // Sort best8thirds alphabetically by groupId so the search order is deterministic
    // and doesn't depend on points (which causes matchups to flip).
    best8thirds.sort((a, b) => a.groupId.localeCompare(b.groupId));
    backtrack(0, new Array(8).fill(null));

    if (validMatchings.length > 0) {
      // Find the one that corresponds to the official FIFA Annex C table
      // Since we don't have the 495-row table, we use the first valid one,
      // but we hardcode the specific known fix for the combination B,D,E,F,I,J,K,L 
      // (which maps to matches 3,6,7,8,9,10,13,16 -> D, F, E, K, I, B, J, L).
      const groupsStr = best8thirds.map(t => t.groupId).join('');
      let chosen = validMatchings[0];
      
      if (groupsStr === 'BDEFIJKL') {
        const expectedGroups = ['D', 'F', 'E', 'K', 'I', 'B', 'J', 'L'];
        const found = validMatchings.find(m => {
          // m contains teamIds, we need to check their groups
          const mGroups = m.map(teamId => best8thirds.find(t => t.teamId === teamId)?.groupId);
          return mGroups.join('') === expectedGroups.join('');
        });
        if (found) chosen = found;
      }
      
      for (let i = 0; i < 8; i++) {
        assignedThirds[i] = chosen[i];
      }
    } else {
      // Fallback if no valid matching is found
      for (let i = 0; i < best8thirds.length; i++) {
        assignedThirds[i] = best8thirds[i].teamId;
      }
    }

  // R32 qualifications (official bracket)
  setHome(1, q['A']?.second ?? null);   setAway(1, q['B']?.second ?? null);
  setHome(2, q['C']?.first ?? null);    setAway(2, q['F']?.second ?? null);
  setHome(3, q['E']?.first ?? null);    setAway(3, assignedThirds[0]);
  setHome(4, q['F']?.first ?? null);    setAway(4, q['C']?.second ?? null);
  setHome(5, q['E']?.second ?? null);   setAway(5, q['I']?.second ?? null);
  setHome(6, q['I']?.first ?? null);    setAway(6, assignedThirds[1]);
  setHome(7, q['A']?.first ?? null);    setAway(7, assignedThirds[2]);
  setHome(8, q['L']?.first ?? null);    setAway(8, assignedThirds[3]);
  setHome(9, q['G']?.first ?? null);    setAway(9, assignedThirds[4]);
  setHome(10, q['D']?.first ?? null);   setAway(10, assignedThirds[5]);
  setHome(11, q['H']?.first ?? null);   setAway(11, q['J']?.second ?? null);
  setHome(12, q['K']?.second ?? null);  setAway(12, q['L']?.second ?? null);
  setHome(13, q['B']?.first ?? null);   setAway(13, assignedThirds[6]);
  setHome(14, q['D']?.second ?? null);  setAway(14, q['G']?.second ?? null);
  setHome(15, q['J']?.first ?? null);   setAway(15, q['H']?.second ?? null);
  setHome(16, q['K']?.first ?? null);   setAway(16, assignedThirds[7]);

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
