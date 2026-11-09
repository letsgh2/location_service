import { suggestCities, suggestDistricts } from './api.js'
import { EMPTY_FILTERS, RANGES, hasActiveFilters } from './filterQuery.js'
import { Field } from './ui.jsx'
import { useSuggestions } from './useSuggestions.js'

export const ROOM_OPTIONS = [1, 2, 3, 4, 5]

const GRID = { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }

// Kontrolowany panel filtrów: stan trzyma rodzic (ListingsView).
export default function ListingFilters({ value, onChange, errors = {} }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })
  const cities = useSuggestions(suggestCities, value.city)
  // Dzielnice zawężone wybranym miastem.
  const districts = useSuggestions(
    (q, opts) => suggestDistricts(q, value.city, opts),
    value.city_district,
    [value.city],
  )

  function toggleRoom(room) {
    const rooms = value.rooms.includes(room)
      ? value.rooms.filter((r) => r !== room)
      : [...value.rooms, room].sort((a, b) => a - b)
    onChange({ ...value, rooms })
  }

  const errorList = Object.values(errors)

  return (
    <section className="card spaced">
      <div className="card-head">
        <h2 className="card-title">Filtry</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={!hasActiveFilters(value)}
        >
          Wyczyść filtry
        </button>
      </div>
      <div className="card-body">
        <div className="form-grid" style={GRID}>
          {RANGES.map(({ min, max, label }) => [
            <Field
              key={min}
              id={`f-${min}`}
              label={`${label} od`}
              type="number"
              min="0"
              inputMode="decimal"
              value={value[min]}
              onChange={set(min)}
              invalid={Boolean(errors[min])}
            />,
            <Field
              key={max}
              id={`f-${max}`}
              label={`${label} do`}
              type="number"
              min="0"
              inputMode="decimal"
              value={value[max]}
              onChange={set(max)}
              invalid={Boolean(errors[max])}
            />,
          ])}
          <Field
            id="f-city"
            label="Miasto"
            icon="city"
            placeholder="np. Kraków"
            list="f-city-options"
            value={value.city}
            onChange={set('city')}
          />
          <Field
            id="f-city_district"
            label="Dzielnica"
            icon="district"
            placeholder="np. Podgórze"
            list="f-district-options"
            value={value.city_district}
            onChange={set('city_district')}
          />
        </div>
        <datalist id="f-city-options" data-testid="city-options">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="f-district-options" data-testid="district-options">
          {districts.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <div className="field" role="group" aria-label="Liczba pokoi" style={{ marginTop: 14 }}>
          <label>Liczba pokoi</label>
          <div className="toolbar">
            {ROOM_OPTIONS.map((room) => {
              const pressed = value.rooms.includes(room)
              return (
                <button
                  key={room}
                  type="button"
                  className={`btn ${pressed ? 'btn-primary' : 'btn-ghost'}`}
                  aria-pressed={pressed}
                  onClick={() => toggleRoom(room)}
                >
                  {room}
                </button>
              )
            })}
          </div>
        </div>
        <div className="hint" role="note">
          {errorList.join(' ')}
        </div>
      </div>
    </section>
  )
}
