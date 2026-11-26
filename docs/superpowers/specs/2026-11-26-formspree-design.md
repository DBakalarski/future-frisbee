# Formularz zgłoszeń przez Formspree - projekt (krótki)

**Po co:** zgłoszenie z `oferta.html#zapisy` ma dotrzeć do trenera bez otwierania programu pocztowego klienta.

**Cele:** wysyłka w tle do `https://formspree.io/f/mppdbeze` (testowe ID usera - do podmiany na docelowe), komunikat „dotarło” na stronie, temat maila „Zgłoszenie ze strony: <usługa>”, `_replyto` gdy kontakt to e-mail, pułapka na boty `_gotcha`, przy błędzie - telefon i e-mail trenera. Bez JS: zwykły POST (strona podziękowania Formspree). `data-pick` / `?temat=` bez zmian.

**Poza zakresem:** polityka prywatności, płatny plan, własna strona podziękowania.

**Czego nie chcemy:** tekstów, które obiecują coś nieprawdziwego („otworzy się poczta”, „nic nie trafia do bazy”).

**Ograniczenia:** darmowy Formspree - 50 zgłoszeń/mies., ponad limit nie przychodzą mailem. Strona bez npm.

**Podejścia:** (1) fetch + JSON - wybrane, zostaje na stronie; (2) zwykły POST z przekierowaniem - gorsze, klient ląduje na stronie Formspree; (3) mailto - obecne, zależy od programu pocztowego klienta.

**Decyzje Claude:** teksty: przycisk „Wyślij”, dopisek „Wiadomość przechodzi przez Formspree i trafia prosto na moją skrzynkę.”, lead bez „otworzy się poczta”; atrybut `data-mail` (adres do komunikatu błędu) zamiast `data-mailto`.
