import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  offersLabel,
  toSearchParams,
  validateFilters,
} from './filterQuery.js'

describe('toSearchParams', () => {
  it('returns empty string for empty filters', () => {
    expect(toSearchParams(EMPTY_FILTERS).toString()).toBe('')
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })

  it('serialises all filters with API parameter names', () => {
    const params = toSearchParams({
      ...EMPTY_FILTERS,
      price_total_min: '100000',
      price_total_max: '500000',
      price_sqm_min: '8000',
      area_max: ' 60 ',
      rooms: [2, 3],
      city: ' Kraków ',
      city_district: 'Podgórze',
    })

    expect(params.get('price_total_min')).toBe('100000')
    expect(params.get('price_total_max')).toBe('500000')
    expect(params.get('price_sqm_min')).toBe('8000')
    expect(params.has('price_sqm_max')).toBe(false)
    expect(params.get('area_max')).toBe('60')
    expect(params.getAll('rooms')).toEqual(['2', '3'])
    expect(params.get('city')).toBe('Kraków')
    expect(params.get('city_district')).toBe('Podgórze')
  })

  it('keeps zero as a valid bound', () => {
    expect(toSearchParams({ ...EMPTY_FILTERS, area_min: 0 }).toString()).toBe('area_min=0')
  })
})

describe('validateFilters', () => {
  it('accepts empty and consistent ranges', () => {
    expect(validateFilters(EMPTY_FILTERS)).toEqual({})
    expect(validateFilters({ ...EMPTY_FILTERS, area_min: '50', area_max: '50' })).toEqual({})
  })

  it('rejects negative values', () => {
    expect(validateFilters({ ...EMPTY_FILTERS, price_sqm_min: '-1' })).toEqual({
      price_sqm_min: 'Wartość nie może być ujemna.',
    })
  })

  it('rejects non-numbers', () => {
    expect(validateFilters({ ...EMPTY_FILTERS, area_max: 'abc' })).toHaveProperty('area_max')
  })

  it('rejects min greater than max', () => {
    const errors = validateFilters({ ...EMPTY_FILTERS, price_total_min: '10', price_total_max: '5' })
    expect(Object.keys(errors)).toEqual(['price_total_max'])
  })
})

describe('offersLabel', () => {
  it.each([
    [0, '0 ofert'],
    [1, '1 oferta'],
    [2, '2 oferty'],
    [4, '4 oferty'],
    [5, '5 ofert'],
    [12, '12 ofert'],
    [14, '14 ofert'],
    [22, '22 oferty'],
    [112, '112 ofert'],
  ])('%i → %s', (n, label) => {
    expect(offersLabel(n)).toBe(label)
  })
})
