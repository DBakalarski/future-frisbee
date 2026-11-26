// Test paczki do publikacji: node scripts/test-dist.mjs
// Uruchamia build i sprawdza, czy dist/ ma komplet plików i nic zbędnego.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
execFileSync('node', [join(ROOT, 'scripts/build.mjs')], { stdio: 'ignore' });

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [relative(DIST, join(d, f))]));
const files = existsSync(DIST) ? walk(DIST).sort() : [];
const pages = ['404.html', 'index.html', 'o-mnie.html', 'oferta.html'];
const SERVER = ['.htaccess', 'robots.txt', 'sitemap.xml'];
const SITE = 'https://futurefrisbee.pl';
const read = (f) => readFileSync(join(DIST, f), 'utf8');
const meta = (html, attr, key) => (html.match(new RegExp(`<(?:meta|link)[^>]*${attr}="${key}"[^>]*>`)) || [''])[0].match(/(?:content|href)="([^"]*)"/)?.[1];

const tests = {
  'dist/ ma cztery strony identyczne z wygenerowanymi'() {
    for (const p of pages) {
      assert.ok(files.includes(p), 'brak ' + p);
      assert.equal(readFileSync(join(DIST, p), 'utf8'), readFileSync(join(ROOT, p), 'utf8'), p + ' różni się');
    }
  },
  'każdy plik, do którego odwołują się strony, jest w dist/'() {
    const refs = new Set(pages.flatMap((p) => readFileSync(join(ROOT, p), 'utf8').match(/(photos|logo)\/[\w.-]+/g) || []));
    assert.ok(refs.size > 50, 'za mało odwołań: ' + refs.size);
    for (const r of refs) assert.ok(files.includes(r), 'brak ' + r);
    assert.equal(files.length, pages.length + SERVER.length + refs.size, 'zbędne pliki: ' + files.filter((f) => !pages.includes(f) && !SERVER.includes(f) && !refs.has(f)).join(', '));
  },
  'bez źródeł i plików roboczych'() {
    for (const f of ['support.js', 'styles.css', 'site.js', 'logo/logo-future.png', 'CLAUDE.md'])
      assert.ok(!files.includes(f), f + ' nie powinien trafić do dist/');
    assert.ok(!files.some((f) => f.endsWith('.dc.html')), '.dc.html w dist/');
  },
  'adres kanoniczny i og:url na każdej stronie'() {
    for (const [f, path] of [['index.html', '/'], ['oferta.html', '/oferta.html'], ['o-mnie.html', '/o-mnie.html']]) {
      const h = read(f);
      assert.equal(meta(h, 'rel', 'canonical'), SITE + path, f + ' canonical');
      assert.equal(meta(h, 'property', 'og:url'), SITE + path, f + ' og:url');
    }
  },
  'og:image: pełny adres, plik w paczce, 1200×630'() {
    for (const f of ['index.html', 'oferta.html', 'o-mnie.html']) {
      const img = meta(read(f), 'property', 'og:image');
      assert.ok(img && img.startsWith(SITE + '/'), f + ' og:image: ' + img);
      const local = img.slice(SITE.length + 1);
      assert.ok(files.includes(local), 'brak ' + local);
      const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', join(DIST, local)], { encoding: 'utf8' });
      assert.match(dims, /pixelWidth: 1200[\s\S]*pixelHeight: 630/);
      assert.equal(meta(read(f), 'name', 'twitter:card'), 'summary_large_image');
    }
  },
  '404: noindex, base href="/", bez canonical'() {
    const h = read('404.html');
    assert.equal(meta(h, 'name', 'robots'), 'noindex');
    assert.match(h, /<base href="\/">/);
    assert.equal(meta(h, 'rel', 'canonical'), undefined);
    assert.match(read('.htaccess'), /ErrorDocument 404 \/404\.html/);
  },
  'sitemap.xml: trzy strony, bez 404; robots.txt wskazuje mapę'() {
    const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
    assert.deepEqual(urls, [SITE + '/', SITE + '/o-mnie.html', SITE + '/oferta.html']);
    assert.match(read('robots.txt'), new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
  },
  '.htaccess: https i adres bez www'() {
    const h = read('.htaccess');
    assert.match(h, /RewriteEngine On/);
    assert.match(h, /https:\/\/futurefrisbee\.pl%\{REQUEST_URI\}/);
    assert.match(h, /\^www\\\./);
    // przekierowanie /index.html od razu na https (bez pośredniego http)
    assert.match(h, /RewriteRule \^index\\\.html\$ https:\/\/futurefrisbee\.pl\/ \[L,R=301\]/);
  },
  'linki wewnętrzne bez index.html (żadnych przekierowań)'() {
    for (const f of pages) assert.ok(!/href="index\.html/.test(read(f)), f + ' linkuje do index.html');
    assert.match(read('o-mnie.html'), /href="\.\/#kontakt"/);
  },
  'dane strukturalne (JSON-LD) na stronie głównej'() {
    const m = read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, 'brak JSON-LD');
    const d = JSON.parse(m[1]);
    assert.equal(d.url, SITE + '/');
    assert.equal(d.telephone, '+48795479709');
    assert.equal(d.name, 'Future Frisbee');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
if (failed) { console.log(failed + ' FAIL'); process.exit(1); }
console.log('OK');
