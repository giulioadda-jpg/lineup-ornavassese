import { ModuleDefinition, Player, TeamConfig } from '../types.ts';
import { DEFAULT_LOGO_PATH } from '../data/teamLogo.ts';

// Helper to safely load image elements for canvas rendering
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// Draw a rounded rectangle on canvas
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

interface ExportLineupOptions {
  module: ModuleDefinition;
  slots: { [slotId: number]: Player | null };
  teamConfig: TeamConfig;
}

export async function generateLineupCanvas({
  module,
  slots,
  teamConfig,
}: ExportLineupOptions): Promise<HTMLCanvasElement> {
  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas 2D context');

  // 1. Deep Matte Black Background ("basic sfondo nero")
  ctx.fillStyle = '#080809';
  ctx.fillRect(0, 0, width, height);

  // Subtle pitch gradient/texture for high-end feel
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    height * 0.55,
    100,
    width / 2,
    height * 0.55,
    900
  );
  bgGrad.addColorStop(0, '#121318');
  bgGrad.addColorStop(1, '#060608');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Pitch markings (minimal, elegant pitch outline)
  if (teamConfig.pitchStyle !== 'pure-black') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2.5;

    // Pitch boundary box
    const pitchMarginX = 60;
    const pitchTopY = 300;
    const pitchBottomY = 1840;
    const pitchWidth = width - pitchMarginX * 2;
    const pitchHeight = pitchBottomY - pitchTopY;

    // Outer border
    drawRoundedRect(ctx, pitchMarginX, pitchTopY, pitchWidth, pitchHeight, 24);
    ctx.stroke();

    // Halfway line (at opponent goal side / top)
    const midY = pitchTopY + 110;
    ctx.beginPath();
    ctx.moveTo(pitchMarginX, midY);
    ctx.lineTo(pitchMarginX + pitchWidth, midY);
    ctx.stroke();

    // Center circle arc
    ctx.beginPath();
    ctx.arc(width / 2, midY, 150, 0, Math.PI);
    ctx.stroke();

    // Penalty Area (Bottom)
    const penWidth = 560;
    const penHeight = 280;
    const penLeft = (width - penWidth) / 2;
    const penTop = pitchBottomY - penHeight;
    ctx.strokeRect(penLeft, penTop, penWidth, penHeight);

    // Goal Area (Bottom 6-yard box)
    const goalAreaWidth = 300;
    const goalAreaHeight = 120;
    const goalAreaLeft = (width - goalAreaWidth) / 2;
    const goalAreaTop = pitchBottomY - goalAreaHeight;
    ctx.strokeRect(goalAreaLeft, goalAreaTop, goalAreaWidth, goalAreaHeight);

    // Penalty spot & arc
    ctx.beginPath();
    ctx.arc(width / 2, pitchBottomY - 200, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width / 2, pitchBottomY - 200, 110, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }

  // 3. Top Header: Logo in alto a sinistra + Titolo e Didascalia perfettamente allineati
  const headerX = 75;
  const headerY = 75;
  // Official oval logo proportions: 500x600 (aspect ratio 5:6)
  const logoW = 125;
  const logoH = 150;

  // Load team logo (draws real uploaded image with original aspect ratio)
  try {
    const logoSrc = teamConfig.logoUrl || DEFAULT_LOGO_PATH;
    const logoImg = await loadImage(logoSrc);
    ctx.save();
    // Maintain natural aspect ratio of the image
    const imgAspect = (logoImg.naturalWidth || logoW) / (logoImg.naturalHeight || logoH);
    const drawH = 150;
    const drawW = drawH * imgAspect;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(logoImg, headerX, headerY, drawW, drawH);
    ctx.restore();
  } catch (err) {
    console.warn('Could not load team logo on canvas:', err);
  }

  // Title typography: Perfectly aligned vertically with the logo
  const textStartX = headerX + logoW + 30;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Subtitle / Caption (default: "XI TITOLARI")
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.letterSpacing = '5px';
  ctx.fillText(
    (teamConfig.subtitle || 'XI TITOLARI').toUpperCase(),
    textStartX,
    headerY + 28
  );

  // Main title (default: "ORNAVASSESE")
  ctx.font = '900 66px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '2.5px';
  ctx.fillText((teamConfig.name || 'ORNAVASSESE').toUpperCase(), textStartX, headerY + 62);

  // Tactical Module Badge on Top-Right
  const badgeWidth = 190;
  const badgeHeight = 56;
  const badgeX = width - badgeWidth - 75;
  const badgeY = headerY + 46;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '2px';
  ctx.fillText(`MODULO ${module.label}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  // 4. Render the 11 Player Circles perfectly arranged (Enlarged diameter: 168px)
  const circleRadius = 84; // 168px diameter in 1080x1920 (enlarged for prominent player photos)

  for (const pos of module.positions) {
    const cx = (pos.x / 100) * width;
    const cy = (pos.y / 100) * height;
    const player = slots[pos.slotId];

    // Shadow underneath circle
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#18181b';
    ctx.fill();
    ctx.restore();

    // Fill circle with player image if available
    let photoDrawn = false;
    if (player?.photoUrl) {
      try {
        const playerImg = await loadImage(player.photoUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, circleRadius - 3.5, 0, Math.PI * 2);
        ctx.clip();
        
        // Center-crop draw
        const imgRatio = playerImg.width / playerImg.height;
        let drawW = (circleRadius - 3.5) * 2;
        let drawH = (circleRadius - 3.5) * 2;
        let drawX = cx - (circleRadius - 3.5);
        let drawY = cy - (circleRadius - 3.5);

        if (imgRatio > 1) {
          drawW = drawH * imgRatio;
          drawX = cx - drawW / 2;
        } else if (imgRatio < 1) {
          drawH = drawW / imgRatio;
          drawY = cy - drawH / 2;
        }

        ctx.drawImage(playerImg, drawX, drawY, drawW, drawH);
        ctx.restore();
        photoDrawn = true;
      } catch {
        photoDrawn = false;
      }
    }

    if (!photoDrawn) {
      // Draw empty circle placeholder or default avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, circleRadius - 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1d22';
      ctx.fill();

      // Role color ring
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (player) {
        // Player surname initials
        const initials = player.name.slice(0, 2).toUpperCase();
        ctx.font = '800 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(initials, cx, cy);
      } else {
        // Empty slot label
        ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(pos.label, cx, cy);
      }
      ctx.restore();
    }

    // High contrast outer border ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = player ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Subtle inner glowing rim
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius - 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Player Surname pill underneath the circle
    const nameText = player ? player.name.toUpperCase() : pos.label;
    ctx.save();
    ctx.font = '800 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1.5px';
    const textMetrics = ctx.measureText(nameText);
    const pillW = Math.max(textMetrics.width + 42, 130);
    const pillH = 44;
    const pillX = cx - pillW / 2;
    const pillY = cy + circleRadius + 12;

    // Pill background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = player ? '#090a0d' : 'rgba(20, 20, 25, 0.85)';
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    // Pill border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = player ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Surname text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = player ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(nameText, cx, pillY + pillH / 2);
    ctx.restore();
  }

  return canvas;
}

// Triggers direct download of 1080x1920 PNG file
export async function downloadLineupGraphic(options: ExportLineupOptions) {
  const canvas = await generateLineupCanvas(options);
  
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `${(options.teamConfig.name || 'ORNAVASSESE').replace(/\s+/g, '_')}_${options.module.label.replace(/-/g, '')}_${Date.now()}.png`;
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
