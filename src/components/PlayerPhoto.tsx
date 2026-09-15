import React, { useState, useEffect } from 'react';
import { Player } from '../types.ts';
import { generatePlayerAvatarSvg } from '../utils/avatar.ts';

interface PlayerPhotoProps {
  player?: Player | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
  showFallbackBadge?: boolean;
}

export const PlayerPhoto: React.FC<PlayerPhotoProps> = ({
  player,
  className = 'w-full h-full',
  imgClassName = 'w-full h-full object-cover',
  alt,
  showFallbackBadge = true,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if player or photo changes
  useEffect(() => {
    setHasError(false);
  }, [player?.id, player?.photo, player?.photoUrl]);

  if (!player) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-500 font-bold ${className}`}>
        --
      </div>
    );
  }

  const role = player.role || 'CEN';
  const surname = player.name || 'GIOCATORE';
  const fallbackSvg = generatePlayerAvatarSvg(surname, role);
  
  // Supporta sia 'photo' che 'photoUrl'
  const activePhoto = player.photo || player.photoUrl;
  const photoSrc = !hasError && activePhoto ? activePhoto : fallbackSvg;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={photoSrc}
        alt={alt || `${player.name}`}
        className={imgClassName}
        referrerPolicy="no-referrer"
        onError={() => {
          if (!hasError) {
            setHasError(true);
          }
        }}
      />
      {hasError && showFallbackBadge && (
        <div className="sr-only">{player.name}</div>
      )}
    </div>
  );
};
