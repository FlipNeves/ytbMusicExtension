/**
 * ColorService - Cor de destaque a partir da capa
 *
 * Single Responsibility: escolher a cor de destaque da capa e aplicá-la como
 * tema (variáveis CSS). Sem capa legível, o destaque é a cor da extensão.
 */

import type { RGB } from '../types';
import { BRAND_COLOR } from '../constants';

/** Fundo escuro do modo foco e do YTM: o destaque precisa de contraste contra ele */
const DARK_BACKGROUND: RGB = { r: 18, g: 18, b: 18 };

/** WCAG AA para texto normal */
const MIN_CONTRAST = 4.5;

/** A capa é reduzida para este tamanho antes da análise */
const SAMPLE_SIZE = 32;

/** Faixas de matiz (20° cada) usadas para agrupar as cores */
const HUE_BINS = 18;

let sampleCanvas: HTMLCanvasElement | null = null;
let sampleCtx: CanvasRenderingContext2D | null = null;

/** Luminância relativa (WCAG 2.x) */
export const relativeLuminance = ({ r, g, b }: RGB): number => {
    const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (a: RGB, b: RGB): number => {
    const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
};

/** Clareia a cor (misturando com branco) até ter contraste mínimo contra o fundo */
export const ensureContrast = (color: RGB, background: RGB = DARK_BACKGROUND, minRatio = MIN_CONTRAST): RGB => {
    let current = { ...color };
    for (let step = 0; step < 20 && contrastRatio(current, background) < minRatio; step++) {
        current = {
            r: Math.round(current.r + (255 - current.r) * 0.1),
            g: Math.round(current.g + (255 - current.g) * 0.1),
            b: Math.round(current.b + (255 - current.b) * 0.1),
        };
    }
    return current;
};

const hueOf = (r: number, g: number, b: number, max: number, min: number): number => {
    const delta = max - min;
    if (delta === 0) return 0;
    let hue: number;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    return hue < 0 ? hue + 360 : hue;
};

/**
 * Escolhe a cor de destaque de uma capa a partir dos pixels RGBA.
 *
 * A média de todos os pixels dava tons barrentos. Aqui os pixels são
 * agrupados por matiz e vence o grupo mais presente, ponderado pela
 * saturação: uma cor viva que de fato aparece na capa. Cinzas, quase pretos
 * e quase brancos não concorrem; capa toda neutra devolve null.
 */
export const pickAccentColor = (pixels: ArrayLike<number>): RGB | null => {
    const bins = Array.from({ length: HUE_BINS }, () => ({ count: 0, r: 0, g: 0, b: 0, saturation: 0 }));

    for (let i = 0; i + 3 < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (pixels[i + 3] < 128) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const value = max / 255;
        if (saturation < 0.25 || value < 0.2) continue;
        if (value > 0.95 && saturation < 0.35) continue;

        const bin = bins[Math.floor(hueOf(r, g, b, max, min) / (360 / HUE_BINS)) % HUE_BINS];
        bin.count++;
        bin.r += r;
        bin.g += g;
        bin.b += b;
        bin.saturation += saturation;
    }

    let best: RGB | null = null;
    let bestScore = 0;
    for (const bin of bins) {
        if (bin.count === 0) continue;
        const score = bin.count * (0.5 + bin.saturation / bin.count);
        if (score > bestScore) {
            bestScore = score;
            best = {
                r: Math.round(bin.r / bin.count),
                g: Math.round(bin.g / bin.count),
                b: Math.round(bin.b / bin.count),
            };
        }
    }
    return best;
};

/** Média simples dos pixels opacos (capas neutras, sem cor viva) */
export const averageColor = (pixels: ArrayLike<number>): RGB | null => {
    let count = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i + 3 < pixels.length; i += 4) {
        if (pixels[i + 3] < 128) continue;
        count++;
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
    }
    return count === 0 ? null : { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
};

export const toCssColor = ({ r, g, b }: RGB): string => `rgb(${r}, ${g}, ${b})`;

/**
 * Cor de destaque de uma imagem, já com contraste garantido.
 * Resolve null se a imagem não puder ser lida (rede, CORS).
 */
export const extractColor = (imgSrc: string): Promise<RGB | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imgSrc;

        img.onload = () => {
            try {
                if (!sampleCanvas) {
                    sampleCanvas = document.createElement('canvas');
                    sampleCanvas.width = SAMPLE_SIZE;
                    sampleCanvas.height = SAMPLE_SIZE;
                    sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
                }
                if (!sampleCtx) {
                    resolve(null);
                    return;
                }

                sampleCtx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
                sampleCtx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
                const { data } = sampleCtx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
                const color = pickAccentColor(data) ?? averageColor(data);
                resolve(color ? ensureContrast(color) : null);
            } catch {
                resolve(null);
            }
        };

        img.onerror = () => resolve(null);
    });
};

/**
 * Apply theme color to CSS custom properties
 */
export const applyThemeColor = (color: string): void => {
    document.documentElement.style.setProperty('--ytm-focus-accent', color);
};

/**
 * Set album art CSS variable
 */
export const setAlbumArtVariable = (url: string): void => {
    document.documentElement.style.setProperty('--ytm-album-art-url', `url('${url}')`);
};

/**
 * Extract color from image and apply as theme
 * (cor da extensão quando a capa não pode ser lida)
 */
export const extractAndApplyTheme = async (imgSrc: string): Promise<string> => {
    const color = await extractColor(imgSrc);
    const css = color ? toCssColor(color) : BRAND_COLOR;
    applyThemeColor(css);
    return css;
};
