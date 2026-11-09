import { useEffect, useMemo, useState } from 'react'
import {
  AUTH_EXPIRED_EVENT,
  clearToken,
  createLocation,
  deleteLocation,
  getToken,
  listLocations,
} from './api.js'
import ListingsView from './ListingsView.jsx'
import Login from './Login.jsx'
import { Field, Icon } from './ui.jsx'

const FIELDS = ['miasto', 'miejscowosc', 'dzielnica', 'ulica']
const EMPTY_FORM = { miasto: '', miejscowosc: '', dzielnica: '', ulica: '' }
const PALETTE = ['#2457c5', '#7b3fd1', '#0f8a7a', '#c2410c', '#be185d', '#0369a1']

const colorFor = (s) =>
  PALETTE[[...s].reduce((sum, c) => sum + c.charCodeAt(0), 0) % PALETTE.length]
const isComplete = (l) => Boolean(l.miasto && l.dzielnica && l.ulica)
const isEmpty = (l) => FIELDS.every((f) => !l[f])
const cell = (v) => v || <span className="empty">—</span>
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Backend zwraca snake_case i null; w UI pracujemy na pustych stringach.
const toRow = (l) => ({
  id: l.location_id,
  miasto: l.city ?? '',
  miejscowosc: l.locality ?? '',
  dzielnica: l.city_district ?? '',
  ulica: l.street ?? '',
})

// Odwrotność toRow: klucze formularza (PL) -> pola API (snake_case). Backend ignoruje nieznane pola.
const API_FIELD = {
  miasto: 'city',
  miejscowosc: 'locality',
  dzielnica: 'city_district',
  ulica: 'street',
}

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()))
  // Widoki renderowane wyłącznie: domyślnie Lokalizacje (e2e oczekuje h1 „Lokalizacje”).
  const [view, setView] = useState('locations')

  useEffect(() => {
    const onExpired = () => setAuthed(false)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  if (!authed) {
    return <Login onLoggedIn={() => setAuthed(true)} />
  }

  function handleLogout() {
    clearToken()
    setAuthed(false)
  }

  if (view === 'listings') {
    return <ListingsView onLogout={handleLogout} onShowLocations={() => setView('locations')} />
  }
  return <Locations onLogout={handleLogout} onShowListings={() => setView('listings')} />
}

function Locations({ onLogout, onShowListings }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [cityError, setCityError] = useState(false)
  const [hint, setHint] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'id', dir: 1 })
  const [newId, setNewId] = useState(null)
  const [leavingId, setLeavingId] = useState(null)
  const [toast, setToast] = useState(null)

  async function load() {
    try {
      setRows((await listLocations()).map(toRow))
      setError(null)
    } catch (e) {
      setError(`Nie udało się pobrać lokalizacji: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => !q || FIELDS.some((f) => r[f].toLowerCase().includes(q)) || String(r.id) === q)
      .sort((a, b) => {
        const x = a[sort.key]
        const y = b[sort.key]
        const cmp = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pl')
        return cmp * sort.dir
      })
  }, [rows, query, sort])

  const cityCount = new Set(rows.map((r) => r.miasto.toLowerCase()).filter(Boolean)).size
  const completeCount = rows.filter(isComplete).length
  const emptyCount = rows.filter(isEmpty).length

  function toggleSort(key) {
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))
  }

  function setField(name) {
    return (e) => {
      setForm((f) => ({ ...f, [name]: e.target.value }))
      if (name === 'miasto') {
        setCityError(false)
        setHint('')
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Wysyłamy tylko niepuste pola; reszta zostaje null w bazie.
    const data = Object.fromEntries(
      FIELDS.map((f) => [API_FIELD[f], form[f].trim()]).filter(([, v]) => v !== ''),
    )
    if (!data.city) {
      setCityError(true)
      setHint('Pole „Miasto” jest wymagane.')
      document.getElementById('miasto')?.focus()
      return
    }
    try {
      const created = await createLocation(data)
      setForm(EMPTY_FORM)
      setNewId(created?.location_id ?? null)
      await load()
      setToast(
        created?.location_id
          ? `Dodano lokalizację #${created.location_id}`
          : 'Dodano lokalizację',
      )
      document.getElementById('miasto')?.focus()
    } catch (err) {
      setHint(`Nie udało się dodać lokalizacji: ${err.message}`)
    }
  }

  async function handleDelete(id) {
    setLeavingId(id)
    await sleep(220) // czas na animację wyjścia wiersza
    try {
      await deleteLocation(id)
      setToast(`Usunięto lokalizację #${id}`)
    } catch (e) {
      setError(`Nie udało się usunąć lokalizacji: ${e.message}`)
    } finally {
      setLeavingId(null)
      await load()
    }
  }

  async function handleClean() {
    const empties = rows.filter(isEmpty)
    if (!empties.length) return
    try {
      await Promise.all(empties.map((r) => deleteLocation(r.id)))
      setToast(`Usunięto ${empties.length} pustych wpisów`)
    } catch (e) {
      setError(`Nie udało się usunąć pustych wpisów: ${e.message}`)
    } finally {
      await load()
    }
  }

  const sortTh = (key, label) => (
    <th
      className={sort.key === key ? 'sorted' : undefined}
      onClick={() => toggleSort(key)}
    >
      {label}
      <span className="arrow">{sort.key === key && sort.dir === -1 ? '▼' : '▲'}</span>
    </th>
  )

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="eyebrow">Słowniki</div>
          <h1>Lokalizacje</h1>
          <p className="subtitle">Zarządzaj adresami: miastami, miejscowościami, dzielnicami i ulicami.</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-ghost" onClick={onShowListings}>
            Oferty
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

      <section className="stats">
        <div className="stat">
          <div className="stat-icon">
            <Icon name="pin" size={20} />
          </div>
          <div>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-label">Wszystkie lokalizacje</div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon ok">
            <Icon name="check" size={20} />
          </div>
          <div>
            <div className="stat-value">{completeCount}</div>
            <div className="stat-label">Kompletne dane</div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon warn">
            <Icon name="warn" size={20} />
          </div>
          <div>
            <div className="stat-value">{cityCount}</div>
            <div className="stat-label">Unikalne miasta</div>
          </div>
        </div>
      </section>

      <section className="card spaced">
        <div className="card-head">
          <h2 className="card-title">Dodaj lokalizację</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <Field
                id="miasto"
                label="Miasto"
                required
                icon="city"
                placeholder="np. Warszawa"
                value={form.miasto}
                onChange={setField('miasto')}
                invalid={cityError}
              />
              <Field
                id="miejscowosc"
                label="Miejscowość"
                icon="locality"
                placeholder="np. Wesoła"
                value={form.miejscowosc}
                onChange={setField('miejscowosc')}
              />
              <Field
                id="dzielnica"
                label="Dzielnica"
                icon="district"
                placeholder="np. Mokotów"
                value={form.dzielnica}
                onChange={setField('dzielnica')}
              />
              <Field
                id="ulica"
                label="Ulica"
                icon="street"
                placeholder="np. Puławska"
                value={form.ulica}
                onChange={setField('ulica')}
              />
              <button type="submit" className="btn btn-primary">
                <Icon name="plus" strokeWidth={2.5} />
                Dodaj
              </button>
            </div>
            <div className="hint">{hint}</div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-head tight">
          <h2 className="card-title">Lista lokalizacji</h2>
          <div className="toolbar">
            <div className="input-wrap">
              <Icon name="search" size={15} />
              <input
                type="search"
                placeholder="Szukaj…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {sortTh('id', 'ID')}
                {sortTh('miasto', 'Miasto')}
                {sortTh('dzielnica', 'Dzielnica')}
                {sortTh('ulica', 'Ulica')}
                <th className="no-sort">Status</th>
                <th className="no-sort" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="loading-cell">Ładowanie…</td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Icon name="pin" size={40} strokeWidth={1.5} />
                      <strong>{query ? 'Brak wyników' : 'Brak lokalizacji'}</strong>
                      {query ? 'Spróbuj innej frazy.' : 'Dodaj pierwszą lokalizację formularzem powyżej.'}
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const classes = [
                    r.id === newId ? 'enter' : '',
                    r.id === leavingId ? 'leave' : '',
                  ].join(' ')
                  return (
                    <tr key={r.id} className={classes.trim() || undefined}>
                      <td>
                        <span className="id-badge">#{r.id}</span>
                      </td>
                      <td>
                        <div className="city">
                          <div
                            className="avatar"
                            style={{ background: r.miasto ? colorFor(r.miasto) : '#c4cad8' }}
                          >
                            {r.miasto ? r.miasto.slice(0, 2).toUpperCase() : '?'}
                          </div>
                          <div>
                            {r.miasto || <span className="empty">Bez nazwy</span>}
                            {r.miejscowosc && <span className="sub">{r.miejscowosc}</span>}
                          </div>
                        </div>
                      </td>
                      <td>{cell(r.dzielnica)}</td>
                      <td>{cell(r.ulica)}</td>
                      <td>
                        {isComplete(r) ? (
                          <span className="tag ok">Kompletna</span>
                        ) : (
                          <span className="tag warn">Niepełna</span>
                        )}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-icon"
                          title="Usuń"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>
            Wyświetlono {visible.length} z {rows.length}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClean}
            style={{ visibility: emptyCount > 0 ? 'visible' : 'hidden' }}
          >
            Usuń puste wpisy
          </button>
        </div>
      </section>

      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        <span>{toast}</span>
      </div>
    </div>
  )
}
