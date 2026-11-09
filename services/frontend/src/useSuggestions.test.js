import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { SUGGEST_DEBOUNCE_MS, useSuggestions } from './useSuggestions.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useSuggestions', () => {
  it('calls the fetcher once after the debounce with the latest query', async () => {
    const fetcher = vi.fn(async (q) => [`${q}ów`])
    const { result, rerender } = renderHook(({ q }) => useSuggestions(fetcher, q), {
      initialProps: { q: 'K' },
    })

    rerender({ q: 'Kr' })
    rerender({ q: 'Kra' })
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('Kra', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(result.current).toEqual(['Kraów'])
  })

  it('aborts the previous request when the query changes', async () => {
    const signals = []
    const fetcher = vi.fn((q, { signal }) => {
      signals.push(signal)
      return new Promise(() => {})
    })
    const { rerender } = renderHook(({ q }) => useSuggestions(fetcher, q), { initialProps: { q: 'Ł' } })
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))

    rerender({ q: 'Łó' })

    expect(signals[0].aborted).toBe(true)
  })

  it('returns empty list for blank query without fetching', async () => {
    const fetcher = vi.fn(async () => ['x'])
    const { result } = renderHook(() => useSuggestions(fetcher, '  '))
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current).toEqual([])
  })

  it('refetches when extra deps change', async () => {
    const fetcher = vi.fn(async () => [])
    const { rerender } = renderHook(({ city }) => useSuggestions(fetcher, 'P', [city]), {
      initialProps: { city: 'Kraków' },
    })
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))
    rerender({ city: 'Warszawa' })
    await act(async () => vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS))

    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
