/**
 * useAutoCollapseSidebar - Mantém o menu lateral do YTM recolhido (opcional)
 *
 * Clica no hambúrguer do próprio YTM (em vez de esconder via CSS) para que o
 * app recalcule o layout sozinho. Um MutationObserver no atributo `opened` do
 * drawer reage na hora; o DomWatcher re-adquire o drawer quando a SPA o recria.
 *
 * Com a preferência desligada nada é feito e o hambúrguer volta a aparecer
 * (a classe COLLAPSE_CLASS no <html> é o que o esconde no sidebar.css).
 */

import { useEffect } from 'react';
import { SELECTORS } from '../constants';
import { watchDom } from '../services/DomWatcher';

const COLLAPSE_CLASS = 'fmp-collapse-sidebar';

/** Cooldown entre cliques: evita loop caso o clique não surta efeito */
const CLICK_COOLDOWN_MS = 1000;

export const useAutoCollapseSidebar = (enabled: boolean): void => {
    useEffect(() => {
        document.documentElement.classList.toggle(COLLAPSE_CLASS, enabled);
        if (!enabled) return;

        let lastClick = 0;
        let observer: MutationObserver | null = null;
        let observedDrawer: Element | null = null;

        const collapseIfExpanded = () => {
            // Drawer expandido tem o atributo `opened`; recolhido vira o rail #mini-guide
            const drawer = document.querySelector(SELECTORS.GUIDE_DRAWER);
            if (!drawer || !drawer.hasAttribute('opened')) return;

            const now = Date.now();
            if (now - lastClick < CLICK_COOLDOWN_MS) return;

            const toggle = document.querySelector<HTMLElement>(SELECTORS.GUIDE_TOGGLE);
            if (!toggle) return;

            lastClick = now;
            toggle.click();
        };

        const ensureObserver = () => {
            const drawer = document.querySelector(SELECTORS.GUIDE_DRAWER);
            if (!drawer) return;
            if (drawer === observedDrawer && observedDrawer.isConnected) return;

            observer?.disconnect();
            observedDrawer = drawer;
            observer = new MutationObserver(collapseIfExpanded);
            observer.observe(drawer, { attributes: true, attributeFilter: ['opened'] });
        };

        const stopWatching = watchDom(() => {
            ensureObserver();
            collapseIfExpanded();
        });

        return () => {
            stopWatching();
            observer?.disconnect();
            document.documentElement.classList.remove(COLLAPSE_CLASS);
        };
    }, [enabled]);
};
