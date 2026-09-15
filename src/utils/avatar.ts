import { PlayerRole } from '../types.ts';

// Generates an SVG data URL for players without an uploaded photo
export function generatePlayerAvatarSvg(surname: string, role: PlayerRole, number?: number): string {
  const initials = surname.slice(0, 2).toUpperCase() || 'GI';
  
  let roleColor = '#3b82f6'; // Blue
  let bgGradient1 = '#1e293b';
  let bgGradient2 = '#0f172a';

  if (role === 'POR') {
    roleColor = '#eab308'; // Amber/Gold
    bgGradient1 = '#422006';
    bgGradient2 = '#1c1917';
  } else if (role === 'DIF') {
    roleColor = '#06b6d4'; // Cyan
    bgGradient1 = '#164e63';
    bgGradient2 = '#082f49';
  } else if (role === 'CEN') {
    roleColor = '#10b981'; // Emerald
    bgGradient1 = '#064e3b';
    bgGradient2 = '#022c22';
  } else if (role === 'ATT') {
    roleColor = '#ef4444'; // Red
    bgGradient1 = '#4c0519';
    bgGradient2 = '#1f040b';
  }

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient1}"/>
        <stop offset="100%" stop-color="${bgGradient2}"/>
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${roleColor}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="transparent"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="100" fill="url(#bg)"/>
    <circle cx="100" cy="100" r="94" fill="none" stroke="${roleColor}" stroke-width="3" stroke-opacity="0.6"/>
    
    <!-- Stylized Head & Shoulders Player Silhouette -->
    <circle cx="100" cy="74" r="32" fill="#ffffff" fill-opacity="0.85"/>
    <path d="M 46 160 C 46 122, 154 122, 154 160 Z" fill="#ffffff" fill-opacity="0.85"/>
    
    <!-- Jersey accent -->
    <path d="M 85 130 L 100 148 L 115 130 Z" fill="${roleColor}"/>
    
    <!-- Initials at bottom -->
    <rect x="65" y="152" width="70" height="26" rx="13" fill="#000000" fill-opacity="0.75" stroke="${roleColor}" stroke-width="1.5"/>
    <text x="100" y="170" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${initials}
    </text>
  </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

import { DEFAULT_LOGO_PATH } from '../data/teamLogo.ts';

// Returns the default logo path for the team
export function generateDefaultTeamLogo(): string {
  return DEFAULT_LOGO_PATH;
}
