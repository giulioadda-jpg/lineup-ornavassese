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

  // 1. Deep Matte Black Background
  ctx.fillStyle = '#080809';
  ctx.fillRect(0, 0, width, height);

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

  // 2. Pitch markings
  if (teamConfig.pitchStyle !== 'pure-black') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2.5;

    const pitchMarginX = 60;
    const pitchTopY = 300;
    const pitchBottomY = 1840;
    const pitchWidth = width - pitchMarginX * 2;
    const pitchHeight = pitchBottomY - pitchTopY;

    drawRoundedRect(ctx, pitchMarginX, pitchTopY, pitchWidth, pitchHeight, 24);
    ctx.stroke();

    const midY = pitchTopY + 110;
    ctx.beginPath();
    ctx.moveTo(pitchMarginX, midY);
    ctx.lineTo(pitchMarginX + pitchWidth, midY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width / 2, midY, 150, 0, Math.PI);
    ctx.stroke();

    const penWidth = 560;
    const penHeight = 280;
    const penLeft = (width - penWidth) / 2;
    const penTop = pitchBottomY - penHeight;
    ctx.strokeRect(penLeft, penTop, penWidth, penHeight);

    const goalAreaWidth = 300;
    const goalAreaHeight = 120;
    const goalAreaLeft = (width - goalAreaWidth) / 2;
    const goalAreaTop = pitchBottomY - goalAreaHeight;
    ctx.strokeRect(goalAreaLeft, goalAreaTop, goalAreaWidth, goalAreaHeight);

    ctx.beginPath();
    ctx.arc(width / 2, pitchBottomY - 200, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width / 2, pitchBottomY - 200, 110, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }

  // 3. Top Header
  const headerX = 75;
  const headerY = 75;
  const logoW = 125;
  const logoH = 150;

  try {
    const logoSrc = teamConfig.logoUrl || DEFAULT_LOGO_PATH;
    const logoImg = await loadImage(logoSrc);
    ctx.save();
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

  const textStartX = headerX + logoW + 30;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.letterSpacing = '5px';
  ctx.fillText(
    (teamConfig.subtitle || 'XI TITOLARI').toUpperCase(),
    textStartX,
    headerY + 28
  );

  ctx.font = '900 66px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '2.5px';
  ctx.fillText((teamConfig.name || 'ORNAVASSESE').toUpperCase(), textStartX, headerY + 62);

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

  // 4. Render FUT Cards - Ingrandite a 250px di larghezza mantenendo le proporzioni
  const targetCardWidth = 250;

  for (const pos of module.positions) {
    const cx = (pos.x / 100) * width;
    const cy = (pos.y / 100) * height;
    const player = slots[pos.slotId];
    const playerPhotoSrc = player?.photo || player?.photoUrl;

    let cardDrawn = false;
    if (playerPhotoSrc) {
      try {
        const cardImg = await loadImage(playerPhotoSrc);
        const natW = cardImg.naturalWidth || cardImg.width || 500;
        const natH = cardImg.naturalHeight || cardImg.height || 600;
        const cardW = targetCardWidth;
        const cardH = (targetCardWidth * natH) / natW;

        const cardX = cx - cardW / 2;
        const cardY = cy - cardH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 12;
        ctx.drawImage(cardImg, cardX, cardY, cardW, cardH);
        ctx.restore();
        cardDrawn = true;
      } catch {
        cardDrawn = false;
      }
    }

    if (!cardDrawn) {
      const cardW = targetCardWidth;
      const cardH = 312;
      const cardX = cx - cardW / 2;
      const cardY = cy - cardH / 2;

      ctx.save();
      ctx.fillStyle = '#1c1d22';
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(player ? player.name.slice(0, 3).toUpperCase() : pos.label, cx, cy);
      ctx.restore();
    }
  }

  return canvas;
}

export async function downloadLineupGraphic(options:ExportLineupOptions) {
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
