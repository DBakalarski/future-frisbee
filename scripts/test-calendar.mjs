// Testy logiki kalendarza z site.js (bez przeglądarki): node scripts/test-calendar.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const sandbox = {
  document: { querySelectorAll: () => [], querySelector: () => null, documentElement: { classList: { add() {} } } },
  location: { search: '' },
  URLSearchParams,
  setTimeout,
};
sandbox.window = sandbox;
vm.runInNewContext(code, sandbox);
const cal = sandbox.ffCal;
assert.ok(cal, 'window.ffCal nie istnieje');

const tests = {
  'monthGrid: grudzień 2026 zaczyna się we wtorek'() {
    const g = cal.monthGrid(2026, 11);
    assert.equal(g[0], null);
    assert.equal(g[1], '2026-12-01');
    assert.equal(g.length, 35);
    assert.equal(g[31], '2026-12-31');
  },
  'monthGrid: luty 2026 zaczyna się w niedzielę'() {
    const g = cal.monthGrid(2026, 1);
    assert.deepEqual([...g.slice(0, 7)], [null, null, null, null, null, null, '2026-02-01']);
    assert.equal(g.length, 35);
  },
  'eventsByDay: wydarzenie na przełomie miesięcy i dwa tego samego dnia'() {
    const m = cal.eventsByDay([
      { date: '2026-11-30', endDate: '2026-12-01', title: 'A' },
      { date: '2026-12-01', title: 'B' },
    ]);
    assert.equal(m['2026-11-30'].length, 1);
    assert.deepEqual([...m["2026-12-01"].map((e) => e.title)], ['A', 'B']);
    assert.equal(Object.keys(m).length, 2);
  },
  'eventsByDay: data końcowa wcześniejsza = jednodniowe'() {
    assert.deepEqual([...Object.keys(cal.eventsByDay([{ date: "2026-12-05", endDate: "2026-12-03" }]))], ['2026-12-05']);
  },
  'addMonths: przejścia przez rok'() {
    assert.deepEqual([...cal.addMonths(2026, 11, 1)], [2027, 0]);
    assert.deepEqual([...cal.addMonths(2026, 0, -1)], [2025, 11]);
  },
  'etykiety po polsku'() {
    assert.equal(cal.dayLabel('2026-12-14'), '14 grudnia 2026');
    assert.equal(cal.monthLabel(2026, 0), 'Styczeń 2026');
    assert.equal(cal.shortMonth('2026-12-14'), 'gru');
  },
  'safeLink: tylko bezpieczne adresy'() {
    assert.equal(cal.safeLink('javascript:alert(1)'), null);
    assert.equal(cal.safeLink(' JavaScript:alert(1)'), null);
    assert.equal(cal.safeLink(''), null);
    assert.equal(cal.safeLink(undefined), null);
    assert.equal(cal.safeLink('https://x.pl'), 'https://x.pl');
    assert.equal(cal.safeLink('mailto:a@b.pl'), 'mailto:a@b.pl');
  },
  'url: zapytanie do Sanity z dzisiejszą datą'() {
    const u = cal.url('2026-11-25');
    assert.ok(u.startsWith('https://xdpvlpcu.apicdn.sanity.io/v2026-01-01/data/query/production?query='), u);
    assert.ok(u.includes('%24today=%222026-11-25%22'), u);
  },
};

// Przeglądarka bez fetch: kalendarz przechodzi w tekst zastępczy, reszta skryptu działa dalej.
tests['bez fetch: tekst zastępczy, bez wyjątku'] = function () {
  const attrs = {};
  const root = {
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = v; },
    style: {}, classList: { add() {} },
  };
  const box = {
    document: {
      querySelectorAll: (s) => (s === '[data-cal]' || s === '[data-reveal]' ? [root] : []),
      querySelector: () => null,
      documentElement: { classList: { add() {} } },
      addEventListener() {},
    },
    location: { search: '' }, URLSearchParams, setTimeout,
  };
  box.window = box;
  vm.runInNewContext(code, box);
  assert.equal(attrs['data-cal-state'], 'empty');
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
if (failed) { console.log(failed + ' FAIL'); process.exit(1); }
console.log('OK');
