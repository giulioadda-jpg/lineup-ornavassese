import { Player } from '../types.ts';

/**
 * Matches an image filename to a player based on surname.
 * Supports:
 * - "ANGELUCCI.jpeg" -> "ANGELUCCI"
 * - "DE GIOVANNINI.jpeg", "DE_GIOVANNINI.jpeg", "degiovannini.jpg" -> "DE GIOVANNINI"
 * - "POR_ANGELUCCI.jpeg", "1_ANGELUCCI.jpeg" -> "ANGELUCCI"
 */
export function matchPlayerByFilename(filename: string, players: Player[]): Player | undefined {
  // Strip extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  // Strip path if any
  const baseName = withoutExt.replace(/^.*[\\/]/, '').trim().toUpperCase();

  // Strip prefixes like POR_, DIF_, CEN_, ATT_ or numbers like 1_
  const cleanSurname = baseName
    .replace(/^(POR|DIF|CEN|ATT)[_\s-]?/i, '')
    .replace(/^\d+[-_\s]?/, '')
    .trim();

  const normalize = (s: string) => s.replace(/[-_\s]+/g, '').toUpperCase();
  const cleanNormalized = normalize(cleanSurname);

  // 1. Exact match
  let matched = players.find((p) => p.name.toUpperCase() === cleanSurname);
  if (matched) return matched;

  // 2. Normalized match (ignoring spaces/underscores/dashes, e.g. DE GIOVANNINI vs DEGIOVANNINI)
  matched = players.find((p) => normalize(p.name) === cleanNormalized);
  if (matched) return matched;

  // 3. Substring match
  matched = players.find((p) => {
    const pNorm = normalize(p.name);
    return cleanNormalized.includes(pNorm) || pNorm.includes(cleanNormalized);
  });
  if (matched) return matched;

  // 4. Match against player full name or firstName
  matched = players.find((p) => {
    if (!p.firstName) return false;
    const combined = normalize(`${p.firstName} ${p.name}`);
    return cleanNormalized === combined || cleanNormalized.includes(normalize(p.name));
  });

  return matched;
}
