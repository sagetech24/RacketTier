import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.resolve('public/build');
const publicDir = path.resolve('public');
const swSource = path.join(buildDir, 'sw.js');
const swDest = path.join(publicDir, 'sw.js');

if (!fs.existsSync(swSource)) {
    console.warn('[copy-pwa-sw] No service worker found at public/build/sw.js — skipping.');
    process.exit(0);
}

/**
 * The SW is served from /sw.js (site root) so it can use scope `/`.
 * Precache entries are generated relative to /build/, so rewrite them to
 * absolute /build/... paths before writing the root copy.
 */
let swContent = fs.readFileSync(swSource, 'utf8');
swContent = swContent.replace(/\{url:"assets\//g, '{url:"/build/assets/');
swContent = swContent.replace(
    /\{url:"manifest\.webmanifest"/g,
    '{url:"/build/manifest.webmanifest"',
);
fs.writeFileSync(swDest, swContent);

for (const name of fs.readdirSync(publicDir)) {
    if (name.startsWith('workbox-') && name.endsWith('.js')) {
        fs.unlinkSync(path.join(publicDir, name));
    }
}

for (const name of fs.readdirSync(buildDir)) {
    if (name.startsWith('workbox-') && name.endsWith('.js')) {
        fs.copyFileSync(path.join(buildDir, name), path.join(publicDir, name));
    }
}

console.log('[copy-pwa-sw] Copied sw.js and workbox bundle to public/ for site-root scope.');
