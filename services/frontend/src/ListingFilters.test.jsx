import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import ListingFilters from './ListingFilters.jsx'
import { EMPTY_FILTERS, validateFilters } from './filterQuery.js'
import * as api from './api.js'
import { SUGGEST_DEBOUNCE_MS } from './useSuggestions.js'

vi.mock('./api.js', () => ({
  suggestCities: vi.fn(async () => []),
  suggestDistricts: vi.fn(async () => []),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// Stanowy wrapper, żeby testować panel tak, jak używa go ListingsView.
function Harness({ initial = EMPTY_FILTERS, onChange = () => {} }) {
  const [value, setValue] = useState(initial)
  return (
    <ListingFilters
      value={value}
      errors={validateFilters(value)}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

describe('ListingFilters', () => {
  it('calls onChange with the typed min price', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Cena od'), { target: { value: '100000' } })

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ price_total_min: '100000' }))
  })

  it('shows a message and marks the field when min > max', () => {
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Metraż od'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Metraż do'), { target: { value: '40' } })

    expect(screen.getByRole('note').textContent).toContain('„do” musi być ≥ „od”')
    expect(screen.getByLabelText('Metraż do').className).toBe('invalid')
  })

  it('toggles rooms as multi-select', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rooms: [2, 3] }))
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rooms: [2] }))
    expect(screen.getByRole('button', { name: '3' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('resets all filters', () => {
    const onChange = vi.fn()
    render(<Harness initial={{ ...EMPTY_FILTERS, area_min: '30', rooms: [2] }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść filtry' }))

    expect(onChange).toHaveBeenLastCalledWith(EMPTY_FILTERS)
    expect(screen.getByLabelText('Metraż od').value).toBe('')
    expect(screen.getByRole('button', { name: 'Wyczyść filtry' }).disabled).toBe(true)
  })

  it('renders city and district suggestions, districts narrowed by city', async () => {
    vi.useFakeTimers()
    api.suggestCities.mockResolvedValue(['Kraków', 'Krosno'])
    api.suggestDistricts.mockResolvedValue(['Podgórze'])
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Miasto'), { target: { value: 'Kr' } })
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))
    const cityOptions = [...screen.getByTestId('city-options').querySelectorAll('option')]
    expect(cityOptions.map((o) => o.value)).toEqual(['Kraków', 'Krosno'])
    expect(screen.getByLabelText('Miasto').getAttribute('list')).toBe('f-city-options')

    fireEvent.change(screen.getByLabelText('Miasto'), { target: { value: 'Kraków' } })
    fireEvent.change(screen.getByLabelText('Dzielnica'), { target: { value: 'Po' } })
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))

    expect(api.suggestDistricts).toHaveBeenLastCalledWith('Po', 'Kraków', expect.anything())
    const districtOptions = [...screen.getByTestId('district-options').querySelectorAll('option')]
    expect(districtOptions.map((o) => o.value)).toEqual(['Podgórze'])
  })
})
