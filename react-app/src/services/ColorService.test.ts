import { describe, it, expect } from 'vitest';
import { adjustColorBrightness } from './ColorService';

describe('adjustColorBrightness', () => {
    it('mantém cores claras inalteradas', () => {
        expect(adjustColorBrightness({ r: 200, g: 200, b: 200 })).toBe('rgb(200,200,200)');
    });

    it('clareia cores muito escuras', () => {
        const result = adjustColorBrightness({ r: 10, g: 10, b: 10 });
        const [r, g, b] = result.match(/\d+/g)!.map(Number);
        expect(r).toBeGreaterThan(10);
        expect(g).toBeGreaterThan(10);
        expect(b).toBeGreaterThan(10);
    });

    it('não ultrapassa 255 ao clarear', () => {
        const result = adjustColorBrightness({ r: 0, g: 0, b: 255 });
        const values = result.match(/\d+/g)!.map(Number);
        values.forEach(v => expect(v).toBeLessThanOrEqual(255));
    });
});
