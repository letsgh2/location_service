# Plan: filtrowanie ofert (zakresy cen i metrażu, pokoje, miasto/dzielnica z podpowiedziami, licznik, reset)

Brief: treść zadania (wymagania podane wprost; w `docs/*.md` i `user_stories*.md` brak sekcji o filtrowaniu ofert).
Baza: branch `main`, HEAD `af01bb8`, drzewo czyste. Bramki na starcie:
`pytest -q` = FAIL (`services/backend/venv` bez pytest: `No module named pytest`, nie zainstalowano `.[dev]`),
`npm run build` = FAIL (brak `services/frontend/node_modules`). e2e nie uruchamiane (brief go nie obejmuje).

**Blokada #0:** obie bramki są czerwone z powodu środowiska, nie kodu. Przed commitem #1 ktoś z uprawnieniami musi uruchomić
`cd services/backend && source venv/bin/activate && pip install -e ".[dev]"` oraz `cd services/frontend && npm install`
i potwierdzić zielone `pytest -q` (oczekiwane 3 pliki testowe w `tests/api/`) i `npm run build`. Bez tego żaden krok nie jest weryfikowalny.

**Uwaga o stanie repo:** `.agent/plans/listings.md` (GET /listings/ + widok) nie został wykonany: w `main.py` nie ma
żadnego endpointu `/listings`. Ten plan wchłania jego kroki 1–4 (commity #1, #2, #10 tutaj), patrz D1.

**Zakres:** `services/backend/main.py`, `services/backend/sql_app/schemas.py`, `services/backend/tests/conftest.py`,
`services/backend/tests/api/test_listings.py` (nowy), `services/backend/tests/api/test_listing_suggestions.py` (nowy),
`services/frontend/package.json`, `services/frontend/package-lock.json`, `services/frontend/vite.config.js`,
`services/frontend/src/api.js`, `services/frontend/src/App.jsx`, nowe w `services/frontend/src/`: `api.test.js`,
`filterQuery.js`, `filterQuery.test.js`, `ListingsView.jsx`, `ListingsView.test.jsx`, `ListingFilters.jsx`,
`ListingFilters.test.jsx`, `useSuggestions.js`, `useSuggestions.test.js`;
dokumentacja: `README.md`, `services/backend/README.md`, `services/backend/CLAUDE.md`, `services/frontend/README.md`.
**Poza zakresem:** `services/backend/sql_app/models.py` i `alembic/` (filtry nie wymagają zmian schematu), istniejące endpointy
`/locations/` i `/auth/` (zachowanie bez zmian), `services/frontend/src/App.css`, `Login.jsx`, `ui.jsx`, `services/e2e/`,
`.github/`, `pyproject.toml`, `.agent/` poza tym plikiem.

## Tabela commitów

| # | Commit (conventional) | Serwis | Pliki | Weryfikacja | Budżet |
|---|-----------------------|--------|-------|-------------|--------|
| 1 | `feat(backend): schematy LocationSummary, ListingSummary i ListingCount` | backend | `sql_app/schemas.py` | `pytest -q` (wyjątek: zmiana czysto schematowa, import + regresja) | 30 l. / 1 plik |
| 2 | `feat(backend): GET /listings/ z paginacją i lokalizacją przez selectinload` | backend | `main.py`, `tests/conftest.py` (fixture `make_listing`), `tests/api/test_listings.py` (nowy) | `pytest -q` | 130 l. / 3 pliki |
| 3 | `feat(backend): filtry zakresów price_total_zl, price_sqm_zl i area w GET /listings/` | backend | `main.py`, `tests/api/test_listings.py` | `pytest -q` | 170 l. / 2 pliki |
| 4 | `feat(backend): filtr rooms (wielokrotny) oraz city i city_district w GET /listings/` | backend | `main.py`, `tests/api/test_listings.py` | `pytest -q` | 130 l. / 2 pliki |
| 5 | `feat(backend): GET /listings/count z tymi samymi filtrami` | backend | `main.py`, `tests/api/test_listings.py` | `pytest -q` | 80 l. / 2 pliki |
| 6 | `feat(backend): podpowiedzi GET /listings/cities i GET /listings/districts` | backend | `main.py`, `tests/api/test_listing_suggestions.py` (nowy) | `pytest -q` | 150 l. / 2 pliki |
| 7 | `build(frontend): vitest, jsdom i testing-library ze skryptem npm test` | frontend | `package.json`, `package-lock.json`, `vite.config.js` | `npm install && npm run build && npm test` (`--passWithNoTests`) | 20 l. ręcznie + lockfile generowany / 3 pliki |
| 8 | `feat(frontend): moduł filterQuery (parametry zapytania, walidacja zakresów, odmiana licznika)` | frontend | `src/filterQuery.js` (nowy), `src/filterQuery.test.js` (nowy) | `npm test && npm run build` | 140 l. / 2 pliki |
| 9 | `feat(frontend): klient API dla ofert, licznika i podpowiedzi` | frontend | `src/api.js`, `src/api.test.js` (nowy) | `npm test && npm run build` | 90 l. / 2 pliki |
| 10 | `feat(frontend): widok ofert z licznikiem wyników przełączany w App` | frontend | `src/ListingsView.jsx` (nowy), `src/ListingsView.test.jsx` (nowy), `src/App.jsx` | `npm test && npm run build` + ręcznie `npm run dev` (częściowo, patrz krok 10) | 190 l. / 3 pliki |
| 11 | `feat(frontend): panel filtrów z zakresami, wyborem pokoi i resetem` | frontend | `src/ListingFilters.jsx` (nowy), `src/ListingFilters.test.jsx` (nowy), `src/ListingsView.jsx` | `npm test && npm run build` + ręcznie `npm run dev` | 200 l. / 3 pliki |
| 12 | `feat(frontend): autouzupełnianie miasta i dzielnicy w panelu filtrów` | frontend | `src/useSuggestions.js` (nowy), `src/useSuggestions.test.js` (nowy), `src/ListingFilters.jsx`, `src/ListingFilters.test.jsx` | `npm test && npm run build` + ręcznie `npm run dev` | 150 l. / 4 pliki |
| 13 | `docs: filtrowanie ofert, licznik i podpowiedzi w README i CLAUDE.md` | docs | `README.md`, `services/backend/README.md`, `services/backend/CLAUDE.md`, `services/frontend/README.md` | `grep -rnE "no endpoints yet\|no API endpoints yet\|only CRUD" services/backend/CLAUDE.md services/backend/README.md services/frontend/README.md` zwraca pusto; przegląd | 70 l. / 4 pliki |

Kolejność: kontrakt → backend → frontend → docs (e2e poza briefem). Każdy krok kończy się zieloną bramką swojego serwisu,
potem `git diff --stat` i tag `cp/<n>`.

## Co dokładnie wchodzi w każdy krok

### 1. Kontrakt (STOP po tym kroku, do akceptacji)

```python
class LocationSummary(BaseModel):
    city: Optional[str] = None
    city_district: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ListingSummary(BaseModel):
    listing_id: int
    rooms: Optional[int] = None
    area: Optional[float] = None
    price_total_zl: Optional[float] = None
    price_sqm_zl: Optional[float] = None
    location: LocationSummary
    model_config = ConfigDict(from_attributes=True)

class ListingCount(BaseModel):
    count: int
```

Parametry zapytania (wspólne dla `GET /listings/` i `GET /listings/count`), wszystkie opcjonalne:
`price_total_min/max`, `price_sqm_min/max`, `area_min/max` (`float`, `Query(None, ge=0)`), `rooms` (powtarzalny,
`?rooms=2&rooms=3`), `city`, `city_district` (`str`, `max_length=255`). Podpowiedzi: `GET /listings/cities?q=&limit=`,
`GET /listings/districts?q=&city=&limit=` → `List[str]`.
Kształt zagnieżdżony `location: {...}` jak w istniejącym `ListingDetail` (`from_attributes=True` mapuje relację bez
`computed_field`); `price_sqm_zl` w summary, bo jest filtrowane i pokazywane w tabeli.

### 2. GET /listings/ (baza pod filtry)

- Publiczny, jak `GET /locations/`. `skip: int = Query(0, ge=0)`, `limit: int = Query(100, ge=1, le=500)`,
  `response_model=List[schemas.ListingSummary]`.
- `select(models.Listing).options(selectinload(models.Listing.location)).order_by(models.Listing.listing_id)`:
  bez `selectinload` serializacja `listing.location` w sesji async rzuca `MissingGreenlet`; `order_by` daje deterministyczną paginację.
- `tests/conftest.py`: nowa fixture `make_listing(db)` (fabryka async tworząca `Location` + `Building`/`Owner`/`Features`
  i `Listing` z podanymi polami), bo `Listing` ma 4 FK `nullable=False`; wzorzec z `test_delete_location_used_by_listing_returns_409`.
  Istniejących testów nie ruszamy. Fixture w conftest, bo używa jej też plik z kroku 6.
- Testy: pusta baza → `[]`; jeden rekord → pola summary + `location.city`, brak `url`/`description_text`;
  `skip=1&limit=1` → drugi rekord; `limit=501` → 422; `skip=-1` → 422.

### 3. Filtry zakresów + walidacja

- W `main.py` dataclass `ListingFilters` + zależność `listing_filters(...)` z parametrami z kroku 1 (FastAPI 0.104 nie ma
  modeli parametrów Query, więc zależność-funkcja) oraz helper `apply_listing_filters(stmt, f)` dokładający `where`.
  Endpoint z kroku 2 przyjmuje `f: ListingFilters = Depends(listing_filters)`.
- Walidacja: wartości ujemne → 422 przez `ge=0` (natywnie FastAPI); `min > max` → `HTTPException(422, detail="price_total_min must be <= price_total_max")`
  (detail jako string, bo `request()` w `api.js` pokazuje tylko string `detail`). `min == max` dozwolone.
- Rekordy z `NULL` w filtrowanej kolumnie odpadają, gdy filtr jest aktywny (SQL `NULL >= x` to nie-prawda); patrz D4.
- Testy: każdy zakres osobno (tylko min, tylko max, oba, granice włącznie); kombinacja dwóch zakresów; `NULL` odpada
  przy aktywnym filtrze, zostaje bez filtra; `-1` → 422 dla każdego z 6 parametrów (parametryzacja); `min > max` → 422 z detail.

### 4. Pokoje + miasto/dzielnica

- `rooms: Optional[List[int]] = Query(None)`; każdy element walidowany ręcznie w zależności (1–20, inaczej 422), duplikaty
  usuwane; filtr `Listing.rooms.in_(...)`.
- `city` / `city_district`: `strip()`, puste traktowane jak brak; dopasowanie dokładne (`==`), `join(models.Listing.location)`
  tylko gdy podano któreś z nich. Nie używać `func.lower`: SQLite `lower()` zmienia tylko ASCII, więc `Łódź` nie zrówna się
  z Pythonowym `.lower()` (D5).
- Testy: `rooms=2` → tylko 2-pokojowe; `rooms=2&rooms=3` → suma; `rooms=0` → 422; `city=Kraków` (znaki PL); `city` + `city_district`;
  `city` nieistniejące → `[]`; kombinacja z zakresem z kroku 3.

### 5. Licznik

- `GET /listings/count`, `response_model=schemas.ListingCount`, ta sama zależność `listing_filters`, zapytanie
  `select(func.count()).select_from(models.Listing)` + `apply_listing_filters` (bez `skip`/`limit`, bez `selectinload`).
- Testy: pusto → `{"count": 0}`; z filtrami zgodne z długością listy przy `limit=500`; licznik ignoruje paginację; `min > max` → 422.

### 6. Podpowiedzi

- `GET /listings/cities`: `select(distinct(Location.city)).join(Location.listings)` (podpowiadamy tylko wartości, które dadzą
  wyniki, D3), `Location.city.is_not(None)`, prefiks `ilike(f"{q}%", escape="\\")` po zescapowaniu `%`, `_`, `\` w `q`,
  `order_by(Location.city)`, `limit: int = Query(10, ge=1, le=50)`, `q: Query(None, max_length=100)`. `response_model=List[str]`.
- `GET /listings/districts`: analogicznie dla `city_district`, opcjonalnie zawężone `city` (dokładne).
- Trasy pod `/listings/`, nie `/locations/`: `/locations/cities` zostałoby złapane przez `/locations/{location_id}` (int) → 422.
  Przy przyszłym `/listings/{listing_id}` te trasy muszą być zadeklarowane wcześniej; komentarz w kodzie.
- Testy (`tests/api/test_listing_suggestions.py`): pusto → `[]`; prefiks `kra` → `["Kraków"]` (ASCII case-insensitive);
  distinct (dwie oferty w tym samym mieście → jedna pozycja); miasto bez ofert nie jest podpowiadane; `q="%"` nie zwraca wszystkiego;
  `limit` przycina i jest posortowane; `limit=51` → 422; dzielnice zawężone `city`.

### 7. Runner testów frontendu

- Brief wymaga testów frontendu, a `package.json` ma tylko `dev`/`build`/`preview`. Dev-zależności: `vitest`, `jsdom`,
  `@testing-library/react` (bez `jest-dom`, wystarczą zwykłe asercje). Skrypt `"test": "vitest run"`, w `vite.config.js`
  sekcja `test: { environment: 'jsdom' }`. Proxy `/api` bez zmian.
- `package-lock.json` jest generowany i nie liczy się do budżetu linii (D7). Ten commit nie zmienia zachowania aplikacji.

### 8. filterQuery.js (czysta logika, testowalna bez DOM)

- `EMPTY_FILTERS`, `toSearchParams(filters)` (pomija puste, `rooms` jako powtórzony klucz, nazwy parametrów jak w kroku 1),
  `validateFilters(filters)` → mapa błędów (ujemne, `min > max`, nie-liczba), `offersLabel(n)` (1 oferta / 2–4 oferty / 5+ ofert, także 12–14 → ofert).
- Testy: puste → pusty string; pełny zestaw; `rooms=[2,3]`; każdy typ błędu; odmiana dla 0, 1, 2, 5, 12, 22, 112.

### 9. Klient API

- `listListings(filters, { signal })`, `countListings(filters, { signal })`, `suggestCities(q, opts)`, `suggestDistricts(q, city, opts)`
  przez istniejące `request()` i `toSearchParams`; `signal` przekazywany do `fetch`, żeby przerywać nieaktualne zapytania.
- Testy z `vi.stubGlobal('fetch', ...)`: poprawny URL `/api/listings/?...`, `/api/listings/count?...`; string `detail` z 422 trafia do `Error.message`.

### 10. Widok ofert + licznik

- `ListingsView.jsx`: tabela (Pokoje, Metraż, Cena, Cena/m², Miasto, Dzielnica), stany loading/error/empty; licznik
  „Znaleziono N ofert” z `countListings` w `table-foot`. Tylko istniejące klasy CSS (`card`, `card-head`, `table-wrap`,
  `table-foot`, `alert`, `empty-state`, `id-badge`, `stats`/`stat`), zero zmian w `App.css`.
- `App.jsx`: stan `view` (`'locations'` domyślnie | `'listings'`), dwa przyciski w nagłówku (ok. 15 linii). Pułapki z e2e:
  domyślny widok musi nadal mieć `h1` „Lokalizacje”; przyciski nie mogą nazywać się „Dodaj”/„Wyloguj”/„Zaloguj”;
  widoki renderowane wyłącznie (inaczej podwójne `role=status`/`role=alert` złamią `services/e2e/tests/`).
- Testy (`vi.mock('./api.js')`): renderuje wiersze i licznik; pusta lista → empty-state; błąd API → alert.
- Ręcznie: w `npm run dev` przełączanie widoków i stan pusty; wiersze tylko jeśli w `sql_app.db` są oferty (brak `POST /listings/`, patrz odrzucone).

### 11. Panel filtrów

- `ListingFilters.jsx` (kontrolowany: `value`, `onChange`, `onReset`): 3 pary pól `Field` z `type="number" min="0"`
  (`Field` przekazuje `...inputProps`, więc nadpisanie `type` działa), pokoje jako przyciski-przełączniki 1–5 z `aria-pressed`
  i klasami `btn btn-ghost` (D6), przycisk „Wyczyść filtry” ustawia `EMPTY_FILTERS`. Błędy z `validateFilters` pod polem w `.hint`;
  przy błędach widok nie wysyła zapytań.
- `ListingsView.jsx`: stan `filters`, debounce 300 ms, `AbortController` przy zmianie filtrów (brak wyścigu odpowiedzi),
  równoległe `listListings` + `countListings`.
- Testy: zmiana min wywołuje `onChange`; `min > max` pokazuje komunikat; klik „2” i „3” daje `rooms=[2,3]`, ponowny klik odznacza;
  reset przywraca `EMPTY_FILTERS`.

### 12. Autouzupełnianie

- `useSuggestions(fetcher, query, deps)`: debounce 250 ms, min. 1 znak, `AbortController`, zwraca listę; w `ListingFilters.jsx`
  pola Miasto i Dzielnica z natywnym `<datalist>` (`list=` przez `Field`), dzielnice zawężane wybranym miastem (D2).
- Testy: hook z fałszywymi timerami (`vi.useFakeTimers`) woła fetcher raz po debounce, przerywa poprzednie; panel renderuje
  `<option>` z podpowiedzi.

### 13. Dokumentacja

- `services/backend/CLAUDE.md`: zdanie „`Listing` have models and schemas but no endpoints yet” będzie nieprawdziwe; opisać
  `/listings/`, `/listings/count`, podpowiedzi i zależność `listing_filters`.
- `services/backend/README.md`: status („no API endpoints yet”), tabela API z parametrami i 422.
- `services/frontend/README.md`: „only CRUD” → widok ofert z filtrami, `npm test`, nowe pliki w Structure.
- `README.md`: kolumna Status backendu i frontendu.

## Decyzje do zatwierdzenia przed kodem

| # | Decyzja | Wybór w planie | Alternatywa |
|---|---------|----------------|-------------|
| D1 | Relacja z `listings.md` | ten plan zastępuje niewykonany `listings.md` (kroki 1–4) | najpierw wykonać `listings.md`, potem ten plan bez #1, #2, #10 |
| D2 | Kontrakt licznika | osobny `GET /listings/count` (te same filtry) | koperta `{items, total}` w `GET /listings/` (jedno zapytanie HTTP, ale łamie kształt listy) |
| D3 | Źródło podpowiedzi | tylko miasta/dzielnice z ofertami, trasy `/listings/cities`, `/listings/districts` | wszystkie `Location` pod `/locations/...` (wymaga przestawienia kolejności tras przed `/{location_id}`) |
| D4 | `NULL` w filtrowanej kolumnie | odpada przy aktywnym filtrze | traktować `NULL` jako dopasowanie |
| D5 | Dopasowanie `city`/`city_district` w filtrze | dokładne `==` (wartość z podpowiedzi) | prefiks/case-insensitive (SQLite nie obniża liter PL; wymaga kolumny znormalizowanej = migracja) |
| D6 | Pokoje w UI | przełączniki 1–5 (dokładne wartości), istniejące klasy CSS | „5+” jako `rooms_min` (dodatkowy parametr) lub nowe style w `App.css` |
| D7 | Runner testów frontendu | `vitest` + `jsdom` + `@testing-library/react`, lockfile poza budżetem linii | brak testów UI (tylko `npm run build`), co nie spełnia briefu |
| D8 | Autoryzacja nowych endpointów | publiczne, jak `GET /locations/` | wymagany token |

## Rozważone i odrzucone (świadomie poza tym planem)

- **`test(e2e): filtrowanie ofert w przeglądarce`**: brief wymaga testów backendu i frontendu, nie e2e; brak też `POST /listings/`
  do przygotowania danych. Osobny wpis po seedzie danych.
- **`feat(backend): skrypt seed ofert`** (`scripts/seed_listings.py`): bez niego ręczna kontrola UI jest tylko częściowa. Osobny wpis.
- **`feat(backend): indeksy na price_total_zl, price_sqm_zl, area, rooms`**: wymaga `models.py` + migracji; przy SQLite i obecnych
  wolumenach przedwczesne. Osobny PR, jeśli pomiary pokażą potrzebę.
- **`fix(backend): Query(ge/le) dla skip/limit w GET /locations/`**: zmiana zachowania istniejącego endpointu, brief tego nie żąda.
- **`refactor(frontend): wydziel Locations.jsx z App.jsx`**: przeniesienie ok. 350 linii, ponad budżet, niepotrzebne do przełącznika widoków.
- **Synchronizacja filtrów z URL (`?price_total_min=...`)**: nie ma routera; poza briefem.

## Strażnik zakresu

```bash
ALLOWED='^(README\.md|services/backend/(main\.py|sql_app/schemas\.py|tests/conftest\.py|tests/api/test_listings\.py|tests/api/test_listing_suggestions\.py|README\.md|CLAUDE\.md)|services/frontend/(package\.json|package-lock\.json|vite\.config\.js|README\.md|src/(api|api\.test|filterQuery|filterQuery\.test|useSuggestions|useSuggestions\.test)\.js|src/(App|ListingsView|ListingsView\.test|ListingFilters|ListingFilters\.test)\.jsx))$'
OUT=$(git diff --name-only af01bb8...HEAD | grep -vE "$ALLOWED")
[ -z "$OUT" ] || { echo "Pliki poza zakresem:"; echo "$OUT"; exit 1; }
```

## Protokół wykonania

```text
Wykonaj commit #N z .agent/plans/listing-filters.md. Tylko ten commit.
0. (raz, przed #1) usuń blokadę #0: zainstaluj .[dev] i node_modules, potwierdź zielone bramki,
1. komenda weryfikacji z tabeli,
2. git diff --stat, strażnik zakresu,
3. zielone i w budżecie → commit z komunikatem z planu, git tag cp/N,
4. stop, czekaj na "dalej".
Odchylenie (nowy plik, >1.5× budżetu) → zgłoś, nie wykonuj.
```
