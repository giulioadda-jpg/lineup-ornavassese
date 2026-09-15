/**
 * Utility to optimize and compress user-uploaded player photos.
 * Prevents browser memory overload and localStorage QuotaExceededError crashes.
 */

export async function optimizeImageFile(
  file: File | Blob,
  maxDimension = 480,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Il file fornito non è un\'immagine valida'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        // Calculate aspect ratio preserving dimensions
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return reject(new Error('Impossibile determinare le dimensioni dell\'immagine'));
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Draw to offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Impossibile creare il contesto grafico 2D'));
        }

        // Smooth image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality compressed JPEG (standard ~25KB - 40KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Errore durante il caricamento dell'immagine: ${err}`));
    };

    img.src = objectUrl;
  });
}
