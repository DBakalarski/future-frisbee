# Future Frisbee - strona trenera dog frisbee

Strona po polsku: strona główna (scrollowana) + dwie podstrony. Zajęcia z dog frisbee, dogfitnessu i behawiorystyki, warsztaty, oferta z cenami, kontakt. Bez backendu, bez npm, bez zależności.

## Pliki

| Plik | Rola | Edytować? |
|---|---|---|
| `Future Frisbee.dc.html` | **Źródło** strony głównej → `index.html` | Tak |
| `Oferta.dc.html` | **Źródło** podstrony z cenami i formularzem → `oferta.html` | Tak |
| `O mnie.dc.html` | **Źródło** podstrony „O mnie” → `o-mnie.html` | Tak |
| `styles.css` | Wspólny wygląd wszystkich stron. Kolory marki to zmienne na górze (`--green`, `--accent` itd.) | Tak |
| `site.js` | Wspólny skrypt: pojawianie się sekcji, formularz → Formspree, podpowiadanie usługi, kalendarz wydarzeń (`window.ffCal`) | Tak |
| `scripts/test-calendar.mjs`, `scripts/test-form.mjs` | Testy kalendarza i wysyłki formularza (Node, bez zależności) | Tak |
| `support.js` | Runtime `dc-runtime` (wygenerowany). | **Nie** |
| `index.html`, `oferta.html`, `o-mnie.html` | **Wersje do publikacji**, generowane z `.dc.html`. Czysty HTML/CSS + mały skrypt, bez Reacta. | **Nie** - zawsze przebuduj |
| `scripts/build.mjs` | Generator stron (Node, zero zależności). Lista stron w `PAGES`. Na końcu składa `dist/` - paczkę na serwer. | Tak |
| `dist/` | **Paczka do wgrania na serwer** (generowana, w `.gitignore`) | **Nie** |
| `photos/*.webp` | Zdjęcia: `img_XXXX.webp` (pionowe 1206 px, poziome 1600 px szerokości) + `img_XXXX-720.webp` (telefony). | - |
| `logo/` | `logo-future.png` - oryginał logo (czarny napis, przezroczyste tło). `logo-mark.webp` - godło bez napisu na jasnym kole (menu, stopka). `favicon.png`, `apple-touch-icon.png` - ikonki. | - |

Pliki `.dc.html` to format narzędzia do projektowania (`<x-dc>`): szablon + klasa `Component`. Renderuje je `support.js` (React z unpkg). Wygląd jest w klasach z `styles.css`, nie w stylach inline.

## Komendy

```bash
node scripts/build.mjs                          # .dc.html → .html + paczka dist/ (uruchamiaj po KAŻDEJ zmianie w .dc.html, styles.css, site.js)
python3 -m http.server 8765 --bind 127.0.0.1    # podgląd: http://127.0.0.1:8765/ (index) i /Future%20Frisbee.dc.html
                                                # port 8765 bywa zajęty przez Anki (AnkiConnect) - wtedy 8766
node scripts/test-calendar.mjs                  # testy logiki kalendarza
node scripts/test-form.mjs                      # testy wysyłki formularza (Formspree)
node scripts/test-dist.mjs                      # test paczki dist/ (komplet plików, nic zbędnego)
```

**Publikacja:** `node scripts/build.mjs`, potem wgraj **zawartość** folderu `dist/` do głównego katalogu serwera (https://futurefrisbee.pl). `dist/` to 3 strony + tylko te zdjęcia i logo, do których się odwołują; jest w `.gitignore`, budowany od zera przy każdym buildzie.

Nowe zdjęcie (z PNG/JPG) - zawsze oba rozmiary, oryginału nie commituj:

```bash
cwebp -q 80 -m 6 -metadata none -resize 1206 0 in.jpg -o photos/img_XXXX.webp   # poziome: -resize 1600 0
cwebp -q 78 -m 6 -metadata none -resize 720 0 in.png -o photos/img_XXXX-720.webp
```

## Zasady

- **Zmiany robisz w `.dc.html` / `styles.css` / `site.js`, potem `node scripts/build.mjs`** i commitujesz źródła razem z wygenerowanymi `.html`. Ręczne poprawki w wygenerowanych plikach znikną przy następnym buildzie.
- Build wkleja `styles.css` i `site.js` do każdej strony (linki lokalne w `<helmet>`). Nawigacja i stopka są skopiowane w każdym `.dc.html` - zmieniasz je w trzech miejscach.
- Nowa podstrona: nowy `Nazwa.dc.html` (skopiuj `O mnie.dc.html`) + wpis w `PAGES` w `build.mjs` (plik wyjściowy i `description`).
- `<img>` ze zdjęciem z `photos/`: build dopisuje `width`/`height` i `srcset` (720 + pełne). Podaj w źródle `sizes` (szerokość wyświetlania), inaczej będzie `100vw`. Pierwszy `<img>` na stronie dostaje `fetchpriority="high"` i preload.
- Ceny są tylko w `Oferta.dc.html` (bloki `.price`). Usługę do formularza podpowiada `data-pick="…"` na przycisku albo `oferta.html?temat=…#zapisy` - wartość musi być identyczna z jedną z `<option>` w `select[name=temat]`.
- Formularz wysyła zgłoszenie przez **Formspree**: adres w `action` na `<form>` (produkcyjny: `https://formspree.io/f/xyewoqyk`), wysyłka w tle (`fetch`, `Accept: application/json`), temat maila „Zgłoszenie ze strony: <usługa>”, `_replyto` gdy kontakt to e-mail, pułapka na boty `_gotcha` (`.hp`). Bez JS - zwykły POST i strona podziękowania Formspree. `data-mail` i `data-phone` na `<form>` to dane do komunikatu o błędzie. Po wysłaniu formularz dostaje `data-state="sent"` - pola znikają, widać panel `.form-done` („Dziękuję!” + „Wyślij kolejną wiadomość”); błąd → `data-state="error"` (ramka komunikatu). Darmowy plan: 50 zgłoszeń/mies. (ponad limit nie przychodzą mailem).
- Kadry: kafelki, zdjęcia w ofercie i „O mnie” są przycinane (`object-fit: cover`, często 4:5, na tablecie 16:9/16:10). Po zmianie zdjęcia sprawdź, czy nie ucina głów. W ścianie zdjęć w finale zdjęcia poziome mają klasę `wide` (3:2).
- Menu na telefonie (≤ 859 px): bez linku „Kontakt” (klasa `nav-hide-m`), z przyciskiem „Zapisz się”. Do 480 px zamiast nazwy jest samo godło - nazwa siedzi w `<span class="brand-name">` (zostaje dla czytników ekranu). Przy zmianie menu pilnuj tego w trzech plikach.
- Wersja `.html` ma na `<html>` klasę `static` (dodaje ją build): ukrywa ramki `.todo` w „Doświadczeniu” i wiersze, w których nie ma nic poza nimi. W `.dc.html` są widoczne.
- Logo jest czarne - na ciemnym tle strony używaj `logo/logo-mark.webp` (z jasnym kołem), nie oryginału. Pierwszy `<img>` z `photos/` (nie logo) dostaje priorytet ładowania.
- Panel „tweaks” (`accent`, `ksztalt`, `animacje`) działa tylko w narzędziu do projektowania - ustawia `--accent`, `data-shape`, `data-motion` na `<html>`. Wersje `.html` używają wartości domyślnych.
- Animacje pojawiania się: `data-reveal="up|left"` + `data-delay="ms"`. Bez JS treść jest widoczna. Respektowane jest `prefers-reduced-motion`.
- Weryfikacja zmian wizualnych: porównaj zrzuty `.html` i `.dc.html` w 1440 px i 390 px (Playwright) - wysokość strony powinna być identyczna, a `scrollX` po `scrollTo(300, 0)` równy 0.

## Kalendarz wydarzeń (Sanity)

- Sekcja `#kalendarz` na stronie głównej. Wydarzenia dodaje trener w panelu **https://future-frisbee.sanity.studio** (projekt Sanity `xdpvlpcu`, zbiór `production`). Kod panelu: `~/Developer/future-frisbee-studio` (osobne repo, npm; `npx sanity deploy` po zmianie schematu).
- `site.js` pobiera wydarzenia w przeglądarce z `xdpvlpcu.api.sanity.io` (celowo nie `apicdn` - CDN Sanity podawał dane sprzed kilku minut) z `cache: no-store` - zmiana w panelu jest widoczna po odświeżeniu strony, bez przebudowy. Link bez `https://` (np. `test.pl`) strona uzupełnia sama. Kategorie (`warsztaty`, `seminarium`, `pokaz`, `grupowe`, `zawody`) są w schemacie panelu i w `CATEGORIES` w `site.js` - zmieniaj w obu.
- Sanity wpuszcza tylko adresy z listy CORS (`npx sanity cors list` w folderze panelu). Teraz: `https://futurefrisbee.pl`, `https://www.futurefrisbee.pl`, `127.0.0.1:8765`, `127.0.0.1:8766`, `localhost:8765`, `localhost:3333`. Nowa domena/subdomena → `npx sanity cors add https://… --no-credentials` w folderze panelu.
- Bez wydarzeń, bez JS albo przy błędzie pobierania widać tekst „Nowe terminy wkrótce” z przyciskiem „Zapytaj o termin”.

## Do zrobienia

- `og:image` i `<link rel="canonical">` z pełnym adresem (https://futurefrisbee.pl) w szablonie `<head>` w `build.mjs`.
