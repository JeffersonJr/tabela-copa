import { Match, GroupStanding, GroupState, MatchScore, KnockoutMatch, TournamentState } from './types';
import GROUPS from '../data/teams';
import { GROUP_MATCHES_SCHEDULE } from './schedule';

// ────────────────────────────────────────────────────────────────────────────
// Score Helpers
// ────────────────────────────────────────────────────────────────────────────

export function getFinalScore(score: MatchScore): { home: number; away: number } {
  const homeFirst = score.home.first ?? 0;
  const homeSecond = score.home.second ?? 0;
  const awayFirst = score.away.first ?? 0;
  const awaySecond = score.away.second ?? 0;

  let home = homeFirst + homeSecond;
  let away = awayFirst + awaySecond;

  if (score.hasExtraTime && score.extraTime) {
    home += score.extraTime.home;
    away += score.extraTime.away;
  }

  return { home, away };
}

export function getWinner(match: Match): string | null {
  if (!match.played) return null;
  if (!match.homeTeamId || !match.awayTeamId) return null;

  const { home, away } = getFinalScore(match.score);

  if (match.score.hasPenalties && match.score.penalties) {
    if (match.score.penalties.home > match.score.penalties.away) return match.homeTeamId;
    if (match.score.penalties.away > match.score.penalties.home) return match.awayTeamId;
    return null;
  }

  if (home > away) return match.homeTeamId;
  if (away > home) return match.awayTeamId;
  return null; // Draw (only in group stage)
}

export function isMatchComplete(match: Match): boolean {
  const s = match.score;
  if (s.home.first === null || s.home.second === null) return false;
  if (s.away.first === null || s.away.second === null) return false;
  if (s.hasExtraTime && !s.extraTime) return false;
  if (s.hasPenalties && !s.penalties) return false;
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Group Stage
// ────────────────────────────────────────────────────────────────────────────

export function calculateGroupStandings(teamIds: string[], matches: Match[]): GroupStanding[] {
  const standings: Record<string, GroupStanding> = {};
  teamIds.forEach(id => {
    standings[id] = { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
  });

  for (const match of matches) {
    if (!match.played || !match.homeTeamId || !match.awayTeamId) continue;

    const { home, away } = getFinalScore(match.score);
    const hs = standings[match.homeTeamId];
    const as_ = standings[match.awayTeamId];
    if (!hs || !as_) continue;

    hs.played++;
    as_.played++;
    hs.goalsFor += home;
    hs.goalsAgainst += away;
    as_.goalsFor += away;
    as_.goalsAgainst += home;

    if (home > away) { hs.won++; hs.points += 3; as_.lost++; }
    else if (away > home) { as_.won++; as_.points += 3; hs.lost++; }
    else { hs.drawn++; hs.points += 1; as_.drawn++; as_.points += 1; }
  }

  Object.values(standings).forEach(s => { s.goalDiff = s.goalsFor - s.goalsAgainst; });

  const getH2HStats = (tiedTeams: string[]) => {
    const h2h: Record<string, { points: number, goalDiff: number, goalsFor: number }> = {};
    tiedTeams.forEach(id => h2h[id] = { points: 0, goalDiff: 0, goalsFor: 0 });

    for (const match of matches) {
      if (!match.played || !match.homeTeamId || !match.awayTeamId) continue;
      if (tiedTeams.includes(match.homeTeamId) && tiedTeams.includes(match.awayTeamId)) {
        const { home, away } = getFinalScore(match.score);
        h2h[match.homeTeamId].goalsFor += home;
        h2h[match.homeTeamId].goalDiff += (home - away);
        h2h[match.awayTeamId].goalsFor += away;
        h2h[match.awayTeamId].goalDiff += (away - home);

        if (home > away) h2h[match.homeTeamId].points += 3;
        else if (away > home) h2h[match.awayTeamId].points += 3;
        else { h2h[match.homeTeamId].points += 1; h2h[match.awayTeamId].points += 1; }
      }
    }
    return h2h;
  };

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    // Head-to-head
    const h2h = getH2HStats([a.teamId, b.teamId]);
    if (h2h[b.teamId].points !== h2h[a.teamId].points) return h2h[b.teamId].points - h2h[a.teamId].points;
    if (h2h[b.teamId].goalDiff !== h2h[a.teamId].goalDiff) return h2h[b.teamId].goalDiff - h2h[a.teamId].goalDiff;
    if (h2h[b.teamId].goalsFor !== h2h[a.teamId].goalsFor) return h2h[b.teamId].goalsFor - h2h[a.teamId].goalsFor;

    return a.teamId.localeCompare(b.teamId);
  });
}

// Generate all 6 matches for a group using the predefined schedule
export function generateGroupMatches(groupId: string, teamIds: string[]): Match[] {
  const matches: Match[] = [];
  const schedule = GROUP_MATCHES_SCHEDULE[groupId];
  
  if (!schedule) {
    // Fallback if no schedule is found
    let idx = 0;
    const matchdays = [[0, 3], [1, 2], [0, 1], [2, 3], [0, 2], [1, 3]];
    for (const [a, b] of matchdays) {
      matches.push({
        id: `${groupId}-${idx++}`,
        groupId,
        matchday: Math.floor(idx / 2),
        homeTeamId: teamIds[a],
        awayTeamId: teamIds[b],
        played: false,
        score: { home: { first: null, second: null }, away: { first: null, second: null }, hasExtraTime: false, hasPenalties: false },
      });
    }
    return matches;
  }

  let idx = 0;
  for (const sm of schedule) {
    matches.push({
      id: `${groupId}-${idx++}`,
      groupId,
      matchday: Math.floor(idx / 2),
      homeTeamId: sm.home,
      awayTeamId: sm.away,
      date: sm.date,
      time: sm.time,
      location: sm.location,
      played: false,
      score: { home: { first: null, second: null }, away: { first: null, second: null }, hasExtraTime: false, hasPenalties: false },
    });
  }
  return matches;
}

// ────────────────────────────────────────────────────────────────────────────
// Best Third-Place Teams
// ────────────────────────────────────────────────────────────────────────────

export function getAllThirds(groups: Record<string, GroupState>): { teamId: string; groupId: string; standing: GroupStanding }[] {
  const thirds: { standing: GroupStanding; groupId: string }[] = [];

  for (const group of Object.values(groups)) {
    if (group.standings.length >= 3) {
      thirds.push({ standing: group.standings[2], groupId: group.id });
    }
  }

  // Sort same as group standings but among all thirds
  thirds.sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    if (b.standing.goalDiff !== a.standing.goalDiff) return b.standing.goalDiff - a.standing.goalDiff;
    if (b.standing.goalsFor !== a.standing.goalsFor) return b.standing.goalsFor - a.standing.goalsFor;
    return 0;
  });

  return thirds.map(s => ({ teamId: s.standing.teamId, groupId: s.groupId, standing: s.standing }));
}

export function getBestThirds(groups: Record<string, GroupState>): { teamId: string; groupId: string }[] {
  return getAllThirds(groups).slice(0, 8).map(t => ({ teamId: t.teamId, groupId: t.groupId }));
}

// ────────────────────────────────────────────────────────────────────────────
// Initial Tournament State
// ────────────────────────────────────────────────────────────────────────────

export function createInitialGroupState(): Record<string, GroupState> {
  const groups: Record<string, GroupState> = {};

  for (const group of GROUPS) {
    const teamIds = group.teams.map(t => t.id);
    const matches = generateGroupMatches(group.id, teamIds);
    groups[group.id] = {
      id: group.id,
      matches,
      standings: calculateGroupStandings(teamIds, matches),
    };
  }

  return groups;
}

// Round of 32 bracket definition (official FIFA 2026 bracket)
// homeLabel / awayLabel are shown before qualification is determined
export function createKnockoutBracket(): Record<number, KnockoutMatch> {
  const r32: Partial<KnockoutMatch>[] = [
    // Left half of bracket
    { matchNumber: 1, homeLabel: '1º Grupo E', awayLabel: '7º dos 3º Colocados' },
    { matchNumber: 2, homeLabel: '1º Grupo I', awayLabel: '2º dos 3º Colocados' },
    { matchNumber: 3, homeLabel: '2º Grupo A', awayLabel: '2º Grupo B' },
    { matchNumber: 4, homeLabel: '1º Grupo F', awayLabel: '2º Grupo C' },
    { matchNumber: 5, homeLabel: '2º Grupo K', awayLabel: '2º Grupo L' },
    { matchNumber: 6, homeLabel: '1º Grupo H', awayLabel: '2º Grupo J' },
    { matchNumber: 7, homeLabel: '1º Grupo D', awayLabel: '5º dos 3º Colocados' },
    { matchNumber: 8, homeLabel: '1º Grupo G', awayLabel: '8º dos 3º Colocados' },
    
    // Right half of bracket
    { matchNumber: 9, homeLabel: '1º Grupo C', awayLabel: '2º Grupo F' },
    { matchNumber: 10, homeLabel: '2º Grupo E', awayLabel: '2º Grupo I' },
    { matchNumber: 11, homeLabel: '1º Grupo A', awayLabel: '3º dos 3º Colocados' },
    { matchNumber: 12, homeLabel: '1º Grupo L', awayLabel: '1º dos 3º Colocados' },
    { matchNumber: 13, homeLabel: '1º Grupo J', awayLabel: '2º Grupo H' },
    { matchNumber: 14, homeLabel: '2º Grupo D', awayLabel: '2º Grupo G' },
    { matchNumber: 15, homeLabel: '1º Grupo B', awayLabel: '6º dos 3º Colocados' },
    { matchNumber: 16, homeLabel: '1º Grupo K', awayLabel: '4º dos 3º Colocados' },
  ];

  // R16 matches (winners of R32 matches)
  // Based on official bracket seeding
  const r16: Partial<KnockoutMatch>[] = [
    { matchNumber: 17, homeFromMatch: 1, awayFromMatch: 2, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J1', awayLabel: 'Vencedor J2' },
    { matchNumber: 18, homeFromMatch: 3, awayFromMatch: 4, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J3', awayLabel: 'Vencedor J4' },
    { matchNumber: 19, homeFromMatch: 5, awayFromMatch: 6, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J5', awayLabel: 'Vencedor J6' },
    { matchNumber: 20, homeFromMatch: 7, awayFromMatch: 8, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J7', awayLabel: 'Vencedor J8' },
    { matchNumber: 21, homeFromMatch: 9, awayFromMatch: 10, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J9', awayLabel: 'Vencedor J10' },
    { matchNumber: 22, homeFromMatch: 11, awayFromMatch: 12, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J11', awayLabel: 'Vencedor J12' },
    { matchNumber: 23, homeFromMatch: 13, awayFromMatch: 14, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J13', awayLabel: 'Vencedor J14' },
    { matchNumber: 24, homeFromMatch: 15, awayFromMatch: 16, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J15', awayLabel: 'Vencedor J16' },
  ];

  // QF
  const qf: Partial<KnockoutMatch>[] = [
    { matchNumber: 25, homeFromMatch: 17, awayFromMatch: 18, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J17', awayLabel: 'Vencedor J18' },
    { matchNumber: 26, homeFromMatch: 19, awayFromMatch: 20, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J19', awayLabel: 'Vencedor J20' },
    { matchNumber: 27, homeFromMatch: 21, awayFromMatch: 22, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J21', awayLabel: 'Vencedor J22' },
    { matchNumber: 28, homeFromMatch: 23, awayFromMatch: 24, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J23', awayLabel: 'Vencedor J24' },
  ];

  // SF
  const sf: Partial<KnockoutMatch>[] = [
    { matchNumber: 29, homeFromMatch: 25, awayFromMatch: 26, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J25', awayLabel: 'Vencedor J26' },
    { matchNumber: 30, homeFromMatch: 27, awayFromMatch: 28, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor J27', awayLabel: 'Vencedor J28' },
  ];

  // Third place
  const third: Partial<KnockoutMatch>[] = [
    { matchNumber: 31, homeFromMatch: 29, awayFromMatch: 30, homeFromWinner: false, awayFromWinner: false, homeLabel: 'Perdedor SF1', awayLabel: 'Perdedor SF2' },
  ];

  // Final
  const final_: Partial<KnockoutMatch>[] = [
    { matchNumber: 32, homeFromMatch: 29, awayFromMatch: 30, homeFromWinner: true, awayFromWinner: true, homeLabel: 'Vencedor SF1', awayLabel: 'Vencedor SF2' },
  ];

  const roundMap: Record<number, KnockoutMatch['round']> = {
    1: 'r32', 2: 'r32', 3: 'r32', 4: 'r32', 5: 'r32', 6: 'r32', 7: 'r32', 8: 'r32',
    9: 'r32', 10: 'r32', 11: 'r32', 12: 'r32', 13: 'r32', 14: 'r32', 15: 'r32', 16: 'r32',
    17: 'r16', 18: 'r16', 19: 'r16', 20: 'r16', 21: 'r16', 22: 'r16', 23: 'r16', 24: 'r16',
    25: 'qf', 26: 'qf', 27: 'qf', 28: 'qf',
    29: 'sf', 30: 'sf',
    31: 'third',
    32: 'final',
  };

  const result: Record<number, KnockoutMatch> = {};
  const allMatches = [...r32, ...r16, ...qf, ...sf, ...third, ...final_];

  for (const m of allMatches) {
    const num = m.matchNumber!;
    result[num] = {
      id: `knockout-${num}`,
      matchNumber: num,
      round: roundMap[num],
      homeTeamId: null,
      awayTeamId: null,
      played: false,
      score: {
        home: { first: null, second: null },
        away: { first: null, second: null },
        hasExtraTime: false,
        hasPenalties: false,
      },
      ...m,
    } as KnockoutMatch;
  }

  return result;
}

export function createInitialTournamentState(): TournamentState {
  return {
    version: 1,
    groups: createInitialGroupState(),
    knockout: createKnockoutBracket(),
    bestThirds: [],
  };
}
