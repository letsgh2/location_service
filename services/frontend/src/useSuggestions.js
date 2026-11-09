import { useEffect, useRef, useState } from 'react'

export const SUGGEST_DEBOUNCE_MS = 250

// Podpowiedzi dla pola tekstowego: debounce, przerywanie nieaktualnych zapytań, błędy → pusta lista.
// fetcher(query, { signal }) zwraca Promise<string[]>; deps to dodatkowe zależności (np. wybrane miasto).
export function useSuggestions(fetcher, query, deps = []) {
  const [items, setItems] = useState([])
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const q = (query ?? '').trim()
    if (!q) {
      setItems([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetcherRef.current(q, { signal: controller.signal })
        .then((result) => {
          if (!controller.signal.aborted) setItems(result)
        })
        .catch(() => {
          if (!controller.signal.aborted) setItems([])
        })
    }, SUGGEST_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, ...deps])

  return items
}
