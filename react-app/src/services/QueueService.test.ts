import { describe, it, expect } from 'vitest';
import { dedupeCounterparts } from './QueueService';

const track = (title: string, artist: string, isVideo: boolean) => ({ title, artist, isVideo });

describe('dedupeCounterparts', () => {
    it('remove a duplicata música/vídeo, preferindo a versão música', () => {
        const result = dedupeCounterparts([
            track('Fica com Deus', 'Artista A', true),
            track('Fica com Deus', 'Artista A', false),
            track('Outra Música', 'Artista B', false),
        ]);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(track('Fica com Deus', 'Artista A', false));
        expect(result[1].title).toBe('Outra Música');
    });

    it('mantém a versão música quando ela vem primeiro', () => {
        const result = dedupeCounterparts([
            track('Fica com Deus', 'Artista A', false),
            track('Fica com Deus', 'Artista A', true),
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].isVideo).toBe(false);
    });

    it('preserva a ordem da primeira ocorrência', () => {
        const result = dedupeCounterparts([
            track('A', 'X', false),
            track('B', 'Y', true),
            track('A', 'X', true),
            track('C', 'Z', false),
        ]);

        expect(result.map((t) => t.title)).toEqual(['A', 'B', 'C']);
    });

    it('compara título/artista sem diferenciar maiúsculas', () => {
        const result = dedupeCounterparts([
            track('Fica Com Deus', 'ARTISTA A', true),
            track('fica com deus', 'Artista A', false),
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].isVideo).toBe(false);
    });

    it('não colapsa faixas de mesmo título com artistas diferentes', () => {
        const result = dedupeCounterparts([
            track('Saudade', 'Artista A', false),
            track('Saudade', 'Artista B', false),
        ]);

        expect(result).toHaveLength(2);
    });

    it('mantém vídeos sem counterpart (conteúdo só em vídeo)', () => {
        const result = dedupeCounterparts([
            track('Show Ao Vivo Completo', 'Artista A', true),
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].isVideo).toBe(true);
    });
});
