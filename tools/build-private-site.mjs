import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const iterations = 600000;
const files = ['index.html', 'style.css', 'script.js', 'tools/login.html'];

export async function readSources() {
    return Promise.all(files.map(file => readFile(resolve(root, file), 'utf8')));
}

export function sourceHash(sources) {
    return createHash('sha256').update(JSON.stringify(sources)).digest('hex');
}

export function bundleApp([html, css, script]) {
    const bundled = html
        .replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`)
        .replace('<script src="script.js"></script>', () => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`);
    if (bundled === html || /(?:src="script\.js"|href="style\.css")/.test(bundled)) {
        throw new Error('The application assets were not bundled correctly.');
    }
    return bundled;
}

export function encryptApp(html, password, hash) {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    key.fill(0);
    return {
        version: 1, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations,
        sourceHash: hash,
        salt: salt.toString('base64'), iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64')
    };
}

export function decryptApp(payload, password) {
    const key = pbkdf2Sync(password, Buffer.from(payload.salt, 'base64'), payload.iterations, 32, 'sha256');
    const encrypted = Buffer.from(payload.ciphertext, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(encrypted.subarray(-16));
    try {
        return Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString('utf8');
    } finally {
        key.fill(0);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const sources = await readSources();
    const hash = sourceHash(sources);
    const output = resolve(root, 'private-site');
    if (args.includes('--check')) {
        const payload = JSON.parse(await readFile(resolve(output, 'encrypted-app.json'), 'utf8'));
        const entries = (await readdir(output)).sort();
        if (JSON.stringify(entries) !== JSON.stringify(['encrypted-app.json', 'index.html'])) {
            throw new Error('Only the login page and encrypted application may be published.');
        }
        if (payload.sourceHash !== hash || payload.version !== 1 || payload.iterations !== iterations ||
            payload.algorithm !== 'AES-GCM' || payload.kdf !== 'PBKDF2-SHA256') {
            throw new Error('The encrypted build is out of date. Run node tools/build-private-site.mjs locally before pushing.');
        }
        if (await readFile(resolve(output, 'index.html'), 'utf8') !== sources[3]) {
            throw new Error('The published login page is out of date.');
        }
        console.log('Verified: current sources, encrypted payload, and only two public files.');
        return;
    }
    const passwordFile = resolve(root, '.local/access-password.txt');
    if (args.includes('--generate-password')) {
        await mkdir(dirname(passwordFile), { recursive: true });
        await writeFile(passwordFile, randomBytes(18).toString('base64url') + '\n', { mode: 0o600, flag: 'wx' });
    }
    const password = (await readFile(passwordFile, 'utf8')).trim();
    if (password.length < 16) throw new Error('Use a dedicated access password of at least 16 characters.');
    const html = bundleApp(sources);
    const payload = encryptApp(html, password, hash);
    if (decryptApp(payload, password) !== html) throw new Error('Encryption verification failed.');
    await mkdir(output, { recursive: true });
    await writeFile(resolve(output, 'encrypted-app.json'), JSON.stringify(payload));
    await writeFile(resolve(output, 'index.html'), sources[3]);
    console.log('Private site built and decryption verified. Password stays in .local/access-password.txt.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
