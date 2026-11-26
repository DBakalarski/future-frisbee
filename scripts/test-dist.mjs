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
const pages = ['index.html', 'o-mnie.html', 'oferta.html'];

const tests = {
  'dist/ ma trzy strony identyczne z wygenerowanymi'() {
    for (const p of pages) {
      assert.ok(files.includes(p), 'brak ' + p);
      assert.equal(readFileSync(join(DIST, p), 'utf8'), readFileSync(join(ROOT, p), 'utf8'), p + ' różni się');
    }
  },
  'każdy plik, do którego odwołują się strony, jest w dist/'() {
    const refs = new Set(pages.flatMap((p) => readFileSync(join(ROOT, p), 'utf8').match(/(photos|logo)\/[\w.-]+/g) || []));
    assert.ok(refs.size > 50, 'za mało odwołań: ' + refs.size);
    for (const r of refs) assert.ok(files.includes(r), 'brak ' + r);
    assert.equal(files.length, pages.length + refs.size, 'zbędne pliki: ' + files.filter((f) => !pages.includes(f) && !refs.has(f)).join(', '));
  },
  'bez źródeł i plików roboczych'() {
    for (const f of ['support.js', 'styles.css', 'site.js', 'logo/logo-future.png', 'CLAUDE.md'])
      assert.ok(!files.includes(f), f + ' nie powinien trafić do dist/');
    assert.ok(!files.some((f) => f.endsWith('.dc.html')), '.dc.html w dist/');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
if (failed) { console.log(failed + ' FAIL'); process.exit(1); }
console.log('OK');
