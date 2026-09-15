export type PlayerRole = 'POR' | 'DIF' | 'CEN' | 'ATT';

export type TacticalModule = '442' | '352' | '532' | '433' | '343' | '4231';

export interface Player {
  id: string;
  name: string; // Cognome (es. "ANGELUCCI", "BETTONI")
  firstName?: string; // Nome (es. "Tommaso", "Emiliano")
  role: PlayerRole;
  number?: number;
  photoUrl?: string; // Data URL or Image URL
}

export interface PitchPosition {
  slotId: number; // 1 to 11
  role: PlayerRole;
  label: string; // e.g. "POR", "TS", "DC", "TD", "CC", "ATT"
  x: number; // 0 to 100 percentage of pitch width
  y: number; // 0 to 100 percentage of pitch height
}

export interface ModuleDefinition {
  id: TacticalModule;
  label: string; // e.g. "4-4-2"
  description: string;
  positions: PitchPosition[];
}

export interface LineupState {
  [slotId: number]: string | null; // slotId -> playerId or null
}

export interface TeamConfig {
  name: string;
  logoUrl: string | null;
  subtitle: string;
  accentColor?: string;
  pitchStyle: 'minimal' | 'pitch-lines' | 'pure-black';
}
