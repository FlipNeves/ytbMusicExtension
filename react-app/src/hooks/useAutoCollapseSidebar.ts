/**
 * useAutoCollapseSidebar - Mantém o menu lateral do YTM sempre recolhido
 *
 * Clica no hambúrguer do próprio YTM (em vez de esconder via CSS) para que o
 * app recalcule o layout sozinho. Um MutationObserver no atributo `opened` do
 * drawer reage na hora; o intervalo re-adquire o drawer quando a SPA o recria.
 */

import { useEffect } from 'react';

const DRAWER_SELECTOR = 'tp-yt-app-drawer#guide';
const TOGGLE_SELECTOR = 'ytmusic-nav-bar yt-icon-button#guide-button button, ytmusic-nav-bar yt-icon-button#guide-button';

const CHECK_INTERVAL_MS = 1000;
/** Cooldown entre cliques: evita loop caso o clique não surta efeito */
const CLICK_COOLDOWN_MS = 1000;

export const useAutoCollapseSidebar = (): void => {
    useEffect(() => {
        let lastClick = 0;
        let observer: MutationObserver | null = null;
        let observedDrawer: Element | null = null;

        const collapseIfExpanded = () => {
            // Drawer expandido tem o atributo `opened`; recolhido vira o rail #mini-guide
            const drawer = document.querySelector(DRAWER_SELECTOR);
            if (!drawer || !drawer.hasAttribute('opened')) return;

            const now = Date.now();
            if (now - lastClick < CLICK_COOLDOWN_MS) return;

            const toggle = document.querySelector<HTMLElement>(TOGGLE_SELECTOR);
            if (!toggle) return;

            lastClick = now;
            toggle.click();
        };

        const ensureObserver = () => {
            const drawer = document.querySelector(DRAWER_SELECTOR);
            if (!drawer) return;
            if (drawer === observedDrawer && observedDrawer.isConnected) return;

            observer?.disconnect();
            observedDrawer = drawer;
            observer = new MutationObserver(collapseIfExpanded);
            observer.observe(drawer, { attributes: true, attributeFilter: ['opened'] });
        };

        const tick = () => {
            ensureObserver();
            collapseIfExpanded();
        };

        tick();
        const interval = setInterval(tick, CHECK_INTERVAL_MS);

        return () => {
            clearInterval(interval);
            observer?.disconnect();
        };
    }, []);
};
