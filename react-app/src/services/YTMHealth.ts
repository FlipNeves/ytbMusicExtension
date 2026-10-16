/**
 * YTMHealth - Alarme de mudanças no YouTube Music
 *
 * A extensão depende do DOM do YTM. Quando um seletor crítico some (o YTM
 * mudou), avisa uma vez no console, em vez de o recurso falhar em silêncio
 * — foi assim que o compartilhar passou a gerar o link da home.
 */

import { CRITICAL_SELECTORS, SELECTORS, type SelectorName } from '../constants';

const reported = new Set<SelectorName>();

/** Seletores críticos ausentes em `root` */
export const findMissingSelectors = (root: Pick<ParentNode, 'querySelector'>): SelectorName[] =>
    CRITICAL_SELECTORS.filter((name) => !root.querySelector(SELECTORS[name]));

/**
 * Verifica a player bar com uma música carregada (antes disso, partes dela
 * ainda não existem e o aviso seria falso)
 */
export const checkPlayerSelectors = (): void => {
    for (const name of findMissingSelectors(document)) {
        if (reported.has(name)) continue;
        reported.add(name);
        console.warn(
            `[Focus Mode for YouTube Music] O YouTube Music mudou: "${SELECTORS[name]}" (${name}) não foi encontrado. ` +
            'Recursos que dependem dele podem não funcionar.'
        );
    }
};
