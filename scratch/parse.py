import re

text = """
Grupo A
11/06 (Qui): México × África do Sul (Cidade do México)
11/06 (Qui): Coreia do Sul × República Tcheca (Guadalajara)
18/06 (Qui) - 13:00: República Tcheca × África do Sul (Atlanta)
18/06 (Qui) - 22:00: México × Coreia do Sul (Guadalajara)
24/06 (Qua) - 22:00: República Tcheca × México (Cidade do México)
24/06 (Qua) - 22:00: África do Sul × Coreia do Sul (Guadalajara)

Grupo B
12/06 (Sex): Canadá × Bósnia e Herzegovina (Toronto)
13/06 (Sáb): Catar × Suíça (Santa Clara)
18/06 (Qui) - 16:00: Suíça × Bósnia e Herzegovina (Inglewood)
18/06 (Qui) - 19:00: Canadá × Catar (Vancouver)
24/06 (Qua) - 16:00: Suíça × Canadá (Vancouver)
24/06 (Qua) - 16:00: Bósnia e Herzegovina × Catar (Seattle)

Grupo C
13/06 (Sáb): Brasil × Marrocos (East Rutherford)
13/06 (Sáb): Haiti × Escócia (Foxborough)
19/06 (Sex) - 19:00: Escócia × Marrocos (Foxborough)
19/06 (Sex) - 21:30: Brasil × Haiti (Filadélfia)
24/06 (Qua) - 19:00: Escócia × Brasil (Miami Gardens)
24/06 (Qua) - 19:00: Marrocos × Haiti (Atlanta)

Grupo D
12/06 (Sex): Estados Unidos × Paraguai (Inglewood)
14/06 (Dom): Austrália × Turquia (Vancouver)
19/06 (Sex) - 16:00: Estados Unidos × Austrália (Seattle)
20/06 (Sáb) - 00:00: Turquia × Paraguai (Santa Clara)
25/06 (Qui) - 23:00: Turquia × Estados Unidos (Inglewood)
25/06 (Qui) - 23:00: Paraguai × Austrália (Santa Clara)

Grupo E
14/06 (Dom) - 14:00: Alemanha × Curaçao (Houston)
14/06 (Dom) - 20:00: Costa do Marfim × Equador (Filadélfia)
20/06 (Sáb) - 17:00: Alemanha × Costa do Marfim (Toronto)
20/06 (Sáb) - 21:00: Equador × Curaçao (Kansas City)
25/06 (Qui) - 17:00: Equador × Alemanha (East Rutherford)
25/06 (Qui) - 17:00: Curaçao × Costa do Marfim (Filadélfia)

Grupo F
14/06 (Dom) - 17:00: Holanda × Japão (Arlington)
14/06 (Dom) - 23:00: Suécia × Tunísia (Guadalupe)
20/06 (Sáb) - 14:00: Holanda × Suécia (Houston)
21/06 (Dom) - 01:00: Tunísia × Japão (Guadalupe)
25/06 (Qui) - 20:00: Japão × Suécia (Arlington)
25/06 (Qui) - 20:00: Tunísia × Holanda (Kansas City)

Grupo G
15/06 (Seg) - 16:00: Bélgica × Egito (Seattle)
15/06 (Seg) - 22:00: Irã × Nova Zelândia (Inglewood)
21/06 (Dom) - 16:00: Bélgica × Irã (Inglewood)
22/06 (Seg) - 22:00: Nova Zelândia × Egito (Vancouver)
27/06 (Sáb) - 00:00: Egito × Irã (Seattle)
27/06 (Sáb) - 00:00: Nova Zelândia × Bélgica (Vancouver)

Grupo H
15/06 (Seg) - 13:00: Espanha × Cabo Verde (Atlanta)
15/06 (Seg) - 19:00: Arábia Saudita × Uruguai (Miami Gardens)
21/06 (Dom) - 13:00: Espanha × Arábia Saudita (Atlanta)
21/06 (Dom) - 19:00: Uruguai × Cabo Verde (Miami Gardens)
26/06 (Sex) - 21:00: Cabo Verde × Arábia Saudita (Houston)
26/06 (Sex) - 21:00: Uruguai × Espanha (Guadalajara)

Grupo I
16/06 (Ter) - 16:00: França × Senegal (East Rutherford)
16/06 (Ter) - 19:00: Iraque × Noruega (Boston)
22/06 (Seg) - 18:00: França × Iraque (Filadélfia)
22/06 (Seg) - 21:00: Noruega × Senegal (East Rutherford)
26/06 (Sex) - 16:00: Noruega × França (Boston)
26/06 (Sex) - 16:00: Senegal × Iraque (Toronto)

Grupo J
16/06 (Ter) - 22:00: Argentina × Argélia (Kansas City)
16/06 (Ter) - 23:00: Áustria × Jordânia (Santa Clara)
22/06 (Seg) - 13:00: Argentina × Áustria (Arlington)
22/06 (Seg) - 23:00: Jordânia × Argélia (Santa Clara)
27/06 (Sáb) - 23:00: Argélia × Áustria (Kansas City)
27/06 (Sáb) - 23:00: Jordânia × Argentina (Arlington)

Grupo K
17/06 (Qua) - 14:00: Portugal × RD do Congo (Houston)
17/06 (Qua) - 23:00: Uzbequistão × Colômbia (Cidade do México)
23/06 (Ter) - 14:00: Portugal × Uzbequistão (Houston)
23/06 (Ter) - 23:00: Colômbia × RD do Congo (Guadalajara)
27/06 (Sáb) - 20:30: Colômbia × Portugal (Miami Gardens)
27/06 (Sáb) - 20:30: RD do Congo × Uzbequistão (Atlanta)

Grupo L
17/06 (Qua) - 17:00: Inglaterra × Croácia (Arlington)
17/06 (Qua) - 20:00: Gana × Panamá (Toronto)
23/06 (Ter) - 17:00: Inglaterra × Gana (Boston)
23/06 (Ter) - 20:00: Panamá × Croácia (Toronto)
27/06 (Sáb) - 18:00: Panamá × Inglaterra (East Rutherford)
27/06 (Sáb) - 18:00: Croácia × Gana (Filadélfia)
"""

team_map = {
    'México': 'MEX', 'África do Sul': 'ZAF', 'Coreia do Sul': 'KOR', 'República Tcheca': 'CZE',
    'Canadá': 'CAN', 'Bósnia e Herzegovina': 'BIH', 'Catar': 'QAT', 'Suíça': 'CHE',
    'Brasil': 'BRA', 'Marrocos': 'MAR', 'Haiti': 'HTI', 'Escócia': 'SCO',
    'Estados Unidos': 'USA', 'Paraguai': 'PRY', 'Austrália': 'AUS', 'Turquia': 'TUR',
    'Alemanha': 'DEU', 'Curaçao': 'CUW', 'Costa do Marfim': 'CIV', 'Equador': 'ECU',
    'Holanda': 'NLD', 'Japão': 'JPN', 'Suécia': 'SWE', 'Tunísia': 'TUN',
    'Bélgica': 'BEL', 'Egito': 'EGY', 'Irã': 'IRN', 'Nova Zelândia': 'NZL',
    'Espanha': 'ESP', 'Cabo Verde': 'CPV', 'Arábia Saudita': 'SAU', 'Uruguai': 'URY',
    'França': 'FRA', 'Senegal': 'SEN', 'Iraque': 'IRQ', 'Noruega': 'NOR',
    'Argentina': 'ARG', 'Argélia': 'DZA', 'Áustria': 'AUT', 'Jordânia': 'JOR',
    'Portugal': 'PRT', 'RD do Congo': 'COD', 'Uzbequistão': 'UZB', 'Colômbia': 'COL',
    'Inglaterra': 'ENG', 'Croácia': 'HRV', 'Gana': 'GHA', 'Panamá': 'PAN'
}

current_group = ""
result = "export const GROUP_MATCHES_SCHEDULE: Record<string, {home: string, away: string, date: string, time: string, location: string}[]> = {\n"

for line in text.split('\n'):
    line = line.strip()
    if not line: continue
    if line.startswith("Grupo"):
        current_group = line.split(" ")[1]
        result += f"  '{current_group}': [\n"
    else:
        # Example: 18/06 (Qui) - 13:00: República Tcheca × África do Sul (Atlanta)
        idx_colon = line.find(':')
        # wait, time can have a colon. '13:00:' or '11/06 (Qui):'
        # find the first ': ' to split date from teams safely
        idx_split = line.find(': ')
        dt_str = line[:idx_split].strip()
        rest = line[idx_split+2:].strip()
        
        time_str = "TBD"
        date_str = dt_str
        if "-" in dt_str:
            date_str = dt_str.split("-")[0].strip()
            time_str = dt_str.split("-")[1].strip()
            
        loc_idx = rest.rfind("(")
        match_str = rest[:loc_idx].strip()
        loc_str = rest[loc_idx+1:-1].strip()
        
        teams = match_str.split("×")
        home_id = team_map.get(teams[0].strip(), teams[0].strip())
        away_id = team_map.get(teams[1].strip(), teams[1].strip())
        
        result += f"    {{ home: '{home_id}', away: '{away_id}', date: '{date_str}', time: '{time_str}', location: '{loc_str}' }},\n"

result += "};\n"
print(result)
