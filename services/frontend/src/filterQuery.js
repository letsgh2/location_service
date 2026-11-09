// Stan filtrów ofert, budowa parametrów zapytania i walidacja (czysta logika, bez DOM).

export const RANGES = [
  { min: 'price_total_min', max: 'price_total_max', label: 'Cena' },
  { min: 'price_sqm_min', max: 'price_sqm_max', label: 'Cena za m²' },
  { min: 'area_min', max: 'area_max', label: 'Metraż' },
]

export const EMPTY_FILTERS = Object.freeze({
  price_total_min: '',
  price_total_max: '',
  price_sqm_min: '',
  price_sqm_max: '',
  area_min: '',
  area_max: '',
  rooms: [],
  city: '',
  city_district: '',
})

const RANGE_KEYS = RANGES.flatMap((r) => [r.min, r.max])

// Nazwy parametrów zgodne z GET /listings/ i /listings/count; puste wartości pomijane.
export function toSearchParams(filters) {
  const params = new URLSearchParams()
  for (const key of RANGE_KEYS) {
    const value = String(filters[key] ?? '').trim()
    if (value !== '') params.append(key, value)
  }
  for (const room of filters.rooms ?? []) params.append('rooms', String(room))
  for (const key of ['city', 'city_district']) {
    const value = (filters[key] ?? '').trim()
    if (value) params.append(key, value)
  }
  return params
}

// Zwraca mapę { klucz: komunikat }; pusta mapa = filtry poprawne.
export function validateFilters(filters) {
  const errors = {}
  const num = (key) => {
    const raw = String(filters[key] ?? '').trim()
    if (raw === '') return null
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      errors[key] = 'Podaj liczbę.'
      return null
    }
    if (value < 0) {
      errors[key] = 'Wartość nie może być ujemna.'
      return null
    }
    return value
  }
  for (const { min, max } of RANGES) {
    const low = num(min)
    const high = num(max)
    if (low !== null && high !== null && low > high) {
      errors[max] = 'Wartość „do” musi być ≥ „od”.'
    }
  }
  return errors
}

export const hasActiveFilters = (filters) => toSearchParams(filters).toString() !== ''

// Polska odmiana: 1 oferta, 2–4 oferty (poza 12–14), reszta ofert.
export function offersLabel(n) {
  if (n === 1) return '1 oferta'
  const lastDigit = n % 10
  const lastTwo = n % 100
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
  return `${n} ${few ? 'oferty' : 'ofert'}`
}
