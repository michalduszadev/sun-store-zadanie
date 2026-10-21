# sun.store: listing produktów (zadanie rekrutacyjne)

- **Aplikacja:** https://sun-store-zadanie.vercel.app
- **Repozytorium:** https://github.com/michalduszadev/sun-store-zadanie

Nuxt 4 · Vue 3 (Composition API) · TypeScript strict · Vuetify 3 · Nitro · Zod · Vitest · Playwright · Vercel

## Uruchomienie

Wymagania: Node 24, pnpm 12 (wersja przypięta w `packageManager`, działa przez Corepack).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # Vitest: 73 testy jednostkowe
pnpm test:e2e     # Playwright: build produkcyjny + 2 scenariusze (lokalny Chrome)
pnpm typecheck    # vue-tsc, strict
pnpm lint
```

Te same testy E2E na wdrożeniu: `E2E_BASE_URL=https://sun-store-zadanie.vercel.app pnpm test:e2e`.

## Co jest zrobione

- Filtrowanie po **kategorii**, **producencie** (wielokrotny wybór, z licznikami wyników), **zakresie cen** i **pojemności lub mocy** (kWh/W).
- **Wyszukiwanie** po nazwie, producencie i opisie.
- **Sortowanie** po cenie, nazwie, kWh/W oraz **cenie za kWh lub W** (dla instalatora B2B to realna metryka).
- Filtrowanie, wyszukiwanie, sortowanie, paginacja i liczniki odbywają się na **serwerze** (`GET /api/products`, Nitro). Dane są czytane z CSV, bez bazy.
- **Stan filtrów w URL.** Link z filtrami renderuje się w SSR z właściwymi wynikami, a przyciski wstecz i dalej działają.
- **SEO zależne od filtrów:** tytuł i H1 odzwierciedlają każdy aktywny filtr (kategoria, producenci, zakres kWh/W, cena, wyszukiwanie, strona); do tego opis, `robots`, canonical, Open Graph i JSON-LD `ItemList`.
- **Responsywność:** na telefonie filtry są w pełnoekranowym dialogu.
- Wdrożenie na Vercel. Lighthouse: mobile 92, desktop 100, Accessibility, Best Practices i SEO po 100.
- Testy: Vitest, 73 testy (wyciąganie kWh/W, CSV, kontrakt zapytania, filtrowanie, fasety, SEO, paginacja, pola powiązane z URL) i Playwright (scenariusz z zadania oraz SSR bez JavaScriptu).

## Struktura

```
shared/                          # kod wspólny dla serwera i przeglądarki (Nuxt 4 shared/)
  utils/productQuery.ts          # kontrakt URL ↔ filtry: schemat zod, normalizacja, serializacja
  utils/categories.ts            # kategorie i ich jednostki (jedno źródło prawdy)
  utils/listingSeo.ts            # tytuł/opis/robots/canonical + JSON-LD (czyste funkcje)
  utils/format.ts                # ceny (EUR), kWh/W, zakresy: wspólne dla UI i SEO
  utils/slugify.ts               # slugi w URL ("Quantum Energy" → quantum-energy)
  types/                         # Product, ProductsResponse
server/
  assets/products.csv            # dane (pakowane do builda serwera)
  utils/specs.ts                 # wyciąganie kWh/W z tekstu
  utils/parseProducts.ts         # CSV → produkty (walidacja wierszy)
  utils/catalog.ts               # jednorazowe wczytanie katalogu
  utils/queryProducts.ts         # filtrowanie, wyszukiwanie, sortowanie, paginacja, fasety
  api/products.get.ts            # GET /api/products
app/
  composables/useProductQuery.ts # jedyne miejsce, które czyta i zapisuje URL
  composables/useDraftField.ts   # pole tekstowe powiązane z URL, odporne na wyścig z nawigacją
  pages/index.vue                # useFetch + SEO
  components/                    # filtry, wyszukiwarka, karta, paginacja, chipy
  utils/pagination.ts            # numery stron z przerwami (1 … 4 5 6 … 12)
tests/unit/, tests/e2e/, playwright.config.ts
```

Szczegółowy dziennik decyzji i poprawek w trakcie pracy: [NOTES.md](NOTES.md). Słownik pojęć: [GLOSSARY.md](GLOSSARY.md).

---

## 1. Kluczowe decyzje i dlaczego

### Filtry są zapisane tylko w adresie strony (URL)
- **Co:** wybrane filtry istnieją wyłącznie w adresie, np. `/?category=battery&manufacturer=ecocharge`. Nie ma osobnego „magazynu stanu” (takiego jak Pinia). Jeden plik, `useProductQuery`, czyta filtry z adresu i zapisuje każdą zmianę jako nowy wpis w historii przeglądarki.
- **Dlaczego:** skoro filtry są tylko w adresie, trzy wymagania z zadania działają same. Link wysłany komuś pokazuje te same wyniki, serwer od razu renderuje właściwą stronę, a przycisk „wstecz” cofa ostatni filtr. Przy dwóch miejscach (adres i magazyn) trzeba by je ciągle synchronizować, a to częste źródło błędów.
- **Dane:** `useFetch` pobiera produkty przy każdej zmianie filtrów. Przy pierwszym wejściu serwer wysyła stronę razem z danymi, więc przeglądarka nie pyta API drugi raz.

### Te same reguły czytania filtrów dla serwera i przeglądarki
- **Co:** plik `shared/utils/productQuery.ts` opisuje, jakie filtry są dozwolone i jak je odczytać z adresu. Korzysta z niego i serwer (API), i przeglądarka. Reguły są zapisane biblioteką zod, która sprawdza dane w trakcie działania aplikacji.
- **Błędne wartości są pomijane, a nie zgłaszane jako błąd.** `?page=abc` daje stronę 1, a nieznana kategoria jest ignorowana. Link z literówką nadal pokazuje listę produktów.
- **Ten sam zestaw filtrów zawsze daje ten sam adres.** Kod zamienia min z max, jeśli ktoś podał je odwrotnie, sortuje producentów i usuwa wartości domyślne oraz obce parametry (np. `utm_source` z newslettera). Dzięki temu serwery Vercela (CDN) mogą zapamiętywać odpowiedzi, a Google widzi jeden adres zamiast wielu kopii.
- **Reguły zmian:** każda zmiana filtra wraca na stronę 1, a zmiana kategorii czyści zakres kWh/W.

### Logika w zwykłych funkcjach, oddzielona od Nuxta
- **Co:** wczytanie CSV, wyciąganie kWh/W, filtrowanie i reguły SEO to zwykłe funkcje. Dostają dane, zwracają wynik i nie wiedzą nic o Nuxcie ani o przeglądarce. Endpoint API i strona tylko je wywołują.
- **Dlaczego:** takie funkcje da się szybko przetestować (Vitest) bez uruchamiania aplikacji, a każda reguła jest w jednym, łatwym do wskazania miejscu.

### Plik CSV jest częścią zbudowanej aplikacji
- **Co:** CSV leży w `server/assets`. Część serwerowa Nuxta (Nitro) dołącza ten folder do builda, a kod czyta plik przez `useStorage('assets:server')`.
- **Dlaczego:** na Vercelu serwer działa jako funkcja w chmurze bez dostępu do plików z repozytorium, więc zwykłe `fs.readFile('products.csv')` by nie zadziałało.
- **Wydajność i odporność:** plik jest parsowany raz na uruchomienie serwera, a nie przy każdym żądaniu. Błędny wiersz CSV jest pomijany z ostrzeżeniem i numerem linii, a reszta katalogu działa.

### Liczniki przy filtrach, jak w dużych sklepach
- **Co:** przy każdym producencie widać liczbę, np. „EcoCharge (5)”: tyle produktów zobaczysz po jego zaznaczeniu, przy pozostałych wybranych filtrach.
- **Szczegóły:**
  - licząc producentów, pomijam filtr producenta, bo inaczej po zaznaczeniu jednego wszyscy pozostali mieliby 0;
  - zaznaczony producent zostaje na liście nawet z wynikiem 0, żeby dało się go odznaczyć;
  - granice pól ceny i kWh/W liczę z całej kategorii, żeby nie zmieniały się przy każdym kliknięciu.

### Filtr i sortowanie po kWh/W tylko po wybraniu kategorii
- kWh (pojemność baterii) i W (moc panelu) to różne wielkości i nie da się ich porównać. Bez wybranej kategorii serwer ignoruje te parametry, a strona podpowiada, żeby wybrać baterie albo panele.

### Pola tekstowe nie gubią tego, co wpisujesz
- **Problem:** wyszukiwarka i pola „od–do” zapisują wartość do adresu z opóźnieniem. Zanim zmiana adresu się zakończy, użytkownik może już pisać dalej, a stary kod nadpisywał wtedy pole starszą wartością. Przykład: wpisanie minimum ceny, Tab i pisanie maksimum czyściło pole maksimum.
- **Rozwiązanie:** wspólny moduł `useDraftField` rozpoznaje, że zmiana adresu pochodzi z własnego zapisu, i wtedy nie nadpisuje pola. Działa w wyszukiwarce i we wszystkich polach zakresów, a test odtwarza dokładnie tę kolejność zdarzeń.

### Wyszukiwanie
- Każde wpisane słowo musi wystąpić w nazwie, producencie lub opisie. Wielkość liter nie ma znaczenia.
- Liczby muszą pasować w całości: „10” znajdzie „10kWh”, ale nie „100” ani „10.5”.
- Wyszukiwanie startuje po 350 ms przerwy w pisaniu. Wpisanie jednej frazy to jeden krok w historii przeglądarki, więc „wstecz” nie przechodzi przez „b”, „ba”, „bat”…

### Strony wyników jako zwykłe linki
- Na jednej stronie są 24 produkty, a kolejne strony to zwykłe linki `?page=2`. Robot Google może po nich przejść, a użytkownik może je otworzyć w nowej karcie.
- Gotowy komponent Vuetify (`v-pagination`) używa przycisków zamiast linków, więc paginację napisałem sam. Kategorie też są linkami.

### Vuetify 3 (jak w sun.store), ale z dbałością o szybkość
- ikony jako małe obrazki SVG zamiast całego fontu z ikonami;
- czcionka systemowa zamiast pobieranej z sieci Roboto;
- własny nagłówek zamiast `v-app-bar`: ten komponent ustala swoją wysokość dopiero po załadowaniu JavaScriptu, przez co cała strona „podskakiwała” (w Lighthouse: CLS);
- panel filtrów jest na telefonie ukryty, więc jego JavaScript w ogóle się nie uruchamia (Nuxt: `hydrate-on-visible`);
- prostsza karta produktu i zwykła lista `<select>` do sortowania, czyli mniej kodu do uruchomienia w przeglądarce.

### Założenia tam, gdzie zadanie nic nie mówiło
- Waluta: **EUR**. W CSV jej nie ma, a sun.store to europejski marketplace.
- Ceny **netto**, bo w handlu B2B podaje się je bez VAT.
- Interfejs po angielsku, bo dane są po angielsku. README po polsku.

## 2. Jak pozyskałem kWh/W i jakie przypadki brzegowe obsłużyłem

Każda kategoria ma w `categories.ts` przypisaną jednostkę: baterie `kWh`, panele `W`, złączki brak. `specs.ts` dla każdej jednostki ma regułę: wzorzec i zakres wiarygodnych wartości.

1. **Najpierw opis**, bo podaje jednostkę wprost („10kWh”, „450W”). Wygrywa **pierwsze** dopasowanie.
2. **Liczba na końcu nazwy** („EcoCharge HomeVault 13.5”) służy jako zapas i do sprawdzenia: przy niezgodności z opisem logowane jest ostrzeżenie, a wygrywa opis.
3. **Zakres wiarygodności** (bateria 0,5–200 kWh, panel 10–1000 W): wartość spoza zakresu jest odrzucana i bierzemy liczbę z nazwy.

| Przypadek | Przykład z danych | Obsługa |
|---|---|---|
| Opis wspomina też pojemność całego zestawu | PowerFlow Stack 7.5: „…for a total of **30kWh**” | pierwsze dopasowanie (7.5) |
| Opis wspomina rozmiar modułu | AuraPower Reserve 12.5: „(five **2.5kWh** modules)”; PowerFlow Stack 7 / 10.5 / 14 | pierwsze dopasowanie |
| Inne jednostki obok W | złączki: „1500V”, „15A”; teksty z „5kW”, „10kWh” | `W` rozróżnia wielkość liter i ma granice słowa, więc kW, kWh, V i A się nie łapią |
| Zapis | „7,5 kWh”, „400 W”, „410Wp” | przecinek dziesiętny, spacja przed jednostką, Wp |
| Brak jednostki w opisie | – | liczba z nazwy |
| Nieprawdopodobna wartość | „0.45W per cell” | odrzucona, bierzemy liczbę z nazwy |
| Kategoria bez spec | złączki | `null`, a z nią brak ceny za jednostkę |

Wynik: wszystkie 50 baterii i 50 paneli ma kWh/W, a wartość z opisu zawsze zgadza się z nazwą. Test na prawdziwym CSV pilnuje tego dla całego pliku. **Świadomie nieobsłużone**, bo w danych nie występują: separator tysięcy („1,500 W” → 1,5 → poza zakresem → liczba z nazwy), zakresy („400–450 W”), jednostki Wh i MWh oraz zapis „450 watts”.

## 3. Indeksowanie kombinacji filtrów w wyszukiwarkach

Indeksowałbym tylko kombinacje z realnym popytem w wyszukiwarce i wystarczającą liczbą wyników: kategorię, producenta, kategorię z producentem, ewentualnie progi pojemności lub mocy („baterie 10 kWh”). Dostałyby czyste, stabilne URL-e (np. `/baterie/ecocharge`), własny tytuł i opis oraz wpis w `sitemap.xml`. Wszystkie pozostałe kombinacje (wyszukiwanie, sortowanie, zakresy, kilku producentów, puste wyniki) dostają `noindex, follow` z canonical na samą siebie, a listę indeksowanych faset weryfikowałbym danymi z Search Console i analizą słów kluczowych.

Obecna implementacja realizuje już tę regułę na parametrach query (`buildListingSeo`). Brakuje czystych ścieżek i sitemapy.

## 4. Czego celowo nie zrobiłem i co zrobiłbym dalej

### Celowo pominięte

**Zapisywanie gotowych stron na serwerach Vercela (cache HTML na CDN, tzw. ISR)**
- *Co to jest:* Vercel może zapamiętać wygenerowaną stronę i podawać ją kolejnym osobom bez ponownego renderowania. Szybciej i taniej.
- *Dlaczego nie teraz:* w domyślnej konfiguracji Vercel rozpoznaje stronę tylko po ścieżce (`/`) i ignoruje parametry po `?`. Wtedy `/?category=battery` i `/?category=solar-panel` dostałyby ten sam zapamiętany HTML, czyli link z filtrami pokazałby złe wyniki. Zepsułoby to wymaganie „link z filtrami renderuje się po stronie serwera z właściwymi wynikami”.
- *Co bym zrobił:* włączył cache z jawną listą parametrów, które odróżniają strony (`allowQuery`), i sprawdził to testem E2E. Odpowiedzi API są już zapamiętywane na CDN (nagłówki `s-maxage` i `stale-while-revalidate`).

**Mniejszy plik CSS Vuetify**
- *Co to jest:* Vuetify dołącza tysiące gotowych klas pomocniczych (np. `mb-4`, `d-flex`). Przeglądarka musi pobrać cały plik CSS, zanim pokaże stronę; na telefonie w Lighthouse to ok. 150–300 ms.
- *Dlaczego nie teraz:* usunięcie nieużywanych klas wymaga konfiguracji Sass i przejrzenia wszystkich komponentów, a wynik mobile i tak wynosi 92/100.
- *Co bym zrobił:* wyłączył nieużywane grupy klas w konfiguracji Sass Vuetify (`$utilities`).

**Wyszukiwanie odporne na literówki i odmiany słów**
- *Co to jest:* dziś „baterry” nie znajdzie „battery”, a „panels” nie znajdzie „panel”.
- *Dlaczego nie teraz:* napisanie tego samemu to osobny duży temat, a sun.store ma do tego Algolię.
- *Co bym zrobił:* przeniósł wyszukiwanie i filtry do Algolii (InstantSearch).

**Strony pojedynczych produktów**
- Zadanie ich nie wymaga. Skutek uboczny: dane dla wyszukiwarek (JSON-LD) nie mają linków do produktów, więc Google nie pokaże przy nich np. ceny w wynikach wyszukiwania (tzw. rich results).

### Co zrobiłbym dalej

1. **Ładne adresy stron, które mają być w Google.** Na przykład `/baterie/ecocharge` zamiast `/?category=battery&manufacturer=ecocharge`, plus plik `sitemap.xml` z ich listą. Adres domeny do canonical ustawiłbym w konfiguracji (`runtimeConfig.public.siteUrl`). Dziś jest brany z adresu żądania, więc kopia strony na `*.vercel.app` i docelowa domena mogłyby ze sobą konkurować w Google.
2. **Wiele języków i walut.** sun.store działa w 7 językach: tłumaczenia (`@nuxtjs/i18n`), ceny netto lub brutto zależnie od kraju. Kwoty trzymałbym w groszach (liczby całkowite), bo ułamki w JavaScripcie dają błędy zaokrągleń (`0.1 + 0.2` to nie dokładnie `0.3`).
3. **Automatyczne sprawdzanie każdej zmiany (CI).** GitHub Actions uruchamia lint, typecheck, Vitest i Playwright przy każdym pull requeście; Playwright także na wersji podglądowej z Vercela.
4. **Pomiar u prawdziwych użytkowników i zbieranie błędów.** Lighthouse to symulacja w laboratorium. Vercel Speed Insights mierzy szybkość u realnych osób, a Sentry zbiera błędy z produkcji.
5. **Algolia przy dużym katalogu.** Przy tysiącach produktów filtrowanie w pamięci serwera przestaje wystarczać.
6. **Porządki w kodzie z przeglądu architektury.** Dziś wszystko działa poprawnie, więc nie ryzykowałem zmian tuż przed wysłaniem:
   - liczniki przy filtrach liczone tą samą funkcją co wyniki po kliknięciu (dziś dwa miejsca w kodzie muszą się ze sobą zgadzać; sprawdziłem 43 przypadki, zgadzają się);
   - jedna lista sortowań zamiast trzech miejsc w kodzie (dziś nowe sortowanie to zmiany w 3 plikach);
   - jedna funkcja opisująca aktywne filtry dla chipów i dla tytułu strony (dziś podobna logika jest w dwóch miejscach);
   - informacja „czy cena za jednostkę ma sens” przy każdej jednostce, zanim dojdą np. ampery dla złączek, bo „cena za amper” nic nie mówi.

## 5. Wynik Lighthouse

Produkcja na Vercel, Lighthouse 13.5. Mediana z 5 przebiegów na mobile i z 3 na desktopie, bo wynik mobile waha się o kilka punktów między przebiegami (84–96).

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| **Mobile** | **92** | **100** | **100** | **100** |
| **Desktop** | **100** | **100** | **100** | **100** |

Mobile: FCP ~1.7 s, LCP ~1.9–2.5 s, TBT ~180–300 ms, **CLS 0**.

| Mobile | Desktop |
|---|---|
| ![Lighthouse mobile](docs/lighthouse/mobile.png) | ![Lighthouse desktop](docs/lighthouse/desktop.png) |

Pełne raporty: [mobile](docs/lighthouse/mobile.html), [desktop](docs/lighthouse/desktop.html).

Pierwszy pomiar dał mobile 83 / A11y 96 i desktop 99 / A11y 90. Poprawki:
- **CLS 0.078 → 0:** `v-app-bar` zamieniony na nagłówek `sticky`;
- **TBT:** opóźniona hydracja sidebaru i lżejsze karty;
- **kontrast etykiet pól:** 4,3:1 → ok. 5,9:1 przez zmienną motywu Vuetify;
- **ARIA:** `ul`/`li` zamiast `v-list` z linkami.

## 6. Jak korzystałem z AI

Pracowałem z **Claude Code** (Claude Opus) jako partnerem do programowania, etapami:
1. plan;
2. dane i kWh/W;
3. API;
4. UI i stan w URL;
5. SEO;
6. wdrożenie i Lighthouse;
7. E2E;
8. README.

Ja podejmowałem decyzje zakresowe (Vuetify 3 jak w stacku firmy, język UI, które dodatki zrobić), zatwierdzałem każdy etap i sam testowałem stronę w przeglądarce, lokalnie i po wdrożeniu na Vercel. AI pisało kod i tłumaczyło go, a ja dopytywałem o rzeczy, których wcześniej nie używałem (Nitro, Zod, opóźniona hydracja). Po każdym etapie uruchamiałem automatyczny przegląd (skill `simplify`, cztery osie: reuse, uproszczenia, wydajność, właściwa warstwa), a po etapie 3 code review całości (zgodność ze standardami i ze specyfikacją).

**Gdzie trzeba było poprawiać wynik AI i dlaczego:**
- **Skill do Nuxta ze skills.sh odrzucony.** Był wygenerowany pod Nuxt 5 i podsuwałby API, którego w Nuxt 4.6 nie ma.
- **Własny `router.options.ts` z pierwszej wersji** nadpisywał całe domyślne przewijanie Nuxta. Wyłapał to przegląd, plik usunięty.
- **Wyścig w wyszukiwarce:** `watch` URL → pole nadpisywał tekst dopisany w trakcie nawigacji („bat” + „tery” → „bat”). Nie złapały tego ani testy jednostkowe, ani dwa review, dopiero ręczny test w przeglądarce.
- **Paginacja:** wszystkie numery stron były „aktywne” i miały `aria-current`, bo vue-router ignoruje query przy porównywaniu linków. Wyłapane w przeglądarce, poprawione propem `exact`.
- **Escape w JSON-LD był pozorny.** Sekwencja `<` zamieniła się przy zapisie pliku w zwykłe `<`, więc zamiana nic nie robiła. Wyłapał to test bezpieczeństwa; ostatecznie escape robi unhead (sprawdzone w jego kodzie).
- **Reguła CSS poprawiająca kontrast nie działała,** bo CSS Vuetify ładuje się później. Wyłapał to drugi pomiar Lighthouse; zostało rozwiązane zmienną motywu.
- **Natywny `<select>` z `:value`** nie przeżywał SSR: po odświeżeniu pole pokazywało „Featured”. Wyłapał to test E2E z wyłączonym JS.
- **Przegląd architektury (skill `improve-codebase-architecture`) znalazł ten sam wyścig co w wyszukiwarce, tym razem w polach ceny.** Odtworzyłem go ręcznie, a poprawkę wydzieliłem do jednego modułu. Z pięciu kandydatów zrobiłem tylko ten jeden: pozostałe po sprawdzeniu (np. 43 liczniki faset zgodne z wynikami) okazały się zabezpieczeniem na przyszłość, a nie błędem. Test E2E dla tego wyścigu odrzuciłem, bo na szybkim serwerze produkcyjnym przechodził także na starym kodzie, więc niczego nie dowodził; dowodem jest test jednostkowy.
- **„Zbędna” asercja usunięta na sugestię przeglądu AI była jedynym czekaniem** przed jednorazowym odczytem listy. Lokalnie test przechodził, na Vercelu się sypał (wyścig z żądaniem).
- **Drobne błędy typów:** agent przeglądu twierdził, że typ zdarzenia `v-checkbox` to `any`, a typecheck pokazał `string[] | null`. `z.coerce.number()` wewnątrz `.pipe()` nie kompiluje się w Zod 4; pojawiło się to dwa razy, raz w pierwszej wersji kodu, raz w sugestii przeglądu.
- **Dziennik czasu:** AI wpisało w NOTES szacowane godziny zamiast zmierzonych. Poprawione na podstawie znaczników czasu commitów, od tej pory tylko z `date`.

**Wniosek:** AI przyspiesza pisanie i przegląd, ale błędy, które naprawdę miały znaczenie (wyścigi, SSR, dostępność), wychodziły dopiero przy uruchomieniu w prawdziwej przeglądarce, w Lighthouse i w E2E. Każdą sugestię typu „to jest zbędne” sprawdzałem, czy nie zmienia zachowania.

## 7. Ile czasu realnie poświęciłem

Łącznie **ok. 3 h 16 min zegarowo** (196 min): 13:31–14:59, 19:00–20:46, 21:02–21:03 i 21:15–21:16 (poprawa czytelności README), z przerwą 15:00–19:00. Źródłem są znaczniki czasu commitów (`git log`) i `date`, a nie szacunki.

Czas zegarowy obejmuje też naukę: ok. **45 min** zajęło tłumaczenie kodu i odpowiedzi na moje pytania o technologie, których wcześniej nie używałem (Nitro, Zod, opóźniona hydracja, SEO fasetowe, JSON-LD). Sama praca nad zadaniem (plan, kod, przeglądy, wdrożenie, testy, README) to więc **ok. 2 h 31 min**.

| Etap | Czas |
|---|---|
| Analiza zadania, plan, wybór narzędzi | 13:31–13:45 |
| Setup, dane i kWh/W, kontrakt zapytania i API (z przeglądami) | 13:45–14:18 |
| UI i stan w URL, code review i poprawki | 14:18–14:40 |
| SEO | 19:00–19:07 |
| Wdrożenie, Lighthouse, poprawki wydajności i dostępności | 19:15–19:44 |
| Playwright E2E | 19:55–20:06 |
| README, końcowy code review i poprawki | 20:10–20:22 |
| Przegląd architektury i poprawka wyścigu w polach ceny | 20:22–20:46 |
| Poprawa czytelności README (sekcje 4 i 1) | 21:02–21:03, 21:15–21:16 |

Pozostałe okienka (14:40–14:59, 19:07–19:15, 19:44–19:55, 20:06–20:10) to tłumaczenia. Część okienka 13:55–14:11 to tłumaczenie Nitro i Zod przemieszane z przeglądem kodu. Pełna tabela jest w [NOTES.md](NOTES.md).
