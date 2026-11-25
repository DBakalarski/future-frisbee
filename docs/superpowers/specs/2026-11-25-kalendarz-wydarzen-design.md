# Kalendarz wydarzeń - projekt

## Po co

Trener chce pokazywać na stronie nadchodzące wydarzenia (warsztaty, seminaria, pokazy, zajęcia grupowe) i dopisywać je sam, bez programisty. Wzór: kalendarz w psietopole (`components/psietopole/events-*.tsx`), z wydarzeniami w Sanity.

## Cele

- Siatka miesiąca jak w psietopole: strzałki poprzedni/następny miesiąc, nagłówki Pon-Nie, dzisiejszy dzień zaznaczony, dni z wydarzeniem wyróżnione.
- Po najechaniu (mysz) albo dotknięciu (telefon) dnia z wydarzeniem - dymek: data, tytuł, krótki opis, link.
- Pod kalendarzem lista 2 najbliższych wydarzeń (data w kafelku, tytuł, kategoria, opis, link).
- Wydarzenia dodaje się w panelu Sanity; nowe wydarzenie widać na stronie od razu, bez przebudowy.

## Poza zakresem

- Zapisy na wydarzenie przez Sanity, płatności, limity miejsc.
- Zmiana menu (link do kalendarza) - na razie nie.
- Domena i ustawienie jej w Sanity - gdy będzie domena.

## Czego nie chcemy

- npm, Reacta ani bibliotek w samej stronie - zostaje czysty HTML/CSS + `site.js`.
- Pustej, „martwej” siatki, gdy nie ma wydarzeń.
- Mieszania danych z psietopole.

## Ograniczenia

- Strona bez backendu: dane pobiera przeglądarka z publicznego API Sanity (`https://<projectId>.apicdn.sanity.io/v2026-01-01/data/query/production?query=…`), zwykłym `fetch`.
- Sanity przepuszcza tylko adresy dopisane w CORS projektu: na start `http://127.0.0.1:8765` (podgląd); domena później.
- Zmiany w `.dc.html` / `styles.css` / `site.js`, potem `node scripts/build.mjs`. `site.js` musi działać też w podglądzie `.dc.html` (start przez `ffInit`).
- Bez JS: sekcja pokazuje tekst z odnośnikiem do formularza, nie pustą ramkę.
- Szanuje `prefers-reduced-motion`; nie powoduje poziomego przewijania w 390 px.

## Podejścia

1. **Osobny projekt Sanity dla Future Frisbee + pobieranie w przeglądarce** - wybrane. Własny panel i login trenera, dane oddzielone od psietopole, darmowy plan wystarcza.
2. Ten sam projekt co psietopole, osobny zbiór danych - odrzucone: trener z dostępem widziałby treści psietopole.
3. Pobieranie w `build.mjs` przy budowaniu - odrzucone: każde wydarzenie wymagałoby przebudowy i publikacji.

## Ustalone

- **Panel Sanity**: nowy projekt „Future Frisbee”, zbiór `production`, folder `~/Developer/future-frisbee-studio` (poza repo strony, żeby strona została bez npm), wzorowany na `psietopole-studio`. Publikacja panelu przez `sanity deploy`. Projekt zakłada user na swoim koncie (`sanity login`), resztę robi Claude.
- **Typ „Wydarzenie”** jak w psietopole: tytuł, data, data końcowa (opcjonalnie), krótki opis (max 220 znaków), link (opcjonalnie), kategoria.

## Decyzje Claude (do sprawdzenia)

- **Kategorie**: Warsztaty, Seminarium, Pokaz, Zajęcia grupowe, Zawody.
- **Miejsce**: nowa sekcja `#kalendarz` „Kalendarz wydarzeń” na stronie głównej, zaraz po „Ofercie”, przed „Opiniami”. Wygląd z kolorów i klas `styles.css` (ciemne tło, akcent czerwieni dysku), nie beż/terakota z psietopole.
- **Wydarzenia wielodniowe**: wyróżnione są wszystkie dni od daty do daty końcowej (w psietopole tylko pierwszy).
- **Link**: gdy wydarzenie nie ma własnego linku, dymek i lista pokazują „Zapisz się” → `oferta.html?temat=Warsztaty%2C%20seminarium%20lub%20pokaz#zapisy`.
- **Brak wydarzeń**: krótki tekst „Nowe terminy wkrótce” + przycisk „Zapytaj o termin”. Błąd pobierania: ten sam tekst (bez komunikatu o błędzie).
- **Startowy miesiąc**: miesiąc najbliższego wydarzenia (jak w psietopole).
- **Dostępność**: dni z wydarzeniem to przyciski (`aria-expanded`), dymek zamyka Esc i kliknięcie obok; dotyk otwiera/zamyka.
- **Zapytanie**: wydarzenia od dziś, rosnąco, max 20; `projectId` wpisany w `site.js` (jest publiczny).

## Dla wykonawcy

- Dokładne klasy CSS, układ dymka na telefonie, animacje pojawiania się (`data-reveal`).
- Kilka wydarzeń testowych w Sanity do sprawdzenia widoku (do usunięcia przed oddaniem).
- Weryfikacja jak w `CLAUDE.md`: zrzuty `.html` i `.dc.html` w 1440 i 390 px.
