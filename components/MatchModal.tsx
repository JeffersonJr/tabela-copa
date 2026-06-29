'use client';
import { useState, useCallback } from 'react';
import { Match, MatchScore, KnockoutMatch } from '@/lib/types';
import { getFinalScore } from '@/lib/tournament';
import { TEAMS_MAP } from '@/data/teams';
import TeamFlag from '@/components/TeamFlag';

type AnyMatch = Match | KnockoutMatch;

interface MatchModalProps {
  match: AnyMatch;
  roundLabel?: string;
  onUpdate: (score: Partial<MatchScore>) => void;
  onClose: () => void;
}

function ScoreInput({
  value,
  onChange,
  className = '',
  id,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  id: string;
}) {
  return (
    <input
      id={id}
      type="number"
      min={0}
      max={99}
      value={value === null ? '' : value}
      onChange={e => {
        const raw = e.target.value;
        if (raw === '') { onChange(null); return; }
        const n = parseInt(raw, 10);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      className={`modal-score-input ${className}`}
      placeholder="—"
    />
  );
}

export default function MatchModal({ match, roundLabel, onUpdate, onClose }: MatchModalProps) {
  const [score, setScore] = useState<MatchScore>({ ...match.score });
  const knockoutMatch = match as KnockoutMatch;
  const isKnockout = 'round' in match;

  const homeTeam = match.homeTeamId ? TEAMS_MAP[match.homeTeamId] : null;
  const awayTeam = match.awayTeamId ? TEAMS_MAP[match.awayTeamId] : null;

  const update = useCallback((patch: Partial<MatchScore>) => {
    setScore(prev => {
      const next = { ...prev, ...patch };
      onUpdate(next);
      return next;
    });
  }, [onUpdate]);

  const total = getFinalScore(score);
  const winner = score.hasPenalties && score.penalties
    ? (score.penalties.home > score.penalties.away ? match.homeTeamId : match.awayTeamId)
    : (total.home !== total.away ? (total.home > total.away ? match.homeTeamId : match.awayTeamId) : null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={handleKeyDown}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        <div className="modal-header">
          <span className="modal-title" id="modal-title">
            {roundLabel ?? 'Jogo'}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {/* Teams */}
        <div className="modal-teams">
          <div className="modal-team">
            {homeTeam && <TeamFlag flagCode={homeTeam.flag} teamName={homeTeam.name} size="xl" />}
            <span className="modal-team-name">{homeTeam?.name ?? knockoutMatch.homeLabel ?? '?'}</span>
            {homeTeam && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{homeTeam.shortName}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="modal-vs">VS</span>
            {(score.home.first !== null) && (
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
              }}>
                {total.home} – {total.away}
              </span>
            )}
          </div>
          <div className="modal-team">
            {awayTeam && <TeamFlag flagCode={awayTeam.flag} teamName={awayTeam.name} size="xl" />}
            <span className="modal-team-name">{awayTeam?.name ?? knockoutMatch.awayLabel ?? '?'}</span>
            {awayTeam && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{awayTeam.shortName}</span>}
          </div>
        </div>

        {/* Score Inputs */}
        <div className="modal-scores">
        {/* Final Score */}
          <div className="score-row">
            <span className="score-row-label">Placar</span>
            <ScoreInput id="h-score" value={score.home.first} onChange={v => update({ home: { ...score.home, first: v } })} />
            <span className="score-row-sep">—</span>
            <ScoreInput id="a-score" value={score.away.first} onChange={v => update({ away: { ...score.away, first: v } })} />
          </div>

          {/* Extra Time */}
          {isKnockout && score.hasExtraTime && (
            <div className="score-row">
              <span className="score-row-label et">ET</span>
              <ScoreInput
                id="h-et"
                className="et"
                value={score.extraTime?.home ?? null}
                onChange={v => update({ extraTime: { home: v ?? 0, away: score.extraTime?.away ?? 0 } })}
              />
              <span className="score-row-sep">—</span>
              <ScoreInput
                id="a-et"
                className="et"
                value={score.extraTime?.away ?? null}
                onChange={v => update({ extraTime: { home: score.extraTime?.home ?? 0, away: v ?? 0 } })}
              />
            </div>
          )}

          {/* Penalties */}
          {isKnockout && score.hasPenalties && (
            <div className="score-row">
              <span className="score-row-label pen">PEN</span>
              <ScoreInput
                id="h-pen"
                className="pen"
                value={score.penalties?.home ?? null}
                onChange={v => update({ penalties: { home: v ?? 0, away: score.penalties?.away ?? 0 } })}
              />
              <span className="score-row-sep">—</span>
              <ScoreInput
                id="a-pen"
                className="pen"
                value={score.penalties?.away ?? null}
                onChange={v => update({ penalties: { home: score.penalties?.home ?? 0, away: v ?? 0 } })}
              />
            </div>
          )}
        </div>

        {/* Definitive Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 4, border: '1px solid var(--border)' }}>
            <button
              className={`btn btn-sm ${!score.isDefinitive ? 'active' : ''}`}
              style={{ background: !score.isDefinitive ? 'var(--accent)' : 'transparent', color: !score.isDefinitive ? '#fff' : 'var(--text-secondary)', border: 'none' }}
              onClick={() => update({ isDefinitive: false })}
            >
              Meu Palpite
            </button>
            <button
              className={`btn btn-sm ${score.isDefinitive ? 'active' : ''}`}
              style={{ background: score.isDefinitive ? '#ff4444' : 'transparent', color: score.isDefinitive ? '#fff' : 'var(--text-secondary)', border: 'none' }}
              onClick={() => update({ isDefinitive: true })}
            >
              Resultado Oficial
            </button>
          </div>
        </div>

        {/* Extra toggles */}
        {isKnockout && (
          <div className="modal-toggles">
            <button
              className={`extra-toggle et ${score.hasExtraTime ? 'active' : ''}`}
              onClick={() => update({ hasExtraTime: !score.hasExtraTime, extraTime: null })}
            >
              ⏱ Prorrogação
            </button>
            <button
              className={`extra-toggle pen ${score.hasPenalties ? 'active' : ''}`}
              onClick={() => update({ hasPenalties: !score.hasPenalties, penalties: null })}
            >
              🥅 Pênaltis
            </button>
          </div>
        )}



        {/* Footer */}
        <div className="modal-footer">
          {winner && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--green)', fontWeight: 600, marginRight: 'auto' }}>
              ✓ {TEAMS_MAP[winner]?.shortName ?? winner} avança
            </span>
          )}
          <button className="btn btn-accent" onClick={onClose}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}
