'use client';
import { useState, useMemo } from 'react';
import { KnockoutMatch } from '@/lib/types';
import { getFinalScore, getWinner } from '@/lib/tournament';
import { TEAMS_MAP } from '@/data/teams';
import { useTournamentStore } from '@/lib/store';
import TeamFlag from '@/components/TeamFlag';
import MatchModal from '@/components/MatchModal';

const ROUND_LABELS: Record<string, string> = {
  r32: 'Oitavas de Final',
  r16: 'Décimo-sexto',
  qf: 'Quartas de Final',
  sf: 'Semifinal',
  third: '3° Lugar',
  final: 'Final',
};

const ROUND_ORDER: KnockoutMatch['round'][] = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];

interface BracketTeamRowProps {
  teamId: string | null;
  label?: string;
  score: number | null;
  isWinner: boolean;
  isPlayed: boolean;
}

function BracketTeamRow({ teamId, label, score, isWinner, isPlayed }: BracketTeamRowProps) {
  const team = teamId ? TEAMS_MAP[teamId] : null;
  return (
    <div className={`bracket-team-row ${isPlayed ? (isWinner ? 'winner' : 'loser') : ''}`}>
      {team ? (
        <>
          <TeamFlag flagCode={team.flag} teamName={team.name} size="sm" />
          <span className="bracket-team-name">{team.shortName}</span>
        </>
      ) : (
        <span className="bracket-team-name pending">{label ?? '?'}</span>
      )}
      <span className={`bracket-score ${!isPlayed || score === null ? 'pending' : ''}`}>
        {isPlayed && score !== null ? score : '–'}
      </span>
    </div>
  );
}

interface BracketMatchCardProps {
  match: KnockoutMatch;
  onOpen: (matchNumber: number) => void;
}

function BracketMatchCard({ match, onOpen }: BracketMatchCardProps) {
  const total = getFinalScore(match.score);
  const winner = getWinner(match);
  const canPlay = !!(match.homeTeamId && match.awayTeamId);

  return (
    <div
      className={`bracket-match ${match.played ? 'active' : ''}`}
      onClick={() => canPlay && onOpen(match.matchNumber)}
      style={{ cursor: canPlay ? 'pointer' : 'default', opacity: canPlay ? 1 : 0.6 }}
      title={canPlay ? 'Clique para inserir placar' : 'Aguardando resultado anterior'}
    >
      <div className="bracket-match-num">J{match.matchNumber}</div>
      <BracketTeamRow
        teamId={match.homeTeamId}
        label={match.homeLabel}
        score={match.played ? total.home : null}
        isWinner={match.played && winner === match.homeTeamId}
        isPlayed={match.played}
      />
      <BracketTeamRow
        teamId={match.awayTeamId}
        label={match.awayLabel}
        score={match.played ? total.away : null}
        isWinner={match.played && winner === match.awayTeamId}
        isPlayed={match.played}
      />
      {match.played && match.score.hasPenalties && match.score.penalties && (
        <div style={{ padding: '3px 10px', fontSize: '0.6rem', color: 'var(--blue)', fontWeight: 600, borderTop: '1px solid var(--border-subtle)' }}>
          ({match.score.penalties.home}–{match.score.penalties.away} pen)
        </div>
      )}
    </div>
  );
}

export default function BracketView() {
  const { tournament, updateKnockoutMatch } = useTournamentStore();
  const [openMatchNum, setOpenMatchNum] = useState<number | null>(null);

  const openMatch = openMatchNum !== null ? tournament.knockout[openMatchNum] : null;

  // Group matches by round
  const roundGroups = useMemo(() => {
    const groups: Record<string, KnockoutMatch[]> = {};
    for (const match of Object.values(tournament.knockout)) {
      const round = match.round;
      if (!groups[round]) groups[round] = [];
      groups[round].push(match);
    }
    // Sort each round by match number
    for (const round of Object.keys(groups)) {
      groups[round].sort((a, b) => a.matchNumber - b.matchNumber);
    }
    return groups;
  }, [tournament.knockout]);

  // Calculate vertical spacing for each round
  // R32: 16 matches, R16: 8, QF: 4, SF: 2, THIRD+FINAL: 1 each
  const roundHeights: Record<string, number> = {
    r32: 80,
    r16: 160,
    qf: 320,
    sf: 640,
    third: 80,
    final: 80,
  };

  return (
    <div className="bracket-scroll">
      <div className="bracket-container">
        {ROUND_ORDER.map(round => {
          const matches = roundGroups[round] ?? [];
          if (matches.length === 0) return null;

          const gap = roundHeights[round] ?? 80;

          return (
            <div key={round} className="bracket-round">
              <div className="bracket-round-header">{ROUND_LABELS[round]}</div>
              <div className="bracket-matches" style={{ gap: round === 'third' ? 8 : 0 }}>
                {matches.map((match, i) => (
                  <div key={match.matchNumber} style={{
                    paddingTop: i === 0 && round !== 'r32' ? `${gap / 4}px` : `${gap / 2}px`,
                    paddingBottom: i === matches.length - 1 && round !== 'r32' ? `${gap / 4}px` : 0,
                  }}>
                    <BracketMatchCard match={match} onOpen={setOpenMatchNum} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score Modal */}
      {openMatch && (
        <MatchModal
          match={openMatch}
          roundLabel={`${ROUND_LABELS[openMatch.round]} — Jogo ${openMatch.matchNumber}`}
          onUpdate={(score) => updateKnockoutMatch(openMatch.matchNumber, score)}
          onClose={() => setOpenMatchNum(null)}
        />
      )}
    </div>
  );
}
