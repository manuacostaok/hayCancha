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
