import { describe, it, expect } from 'vitest';
import { averageColor, contrastRatio, ensureContrast, pickAccentColor } from './ColorService';
import { BRAND_COLOR } from '../constants';

/** Monta pixels RGBA a partir de [cor, quantidade] */
const pixelsOf = (...groups: [[number, number, number], number][]): number[] =>
    groups.flatMap(([[r, g, b], count]) => Array.from({ length: count }, () => [r, g, b, 255]).flat());

const DARK = { r: 18, g: 18, b: 18 };

describe('pickAccentColor', () => {
    it('escolhe a cor viva mais presente, ignorando o fundo neutro', () => {
        const pixels = pixelsOf(
            [[20, 20, 20], 600],   // fundo quase preto
            [[230, 60, 40], 250],  // vermelho dominante
            [[40, 90, 220], 80],   // azul secundário
        );

        const color = pickAccentColor(pixels)!;
        expect(color.r).toBeGreaterThan(color.b);
        expect(color.r).toBeGreaterThan(200);
    });

    it('agrupa variações do mesmo tom (gradiente) em vez de dividir os votos', () => {
        const pixels = pixelsOf(
            [[40, 160, 60], 60], [[50, 180, 70], 60], [[60, 200, 80], 60], // verde em gradiente
            [[220, 200, 40], 120],                                          // amarelo sólido
        );

        const color = pickAccentColor(pixels)!;
        expect(color.g).toBeGreaterThan(color.r);
    });

    it('devolve null para capas sem cor (preto, branco e cinza)', () => {
        const pixels = pixelsOf([[0, 0, 0], 100], [[250, 250, 250], 100], [[128, 128, 128], 100]);
        expect(pickAccentColor(pixels)).toBeNull();
    });

    it('ignora pixels transparentes', () => {
        expect(pickAccentColor([230, 60, 40, 0, 230, 60, 40, 10])).toBeNull();
    });
});

describe('averageColor', () => {
    it('faz a média dos pixels opacos', () => {
        expect(averageColor(pixelsOf([[0, 0, 0], 1], [[200, 100, 50], 1]))).toEqual({ r: 100, g: 50, b: 25 });
    });

    it('devolve null sem pixels', () => {
        expect(averageColor([])).toBeNull();
    });
});

describe('ensureContrast', () => {
    it('clareia cores escuras até o contraste mínimo contra o fundo do modo foco', () => {
        const color = ensureContrast({ r: 60, g: 20, b: 90 });
        expect(contrastRatio(color, DARK)).toBeGreaterThanOrEqual(4.5);
    });

    it('mantém cores que já têm contraste', () => {
        expect(ensureContrast({ r: 255, g: 176, b: 32 })).toEqual({ r: 255, g: 176, b: 32 });
    });

    it('não ultrapassa 255 ao clarear', () => {
        const color = ensureContrast({ r: 0, g: 0, b: 255 });
        [color.r, color.g, color.b].forEach((value) => expect(value).toBeLessThanOrEqual(255));
    });
});

describe('BRAND_COLOR', () => {
    it('serve de destaque sem capa: tem o contraste mínimo contra o fundo do modo foco', () => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(BRAND_COLOR.slice(i, i + 2), 16));
        expect(contrastRatio({ r, g, b }, DARK)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('contrastRatio', () => {
    it('vai de 1 (cores iguais) a 21 (preto e branco)', () => {
        expect(contrastRatio(DARK, DARK)).toBeCloseTo(1);
        expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21);
    });
});
