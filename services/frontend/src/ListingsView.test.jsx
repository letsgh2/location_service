import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ListingsView from './ListingsView.jsx'
import * as api from './api.js'

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
})
