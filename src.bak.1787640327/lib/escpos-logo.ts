/**
 * escpos-logo.ts — Conversor de logo a bitmap ESC/POS
 * 
 * Convierte una imagen (base64 data URL) a comandos ESC/POS GS v 0
 * para impresion directa en impresoras termicas.
 * 
 * Usa Floyd-Steinberg dithering para convertir a 1-bit (blanco/negro).
 * Funciona 100% en el navegador usando Canvas API.
 */

// Ancho maximo en pixeles segun tipo de papel
const PAPER_MAX_PIXELS: Record<string, number> = {
  '55mm': 384,
  '57mm': 384,
  '58mm': 384,
  '80mm': 576,
};

// Altura maxima del logo en pixeles (para no ocupar todo el ticket)
const MAX_LOGO_HEIGHT = 180;

/**
 * Convierte una imagen (data URL base64) a un bitmap ESC/POS.
 * Retorna los bytes del comando GS v 0, o null si falla.
 * 
 * Formato ESC/POS GS v 0:
 *   1D 76 30 00  m  xL xH  yL yH  d1...dk
 *   donde:
 *     m = modo (0x00 = normal)
 *     xL xH = bytes por fila (ancho_pixels / 8)
 *     yL yH = numero de filas (alto en pixeles)
 *     d1...dk = datos del bitmap (1 bit por pixel, MSB primero)
 */
export async function convertLogoToEscpos(
  storeLogo: string,
  paperWidth: string
): Promise<Uint8Array | null> {
  if (!storeLogo) return null;

  const maxW = PAPER_MAX_PIXELS[paperWidth] || 384;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const bitmap = imageToEscposBitmap(img, maxW, MAX_LOGO_HEIGHT);
        resolve(bitmap);
      } catch (e) {
        console.warn('[ESC/POS Logo] Error al convertir logo:', e);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('[ESC/POS Logo] No se pudo cargar la imagen del logo');
      resolve(null);
    };

    img.src = storeLogo;
  });
}

/**
 * Convierte un elemento Image a bytes ESC/POS GS v 0
 */
function imageToEscposBitmap(
  img: HTMLImageElement,
  maxW: number,
  maxH: number
): Uint8Array {
  // Calcular dimensiones manteniendo aspect ratio
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  // Escalar si es mas ancho que el maximo
  if (w > maxW) {
    const scale = maxW / w;
    w = maxW;
    h = Math.round(h * scale);
  }

  // Limitar altura
  if (h > maxH) {
    const scale = maxH / h;
    h = maxH;
    w = Math.round(w * scale);
  }

  // Redondear ancho a multiplo de 8 (requerido por ESC/POS)
  w = Math.ceil(w / 8) * 8;

  // Si la imagen queda muy pequena, no imprimir
  if (w < 8 || h < 8) {
    throw new Error('Logo demasiado pequeno despues del escalamiento');
  }

  // Dibujar en canvas para obtener pixeles
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo obtener contexto 2D');

  // Fondo blanco (los pixeles blancos = sin imprimir)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);

  // Dibujar la imagen centrada
  const drawX = Math.round((w - img.naturalWidth * (w / Math.max(img.naturalWidth, 1))) / 2);
  ctx.drawImage(img, drawX, 0, w, h);

  // Obtener datos de pixeles RGBA
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;

  // Convertir a escala de grises
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const a = pixels[i * 4 + 3];
    // luminancia ITU-R BT.601
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Aplicar alpha: si es transparente, tratar como blanco
    if (a < 128) lum = 255;
    gray[i] = lum;
  }

  // Floyd-Steinberg dithering
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const oldPixel = gray[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      gray[idx] = newPixel;
      const error = oldPixel - newPixel;

      // Difundir error a pixeles vecinos
      if (x + 1 < w) {
        gray[idx + 1] += error * 7 / 16;
      }
      if (y + 1 < h) {
        if (x - 1 >= 0) {
          gray[(y + 1) * w + (x - 1)] += error * 3 / 16;
        }
        gray[(y + 1) * w + x] += error * 5 / 16;
        if (x + 1 < w) {
          gray[(y + 1) * w + (x + 1)] += error * 1 / 16;
        }
      }
    }
  }

  // Empaquetar en 1-bit (MSB primero, 8 pixeles por byte)
  const bytesPerRow = w / 8;
  const bitmapData = new Uint8Array(bytesPerRow * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixelIdx = y * w + x;
      // 0 = negro (imprimir), 255 = blanco (no imprimir)
      if (gray[pixelIdx] === 0) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8); // MSB primero
        bitmapData[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  // Construir comando ESC/POS GS v 0
  // Formato: 1D 76 30 00 [m] [xL] [xH] [yL] [yH] [data...]
  const xL = bytesPerRow & 0xFF;
  const xH = (bytesPerRow >> 8) & 0xFF;
  const yL = h & 0xFF;
  const yH = (h >> 8) & 0xFF;

  const cmdSize = 8 + bitmapData.length;
  const cmd = new Uint8Array(cmdSize);

  // Header del comando GS v 0
  cmd[0] = 0x1D; // GS
  cmd[1] = 0x76; // v
  cmd[2] = 0x30; // funcion 0
  cmd[3] = 0x00; // modo: 0x00 = normal
  cmd[4] = xL;   // bytes por fila (low byte)
  cmd[5] = xH;   // bytes por fila (high byte)
  cmd[6] = yL;   // numero de filas (low byte)
  cmd[7] = yH;   // numero de filas (high byte)

  // Datos del bitmap
  cmd.set(bitmapData, 8);

  return cmd;
}
