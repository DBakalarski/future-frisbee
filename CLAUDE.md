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
| `photos/*.webp` | Zdjęcia: `img_XXXX.webp` (1206 px) + `img_XXXX-720.webp` (telefony). | — |

Pliki `.dc.html` to format narzędzia do projektowania (`<x-dc>`): szablon + klasa `Component`. Renderuje je `support.js` (React z unpkg). Wygląd jest w klasach z `styles.css`, nie w stylach inline.

## Komendy

```bash
node scripts/build.mjs                          # .dc.html → .html (uruchamiaj po KAŻDEJ zmianie w .dc.html, styles.css, site.js)
python3 -m http.server 8765 --bind 127.0.0.1    # podgląd: http://127.0.0.1:8765/ (index) i /Future%20Frisbee.dc.html
```

Nowe zdjęcie (z PNG/JPG) — zawsze oba rozmiary, oryginału nie commituj:

```bash
cwebp -q 80 -m 6 -metadata none in.png -o photos/img_XXXX.webp
cwebp -q 78 -m 6 -metadata none -resize 720 0 in.png -o photos/img_XXXX-720.webp
```

## Zasady

- **Zmiany robisz w `.dc.html` / `styles.css` / `site.js`, potem `node scripts/build.mjs`** i commitujesz źródła razem z wygenerowanymi `.html`. Ręczne poprawki w wygenerowanych plikach znikną przy następnym buildzie.
- Build wkleja `styles.css` i `site.js` do każdej strony (linki lokalne w `<helmet>`). Nawigacja i stopka są skopiowane w każdym `.dc.html` — zmieniasz je w trzech miejscach.
- Nowa podstrona: nowy `Nazwa.dc.html` (skopiuj `O mnie.dc.html`) + wpis w `PAGES` w `build.mjs` (plik wyjściowy i `description`).
- `<img>` ze zdjęciem z `photos/`: build dopisuje `width`/`height` i `srcset` (720 + pełne). Podaj w źródle `sizes` (szerokość wyświetlania), inaczej będzie `100vw`. Pierwszy `<img>` na stronie dostaje `fetchpriority="high"` i preload.
- Ceny są tylko w `Oferta.dc.html` (bloki `.price`). Usługę do formularza podpowiada `data-pick="…"` na przycisku albo `oferta.html?temat=…#zapisy` — wartość musi być identyczna z jedną z `<option>` w `select[name=temat]`.
- Formularz nie ma backendu: składa wiadomość i otwiera program pocztowy (`mailto:`). Adres w `data-mailto` na `<form>`.
- Zdjęcia `img_5955`–`img_5958` to zrzuty z Instagrama ze znaczkiem „1/4” w prawym górnym rogu — kadruj je tak, żeby go ucinać (`object-position: 20% 50%` przy proporcjach 4:5; w bloku warsztatów `transform: scale`).
- Panel „tweaks” (`accent`, `ksztalt`, `animacje`) działa tylko w narzędziu do projektowania — ustawia `--accent`, `data-shape`, `data-motion` na `<html>`. Wersje `.html` używają wartości domyślnych.
- Animacje pojawiania się: `data-reveal="up|left"` + `data-delay="ms"`. Bez JS treść jest widoczna. Respektowane jest `prefers-reduced-motion`.
- Weryfikacja zmian wizualnych: porównaj zrzuty `.html` i `.dc.html` w 1440 px i 390 px (Playwright) — wysokość strony powinna być identyczna, a `scrollX` po `scrollTo(300, 0)` równy 0.

## Do zrobienia

- Logo klienta (ciemnozielone): podmienić `.brand-mark` na plik logo i dopasować `--green` w `styles.css` do jego koloru.
- Uzupełnić „Doświadczenie” w `O mnie.dc.html` (pola `.todo`).
- Opinie na stronie głównej to teksty z pierwotnego projektu — zastąpić prawdziwymi.
- Gdy będzie domena: `og:image` i `<link rel="canonical">` z pełnym adresem w szablonie `<head>` w `build.mjs`.
