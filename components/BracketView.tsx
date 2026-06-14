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

function Podium({ tournament }: { tournament: any }) {
  const thirdM = Object.values(tournament.knockout).find((m: any) => m.round === 'third') as KnockoutMatch | undefined;
  const finalM = Object.values(tournament.knockout).find((m: any) => m.round === 'final') as KnockoutMatch | undefined;

  let firstId = null;
  let secondId = null;
  let thirdId = null;

  if (finalM && finalM.played) {
    firstId = getWinner(finalM);
    secondId = firstId === finalM.homeTeamId ? finalM.awayTeamId : finalM.homeTeamId;
  }
  
  if (thirdM && thirdM.played) {
    thirdId = getWinner(thirdM);
  }

  const renderStep = (teamId: string | null, height: number, color: string, icon: string) => {
    const team = teamId ? TEAMS_MAP[teamId] : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', justifyContent: 'flex-end' }}>
        {team ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
            <TeamFlag flagCode={team.flag} teamName={team.name} size="md" />
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>{team.shortName}</span>
          </div>
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', marginBottom: 8, opacity: 0.5 }} />
        )}
        <div style={{ 
          width: '100%', 
          height, 
          background: color, 
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: 8,
          fontSize: '1.5rem',
          color: '#fff',
          fontWeight: 'bold',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
        }}>
          {icon}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 32, padding: 24, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
      <h3 style={{ textAlign: 'center', marginBottom: 32, fontSize: '1.25rem', fontWeight: 800 }}>Pódio</h3>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8, height: 160 }}>
        {renderStep(secondId, 100, '#C0C0C0', '🥈')}
        {renderStep(firstId, 140, '#FFD700', '🏆')}
        {renderStep(thirdId, 70, '#CD7F32', '🥉')}
      </div>
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

      {activeTab === 'finais' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {displayMatches.map(match => (
              <div key={match.matchNumber} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ marginBottom: 12, fontSize: '1rem', color: match.round === 'final' ? '#FFD700' : '#CD7F32', fontWeight: 'bold' }}>
                  {match.round === 'final' ? '🏆 Grande Final' : '🥉 Disputa do 3º Lugar'}
                </h3>
                <BracketMatchCard match={match} onOpen={setOpenMatchNum} />
              </div>
            ))}
          </div>
          <Podium tournament={tournament} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {displayMatches.map(match => (
            <div key={match.matchNumber} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <BracketMatchCard match={match} onOpen={setOpenMatchNum} />
            </div>
          ))}
        </div>
      )}

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
