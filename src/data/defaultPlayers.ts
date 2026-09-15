import { Player, LineupState } from '../types.ts';

// Players sorted strictly by Role (POR, DIF, CEN, ATT) and Cognome A-Z with permanent photo paths
export const DEFAULT_PLAYERS: Player[] = [
  // --- POR (Portieri) ---
  {
    id: 'p_por_angelucci',
    name: 'ANGELUCCI',
    firstName: 'Tommaso',
    role: 'POR',
    photo: '/ANGELUCCI.jpeg',
  },
  {
    id: 'p_por_degiovannini',
    name: 'DE GIOVANNINI',
    firstName: 'Elia',
    role: 'POR',
    photo: '/DE GIOVANNINI.jpeg',
  },

  // --- DIF (Difensori) ---
  {
    id: 'p_dif_bettoni',
    name: 'BETTONI',
    firstName: 'Emiliano',
    role: 'DIF',
    photo: '/BETTONI.jpeg',
  },
  {
    id: 'p_dif_borghi',
    name: 'BORGHI',
    firstName: 'Leonardo',
    role: 'DIF',
    photo: '/BORGHI.jpeg',
  },
  {
    id: 'p_dif_castrigno',
    name: 'CASTRIGNO',
    firstName: 'Luca',
    role: 'DIF',
    photo: '/CASTRIGNO.jpeg',
  },
  {
    id: 'p_dif_elca',
    name: 'ELCA',
    firstName: 'Roberto',
    role: 'DIF',
    photo: '/ELCA.jpeg',
  },
  {
    id: 'p_dif_masoero',
    name: 'MASOERO',
    firstName: 'Mattia',
    role: 'DIF',
    photo: '/MASOERO.jpeg',
  },
  {
    id: 'p_dif_stagni',
    name: 'STAGNI',
    firstName: 'Niccolò',
    role: 'DIF',
    photo: '/STAGNI.jpeg',
  },
  {
    id: 'p_dif_stoppini',
    name: 'STOPPINI',
    firstName: 'Ivan',
    role: 'DIF',
    photo: '/STOPPINI.jpeg',
  },
  {
    id: 'p_dif_viscomi',
    name: 'VISCOMI',
    firstName: 'Carlo Alberto',
    role: 'DIF',
    photo: '/VISCOMI.jpeg',
  },

  // --- CEN (Centrocampisti) ---
  {
    id: 'p_cen_clausi',
    name: 'CLAUSI',
    firstName: 'Antonio',
    role: 'CEN',
    photo: '/CLAUSI.jpeg',
  },
  {
    id: 'p_cen_fodrini',
    name: 'FODRINI',
    firstName: 'Simone',
    role: 'CEN',
    photo: '/FODRINI.jpeg',
  },
  {
    id: 'p_cen_gagliardi',
    name: 'GAGLIARDI',
    firstName: 'Giacomo',
    role: 'CEN',
    photo: '/GAGLIARDI.jpeg',
  },
  {
    id: 'p_cen_garoni',
    name: 'GARONI',
    firstName: 'Alessandro',
    role: 'CEN',
    photo: '/GARONI.jpeg',
  },
  {
    id: 'p_cen_rolando',
    name: 'ROLANDO',
    firstName: 'Fabio',
    role: 'CEN',
    photo: '/ROLANDO.jpeg',
  },
  {
    id: 'p_cen_tagliaferri',
    name: 'TAGLIAFERRI',
    firstName: 'Riccardo',
    role: 'CEN',
    photo: '/TAGLIAFERRI.jpeg',
  },

  // --- ATT (Attaccanti) ---
  {
    id: 'p_att_beltrami',
    name: 'BELTRAMI',
    firstName: 'Sebastiano',
    role: 'ATT',
    photo: '/BELTRAMI.jpeg',
  },
  {
    id: 'p_att_botta',
    name: 'BOTTA',
    firstName: 'Giovanni',
    role: 'ATT',
    photo: '/BOTTA.jpeg',
  },
  {
    id: 'p_att_minazzi',
    name: 'MINAZZI',
    firstName: 'Pietro',
    role: 'ATT',
    photo: '/MINAZZI.jpeg',
  },
  {
    id: 'p_att_modesti',
    name: 'MODESTI',
    firstName: 'Luca',
    role: 'ATT',
    photo: '/MODESTI.jpeg',
  },
  {
    id: 'p_att_piana',
    name: 'PIANA',
    firstName: 'Federico',
    role: 'ATT',
    photo: '/PIANA.jpeg',
  },
  {
    id: 'p_att_trisconi',
    name: 'TRISCONI',
    firstName: 'Fabio',
    role: 'ATT',
    photo: '/TRISCONI.jpeg',
  },
];

// Initial 4-4-2 lineup assigned with the new players
export const DEFAULT_INITIAL_LINEUP: LineupState = {
  1: 'p_por_angelucci', // POR - Angelucci
  2: 'p_dif_bettoni',   // TS - Bettoni
  3: 'p_dif_borghi',    // DC - Borghi
  4: 'p_dif_castrigno', // DC - Castrigno
  5: 'p_dif_elca',      // TD - Elca
  6: 'p_cen_clausi',    // ES - Clausi
  7: 'p_cen_fodrini',   // CC - Fodrini
  8: 'p_cen_gagliardi', // CC - Gagliardi
  9: 'p_cen_garoni',    // ED - Garoni
  10: 'p_att_beltrami', // ATT - Beltrami
  11: 'p_att_botta',    // ATT - Botta
};
