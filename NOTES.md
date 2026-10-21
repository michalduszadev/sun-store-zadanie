# Dziennik pracy (materiał do README)

## Czas
| Etap | Start | Koniec |
|---|---|---|
| 0. Setup | 13:45 | 13:52 |
| 1. Dane + kWh/W | 13:52 | 13:56 |
| 1b. simplify + repo | 13:56 | 14:10 |
| 2. Query + API | 14:10 | 14:35 |

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
- **Cache-Control** `s-maxage=3600, stale-while-revalidate`: dane zmieniają się tylko z deployem, a Vercel czyści CDN przy deployu. Nagłówek ustawiany *po* udanym wczytaniu katalogu, żeby nie cache'ować błędu.
- **`getQuery` zamiast `getValidatedQuery`**: ten drugi służy do walidacji, która rzuca 400; my celowo nie rzucamy.

## Użycie AI / poprawki
- Skill `onmax/nuxt-skills` (skills.sh) **odrzucony**: jego `nuxt` SKILL.md jest wygenerowany pod Nuxt 5 (Nitro v3, `nuxt/server` imports). W projekcie Nuxt 4.6 podsuwałby nieistniejące API.
- Zod 4: `z.string().pipe(z.coerce.number())` nie typuje się (coerce ma input `unknown`) → zamienione na `.transform(Number).pipe(z.number())`.
- Zod 4 + TS: `z.coerce.number()` w `.pipe()` ponownie nie typuje się (agent review sprawdził to tylko w node, nie w TS) → `.transform(Number).pipe(z.number())`.
- Simplify etapu 2 wyłapał realny problem projektowy: brak wspólnej reguły „zmiana kategorii czyści zakres spec”, więc zakres 5–10 kWh przeszedłby na panele jako 5–10 W.
