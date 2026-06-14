'use client';
import { useState } from 'react';

interface TeamFlagProps {
  flagCode: string;
  teamName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function TeamFlag({ flagCode, teamName, size = 'md' }: TeamFlagProps) {
  const [error, setError] = useState(false);

  const dimensions: Record<string, { w: number; h: number }> = {
    sm: { w: 16, h: 12 },
    md: { w: 20, h: 15 },
    lg: { w: 28, h: 21 },
    xl: { w: 40, h: 30 },
  };

  const { w, h } = dimensions[size];

  if (error) {
    return (
      <span
        className="flag-placeholder"
        style={{ width: w, height: h, fontSize: Math.max(6, w * 0.3) }}
        aria-label={teamName}
      >
        {teamName.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${w}x${h}/${flagCode}.png`}
      srcSet={`https://flagcdn.com/${w * 2}x${h * 2}/${flagCode}.png 2x`}
      width={w}
      height={h}
      alt={`Bandeira ${teamName}`}
      className={`team-flag ${size}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
