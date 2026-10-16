import { describe, it, expect } from 'vitest';
import { buildTrackUrl, getQueueTarget, getVideoIdFromUrl } from './TrackUrl';

describe('getVideoIdFromUrl', () => {
    it('extrai o id de uma URL /watch, ignorando a fila', () => {
        expect(getVideoIdFromUrl('https://music.youtube.com/watch?v=BfYF_pnrKKM&list=RDAMVMszWX1HhMZvI'))
            .toBe('BfYF_pnrKKM');
    });

    it('retorna null fora da página /watch (a URL não identifica a música)', () => {
        expect(getVideoIdFromUrl('https://music.youtube.com/')).toBeNull();
        expect(getVideoIdFromUrl('https://music.youtube.com/library/playlists')).toBeNull();
        expect(getVideoIdFromUrl('https://music.youtube.com/playlist?list=PL123')).toBeNull();
    });

    it('retorna null para /watch sem v e para URLs inválidas', () => {
        expect(getVideoIdFromUrl('https://music.youtube.com/watch?list=PL123')).toBeNull();
        expect(getVideoIdFromUrl('não é uma url')).toBeNull();
    });
});

describe('buildTrackUrl', () => {
    it('gera o link canônico da faixa, sem a fila', () => {
        expect(buildTrackUrl('BfYF_pnrKKM')).toBe('https://music.youtube.com/watch?v=BfYF_pnrKKM');
    });

    it('inclui a fila quando pedida (reabrir a sessão com o mesmo rádio)', () => {
        expect(buildTrackUrl('BfYF_pnrKKM', 'RDAMVMszWX1HhMZvI'))
            .toBe('https://music.youtube.com/watch?v=BfYF_pnrKKM&list=RDAMVMszWX1HhMZvI');
    });
});

describe('getQueueTarget', () => {
    it('usa só a faixa de um link /watch, mesmo com fila', () => {
        expect(getQueueTarget('https://music.youtube.com/watch?v=abc&list=RD123')).toEqual({ videoId: 'abc' });
    });

    it('usa a playlist de um link /playlist', () => {
        expect(getQueueTarget('https://music.youtube.com/playlist?list=PL123')).toEqual({ playlistId: 'PL123' });
    });

    it('não enfileira páginas de álbum, artista ou busca', () => {
        expect(getQueueTarget('https://music.youtube.com/browse/MPREb_123')).toBeNull();
        expect(getQueueTarget('https://music.youtube.com/channel/UC123')).toBeNull();
        expect(getQueueTarget('https://music.youtube.com/search?q=djavan')).toBeNull();
        expect(getQueueTarget('lixo')).toBeNull();
    });
});
