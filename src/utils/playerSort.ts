import { Player, PlayerRole } from '../types.ts';

const ROLE_RANK: Record<PlayerRole, number> = {
  POR: 1,
  DIF: 2,
  CEN: 3,
  ATT: 4,
};

// Sorts players strictly by Role (POR -> DIF -> CEN -> ATT) and Cognome A-Z
export function sortPlayersByRoleAndSurname(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const roleDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
    if (roleDiff !== 0) return roleDiff;
    return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
  });
}
