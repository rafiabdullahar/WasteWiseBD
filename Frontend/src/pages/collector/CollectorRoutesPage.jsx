import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Route as RouteIcon,
  MapPin,
  ClipboardList,
  Loader2,
  AlertCircle,
  Navigation,
} from 'lucide-react'
import api from '../../services/api'

// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT (collector view)
//
// The read-only other half of the feature: a collector sees the weekly routes
// an administrator assigned to them, with the stop list in driving order.
// Without this screen a route assignment would be invisible to the person
// expected to drive it.
//
// Backed by GET /api/routes/my, which resolves the collector from the JWT —
// a collector can never request another collector's routes.
// ============================================================================

const DAY_ORDER = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const titleCase = (value) =>
  value
    ? String(value)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '—'

const CollectorRoutesPage = () => {
  const [routes, setRoutes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadRoutes = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await api.get('/routes/my')
        const fetched = response?.data?.data?.routes || []

        // The API sorts by day name alphabetically; re-sort into real week
        // order so the list reads like a week.
        setRoutes(
          [...fetched].sort(
            (a, b) =>
              DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
          )
        )
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message || 'Failed to load your routes'
        setError(message)
        setRoutes([])
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadRoutes()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <RouteIcon className="w-8 h-8 text-brand-400" />
          My Routes
        </h1>
        <p className="page-subtitle">
          The weekly collection routes assigned to you, with stops in driving
          order.
        </p>
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center gap-3 py-16">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span className="text-gray-400">Loading your routes…</span>
        </div>
      ) : error ? (
        <div className="card border-red-900/50 flex flex-col items-center gap-4 py-12">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-gray-300">{error}</p>
        </div>
      ) : routes.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16">
          <RouteIcon className="w-8 h-8 text-gray-600" />
          <p className="text-gray-400">No routes are assigned to you yet.</p>
          <p className="text-sm text-gray-600">
            An administrator assigns weekly routes for your service areas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold text-white">
                      {route.name}
                    </h2>
                    <span className="badge-blue">
                      {route.dayOfWeek} · {titleCase(route.timeSlot)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <MapPin className="w-4 h-4" />
                    {route.serviceArea?.name || '—'}
                    <span className="text-gray-700">|</span>
                    {route.stopCount} stops
                  </p>
                </div>

                {route.wasteCategories?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {route.wasteCategories.map((category) => (
                      <span key={category} className="badge-gray">
                        {titleCase(category)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {route.routeDescription ? (
                <div className="mb-4 bg-brand-950/40 border border-brand-900/50 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wider text-brand-400 flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Directions
                  </p>
                  <p className="text-sm text-gray-300 whitespace-pre-line">
                    {route.routeDescription}
                  </p>
                </div>
              ) : null}

              {route.notes ? (
                <p className="text-sm text-gray-400 mb-4 bg-gray-800/50 border border-gray-800 rounded-xl p-3">
                  {route.notes}
                </p>
              ) : null}

              {route.stops?.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  This route has no stops yet.
                </p>
              ) : (
                <ol className="space-y-2">
                  {route.stops.map((stop) => (
                    <li
                      key={stop._id || stop.sequence}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-brand-950 border border-brand-800/60 text-brand-300 text-sm font-semibold flex items-center justify-center">
                        {stop.sequence}
                      </span>

                      <div className="min-w-0">
                        <p className="text-gray-100">{stop.label}</p>
                        <p className="text-xs text-gray-500">
                          {[stop.street, stop.area, stop.postalCode]
                            .filter(Boolean)
                            .join(', ') || 'No address details'}
                        </p>
                        {stop.landmark ? (
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                            <Navigation className="w-3 h-3" />
                            {stop.landmark}
                          </p>
                        ) : null}
                        {stop.notes ? (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {stop.notes}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CollectorRoutesPage
