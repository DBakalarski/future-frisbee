# Future Frisbee — strona trenera dog frisbee

Jednostronicowa strona (landing) po polsku: treningi dog frisbee, oferta, cennik, opinie, galeria, kontakt. Bez backendu, bez npm, bez zależności.

## Pliki

| Plik | Rola | Edytować? |
|---|---|---|
| `Future Frisbee.dc.html` | **Źródło.** Eksport z narzędzia do projektowania (format `<x-dc>`): szablon + klasa `Component` z logiką. Renderowany w przeglądarce przez `support.js` (React z unpkg). | Tak — tu wprowadzaj zmiany treści i wyglądu |
| `support.js` | Runtime `dc-runtime` (wygenerowany). | **Nie** |
| `index.html` | **Wersja do publikacji**, generowana z `.dc.html`. Czysty HTML/CSS + ~1 KB JS, bez Reacta. | **Nie** — zawsze przebuduj |
| `scripts/build.mjs` | Generator `index.html` (Node, zero zależności). | Tak |
| `photos/*.webp` | Zdjęcia: `img_XXXX.webp` (1206 px) + `img_XXXX-720.webp` (telefony). | — |

## Komendy

```bash
node scripts/build.mjs                          # .dc.html → index.html (uruchamiaj po KAŻDEJ zmianie w .dc.html)
python3 -m http.server 8765 --bind 127.0.0.1    # podgląd: http://127.0.0.1:8765/ (index) i /Future%20Frisbee.dc.html
```

Nowe zdjęcie (z PNG/JPG) — zawsze oba rozmiary, oryginału nie commituj:

```bash
cwebp -q 80 -m 6 -metadata none in.png -o photos/img_XXXX.webp
cwebp -q 78 -m 6 -metadata none -resize 720 0 in.png -o photos/img_XXXX-720.webp
```

## Zasady

- **Zmiany robisz w `.dc.html`, potem `node scripts/build.mjs`** i commitujesz oba pliki razem. Ręczne poprawki w `index.html` znikną przy następnym buildzie.
- `build.mjs` duplikuje wartości z `renderVals()` w `.dc.html` (tablice `VARS` i `FLAGS`: `[desktop, mobile]`, próg 859 px). Gdy zmieniasz `renderVals()` albo dodajesz nowe `{{ pole }}` / `<sc-if>`, zaktualizuj je też w `build.mjs` — nieznane pole przerywa build błędem (celowo).
- Nowe zdjęcie w `<img>`: dopisz jego szerokość wyświetlania do `SIZES` w `build.mjs` (domyślnie `100vw`). Pierwszy `<img>` w dokumencie dostaje `fetchpriority="high"` i preload — to zdjęcie z pierwszego ekranu.
- Panel „tweaks” z `.dc.html` (`accent`, `ksztalt`, `animacje`) działa tylko w narzędziu do projektowania. `index.html` używa wartości domyślnych (czerwień `#e8402c`, kształt miękki, animacje dynamiczne).
- Animacje pojawiania się sekcji: atrybuty `data-reveal="up|left"` + `data-delay="ms"`. W `index.html` obsługuje je CSS (klasa `.js` na `<html>`) + IntersectionObserver; bez JS treść jest widoczna. Respektowane jest `prefers-reduced-motion`.
- Weryfikacja zmian wizualnych: porównaj zrzuty `index.html` i `.dc.html` w 1440 px i 390 px (Playwright) — wysokość strony powinna być identyczna.

## Do zrobienia, gdy będzie domena

- Dodać `og:image` i `<link rel="canonical">` z pełnym adresem (np. `https://futurefrisbee.pl/…`) w szablonie `<head>` w `build.mjs`.
