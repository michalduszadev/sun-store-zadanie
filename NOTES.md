# Dziennik pracy (materiał do README)

## Czas
Źródło: znaczniki czasu commitów (`git log`) i `date`. Czas zegarowy obejmuje też tłumaczenie kodu i pytania (tryb nauki), więc jest dłuższy niż sam czas implementacji.

| Etap | Start | Koniec (commit) |
|---|---|---|
| Analiza zadania, plan, wybór skilli | 13:31 | ~13:45 |
| 0. Setup | ~13:45 | 13:52 |
| 1. Dane + kWh/W | 13:52 | 13:55 |
| 1b. Objaśnienie Nitro/Zod, simplify, repo | 13:55 | 14:11 |
| 2. Query + API (+ simplify) | 14:11 | 14:18 |
| 3. UI + stan w URL (+ simplify) | 14:18 | 14:35 |
| 3b. Code review + poprawki | 14:35 | 14:40 |
| Objaśnienia etapu 3 | 14:40 | 14:55 |
| **Pauza** | 14:59 | 19:00 |
| 4. SEO (+ simplify) | 19:00 | 19:07 |
| 4b. Objaśnienia SEO/fasety/JSON-LD | 19:07 | 19:15 |
| 5. Deploy Vercel + Lighthouse + poprawki (+ simplify) | 19:15 | 19:45 |

## Decyzje
- **Vuetify 3.13 zamiast 4.x**: v4 jest już stabilne, ale produkcja sun.store stoi na Vuetify 3 (ogłoszenie). Kod ma być „ich”.
- **TypeScript 5.9, nie 7.0**: TS 7 (natywny kompilator w Go) świeżo wydany, `vue-tsc` opiera się na JS API TS, więc ryzyko niekompatybilności. Przypięte `~5.9.3`.
- **Ikony `mdi-svg` (@mdi/js)**: tylko użyte ścieżki SVG trafiają do bundla, brak requestu po font ikon.
- **Systemowy font**: Vuetify 3 ma zahardkodowane `Roboto, sans-serif`; nie ładujemy Roboto z sieci (LCP), nadpisujemy w `app/assets/main.css`.
- **pnpm 12 `allowBuilds`**: tylko esbuild i unrs-resolver mogą uruchamiać skrypty instalacyjne (supply-chain hygiene).

- **CSV w `server/assets` + `useStorage('assets:server')`**: Nitro pakuje assety do bundla serwera, więc działa też na Vercel (serverless), gdzie `fs.readFile('./products.csv')` nie ma pliku. Parsowanie raz, cache'owany *promise* (równoległe pierwsze requesty dzielą jedno parsowanie; błąd nie jest cache'owany).
- **`parseProductsCsv` czysta, `getCatalog` z I/O**: rozdzielone, żeby testować logikę bez runtime'u Nitro.
- **Walidacja wierszy zod**: zły wiersz jest pomijany z ostrzeżeniem (nr linii CSV), reszta katalogu działa.
- **Jawne importy w `server/utils`** (zamiast auto-importów) dla modułów czystych: Vitest bez Nuxt runtime je zrozumie, a na rozmowie widać zależności.
- **kWh/W**: reguła per kategoria (regex + jednostka + zakres wiarygodności). Opis ma pierwszeństwo (ma jednostkę), *pierwsze* dopasowanie wygrywa, nazwa jako fallback i cross-check (warn przy niezgodności). `W` case-sensitive + `\b`, więc nie łapie kW/kWh/V/A; obsługa `Wp`, przecinka dziesiętnego, spacji. Wartość poza zakresem (np. 0.45W „per cell”) → fallback do nazwy.
- **Nie obsłużone świadomie**: separator tysięcy („1,500 W” → 1.5 → poza zakresem → fallback do nazwy), zakresy („400–450 W”), jednostki Wh/MWh.

- **Po simplify (4 agenty: reuse/uproszczenia/wydajność/altitude)**: jednostka kWh/W miała dwa źródła prawdy (SPEC_RULES i CATEGORIES) → CATEGORIES (shared) mówi *która* kategoria ma *jaką* jednostkę, SPEC_RULES (server) tylko *jak* ją czytać z tekstu. `CategorySlug` wyprowadzony z `CATEGORY_SLUGS` (as const), `CATEGORIES` jako `Record<CategorySlug, …>` → TS wymusza kompletność. Usunięte potrójne trimowanie, sprawdzenia niemożliwe do spełnienia, reset cache po błędzie (asset jest w bundlu, błąd byłby deterministyczny). Numer linii CSV z `info: true` csv-parse zamiast `index + 2`. Katalog zwracany jako `readonly` (współdzielony między requestami).

- **Kontrakt zapytania w `shared/utils/productQuery.ts`**: jeden schemat zod używany przez serwer (`getQuery`) i klienta (`route.query`). Każde pole ma `.catch()` → zły parametr = „nie ustawiony”, nigdy 400/500 (link z błędem i tak pokaże listę). `normalize` = reguły między polami: zamiana min/max, spec tylko w kategorii ze spec, unikalne posortowane slugi producentów (jeden zestaw filtrów = jeden URL = jeden wpis w cache CDN). `updateProductQuery` = reguły zmian z UI: reset strony, czyszczenie zakresu spec przy zmianie kategorii (kWh ≠ W).
- **Fasety**: liczniki producentów/kategorii liczone z pominięciem *własnego* filtra (klasyczny faceting, jak w Algolii). Wybrany producent z 0 wynikami zostaje widoczny, żeby dało się go odznaczyć. Zakresy ceny/spec z całej kategorii, żeby suwaki nie skakały.
- **Wyszukiwanie**: każde słowo musi wystąpić (AND) w nazwie, producencie lub opisie, case-insensitive. „10 kwh” znajdzie „10kWh”. Brak fuzzy/stemmingu → w produkcji Algolia (mają ją w stacku).
- **Strona poza zakresem** → przycinana do ostatniej (zamiast pustej listy).
- **Cache-Control** `max-age=60, s-maxage=3600, stale-while-revalidate=86400`: dane zmieniają się tylko z deployem, a Vercel czyści CDN przy deployu. Nagłówek ustawiany *po* udanym wczytaniu katalogu, żeby nie cache'ować błędu.
- **`getQuery` zamiast `getValidatedQuery`**: ten drugi służy do walidacji, która rzuca 400; my celowo nie rzucamy.

- **`useProductQuery`**: jedyne miejsce, które czyta/pisze URL. `query = computed(parse(route.query))`, `update(patch)` = `router.push` (nowy wpis w historii → wstecz działa), `linkTo(patch)` dla `:to` (kategorie i strony to prawdziwe `<a href>`, crawlowalne).
- **`useFetch` z `serializeProductQuery(query)`** zamiast surowego `route.query`: znormalizowany URL API (lepszy cache, `utm_*` nie idą do API). Stały `key: 'products'` → poprzednie wyniki zostają na ekranie (przyciemnione) podczas ładowania nowych.
- **Debounce wyszukiwania 350 ms** + Enter od razu; pola zakresów commitują na blur/Enter. Lokalny stan pola + `watch` URL → pole (wstecz/„Clear all” aktualizują inputy). Strażnik „bez zmian” w `commit()` jest potrzebny, bo każda zmiana resetuje stronę.
- **Mobile**: filtry w `v-dialog` (lazy, montowany dopiero po otwarciu), sidebar ukrywany CSS-em (`d-none d-md-block`), nie `useDisplay()` → brak hydration mismatch (serwer nie zna szerokości ekranu).
- **Paginacja jako linki** (`v-pagination` renderuje przyciski, nie `<a>`). Vue Router przy ustalaniu aktywnego linku ignoruje query → bez `exact` każdy `?page=N` byłby „aktywny” i miał `aria-current` (złapane w przeglądarce). Kategorie: jawny `:active`, bo `exact` zawiódłby na stronie > 1.
- **Scroll**: domyślne zachowanie Nuxt przy zmianie samego query = brak przewijania (dobre dla filtrów); paginacja przewija na górę sama. Własny `router.options.ts` usunięty po review (nadpisywał całe domyślne zachowanie Nuxt, łącznie z obsługą hash i czekaniem na render).
- **Odłożone do etapu 5 (najpierw pomiar Lighthouse)**: lżejsze karty (mniej komponentów Vuetify), natywny `<select>`, `routeRules` cache dla HTML.

- **Po code review (2 osie: standardy + zgodność ze specyfikacją)**: wyszukiwanie liczb jako całych liczb („1” nie znajduje „10”/„15A”, „10” znajduje „10kWh”); powtarzane `?manufacturer=a&manufacturer=b` są łączone; jedna sesja pisania w wyszukiwarce = jeden wpis w historii (pierwszy commit `push`, kolejne `replace`); błędna wartość w polu zakresu jest czyszczona zamiast ignorowana po cichu; `categorySpec()` zamiast powtarzanego `category ? CATEGORIES[...].spec : null`; algorytm paginacji wydzielony do `app/utils/pagination.ts` + testy.
- **Świadomie nie poprawione**: filtr/sort po kWh/W tylko po wyborze kategorii (kWh i W są nieporównywalne, → README); `?page=99` pokazuje ostatnią stronę bez przekierowania (canonical w etapie 4 użyje strony z odpowiedzi); opisy sortowań w toolbarze obok listy `SPEC_SORTS` (3 miejsca przy nowym sorcie, `Record` pilnuje komparatorów).

- **SEO w czystej funkcji `shared/utils/listingSeo.ts`**: `buildListingSeo(query, response)` → h1, title, description, robots, canonical; strona tylko podpina wynik w `useSeoMeta`/`useHead` (gettery → tagi aktualizują się też przy nawigacji po stronie klienta). Testowane jednostkowo.
- **Reguła indeksowania**: indeksujemy „landing pages” = cały katalog, kategoria, jeden producent, kategoria + jeden producent (oraz ich kolejne strony), o ile mają wyniki. Wyszukiwanie, sortowanie, zakresy, wielu producentów i puste wyniki → `noindex, follow` (nie do indeksu, ale linki i produkty na nich są odkrywane). Powód: kombinacji filtrów jest praktycznie nieskończenie wiele, to prawie-duplikaty i marnowanie crawl budget.
- **Canonical zawsze na samą siebie, znormalizowany**: bez `utm_*`/śmieci, kolejność parametrów stała, strona przycięta przez serwer (`?page=99` → canonical `?page=7`). Nie łączymy `noindex` z canonical wskazującym *inny* URL (sprzeczne sygnały dla Google). Origin z `useRequestURL()`; w produkcji z własną domeną lepiej `runtimeConfig.public.siteUrl` (żeby `*.vercel.app` i domena nie konkurowały).
- **JSON-LD `ItemList` → `Product` + `Offer` (EUR) + `additionalProperty` z kodem jednostki UN/CEFACT (KWH, WTT)**: pozycje liczone przez strony (strona 2 zaczyna od 25). Brak `url` produktów (nie ma stron produktu), więc to opis danych, nie rich results. Escapowanie `<` robi unhead dla skryptów typu `*json` (sprawdzone w kodzie i renderem).

- **Deploy: Vercel z integracją GitHub** (każdy push na `main` = deploy produkcyjny, branch = preview). Przypięte `engines.node: 24.x` i `packageManager: pnpm@12.8.1` + zmienna `ENABLE_EXPERIMENTAL_COREPACK=1` (Vercel wybiera pnpm po `lockfileVersion: 9.0`, czyli starszy pnpm; Corepack wymusza tę samą wersję co lokalnie). `onlyBuiltDependencies` obok `allowBuilds` jako zabezpieczenie dla starszego pnpm. GitHub App Vercela tylko na to jedno repo (najmniejsze uprawnienia). Plugin „Vercel for agents” pominięty (niepotrzebny przy deployu z gita).
- **Lighthouse, przed → po** (mediana; mobile 5 przebiegów, desktop 3; Lighthouse 13.5, headless Chrome, produkcja na Vercel):
  - mobile: Performance 83 → **92**, Accessibility 96 → **100**, Best Practices 100, SEO 100; CLS 0.078 → **0**, TBT 380 → ~250 ms
  - desktop: Performance 99 → **100**, Accessibility 90 → **100**, BP 100, SEO 100
  - rozrzut mobile 84–96 (symulowane 4× wolniejsze CPU na moim laptopie) → dlatego mediana
- **Poprawki z Lighthouse**:
  - CLS: `v-app-bar` mierzy swoją wysokość dopiero po hydracji (SSR wysyła `--v-layout-top: 0px`, klient 64px → cała treść skacze). Zamiana na zwykły `<header>` ze `position: sticky`.
  - TBT: sidebar z filtrami jako `<LazyProductFilters hydrate-on-visible>` (Nuxt delayed hydration). Na telefonie sidebar ma `display:none` → nie hydratuje się na starcie (~30 inputów mniej); HTML z linkami kategorii nadal jest w SSR dla robotów. Karta produktu: zwykły HTML w jednym `v-card` (24 karty × ~6 komponentów Vuetify mniej do hydracji).
  - Kontrast: etykiety pól Vuetify 4.3:1 (WCAG AA wymaga 4.5:1) → zmienna motywu `medium-emphasis-opacity: 0.7` (ok. 5.9:1).
  - ARIA: `v-list` ma `role="list"`, a dzieci-linki nie mają `role="listitem"` → `<ul>/<li>`.
- **Świadomie nie zrobione**: (1) cache HTML przez `routeRules` ISR/SWR: Vercel ISR domyślnie ignoruje query string, więc wszystkie URL-e z filtrami dostałyby ten sam HTML (złamany SSR filtrów); wymagałoby jawnej listy `allowQuery`. (2) Odchudzenie CSS Vuetify (entry.css render-blocking, głównie klasy utility) wymaga konfiguracji Sass `$utilities` – duża zmiana. (3) Natywny `<select>` zamiast `v-select` – mały zysk (VOverlay i tak potrzebny dla dialogu).

## Użycie AI / poprawki
- Skill `onmax/nuxt-skills` (skills.sh) **odrzucony**: jego `nuxt` SKILL.md jest wygenerowany pod Nuxt 5 (Nitro v3, `nuxt/server` imports). W projekcie Nuxt 4.6 podsuwałby nieistniejące API.
- Zod 4: `z.string().pipe(z.coerce.number())` nie typuje się (coerce ma input `unknown`) → zamienione na `.transform(Number).pipe(z.number())`.
- Zod 4 + TS: `z.coerce.number()` w `.pipe()` ponownie nie typuje się (agent review sprawdził to tylko w node, nie w TS) → `.transform(Number).pipe(z.number())`.
- Simplify etapu 2 wyłapał realny problem projektowy: brak wspólnej reguły „zmiana kategorii czyści zakres spec”, więc zakres 5–10 kWh przeszedłby na panele jako 5–10 W.
- Agent review twierdził, że `update:modelValue` w `v-checkbox` jest typu `any` → w rzeczywistości `string[] | null`; typecheck to wyłapał.
- Moja pierwsza wersja `router.options.ts` zastępowała cały domyślny scrollBehavior Nuxta: usunięta.
- **Wyścig w wyszukiwarce** (złapany testem w przeglądarce, nie przez review ani testy jednostkowe): `watch` URL→pole nadpisywał tekst dopisany w trakcie trwającej nawigacji („bat” + „tery” → „bat”). Poprawka: ignorowanie „echa” własnego commitu.
- Escape `\u003c` w JSON-LD: przy zapisie pliku sekwencja zamieniła się w dosłowne `<`, więc „escapowanie” było no-opem; złapał to test bezpieczeństwa. Ostatecznie ręczny escape usunięty, bo unhead robi to sam (simplify znalazł, zweryfikowane w źródle i renderem).
- Dev server nie podłapał auto-importu z nowego pliku w `shared/utils` (500 „buildListingSeo is not defined”), typecheck przechodził → restart serwera.
- Pierwsza poprawka kontrastu (reguła CSS) nie działała: CSS Vuetify ładuje się po naszym, przy tej samej specyficzności wygrywa – złapał to drugi pomiar Lighthouse; ostatecznie zmienna motywu (sugestia simplify).
