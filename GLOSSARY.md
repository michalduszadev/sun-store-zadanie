# Słownik pojęć

Nazwy używane w kodzie i w rozmowie o nim.

| Pojęcie | Znaczenie | Gdzie w kodzie |
|---|---|---|
| **Product** | Wiersz z `products.csv` po walidacji, wzbogacony o `spec` i `unitPrice`. | `shared/types/product.ts` |
| **Spec** | Pojemność baterii (kWh) albo moc panelu (W), wyciągnięta z opisu lub nazwy. Złączki nie mają spec. | `server/utils/specs.ts`, `shared/utils/categories.ts` |
| **Unit price** | Cena za jednostkę spec (EUR/kWh, EUR/W). | `server/utils/parseProducts.ts` |
| **Product query** | Stan filtrów strony listingu: to, co jest w URL, po walidacji i normalizacji. Wspólny kontrakt przeglądarki i serwera. | `shared/utils/productQuery.ts` |
| **Facet** | Wymiar filtrowania (kategoria, producent) z licznikami „ile wyników po wybraniu tej opcji”. | `server/utils/queryProducts.ts` |
| **Landing page** | Kombinacja filtrów, którą indeksujemy: katalog, kategoria, producent, kategoria + producent. Reszta to `noindex, follow`. | `shared/utils/listingSeo.ts` |
| **Draft field** | Pole tekstowe, którego wartość żyje w URL: lokalny tekst + zatwierdzanie do URL, odporne na „echo” własnej nawigacji. | `app/composables/useDraftField.ts` |
