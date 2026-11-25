# Kalendarz wydarzeń - plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalendarz wydarzeń na stronie głównej Future Frisbee, z danymi z nowego projektu Sanity.

**Architecture:** Osobny panel Sanity (`~/Developer/future-frisbee-studio`, kopia wzoru `psietopole-studio`). Strona pobiera wydarzenia w przeglądarce z `apicdn.sanity.io` zwykłym `fetch` w `site.js` i rysuje siatkę miesiąca + listę 2 najbliższych. Czyste funkcje dat w `window.ffCal`, testowane w Node.

**Tech Stack:** Sanity v5 (tylko panel), czysty JS ES5-style (jak `site.js`), CSS w `styles.css`, Node 22 do testów, Playwright (Python) do zrzutów.

**Spec:** `docs/superpowers/specs/2026-11-25-kalendarz-wydarzen-design.md`

## Global Constraints

- Strona bez npm, Reacta i bibliotek; zmiany tylko w `.dc.html` / `styles.css` / `site.js`, potem `node scripts/build.mjs`.
- Zapytanie: `*[_type=="event" && (date >= $today || endDate >= $today)] | order(date asc)[0...20]{_id,title,date,endDate,shortDescription,link,category}`, API `v2026-01-01`, zbiór `production`.
- Kategorie (value → etykieta): `warsztaty` Warsztaty, `seminarium` Seminarium, `pokaz` Pokaz, `grupowe` Zajęcia grupowe, `zawody` Zawody.
- Domyślny link: `oferta.html?temat=Warsztaty%2C%20seminarium%20lub%20pokaz#zapisy`, tekst „Zapisz się”. Własny link: tekst „Szczegóły”.
- Brak wydarzeń i błąd: „Nowe terminy wkrótce” + przycisk „Zapytaj o termin” (ten sam link). Bez JS - ten sam tekst w HTML.
- CORS Sanity: `http://127.0.0.1:8765`, `http://localhost:8765`.
- Daty liczone na napisach `YYYY-MM-DD` (bez `new Date('YYYY-MM-DD')`, które daje UTC).

## Review Focus

- Strefa czasowa: wydarzenie 1. dnia miesiąca nie może trafić na ostatni dzień poprzedniego → test `monthGrid`/`eventsByDay` na napisach.
- Dwa wydarzenia tego samego dnia → oba w dymku (test `eventsByDay`).
- `endDate` wcześniejsza niż `date` albo równa → traktowane jak jednodniowe (test).
- Tytuł/opis z `<`/`&` i link `javascript:` → tekst przez `textContent`, link tylko http(s)/mailto/tel (test `safeLink`).
- Telefon 390 px: dymek przy dniu z prawej krawędzi nie wychodzi poza ekran, `scrollX` po `scrollTo(300,0)` = 0 (Playwright, Task 3).

---

### Task 1: Panel Sanity „Future Frisbee”

**Files (poza repo strony):**
- Create: `~/Developer/future-frisbee-studio/{package.json,sanity.config.ts,sanity.cli.ts,tsconfig.json,schemas/index.ts,schemas/event.ts,.gitignore}` - skopiowane z `~/Documents/projekty/psietopole/psietopole-studio`, bez `node_modules`, `dist`, `deployment.appId`.

**Interfaces:**
- Produces: `projectId` nowego projektu (wpisywany w `site.js` w Task 2), dokument typu `event` z polami jak w spec, adres panelu `https://future-frisbee.sanity.studio` (albo wolna nazwa).

- [ ] Utwórz projekt: `npx sanity@latest projects create "Future Frisbee"` (gdy brak tej komendy: `sanity init --create-project "Future Frisbee" --dataset production --bare`), potem dataset `production` (public).
- [ ] Skopiuj studio, ustaw `title: 'Future Frisbee'`, nowy `projectId`, kategorie z Global Constraints, `pnpm install` (log do pliku).
- [ ] CORS: `sanity cors add http://127.0.0.1:8765 --no-credentials` i `http://localhost:8765`.
- [ ] Sprawdź: `sanity build` kończy się bez błędów; `curl` na adres zapytania zwraca `{"result":[]...}`.
- [ ] `sanity deploy` (nazwa `future-frisbee`); zapisz adres.
- [ ] Dodaj 3 wydarzenia testowe (`sanity documents create`): jednodniowe w tym miesiącu, dwudniowe na przełomie miesięcy, dwa tego samego dnia. ID z prefiksem `test-`.
- [ ] `git init`, commit w folderze studia.

### Task 2: Logika dat i pobieranie (`window.ffCal`)

**Files:**
- Modify: `site.js` (nowa funkcja w IIFE, eksport `window.ffCal`)
- Create: `scripts/test-calendar.mjs` (Node, `vm` + atrapy `window`/`document`)

**Interfaces:**
- Produces:
  - `ffCal.monthGrid(year, month0) -> (string|null)[]` - ISO dni, poniedziałek pierwszy, długość wielokrotnością 7.
  - `ffCal.eventsByDay(events) -> {[iso]: Event[]}` - rozwija `date..endDate`.
  - `ffCal.addMonths(year, month0, n) -> [year, month0]`
  - `ffCal.monthLabel(year, month0) -> "Grudzień 2026"`, `ffCal.dayLabel(iso) -> "14 grudnia 2026"`, `ffCal.shortMonth(iso) -> "gru"`.
  - `ffCal.safeLink(url) -> string|null`
  - `ffCal.url(todayIso) -> string` (pełny adres zapytania)

- [ ] Napisz testy w `scripts/test-calendar.mjs` (`node:assert`):
  - `monthGrid(2026, 11)` (grudzień 2026, 1.12 = wtorek): `[0]===null`, `[1]==='2026-12-01'`, długość 35.
  - `monthGrid(2026, 1)` (luty 2026, start niedziela): 6 pustych na początku, długość 35.
  - `eventsByDay([{date:'2026-11-30',endDate:'2026-12-01',title:'A'},{date:'2026-12-01',title:'B'}])['2026-12-01'].length===2`, `['2026-11-30'].length===1`.
  - `eventsByDay([{date:'2026-12-05',endDate:'2026-12-03'}])` ma tylko `2026-12-05`.
  - `addMonths(2026, 11, 1)` → `[2027, 0]`; `addMonths(2026, 0, -1)` → `[2025, 11]`.
  - `dayLabel('2026-12-14')==='14 grudnia 2026'`, `monthLabel(2026,0)==='Styczeń 2026'`.
  - `safeLink('javascript:alert(1)')===null`, `safeLink('https://x.pl')==='https://x.pl'`, `safeLink('')===null`.
  - `url('2026-11-25')` zawiera `apicdn.sanity.io/v2026-01-01/data/query/production` i `%24today=%222026-11-25%22`.
- [ ] `node scripts/test-calendar.mjs` → FAIL (brak `ffCal`).
- [ ] Zaimplementuj w `site.js`; `projectId` z Task 1 jako stała.
- [ ] `node scripts/test-calendar.mjs` → „OK”.
- [ ] Commit.

### Task 3: Sekcja na stronie głównej

**Files:**
- Modify: `Future Frisbee.dc.html` (sekcja po `#oferta`, przed `#opinie`), `styles.css` (blok „Kalendarz”), `site.js` (`renderCalendar(root)` w `init`), wygenerowane `index.html`.

**Interfaces:**
- Consumes: wszystko z `ffCal`.
- Markup źródłowy: `<section id="kalendarz" class="section section-alt" data-screen-label="Kalendarz">` z nagłówkiem „Kalendarz wydarzeń”, podtytułem i `<div class="cal-root" data-cal>` zawierającym fallback (tekst + przycisk). JS podmienia zawartość `[data-cal]`.

- [ ] Dodaj sekcję i style (ciemna karta `--surface`, dni z wydarzeniem tło akcentu z przezroczystością, dziś obwódka `--accent`, dymek `--surface-2`, legenda, lista 2 najbliższych z kafelkiem daty).
- [ ] `renderCalendar`: fetch → siatka startuje od miesiąca pierwszego wydarzenia; dni z wydarzeniem to `<button aria-expanded>`; dymek: hover (mysz), klik/tap (przełącza), Esc i klik obok zamykają; dymek przyklejony do komórki, przesunięty, by mieścił się w `.cal` (bez poziomego scrolla). Pusta lista lub błąd → fallback. Guard przed podwójnym renderem.
- [ ] `node scripts/build.mjs` (log do pliku).
- [ ] Playwright (serwer `python3 -m http.server 8765 --bind 127.0.0.1`): `index.html` i `Future%20Frisbee.dc.html` w 1440 i 390 px - siatka widoczna, dzień testowy podświetlony, po kliknięciu dymek z tytułem, wysokość strony równa w obu wersjach, `scrollX`=0 po `scrollTo(300,0)`; dymek dnia z prawej kolumny w 390 px mieści się w oknie. Zrzuty do scratchpada.
- [ ] Fallback: zablokuj `apicdn.sanity.io` w Playwright → widać „Nowe terminy wkrótce”.
- [ ] Commit (źródła + `index.html`).

### Task 4: Porządki i PR

- [ ] Usuń wydarzenia `test-*` z Sanity.
- [ ] Dopisz do `CLAUDE.md`: sekcja kalendarza, `projectId`, folder i adres panelu, CORS przy domenie (także w „Do zrobienia”).
- [ ] Commit, `git push -u origin kalendarz-wydarzen`, `gh pr create` do `main`.
