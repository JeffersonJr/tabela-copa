'use client';
import { useState } from 'react';
import { GroupState } from '@/lib/types';
import { getFinalScore, getWinner } from '@/lib/tournament';
import { TEAMS_MAP } from '@/data/teams';
import { useTournamentStore } from '@/lib/store';
import TeamFlag from '@/components/TeamFlag';
import MatchModal from '@/components/MatchModal';
import GROUPS from '@/data/teams';

interface GroupCardProps {
  groupId: string;
  groupState: GroupState;
}

export default function GroupCard({ groupId, groupState }: GroupCardProps) {
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const { updateGroupMatch } = useTournamentStore();
  const group = GROUPS.find(g => g.id === groupId)!;

  const playedCount = groupState.matches.filter(m => m.played).length;
  const totalCount = groupState.matches.length;
  const openMatch = openMatchId ? groupState.matches.find(m => m.id === openMatchId) : null;

  // Group matches by matchday
  const matchdays: Record<number, typeof groupState.matches> = {};
  for (const m of groupState.matches) {
    const d = m.matchday ?? 1;
    if (!matchdays[d]) matchdays[d] = [];
    matchdays[d].push(m);
  }

  return (
    <>
      <div className="group-card animate-fadeIn">
        {/* Header */}
        <div className="group-header">
          <span className="group-name">Grupo {groupId}</span>
          <span className="group-progress">{playedCount}/{totalCount} jogos</span>
        </div>

        {/* Standings */}
        <div className="standings">
          <div className="standings-header">
            <span style={{ paddingLeft: 22 }}>Seleção</span>
            <span>J</span>
            <span>V</span>
            <span>E</span>
            <span>D</span>
            <span>SG</span>
            <span>Pts</span>
          </div>
          {groupState.standings.map((s, i) => {
            const team = TEAMS_MAP[s.teamId];
            const cls = i < 2 ? 'qualify' : i === 2 ? 'qualify-3' : '';
            return (
              <div key={s.teamId} className={`standings-row ${cls}`}>
                <div className="standings-team">
                  <span className="standings-rank">{i + 1}</span>
                  {team && <TeamFlag flagCode={team.flag} teamName={team.name} size="sm" />}
                  <span className="standings-name">{team?.shortName ?? s.teamId}</span>
                </div>
                <span className="standings-col">{s.played}</span>
                <span className="standings-col">{s.won}</span>
                <span className="standings-col">{s.drawn}</span>
                <span className="standings-col">{s.lost}</span>
                <span className="standings-col">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</span>
                <span className="standings-col pts">{s.points}</span>
              </div>
            );
          })}
        </div>

        {/* Matches */}
        <div className="matches-section">
          {Object.entries(matchdays)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([day, matches]) => (
              <div key={day}>
                <div className="matchday-label">Rodada {day}</div>
                {matches.map(match => {
                  const home = TEAMS_MAP[match.homeTeamId!];
                  const away = TEAMS_MAP[match.awayTeamId!];
                  const total = getFinalScore(match.score);
                  const winner = getWinner(match);
                  const isPlayed = match.played;

                  return (
                    <div
                      key={match.id}
                      className="match-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenMatchId(match.id)}
                    >
                      <div className="match-teams">
                        {/* Home Team */}
                        <div className="match-team">
                          {home && <TeamFlag flagCode={home.flag} teamName={home.name} size="sm" />}
                          <span className={`match-team-name ${isPlayed ? (winner === match.homeTeamId ? 'winner' : winner ? 'loser' : '') : ''}`}>
                            {home?.shortName ?? match.homeTeamId}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="match-score-center">
                          {isPlayed ? (
                            <>
                              <span className="match-total-score played">
                                <span>{total.home}</span>
                                <span className="match-score-sep">–</span>
                                <span>{total.away}</span>
                              </span>
                              {match.score.hasPenalties && match.score.penalties && (
                                <span style={{ fontSize: '0.6rem', color: 'var(--blue)', fontWeight: 600 }}>
                                  ({match.score.penalties.home}–{match.score.penalties.away} pen)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="match-total-score unplayed">
                              <span style={{ fontSize: '0.75rem' }}>vs</span>
                            </span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="match-team away">
                          {away && <TeamFlag flagCode={away.flag} teamName={away.name} size="sm" />}
                          <span className={`match-team-name ${isPlayed ? (winner === match.awayTeamId ? 'winner' : winner ? 'loser' : '') : ''}`}>
                            {away?.shortName ?? match.awayTeamId}
                          </span>
                        </div>
                      </div>

                      {/* Score detail */}
                      {isPlayed && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            <span>{match.score.home.first ?? 0}–{match.score.away.first ?? 0} (1T)</span>
                            <span>·</span>
                            <span>{match.score.home.second ?? 0}–{match.score.away.second ?? 0} (2T)</span>
                          </div>
                          <span style={{ 
                            fontSize: '0.6rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: match.score.isDefinitive ? '#ff444420' : 'var(--accent-light)',
                            color: match.score.isDefinitive ? '#ff4444' : 'var(--accent)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            lineHeight: 1
                          }}>
                            {match.score.isDefinitive ? 'Oficial' : 'Palpite'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>

      {/* Match Modal */}
      {openMatch && (
        <MatchModal
          match={openMatch}
          roundLabel={`Grupo ${groupId} — Rodada ${openMatch.matchday}`}
          onUpdate={(score) => updateGroupMatch(groupId, openMatch.id, score)}
          onClose={() => setOpenMatchId(null)}
        />
      )}
    </>
  );
}
