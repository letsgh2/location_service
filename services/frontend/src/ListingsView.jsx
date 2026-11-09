import { useEffect, useMemo, useState } from 'react'
import { countListings, listListings } from './api.js'
import { EMPTY_FILTERS, offersLabel, validateFilters } from './filterQuery.js'
import ListingFilters from './ListingFilters.jsx'
import { Icon } from './ui.jsx'

const cell = (v) => (v ?? '') === '' ? <span className="empty">—</span> : v
export const DEBOUNCE_MS = 300
// Ile wierszy pobiera tabela; licznik pokazuje pełną liczbę wyników.
export const PAGE_SIZE = 100

const fmt = (n, suffix) => (n == null ? null : `${n.toLocaleString('pl-PL')} ${suffix}`)

export default function ListingsView({ onLogout, onShowLocations }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Zapytania idą dopiero po chwili bez zmian w polach; reset działa od razu.
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const errors = useMemo(() => validateFilters(filters), [filters])
  const valid = Object.keys(errors).length === 0

  useEffect(() => {
    if (!valid) return
    if (filters === EMPTY_FILTERS) {
      setApplied(filters)
      return
    }
    const timer = setTimeout(() => setApplied(filters), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [filters, valid])

  useEffect(() => {
    // AbortController: zmiana filtrów przerywa poprzednie zapytania (brak wyścigu odpowiedzi).
    const controller = new AbortController()
    const { signal } = controller
    setLoading(true)
    Promise.all([listListings(applied, { signal, limit: PAGE_SIZE }), countListings(applied, { signal })])
      .then(([items, { count }]) => {
        // Nie polegamy tylko na odrzuceniu fetch po abort: spóźniona odpowiedź nie może nadpisać nowszej.
        if (signal.aborted) return
        setRows(items)
        setCount(count)
        setError(null)
      })
      .catch((e) => {
        if (!signal.aborted && e.name !== 'AbortError') setError(`Nie udało się pobrać ofert: ${e.message}`)
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [applied])

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="eyebrow">Ogłoszenia</div>
          <h1>Oferty</h1>
          <p className="subtitle">Przeglądaj oferty i zawężaj je filtrami.</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-ghost" onClick={onShowLocations}>
            Lokalizacje
          </button>
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Wyloguj
          </button>
        </div>
      </header>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <ListingFilters value={filters} onChange={setFilters} errors={errors} />

      <section className="card">
        <div className="card-head tight">
          <h2 className="card-title">Lista ofert</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="no-sort">ID</th>
                <th className="no-sort">Pokoje</th>
                <th className="no-sort">Metraż</th>
                <th className="no-sort">Cena</th>
                <th className="no-sort">Cena/m²</th>
                <th className="no-sort">Miasto</th>
                <th className="no-sort">Dzielnica</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="loading-cell">Ładowanie…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <Icon name="search" size={40} strokeWidth={1.5} />
                      <strong>Brak ofert</strong>
                      Zmień lub wyczyść filtry.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.listing_id}>
                    <td>
                      <span className="id-badge">#{r.listing_id}</span>
                    </td>
                    <td>{cell(r.rooms)}</td>
                    <td>{cell(fmt(r.area, 'm²'))}</td>
                    <td>{cell(fmt(r.price_total_zl, 'zł'))}</td>
                    <td>{cell(fmt(r.price_sqm_zl, 'zł'))}</td>
                    <td>{cell(r.location?.city)}</td>
                    <td>{cell(r.location?.city_district)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span aria-live="polite" data-testid="results-count">
            {count === null ? '' : `Znaleziono ${offersLabel(count)}`}
          </span>
          {count !== null && count > rows.length && (
            <span data-testid="results-truncated">
              Pokazano pierwsze {rows.length}. Zawęź filtry, aby zobaczyć pozostałe.
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
