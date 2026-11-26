# Formspree - plan

**Spec:** `docs/superpowers/specs/2026-11-26-formspree-design.md`

### Task 1: wysyłka (site.js) + testy
- `scripts/test-form.mjs` (Node vm, atrapy formularza, `fetch` przechwycony): POST na `form.action`, nagłówek `Accept: application/json`, `_subject` = `Zgłoszenie ze strony: Zajęcia grupowe`, `_replyto` tylko dla e-maila, sukces → status „Dziękuję…” + `reset()`, błąd HTTP i sieci → status z telefonem i e-mailem, przycisk zablokowany w trakcie.
- `site.js`: obsługa `form[data-mail]` zamiast mailto.

### Task 2: formularz i teksty (Oferta.dc.html, styles.css), build
- `action`, `method="POST"`, `data-mail`, ukryte `_subject`, `_gotcha` (klasa `.hp`), teksty.
- Playwright: przechwycone POST (200 i 422) w 1440/390, `.html` i `.dc.html`; jedno prawdziwe zgłoszenie na testowy formularz.
- `CLAUDE.md`.
