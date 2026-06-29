'use client';
import { useState, useMemo } from 'react';
import { KnockoutMatch } from '@/lib/types';
import { getFinalScore, getWinner } from '@/lib/tournament';
import { TEAMS_MAP } from '@/data/teams';
import { useTournamentStore } from '@/lib/store';
import TeamFlag from '@/components/TeamFlag';
import MatchModal from '@/components/MatchModal';



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
  variant?: 'compact' | 'default';
}

function BracketMatchCard({ match, onOpen, variant = 'default' }: BracketMatchCardProps) {
  const total = getFinalScore(match.score);
  const winner = getWinner(match);
  const canPlay = !!(match.homeTeamId && match.awayTeamId);
  const compactClass = variant === 'compact' ? 'compact' : '';

  return (
    <div
      className={`bracket-match ${match.played ? 'active' : ''} ${compactClass}`}
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
      {match.played && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', borderTop: '1px solid var(--border-subtle)', gap: 4 }}>
          {match.score.hasPenalties && match.score.penalties && (
            <span style={{ fontSize: '0.6rem', color: 'var(--blue)', fontWeight: 600 }}>
              ({match.score.penalties.home}–{match.score.penalties.away} pen)
            </span>
          )}
          <span style={{ 
            fontSize: '0.55rem', 
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

  const openMatch = openMatchNum !== null ? tournament.knockout[openMatchNum] : null;

  // Group matches by round
  const roundGroups = useMemo(() => {
    const groups: Record<string, KnockoutMatch[]> = {};
    for (const match of Object.values(tournament.knockout)) {
      const round = match.round;
      if (!groups[round]) groups[round] = [];
      groups[round].push(match);
    }
    for (const round of Object.keys(groups)) {
      groups[round].sort((a, b) => a.matchNumber - b.matchNumber);
    }
    return groups;
  }, [tournament.knockout]);

  const r32 = roundGroups['r32'] || [];
  const r16 = roundGroups['r16'] || [];
  const qf = roundGroups['qf'] || [];
  const sf = roundGroups['sf'] || [];
  
  // Left side
  const r32_left = r32.slice(0, 8);
  const r16_left = r16.slice(0, 4);
  const qf_left = qf.slice(0, 2);
  const sf_left = sf.slice(0, 1);
  
  // Right side
  const r32_right = r32.slice(8, 16);
  const r16_right = r16.slice(4, 8);
  const qf_right = qf.slice(2, 4);
  const sf_right = sf.slice(1, 2);

  const thirdPlace = roundGroups['third']?.[0];
  const finalMatch = roundGroups['final']?.[0];

  return (
    <div className="animate-fadeIn" style={{ width: '100%' }}>
      <div className="bracket-wrapper">
        <div className="bracket-container">
          {/* Lado Esquerdo */}
          <div className="bracket-half-left" style={{ display: 'flex', gap: 20 }}>
            <div className="bracket-col">
              {r32_left.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
            <div className="bracket-col">
              {r16_left.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
            <div className="bracket-col">
              {qf_left.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
            <div className="bracket-col">
              {sf_left.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
          </div>

          {/* Centro (Finais e Pódio) */}
          <div className="bracket-center">
            {finalMatch && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h3 style={{ color: '#FFD700', fontSize: '1rem', marginBottom: 8, fontWeight: 'bold' }}>🏆 Grande Final</h3>
                <BracketMatchCard match={finalMatch} onOpen={setOpenMatchNum} />
              </div>
            )}
            
            <Podium tournament={tournament} />

            {thirdPlace && (
              <div style={{ textAlign: 'center', width: '100%', marginTop: 16 }}>
                <h3 style={{ color: '#CD7F32', fontSize: '1rem', marginBottom: 8, fontWeight: 'bold' }}>🥉 3º Lugar</h3>
                <BracketMatchCard match={thirdPlace} onOpen={setOpenMatchNum} />
              </div>
            )}
          </div>

          {/* Lado Direito */}
          <div className="bracket-half-right" style={{ display: 'flex', gap: 20, flexDirection: 'row-reverse' }}>
            <div className="bracket-col">
              {r32_right.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
            <div className="bracket-col">
              {r16_right.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
            <div className="bracket-col">
              {qf_right.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
            <div className="bracket-col">
              {sf_right.map(m => (
                <div className="bracket-match-node" key={m.matchNumber}>
                  <BracketMatchCard variant="compact" match={m} onOpen={setOpenMatchNum} />
                </div>
              ))}
            </div>
          </div>
        </div>
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
