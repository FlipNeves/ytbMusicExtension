/**
 * ColorService - Handles color extraction and manipulation
 * 
 * Single Responsibility: Extract dominant colors from images and apply theme colors
 */

import type { RGB } from '../types';

// Canvas elements for color extraction (reused for performance)
let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

/**
 * Extract the dominant color from an image
 * Uses a 1x1 canvas to get the average color
 */
export const extractColor = (imgSrc: string): Promise<RGB> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imgSrc;

        img.onload = () => {
            try {
                if (!colorCanvas) {
                    colorCanvas = document.createElement('canvas');
                    colorCanvas.width = 1;
                    colorCanvas.height = 1;
                    colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
                }

                if (!colorCtx) {
                    throw new Error('Could not get canvas context');
                }

                colorCtx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = colorCtx.getImageData(0, 0, 1, 1).data;
                resolve({ r, g, b });
            } catch {
                // Fallback to red on error
                resolve({ r: 255, g: 0, b: 0 });
            }
        };

        img.onerror = () => resolve({ r: 255, g: 0, b: 0 });
    });
};

/**
 * Adjust color brightness if too dark
 * Ensures text remains readable against dark album art colors
 */
export const adjustColorBrightness = (colorObj: RGB): string => {
    let { r, g, b } = colorObj;

    // Calculate perceived brightness using standard coefficients
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // If too dark, lighten it
    if (brightness < 60) {
        const factor = 1.5;
        r = Math.min(255, r * factor + 50);
        g = Math.min(255, g * factor + 50);
        b = Math.min(255, b * factor + 50);
    }

    return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
};

/**
 * Apply theme color to CSS custom properties
 */
export const applyThemeColor = (color: string): void => {
    document.documentElement.style.setProperty('--ytm-focus-accent', color);
    document.documentElement.style.setProperty('--minha-cor-tema', color);
};

/**
 * Set album art CSS variable
 */
export const setAlbumArtVariable = (url: string): void => {
    document.documentElement.style.setProperty('--ytm-album-art-url', `url('${url}')`);
};

/**
 * Extract color from image and apply as theme
 * Combines extraction, brightness adjustment, and application
 */
export const extractAndApplyTheme = async (imgSrc: string): Promise<string> => {
    const color = await extractColor(imgSrc);
    const adjustedColor = adjustColorBrightness(color);
    applyThemeColor(adjustedColor);
    return adjustedColor;
};
