/**
 * DomWatcher - Um único observador de mudanças na página
 *
 * O YTM recria partes do DOM durante a navegação SPA (player bar, nav bar,
 * <video>). Em vez de cada componente checar com setInterval, todos se
 * inscrevem aqui: um MutationObserver agrupa as mudanças e chama os
 * inscritos no máximo a cada FLUSH_INTERVAL_MS — e nada roda com a página parada.
 */

type Listener = () => void;

const FLUSH_INTERVAL_MS = 250;

const listeners = new Set<Listener>();
let observer: MutationObserver | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const flush = () => {
    timer = null;
    listeners.forEach((listener) => {
        try {
            listener();
        } catch (error) {
            console.error('[DomWatcher] Listener error:', error);
        }
    });
};

const schedule = () => {
    if (timer === null) {
        timer = setTimeout(flush, FLUSH_INTERVAL_MS);
    }
};

/**
 * Chama `listener` agora e sempre que o DOM mudar (agrupado).
 * Retorna a função de cancelamento.
 */
export const watchDom = (listener: Listener): (() => void) => {
    listeners.add(listener);

    if (!observer) {
        observer = new MutationObserver(schedule);
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    listener();

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            observer?.disconnect();
            observer = null;
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        }
    };
};
