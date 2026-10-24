# Future Frisbee — strona trenera dog frisbee

Strona po polsku: strona główna (scrollowana) + dwie podstrony. Zajęcia z dog frisbee, dogfitnessu i behawiorystyki, warsztaty, oferta z cenami, kontakt. Bez backendu, bez npm, bez zależności.

## Pliki

| Plik | Rola | Edytować? |
|---|---|---|
| `Future Frisbee.dc.html` | **Źródło** strony głównej → `index.html` | Tak |
| `Oferta.dc.html` | **Źródło** podstrony z cenami i formularzem → `oferta.html` | Tak |
| `O mnie.dc.html` | **Źródło** podstrony „O mnie” → `o-mnie.html` | Tak |
| `styles.css` | Wspólny wygląd wszystkich stron. Kolory marki to zmienne na górze (`--green`, `--accent` itd.) | Tak |
| `site.js` | Wspólny skrypt: pojawianie się sekcji, formularz → mailto, podpowiadanie usługi | Tak |
| `support.js` | Runtime `dc-runtime` (wygenerowany). | **Nie** |
| `index.html`, `oferta.html`, `o-mnie.html` | **Wersje do publikacji**, generowane z `.dc.html`. Czysty HTML/CSS + mały skrypt, bez Reacta. | **Nie** — zawsze przebuduj |
| `scripts/build.mjs` | Generator stron (Node, zero zależności). Lista stron w `PAGES`. | Tak |
| `photos/*.webp` | Zdjęcia: `img_XXXX.webp` (pionowe 1206 px, poziome 1600 px szerokości) + `img_XXXX-720.webp` (telefony). | — |
| `logo/` | `logo-future.png` — oryginał logo (czarny napis, przezroczyste tło). `logo-mark.webp` — godło bez napisu na jasnym kole (menu, stopka). `favicon.png`, `apple-touch-icon.png` — ikonki. | — |

Pliki `.dc.html` to format narzędzia do projektowania (`<x-dc>`): szablon + klasa `Component`. Renderuje je `support.js` (React z unpkg). Wygląd jest w klasach z `styles.css`, nie w stylach inline.

## Komendy

```bash
node scripts/build.mjs                          # .dc.html → .html (uruchamiaj po KAŻDEJ zmianie w .dc.html, styles.css, site.js)
python3 -m http.server 8765 --bind 127.0.0.1    # podgląd: http://127.0.0.1:8765/ (index) i /Future%20Frisbee.dc.html
```

Nowe zdjęcie (z PNG/JPG) — zawsze oba rozmiary, oryginału nie commituj:

```bash
cwebp -q 80 -m 6 -metadata none -resize 1206 0 in.jpg -o photos/img_XXXX.webp   # poziome: -resize 1600 0
cwebp -q 78 -m 6 -metadata none -resize 720 0 in.png -o photos/img_XXXX-720.webp
```

## Zasady

- **Zmiany robisz w `.dc.html` / `styles.css` / `site.js`, potem `node scripts/build.mjs`** i commitujesz źródła razem z wygenerowanymi `.html`. Ręczne poprawki w wygenerowanych plikach znikną przy następnym buildzie.
- Build wkleja `styles.css` i `site.js` do każdej strony (linki lokalne w `<helmet>`). Nawigacja i stopka są skopiowane w każdym `.dc.html` — zmieniasz je w trzech miejscach.
- Nowa podstrona: nowy `Nazwa.dc.html` (skopiuj `O mnie.dc.html`) + wpis w `PAGES` w `build.mjs` (plik wyjściowy i `description`).
- `<img>` ze zdjęciem z `photos/`: build dopisuje `width`/`height` i `srcset` (720 + pełne). Podaj w źródle `sizes` (szerokość wyświetlania), inaczej będzie `100vw`. Pierwszy `<img>` na stronie dostaje `fetchpriority="high"` i preload.
- Ceny są tylko w `Oferta.dc.html` (bloki `.price`). Usługę do formularza podpowiada `data-pick="…"` na przycisku albo `oferta.html?temat=…#zapisy` — wartość musi być identyczna z jedną z `<option>` w `select[name=temat]`.
- Formularz nie ma backendu: składa wiadomość i otwiera program pocztowy (`mailto:`). Adres w `data-mailto` na `<form>`.
- Kadry: kafelki, zdjęcia w ofercie i „O mnie” są przycinane (`object-fit: cover`, często 4:5, na tablecie 16:9/16:10). Po zmianie zdjęcia sprawdź, czy nie ucina głów. W ścianie zdjęć w finale zdjęcia poziome mają klasę `wide` (3:2).
- Menu na telefonie (≤ 859 px): bez linku „Kontakt” (klasa `nav-hide-m`), z przyciskiem „Zapisz się”. Do 480 px zamiast nazwy jest samo godło — nazwa siedzi w `<span class="brand-name">` (zostaje dla czytników ekranu). Przy zmianie menu pilnuj tego w trzech plikach.
- Wersja `.html` ma na `<html>` klasę `static` (dodaje ją build): ukrywa ramki `.todo` w „Doświadczeniu” i wiersze, w których nie ma nic poza nimi. W `.dc.html` są widoczne.
- Logo jest czarne — na ciemnym tle strony używaj `logo/logo-mark.webp` (z jasnym kołem), nie oryginału. Pierwszy `<img>` z `photos/` (nie logo) dostaje priorytet ładowania.
- Panel „tweaks” (`accent`, `ksztalt`, `animacje`) działa tylko w narzędziu do projektowania — ustawia `--accent`, `data-shape`, `data-motion` na `<html>`. Wersje `.html` używają wartości domyślnych.
- Animacje pojawiania się: `data-reveal="up|left"` + `data-delay="ms"`. Bez JS treść jest widoczna. Respektowane jest `prefers-reduced-motion`.
- Weryfikacja zmian wizualnych: porównaj zrzuty `.html` i `.dc.html` w 1440 px i 390 px (Playwright) — wysokość strony powinna być identyczna, a `scrollX` po `scrollTo(300, 0)` równy 0.

## Do zrobienia

- Uzupełnić „Doświadczenie” w `O mnie.dc.html` (pola `.todo`).
- Opinie na stronie głównej to teksty z pierwotnego projektu — zastąpić prawdziwymi.
- Gdy będzie domena: `og:image` i `<link rel="canonical">` z pełnym adresem w szablonie `<head>` w `build.mjs`.
