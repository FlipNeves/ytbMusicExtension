/**
 * Gera a variante Firefox da extensão a partir de dist/.
 *
 * O Firefox (MV3) não suporta background.service_worker — usa background.scripts —
 * e exige browser_specific_settings.gecko para assinatura no AMO.
 * O restante do código (chrome.*, content scripts com world MAIN) é compatível
 * com Firefox 128+.
 */
import { cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const distFirefox = resolve(root, 'dist-firefox');

if (!existsSync(dist)) {
    console.error('dist/ não encontrado. Rode "npm run build" antes.');
    process.exit(1);
}

rmSync(distFirefox, { recursive: true, force: true });
cpSync(dist, distFirefox, { recursive: true });

const manifestPath = resolve(distFirefox, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

delete manifest.minimum_chrome_version;

manifest.background = {
    scripts: ['assets/background.js'],
    type: 'module',
};

manifest.browser_specific_settings = {
    gecko: {
        id: 'focus-music-player@flipneves.dev',
        strict_min_version: '128.0',
    },
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
console.log('Build Firefox gerado em dist-firefox/');
