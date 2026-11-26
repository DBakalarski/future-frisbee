// Testy wysyłki formularza przez Formspree (site.js, bez przeglądarki): node scripts/test-form.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const code = readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const ACTION = 'https://formspree.io/f/mppdbeze';

class FakeFormData {
  constructor(form) { this.m = new Map(Object.entries(form._fields)); }
  set(k, v) { this.m.set(k, v); }
  get(k) { return this.m.has(k) ? this.m.get(k) : null; }
}

// Formularz-atrapa + uruchomienie site.js; zwraca handler „submit” i stan.
function setup(fields, fetchImpl) {
  const status = { textContent: '' };
  const btn = { disabled: false, textContent: 'Wyślij' };
  const form = {
    action: ACTION,
    _fields: Object.assign({ temat: 'Zajęcia grupowe', imie: 'Ala', kontakt: 'ala@kot.pl', _subject: 'Zgłoszenie ze strony' }, fields),
    getAttribute: (k) => ({ 'data-mail': 'future.frisbee.ms@gmail.com', 'data-phone': '795 479 709' })[k] ?? null,
    get elements() { const e = {}; for (const [k, v] of Object.entries(this._fields)) e[k] = { value: v }; return e; },
    querySelector: (s) => (s === '.form-status' ? status : s === 'button[type="submit"]' ? btn : null),
    reset() { this._reset = true; },
    addEventListener(t, f) { if (t === 'submit') this._submit = f; },
  };
  const calls = [];
  const box = {
    document: {
      querySelectorAll: (s) => (s === 'form[data-mail]' ? [form] : []),
      querySelector: () => null,
      documentElement: { classList: { add() {} } },
      addEventListener() {},
    },
    location: { search: '' }, URLSearchParams, setTimeout, FormData: FakeFormData,
    fetch: (url, opts) => { calls.push({ url, opts }); return fetchImpl(); },
  };
  box.window = box;
  form._win = box;
  vm.runInNewContext(code, box);
  assert.ok(form._submit, 'brak obsługi submit');
  const submit = () => form._submit({ preventDefault() {} });
  return { form, status, btn, calls, submit };
}

const ok = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
const tests = {
  async 'sukces: POST na Formspree, temat, odpowiedź do klienta, podziękowanie'() {
    const t = setup({}, ok);
    await t.submit();
    assert.equal(t.calls.length, 1);
    assert.equal(t.calls[0].url, ACTION);
    assert.equal(t.calls[0].opts.method, 'POST');
    assert.equal(t.calls[0].opts.headers.Accept, 'application/json');
    const body = t.calls[0].opts.body;
    assert.equal(body.get('_subject'), 'Zgłoszenie ze strony: Zajęcia grupowe');
    assert.equal(body.get('_replyto'), 'ala@kot.pl');
    assert.match(t.status.textContent, /Dziękuję/);
    assert.equal(t.form._reset, true);
    assert.equal(t.btn.disabled, false);
  },
  async 'kontakt telefoniczny: bez _replyto'() {
    const t = setup({ kontakt: '795 111 222' }, ok);
    await t.submit();
    assert.equal(t.calls[0].opts.body.get('_replyto'), null);
  },
  async 'przycisk zablokowany w trakcie wysyłki'() {
    let done;
    const t = setup({}, () => new Promise((r) => { done = r; }));
    const p = t.submit();
    assert.equal(t.btn.disabled, true);
    done({ ok: true, json: () => Promise.resolve({}) });
    await p;
    assert.equal(t.btn.disabled, false);
  },
  async 'błąd HTTP: telefon i e-mail, formularz nie wyczyszczony'() {
    const t = setup({}, () => Promise.resolve({ ok: false, status: 422, json: () => Promise.resolve({ errors: [] }) }));
    await t.submit();
    assert.match(t.status.textContent, /795 479 709/);
    assert.match(t.status.textContent, /future\.frisbee\.ms@gmail\.com/);
    assert.notEqual(t.form._reset, true);
  },
  async 'błąd sieci: telefon i e-mail'() {
    const t = setup({}, () => Promise.reject(new Error('offline')));
    await t.submit();
    assert.match(t.status.textContent, /795 479 709/);
  },
  async 'bez fetch: zwykła wysyłka formularza (bez preventDefault)'() {
    const t = setup({}, ok);
    delete t.form._win.fetch;
    let prevented = false;
    t.form._submit({ preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { await fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message); }
}
if (failed) { console.log(failed + ' FAIL'); process.exit(1); }
console.log('OK');
