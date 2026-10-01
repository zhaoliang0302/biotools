import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { iterations, readSources, bundleApp, encryptApp, decryptApp, sourceHash } from './build-private-site.mjs';

const sources = await readSources();
const app = bundleApp(sources);
const password = 'test-only-long-password-123';
const encrypted = encryptApp(app, password, sourceHash(sources));

test('encrypted app contains the current complete tool and decrypts with browser Web Crypto', async () => {
    const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.from(encrypted.salt, 'base64'), iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const decrypted = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(encrypted.iv, 'base64'), tagLength: 128 }, key, Buffer.from(encrypted.ciphertext, 'base64'));
    assert.equal(new TextDecoder().decode(decrypted), app);
    for (const module of ['module-lipo', 'module-tic', 'module-qpcr']) assert.ok(app.includes(module));
    assert.ok(app.includes(sources[1]));
    assert.ok(app.includes('buildQpcrCdnaVolumeChecks'));
    assert.ok(!app.includes('src="script.js"'));
    assert.ok(!app.includes('href="style.css"'));
    assert.ok(!JSON.stringify(encrypted).includes(password));
    assert.ok(!JSON.stringify(encrypted).includes('buildQpcrCdnaVolumeChecks'));
});

test('incorrect password and tampered payload cannot unlock the app', () => {
    assert.throws(() => decryptApp(encrypted, 'incorrect-password'));
    const bytes = Buffer.from(encrypted.ciphertext, 'base64');
    bytes[10] ^= 1;
    assert.throws(() => decryptApp({ ...encrypted, ciphertext: bytes.toString('base64') }, password));
});

test('each publication uses a fresh salt and IV', () => {
    const next = encryptApp(app, password, sourceHash(sources));
    assert.notEqual(next.salt, encrypted.salt);
    assert.notEqual(next.iv, encrypted.iv);
    assert.notEqual(next.ciphertext, encrypted.ciphertext);
});

test('source fingerprint catches changes to either the tool or login page', () => {
    for (let i = 0; i < sources.length; i++) {
        const changed = sources.slice();
        changed[i] += '\n';
        assert.notEqual(sourceHash(changed), sourceHash(sources));
    }
});

test('latest qPCR volume checks handle sufficient, borderline and insufficient cDNA', () => {
    const context = vm.createContext({ document: { addEventListener() {} } });
    vm.runInContext(sources[2], context);
    const checks = context.buildQpcrCdnaVolumeChecks([
        { group: 'sufficient', cdna: 40 },
        { group: 'borderline', cdna: 100 },
        { group: 'insufficient', cdna: 120 }
    ], 5);
    assert.equal(checks[0].isCdnaVolumeSufficient, true);
    assert.equal(checks[1].isCdnaVolumeSufficient, true);
    assert.equal(checks[2].isCdnaVolumeSufficient, false);
    assert.equal(checks[2].cdnaShortfall, 20);
    assert.equal(checks[2].requiredRtReactions, 2);
    assert.equal(context.buildQpcrCdnaVolumeChecks([{ group: 'undiluted', cdna: 21 }], 0.5)[0].dilutedCdnaAvailable, 20);
});

test('published login JavaScript parses independently of the encrypted tool', () => {
    const script = sources[3].match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.doesNotThrow(() => new vm.Script(script));
});

test('login clears credentials, removes decrypted content on logout, and expires after inactivity', async () => {
    let now = 1000;
    let timer;
    const elements = new Map();
    const element = () => ({
        hidden: false, value: '', textContent: '', disabled: false,
        listeners: {}, children: [], removed: false,
        addEventListener(name, listener) { this.listeners[name] = listener; },
        appendChild(child) { this.children.push(child); },
        remove() { this.removed = true; this.srcdoc = ''; },
        focus() {}, select() {}
    });
    for (const id of ['login', 'workspace', 'password', 'message', 'submit', 'show-password', 'lock', 'form']) {
        elements.set(id, element());
    }
    elements.get('workspace').hidden = true;
    const document = {
        listeners: {},
        getElementById(id) { return elements.get(id); },
        addEventListener(name, listener) { this.listeners[name] = listener; },
        createElement() { return element(); }
    };
    const context = vm.createContext({
        document, window: { crypto: webcrypto, addEventListener() {} }, crypto: webcrypto,
        fetch: async () => ({ ok: true, json: async () => encrypted }),
        atob: value => Buffer.from(value, 'base64').toString('binary'),
        TextEncoder, TextDecoder, Uint8Array, Date: { now: () => now },
        setInterval(callback) { timer = callback; return 1; }, clearInterval() { timer = null; }
    });
    vm.runInContext(sources[3].match(/<script>([\s\S]*?)<\/script>/)[1], context);
    const submitForm = () => elements.get('form').listeners.submit({ preventDefault() {} });
    elements.get('password').value = 'incorrect-password';
    await submitForm();
    assert.equal(elements.get('workspace').hidden, true);
    assert.equal(elements.get('workspace').children.length, 0);
    elements.get('password').value = password;
    await submitForm();
    assert.equal(elements.get('password').value, '');
    assert.equal(elements.get('workspace').hidden, false);
    assert.equal(elements.get('workspace').children[0].srcdoc, app);
    elements.get('lock').listeners.click();
    assert.equal(elements.get('workspace').children[0].removed, true);
    assert.equal(elements.get('workspace').hidden, true);
    elements.get('password').value = password;
    await submitForm();
    now += 29 * 60 * 1000;
    document.listeners.pointerdown();
    now += 29 * 60 * 1000;
    timer();
    assert.equal(elements.get('workspace').hidden, false, 'activity extends the idle deadline');
    now += 60 * 1000;
    document.listeners.pointerdown();
    assert.equal(elements.get('workspace').hidden, true, 'an expired session cannot be revived by activity');
    assert.equal(elements.get('workspace').children[1].removed, true);
    assert.equal(elements.get('password').value, '');
    assert.equal(timer, null);
});
