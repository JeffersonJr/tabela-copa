'use client';
import { useTournamentStore } from '@/lib/store';
import { getAllThirds } from '@/lib/tournament';
import { TEAMS_MAP } from '@/data/teams';
import TeamFlag from '@/components/TeamFlag';

export default function ThirdPlaceTable() {
  const { tournament } = useTournamentStore();
  const allThirds = getAllThirds(tournament.groups);

  if (allThirds.length === 0) {
    return null;
  }

  return (
    <div className="group-card animate-fadeIn" style={{ marginTop: '2rem', maxWidth: 800, margin: '2rem auto' }}>
      <div className="group-header">
        <span className="group-name">Classificação dos 3º Colocados</span>
        <span className="group-progress">Os 8 melhores avançam</span>
      </div>
      <div className="standings">
        <div className="standings-header">
          <span style={{ paddingLeft: 22 }}>Seleção</span>
          <span>Grp</span>
          <span>J</span>
          <span>V</span>
          <span>E</span>
          <span>D</span>
          <span>SG</span>
          <span>Pts</span>
        </div>
        {allThirds.map((t, i) => {
          const team = TEAMS_MAP[t.teamId];
          const s = t.standing;
          // Highlight the top 8
          const cls = i < 8 ? 'qualify' : 'eliminated';
          return (
            <div key={t.teamId} className={`standings-row ${cls}`}>
              <div className="standings-team">
                <span className="standings-rank">{i + 1}</span>
                {team && <TeamFlag flagCode={team.flag} teamName={team.name} size="sm" />}
                <span className="standings-name">{team?.shortName ?? t.teamId}</span>
              </div>
              <span className="standings-col" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t.groupId}</span>
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
    </div>
  );
}
