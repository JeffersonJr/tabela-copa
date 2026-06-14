'use client';
import { useState, useMemo } from 'react';
import { KnockoutMatch } from '@/lib/types';
import { getFinalScore, getWinner } from '@/lib/tournament';
import { TEAMS_MAP } from '@/data/teams';
import { useTournamentStore } from '@/lib/store';
import TeamFlag from '@/components/TeamFlag';
import MatchModal from '@/components/MatchModal';

const ROUND_TABS = [
  { id: 'r32', label: '16-Avos' },
  { id: 'r16', label: 'Oitavas' },
  { id: 'qf', label: 'Quartas' },
  { id: 'sf', label: 'Semifinal' },
  { id: 'finais', label: 'Finais' },
];

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
      style={{ cursor: canPlay ? 'pointer' : 'default', opacity: canPlay ? 1 : 0.6, width: '100%', maxWidth: '360px', margin: 0 }}
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
  const [activeTab, setActiveTab] = useState<string>('r32');

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

  const displayMatches = useMemo(() => {
    if (activeTab === 'finais') {
      return [...(roundGroups['third'] || []), ...(roundGroups['final'] || [])];
    }
    return roundGroups[activeTab] || [];
  }, [activeTab, roundGroups]);

  return (
    <div className="animate-fadeIn">
      {/* Sub-Tabs for Knockout Rounds */}
      <div className="tabs" role="tablist" style={{ overflowX: 'auto', maxWidth: '100%', display: 'flex', gap: 4, paddingBottom: 4, marginBottom: 24, border: 'none', background: 'transparent' }}>
        {ROUND_TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ flexShrink: 0, padding: '8px 16px', border: '1px solid var(--border)', background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {displayMatches.map(match => (
          <div key={match.matchNumber} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <BracketMatchCard match={match} onOpen={setOpenMatchNum} />
          </div>
        ))}
      </div>

      {/* Score Modal */}
      {openMatch && (
        <MatchModal
          match={openMatch}
          roundLabel={openMatch.round === 'third' ? '3º Lugar' : openMatch.round === 'final' ? 'Final' : `Jogo ${openMatch.matchNumber}`}
          onUpdate={(score) => updateKnockoutMatch(openMatch.matchNumber, score)}
          onClose={() => setOpenMatchNum(null)}
        />
      )}
    </div>
  );
}
