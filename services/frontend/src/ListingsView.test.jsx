import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import ListingsView, { DEBOUNCE_MS } from './ListingsView.jsx'
import * as api from './api.js'
import { EMPTY_FILTERS } from './filterQuery.js'

vi.mock('./api.js', () => ({
  listListings: vi.fn(),
  countListings: vi.fn(),
  suggestCities: vi.fn(async () => []),
  suggestDistricts: vi.fn(async () => []),
}))

const LISTING = {
  listing_id: 7,
  rooms: 2,
  area: 48.5,
  price_total_zl: 650000,
  price_sqm_zl: 13402,
  location: { city: 'Kraków', city_district: 'Podgórze' },
}

beforeEach(() => {
  api.listListings.mockResolvedValue([LISTING])
  api.countListings.mockResolvedValue({ count: 1 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('ListingsView', () => {
  it('renders rows and the result counter', async () => {
    render(<ListingsView />)

    expect(await screen.findByText('#7')).toBeTruthy()
    expect(screen.getByText('Kraków')).toBeTruthy()
    expect(screen.getByText('Podgórze')).toBeTruthy()
    expect((await screen.findByTestId('results-count')).textContent).toBe('Znaleziono 1 oferta')
  })

  it('shows empty state', async () => {
    api.listListings.mockResolvedValue([])
    api.countListings.mockResolvedValue({ count: 0 })

    render(<ListingsView />)

    expect(await screen.findByText('Brak ofert')).toBeTruthy()
    expect(screen.getByTestId('results-count').textContent).toBe('Znaleziono 0 ofert')
  })

  it('shows an alert when the API fails', async () => {
    api.listListings.mockRejectedValue(new Error('HTTP 500'))

    render(<ListingsView />)

    expect((await screen.findByRole('alert')).textContent).toContain('HTTP 500')
  })

  it('refetches list and count with debounced filters and skips invalid ones', async () => {
    render(<ListingsView />)
    await screen.findByText('#7')
    vi.useFakeTimers()
    api.countListings.mockResolvedValue({ count: 3 })

    fireEvent.change(screen.getByLabelText('Cena od'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Cena od'), { target: { value: '100' } })
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS))

    expect(api.listListings).toHaveBeenCalledTimes(2)
    expect(api.countListings).toHaveBeenLastCalledWith(
      expect.objectContaining({ price_total_min: '100' }),
      expect.anything(),
    )
    expect(screen.getByTestId('results-count').textContent).toBe('Znaleziono 3 oferty')

    fireEvent.change(screen.getByLabelText('Cena do'), { target: { value: '50' } })
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS))
    expect(api.listListings).toHaveBeenCalledTimes(2)
  })

  it('reset refetches immediately without filters', async () => {
    render(<ListingsView />)
    await screen.findByText('#7')
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS))
    expect(api.listListings).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść filtry' }))
    await act(async () => {})

    expect(api.listListings).toHaveBeenCalledTimes(3)
    expect(api.listListings).toHaveBeenLastCalledWith(EMPTY_FILTERS, expect.anything())
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('false')
  })
})
