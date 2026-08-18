export interface SeedTeam { id: string; name: string; seed: number }
export interface BracketMatch { round: string; roundOrder: number; teamAId: string | null; teamBId: string | null }

/**
 * Genera el fixture de eliminación simple a partir de una lista de equipos.
 * Completa con BYE (pase directo) si la cantidad no es potencia de 2 —
 * el caso más común en un complejo real (13, 15, 22 equipos anotados, etc).
 */
export function generateSingleEliminationBracket(teams: SeedTeam[]): BracketMatch[] {
  if (teams.length < 2) throw new Error("Necesitás al menos 2 equipos para armar un fixture.");

  const size = 2 ** Math.ceil(Math.log2(teams.length));
  const seeded = [...teams].sort((a, b) => a.seed - b.seed);
  const slots: (SeedTeam | null)[] = Array.from({ length: size }, (_, i) => seeded[i] ?? null);

  const roundNames = (totalRounds: number) => {
    const names = ["Final", "Semifinal", "Cuartos de final", "Octavos de final", "Dieciseisavos de final"];
    return Array.from({ length: totalRounds }, (_, i) => names[totalRounds - 1 - i] ?? `Ronda ${i + 1}`);
  };

  const totalRounds = Math.log2(size);
  const names = roundNames(totalRounds);
  const matches: BracketMatch[] = [];

  for (let i = 0; i < size; i += 2) {
    matches.push({
      round: names[0],
      roundOrder: 0,
      teamAId: slots[i]?.id ?? null,
      teamBId: slots[i + 1]?.id ?? null,
    });
  }

  // rondas siguientes: placeholders vacíos, se completan a medida que se juega
  for (let r = 1; r < totalRounds; r++) {
    const matchesInRound = size / 2 ** (r + 1);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({ round: names[r], roundOrder: r, teamAId: null, teamBId: null });
    }
  }

  return matches;
}

export interface RoundRobinMatch { round: string; roundOrder: number; teamAId: string | null; teamBId: string | null }

/**
 * Todos contra todos (round robin) con el método del círculo: si la cantidad
 * de equipos es impar, se agrega un "descanso" (bye) rotativo. Cada equipo
 * juega exactamente una vez contra cada rival, repartido en fechas.
 */
export function generateRoundRobin(teams: SeedTeam[]): RoundRobinMatch[] {
  if (teams.length < 2) throw new Error("Necesitás al menos 2 equipos para armar una liga.");

  const list: (SeedTeam | null)[] = [...teams];
  if (list.length % 2 !== 0) list.push(null); // bye

  const n = list.length;
  const rounds = n - 1;
  const matches: RoundRobinMatch[] = [];
  const arr = [...list];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) {
        matches.push({ round: `Fecha ${r + 1}`, roundOrder: r, teamAId: a.id, teamBId: b.id });
      }
    }
    // rotación: todos menos el primero giran una posición
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return matches;
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  points: number;
}

interface MatchResult {
  teamAId: string | null;
  teamBId: string | null;
  teamAName?: string;
  teamBName?: string;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
}

/** Calcula la tabla de posiciones (3 puntos por victoria, 1 por empate) a partir de los resultados cargados. */
export function computeStandings(matches: MatchResult[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>();

  function ensure(id: string, name: string) {
    if (!table.has(id)) {
      table.set(id, { teamId: id, teamName: name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, diff: 0, points: 0 });
    }
    return table.get(id)!;
  }

  for (const m of matches) {
    if (m.status !== "PLAYED" || m.scoreA == null || m.scoreB == null || !m.teamAId || !m.teamBId) continue;

    const a = ensure(m.teamAId, m.teamAName ?? "—");
    const b = ensure(m.teamBId, m.teamBName ?? "—");

    a.played++; b.played++;
    a.goalsFor += m.scoreA; a.goalsAgainst += m.scoreB;
    b.goalsFor += m.scoreB; b.goalsAgainst += m.scoreA;

    if (m.scoreA > m.scoreB) { a.won++; b.lost++; a.points += 3; }
    else if (m.scoreA < m.scoreB) { b.won++; a.lost++; b.points += 3; }
    else { a.drawn++; b.drawn++; a.points += 1; b.points += 1; }
  }

  for (const row of table.values()) row.diff = row.goalsFor - row.goalsAgainst;

  return Array.from(table.values()).sort((x, y) => y.points - x.points || y.diff - x.diff || y.goalsFor - x.goalsFor);
}
