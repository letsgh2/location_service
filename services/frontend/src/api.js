import { toSearchParams } from './filterQuery.js'

// Thin client for the backend API (proxied under /api, see vite.config.js).
const BASE = '/api'
const TOKEN_KEY = 'accessToken'

// Wylogowanie wymuszone przez backend (np. wygasły token) — App nasłuchuje tego zdarzenia.
export const AUTH_EXPIRED_EVENT = 'auth:expired'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // brak dostępu do localStorage — użytkownik będzie musiał zalogować się ponownie
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignorujemy
  }
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken()
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      // response had no JSON body
    }
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}

// Auth
export const register = (email, password) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export async function login(email, password) {
  // OAuth2PasswordRequestForm oczekuje formularza, nie JSON-a.
  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }).toString(),
  })
  setToken(data.access_token)
  return data
}

export const getMe = () => request('/auth/me')

// Locations
export const listLocations = () => request('/locations/')

export const createLocation = (data) =>
  request('/locations/', { method: 'POST', body: JSON.stringify(data) })

export const deleteLocation = (id) =>
  request(`/locations/${id}`, { method: 'DELETE' })

// Listings (publiczne; signal pozwala przerwać nieaktualne zapytanie)
const withQuery = (path, params) => {
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export const listListings = (filters, { signal, limit = 100 } = {}) => {
  const params = toSearchParams(filters)
  params.set('limit', String(limit))
  return request(withQuery('/listings/', params), { signal })
}

export const countListings = (filters, { signal } = {}) =>
  request(withQuery('/listings/count', toSearchParams(filters)), { signal })

function suggestionParams(q, limit) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (q.trim()) params.set('q', q.trim())
  return params
}

export const suggestCities = (q, { signal, limit = 10 } = {}) =>
  request(withQuery('/listings/cities', suggestionParams(q, limit)), { signal })

export const suggestDistricts = (q, city, { signal, limit = 10 } = {}) => {
  const params = suggestionParams(q, limit)
  if (city?.trim()) params.set('city', city.trim())
  return request(withQuery('/listings/districts', params), { signal })
}
