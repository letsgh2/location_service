import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countListings, listListings, suggestCities, suggestDistricts } from './api.js'
import { EMPTY_FILTERS } from './filterQuery.js'

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse([]))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const calledUrl = () => fetchMock.mock.calls[0][0]

describe('listings API client', () => {
  it('lists listings with filters, limit and signal', async () => {
    const controller = new AbortController()

    await listListings({ ...EMPTY_FILTERS, rooms: [2, 3], city: 'Kraków' }, { signal: controller.signal })

    const url = new URL(calledUrl(), 'http://x')
    expect(url.pathname).toBe('/api/listings/')
    expect(url.searchParams.getAll('rooms')).toEqual(['2', '3'])
    expect(url.searchParams.get('city')).toBe('Kraków')
    expect(url.searchParams.get('limit')).toBe('100')
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('counts listings without query string when no filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 7 }))

    expect(await countListings(EMPTY_FILTERS)).toEqual({ count: 7 })
    expect(calledUrl()).toBe('/api/listings/count')
  })

  it('requests suggestions with prefix and city', async () => {
    await suggestCities(' kra ')
    await suggestDistricts('p', 'Kraków')

    expect(calledUrl()).toBe('/api/listings/cities?limit=10&q=kra')
    const url = new URL(fetchMock.mock.calls[1][0], 'http://x')
    expect(url.pathname).toBe('/api/listings/districts')
    expect(url.searchParams.get('q')).toBe('p')
    expect(url.searchParams.get('city')).toBe('Kraków')
  })

  it('surfaces string detail from 422 as error message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'area_min must be <= area_max' }, 422))

    await expect(countListings(EMPTY_FILTERS)).rejects.toThrow('area_min must be <= area_max')
  })
})
