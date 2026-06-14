export interface Team {
  id: string;
  name: string;
  shortName: string;
  flag: string; // ISO 3166-1 alpha-2 code for flagcdn.com
  badge?: string; // URL for team badge
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
}

// Flag CDN: https://flagcdn.com/48x36/{code}.png
const GROUPS: Group[] = [
  {
    id: 'A',
    name: 'Grupo A',
    teams: [
      { id: 'MEX', name: 'México', shortName: 'MEX', flag: 'mx' },
      { id: 'ZAF', name: 'África do Sul', shortName: 'RSA', flag: 'za' },
      { id: 'KOR', name: 'Coreia do Sul', shortName: 'KOR', flag: 'kr' },
      { id: 'CZE', name: 'Tchéquia', shortName: 'CZE', flag: 'cz' },
    ],
  },
  {
    id: 'B',
    name: 'Grupo B',
    teams: [
      { id: 'CAN', name: 'Canadá', shortName: 'CAN', flag: 'ca' },
      { id: 'BIH', name: 'Bósnia e Herz.', shortName: 'BIH', flag: 'ba' },
      { id: 'QAT', name: 'Catar', shortName: 'QAT', flag: 'qa' },
      { id: 'CHE', name: 'Suíça', shortName: 'SUI', flag: 'ch' },
    ],
  },
  {
    id: 'C',
    name: 'Grupo C',
    teams: [
      { id: 'BRA', name: 'Brasil', shortName: 'BRA', flag: 'br' },
      { id: 'MAR', name: 'Marrocos', shortName: 'MAR', flag: 'ma' },
      { id: 'HTI', name: 'Haiti', shortName: 'HAI', flag: 'ht' },
      { id: 'SCO', name: 'Escócia', shortName: 'SCO', flag: 'gb-sct' },
    ],
  },
  {
    id: 'D',
    name: 'Grupo D',
    teams: [
      { id: 'USA', name: 'Estados Unidos', shortName: 'USA', flag: 'us' },
      { id: 'PRY', name: 'Paraguai', shortName: 'PAR', flag: 'py' },
      { id: 'AUS', name: 'Austrália', shortName: 'AUS', flag: 'au' },
      { id: 'TUR', name: 'Turquia', shortName: 'TUR', flag: 'tr' },
    ],
  },
  {
    id: 'E',
    name: 'Grupo E',
    teams: [
      { id: 'DEU', name: 'Alemanha', shortName: 'GER', flag: 'de' },
      { id: 'CUW', name: 'Curaçao', shortName: 'CUW', flag: 'cw' },
      { id: 'CIV', name: "Costa do Marfim", shortName: 'CIV', flag: 'ci' },
      { id: 'ECU', name: 'Equador', shortName: 'ECU', flag: 'ec' },
    ],
  },
  {
    id: 'F',
    name: 'Grupo F',
    teams: [
      { id: 'NLD', name: 'Holanda', shortName: 'NED', flag: 'nl' },
      { id: 'JPN', name: 'Japão', shortName: 'JPN', flag: 'jp' },
      { id: 'SWE', name: 'Suécia', shortName: 'SWE', flag: 'se' },
      { id: 'TUN', name: 'Tunísia', shortName: 'TUN', flag: 'tn' },
    ],
  },
  {
    id: 'G',
    name: 'Grupo G',
    teams: [
      { id: 'BEL', name: 'Bélgica', shortName: 'BEL', flag: 'be' },
      { id: 'EGY', name: 'Egito', shortName: 'EGY', flag: 'eg' },
      { id: 'IRN', name: 'Irã', shortName: 'IRN', flag: 'ir' },
      { id: 'NZL', name: 'Nova Zelândia', shortName: 'NZL', flag: 'nz' },
    ],
  },
  {
    id: 'H',
    name: 'Grupo H',
    teams: [
      { id: 'ESP', name: 'Espanha', shortName: 'ESP', flag: 'es' },
      { id: 'CPV', name: 'Cabo Verde', shortName: 'CPV', flag: 'cv' },
      { id: 'SAU', name: 'Arábia Saudita', shortName: 'KSA', flag: 'sa' },
      { id: 'URY', name: 'Uruguai', shortName: 'URU', flag: 'uy' },
    ],
  },
  {
    id: 'I',
    name: 'Grupo I',
    teams: [
      { id: 'FRA', name: 'França', shortName: 'FRA', flag: 'fr' },
      { id: 'SEN', name: 'Senegal', shortName: 'SEN', flag: 'sn' },
      { id: 'IRQ', name: 'Iraque', shortName: 'IRQ', flag: 'iq' },
      { id: 'NOR', name: 'Noruega', shortName: 'NOR', flag: 'no' },
    ],
  },
  {
    id: 'J',
    name: 'Grupo J',
    teams: [
      { id: 'ARG', name: 'Argentina', shortName: 'ARG', flag: 'ar' },
      { id: 'DZA', name: 'Argélia', shortName: 'ALG', flag: 'dz' },
      { id: 'AUT', name: 'Áustria', shortName: 'AUT', flag: 'at' },
      { id: 'JOR', name: 'Jordânia', shortName: 'JOR', flag: 'jo' },
    ],
  },
  {
    id: 'K',
    name: 'Grupo K',
    teams: [
      { id: 'PRT', name: 'Portugal', shortName: 'POR', flag: 'pt' },
      { id: 'COD', name: 'RD Congo', shortName: 'DRC', flag: 'cd' },
      { id: 'UZB', name: 'Uzbequistão', shortName: 'UZB', flag: 'uz' },
      { id: 'COL', name: 'Colômbia', shortName: 'COL', flag: 'co' },
    ],
  },
  {
    id: 'L',
    name: 'Grupo L',
    teams: [
      { id: 'ENG', name: 'Inglaterra', shortName: 'ENG', flag: 'gb-eng' },
      { id: 'HRV', name: 'Croácia', shortName: 'CRO', flag: 'hr' },
      { id: 'GHA', name: 'Gana', shortName: 'GHA', flag: 'gh' },
      { id: 'PAN', name: 'Panamá', shortName: 'PAN', flag: 'pa' },
    ],
  },
];

export const TEAMS_MAP: Record<string, Team> = {};
GROUPS.forEach(g => g.teams.forEach(t => { TEAMS_MAP[t.id] = t; }));

export default GROUPS;
