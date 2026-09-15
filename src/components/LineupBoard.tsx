import React from 'react';
import { ModuleDefinition, Player, TeamConfig } from '../types.ts';
import { Plus } from 'lucide-react';
import { DEFAULT_LOGO_PATH } from '../data/teamLogo.ts';

interface LineupBoardProps {
  module: ModuleDefinition;
  slots: { [slotId: number]: Player | null };
  selectedSlotId: number | null;
  onSelectSlot: (slotId: number) => void;
  teamConfig: TeamConfig;
  onOpenTeamCustomizer?: () => void;
}

export const LineupBoard: React.FC<LineupBoardProps> = ({
  module,
  slots,
  selectedSlotId,
  onSelectSlot,
  teamConfig,
}) => {
  return (
    <div
      id="lineup-pitch-canvas-wrapper"
      className="relative w-full aspect-[9/16] max-h-[84vh] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-[#080809] select-none"
    >
      {/* Background Pitch Graphics */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/60 via-[#0a0a0c] to-[#050507]" />

        {teamConfig.pitchStyle !== 'pure-black' && (
          <div className="absolute inset-x-4 sm:inset-x-6 top-[16%] bottom-3 border border-white/10 rounded-xl">
            <div className="absolute top-9 inset-x-0 h-px bg-white/10" />
            <div className="absolute top-9 left-1/2 -translate-x-1/2 w-28 h-14 border-b border-l border-r border-white/10 rounded-b-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-[19%] border-t border-l border-r border-white/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[7.5%] border-t border-l border-r border-white/10" />
            <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-20 h-10 border-t border-l border-r border-white/10 rounded-t-full -translate-y-full" />
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="absolute top-0 inset-x-0 z-30 px-4 sm:px-5 pt-4 sm:pt-5 pb-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 sm:gap-3.5 pointer-events-auto">
          <div className="w-10 sm:w-12 md:w-14 shrink-0 flex items-center justify-center">
            <img
              src={DEFAULT_LOGO_PATH}
              alt={teamConfig.name || 'Logo Squadra'}
              className="w-full h-auto max-h-13 sm:max-h-15 md:max-h-16 object-contain drop-shadow-md"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div className="text-[9.5px] sm:text-[11px] font-bold tracking-[0.2em] text-zinc-400 uppercase leading-tight mb-0.5">
              {teamConfig.subtitle || 'XI TITOLARI'}
            </div>
            <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-wider text-white uppercase leading-none font-sans">
              {teamConfig.name || 'ORNAVASSESE'}
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto bg-zinc-900/85 border border-zinc-700/70 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-full tracking-wider shadow-sm">
          {module.label}
        </div>
      </div>

      {/* Interactive FUT Cards Pitch Area */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {module.positions.map((pos) => {
          const player = slots[pos.slotId];
          const isSelected = selectedSlotId === pos.slotId;
          const playerPhotoSrc = player?.photo || player?.photoUrl;

          return (
            <div
              key={`slot-${module.id}-${pos.slotId}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto z-20 group"
              onClick={() => onSelectSlot(pos.slotId)}
              id={`player-circle-slot-${pos.slotId}`}
              title={`Clicca per cambiare ${pos.label}: ${player ? player.name : 'Vuoto'}`}
            >
              {/* FUT Card Container - Senza bordi né anelli */}
              <div
                className={`relative w-[72px] h-[90px] sm:w-[88px] sm:h-[110px] md:w-[104px] md:h-[130px] transition-all duration-200 flex items-center justify-center ${
                  isSelected ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]' : 'hover:scale-105'
                }`}
              >
                {playerPhotoSrc ? (
                  <img
                    src={playerPhotoSrc}
                    alt={player?.name || pos.label}
                    className="w-full h-full object-contain drop-shadow-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900/90 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider">
                      {pos.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
