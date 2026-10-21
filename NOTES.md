# Dziennik pracy (materiał do README)

## Czas
| Etap | Start | Koniec |
|---|---|---|
| 0. Setup | 13:45 | 14:05 |

## Decyzje
- **Vuetify 3.13 zamiast 4.x**: v4 jest już stabilne, ale produkcja sun.store stoi na Vuetify 3 (ogłoszenie). Kod ma być „ich”.
- **TypeScript 5.9, nie 7.0**: TS 7 (natywny kompilator w Go) świeżo wydany, `vue-tsc` opiera się na JS API TS, więc ryzyko niekompatybilności. Przypięte `~5.9.3`.
- **Ikony `mdi-svg` (@mdi/js)**: tylko użyte ścieżki SVG trafiają do bundla, brak requestu po font ikon.
- **Systemowy font**: Vuetify 3 ma zahardkodowane `Roboto, sans-serif`; nie ładujemy Roboto z sieci (LCP), nadpisujemy w `app/assets/main.css`.
- **pnpm 12 `allowBuilds`**: tylko esbuild i unrs-resolver mogą uruchamiać skrypty instalacyjne (supply-chain hygiene).

## Użycie AI / poprawki
- Skill `onmax/nuxt-skills` (skills.sh) **odrzucony**: jego `nuxt` SKILL.md jest wygenerowany pod Nuxt 5 (Nitro v3, `nuxt/server` imports). W projekcie Nuxt 4.6 podsuwałby nieistniejące API.
