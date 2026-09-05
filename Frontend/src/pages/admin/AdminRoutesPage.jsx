import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Route as RouteIcon,
  MapPin,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  UserCheck,
  Send,
  Power,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react'
import api from '../../services/api'

// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT (admin)
//
// One screen with three jobs:
//
//   1. Coverage    — which published calendar slots have nobody behind them
//   2. Routes      — create, assign and dispatch collection routes
//   3. Stop editor — the ordered stop list plus the written directions
//
// There is no automatic route optimisation: the admin arranges the stops
// and writes the directions for driving them.
//
// Collector and service-area dropdowns reuse existing endpoints
// (/service-areas and /admin/collectors) rather than adding new ones.
// ============================================================================

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const TIME_SLOTS = ['morning', 'afternoon', 'evening']

const WASTE_CATEGORIES = [
  'organic',
  'plastic',
  'paper',
  'glass',
  'metal',
  'electronic',
  'hazardous',
]

const emptyFilters = () => ({
  serviceArea: '',
  dayOfWeek: '',
  timeSlot: '',
  assigned: '',
  isActive: 'true',
  search: '',
})

const emptyStop = () => ({
  label: '',
  street: '',
  area: '',
  postalCode: '',
  landmark: '',
})

const emptyRouteForm = () => ({
  name: '',
  serviceArea: '',
  dayOfWeek: 'Monday',
  timeSlot: 'morning',
  wasteCategories: [],
  routeDescription: '',
  notes: '',
  stops: [emptyStop()],
})

const titleCase = (value) =>
  value
    ? String(value)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '—'

const GAP_REASONS = {
  no_route: 'No route planned',
  route_unassigned: 'Route has no collector',
}

const AdminRoutesPage = () => {
  const [filters, setFilters] = useState(emptyFilters)
  const [routes, setRoutes] = useState([])
  const [coverage, setCoverage] = useState(null)
  const [serviceAreas, setServiceAreas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [editorRoute, setEditorRoute] = useState(null) // null | 'new' | route
  const [form, setForm] = useState(emptyRouteForm)
  const [isSaving, setIsSaving] = useState(false)

  const [assignTarget, setAssignTarget] = useState(null)
  const [collectors, setCollectors] = useState([])
  const [isCollectorsLoading, setIsCollectorsLoading] = useState(false)

  // ─── Reference data ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const response = await api.get('/service-areas')
        setServiceAreas(response?.data?.data?.areas || [])
      } catch {
        setServiceAreas([])
      }
    }

    loadAreas()
  }, [])

  const activeParams = useMemo(() => {
    const params = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') params[key] = value
    })
    return params
  }, [filters])

  const loadRoutes = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [routesResponse, coverageResponse] = await Promise.all([
        api.get('/routes', { params: activeParams }),
        api.get('/routes/coverage', {
          params: filters.serviceArea
            ? { serviceArea: filters.serviceArea }
            : {},
        }),
      ])

      setRoutes(routesResponse?.data?.data?.routes || [])
      setCoverage(coverageResponse?.data?.data || null)
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message || 'Failed to load routes'
      setError(message)
      setRoutes([])
      setCoverage(null)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [activeParams, filters.serviceArea])

  useEffect(() => {
    loadRoutes()
  }, [loadRoutes])

  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }))

  // ─── Editor ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({
      ...emptyRouteForm(),
      serviceArea: filters.serviceArea || serviceAreas[0]?._id || '',
    })
    setEditorRoute('new')
  }

  const openEdit = (route) => {
    setForm({
      name: route.name,
      serviceArea: route.serviceArea?._id || '',
      dayOfWeek: route.dayOfWeek,
      timeSlot: route.timeSlot,
      wasteCategories: route.wasteCategories || [],
      routeDescription: route.routeDescription || '',
      notes: route.notes || '',
      stops: route.stops?.length
        ? route.stops.map((stop) => ({
            label: stop.label || '',
            street: stop.street || '',
            area: stop.area || '',
            postalCode: stop.postalCode || '',
            landmark: stop.landmark || '',
          }))
        : [emptyStop()],
    })
    setEditorRoute(route)
  }

  const closeEditor = () => {
    setEditorRoute(null)
    setForm(emptyRouteForm())
  }

  const updateStop = (index, key, value) =>
    setForm((current) => ({
      ...current,
      stops: current.stops.map((stop, position) =>
        position === index ? { ...stop, [key]: value } : stop
      ),
    }))

  // Stop order in the array IS the driving order; the backend renumbers from it.
  const moveStop = (index, direction) =>
    setForm((current) => {
      const target = index + direction
      if (target < 0 || target >= current.stops.length) return current

      const stops = [...current.stops]
      ;[stops[index], stops[target]] = [stops[target], stops[index]]
      return { ...current, stops }
    })

  const removeStop = (index) =>
    setForm((current) => ({
      ...current,
      stops: current.stops.filter((_, position) => position !== index),
    }))

  const toggleCategory = (category) =>
    setForm((current) => ({
      ...current,
      wasteCategories: current.wasteCategories.includes(category)
        ? current.wasteCategories.filter((item) => item !== category)
        : [...current.wasteCategories, category],
    }))

  const saveRoute = async (event) => {
    event.preventDefault()
    setIsSaving(true)

    // Drop blank stop rows so an untouched "add stop" row is not submitted.
    const payload = {
      ...form,
      stops: form.stops.filter((stop) => stop.label.trim()),
    }

    try {
      if (editorRoute === 'new') {
        await api.post('/routes', payload)
        toast.success('Route created')
      } else {
        await api.put(`/routes/${editorRoute._id}`, payload)
        toast.success('Route updated')
      }

      closeEditor()
      loadRoutes()
    } catch (requestError) {
      toast.error(
        requestError?.response?.data?.message || 'Failed to save the route'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Row actions ─────────────────────────────────────────────────────────

  const runAction = async (action, successMessage) => {
    try {
      const response = await action()
      toast.success(response?.data?.message || successMessage)
      loadRoutes()
      return response
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Action failed')
      return null
    }
  }

  const dispatchRoute = (route) =>
    runAction(
      () => api.post(`/routes/${route._id}/dispatch`),
      'Route dispatched'
    )

  const toggleRoute = (route) =>
    runAction(() => api.patch(`/routes/${route._id}/toggle`), 'Route updated')

  // ─── Assignment ──────────────────────────────────────────────────────────

  const openAssign = async (route) => {
    setAssignTarget(route)
    setIsCollectorsLoading(true)

    try {
      // Reuses Feature 10's collector list, which already reports availability
      // and current workload per service area.
      const response = await api.get('/admin/collectors', {
        params: { serviceArea: route.serviceArea?._id },
      })
      setCollectors(response?.data?.data?.collectors || [])
    } catch {
      setCollectors([])
      toast.error('Failed to load collectors')
    } finally {
      setIsCollectorsLoading(false)
    }
  }

  const assignCollector = async (collectorId) => {
    const route = assignTarget
    setAssignTarget(null)

    await runAction(
      () => api.patch(`/routes/${route._id}/assign`, { collectorId }),
      collectorId ? 'Route assigned' : 'Route unassigned'
    )
  }

  const totals = coverage?.totals
  const gapAreas = (coverage?.areas || []).filter((area) => area.gaps.length > 0)

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="section-header flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <RouteIcon className="w-8 h-8 text-brand-400" />
            Route Management
          </h1>
          <p className="page-subtitle">
            Plan collection routes inside each service area, assign them to
            collectors, and keep the published calendar covered.
          </p>
        </div>

        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          New route
        </button>
      </div>

      {/* ── Coverage summary ───────────────────────────────────────────── */}
      {totals ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="stat-card">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Coverage
            </span>
            <p
              className={`text-2xl font-bold ${
                totals.coverageRate === null
                  ? 'text-gray-500'
                  : totals.coverageRate >= 90
                    ? 'text-brand-400'
                    : totals.coverageRate >= 60
                      ? 'text-yellow-400'
                      : 'text-red-400'
              }`}
            >
              {totals.coverageRate === null ? '—' : `${totals.coverageRate}%`}
            </p>
            <p className="text-xs text-gray-500">
              {totals.coveredSlots}/{totals.scheduleSlots} calendar slots staffed
            </p>
          </div>

          <div className="stat-card">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Routes
            </span>
            <p className="text-2xl font-bold text-white">{totals.routes}</p>
            <p className="text-xs text-gray-500">across {totals.areas} areas</p>
          </div>

          <div className="stat-card">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Unassigned
            </span>
            <p
              className={`text-2xl font-bold ${
                totals.unassignedRoutes ? 'text-yellow-400' : 'text-white'
              }`}
            >
              {totals.unassignedRoutes}
            </p>
            <p className="text-xs text-gray-500">routes without a collector</p>
          </div>

          <div className="stat-card">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Areas with no route
            </span>
            <p
              className={`text-2xl font-bold ${
                totals.areasWithoutRoutes ? 'text-red-400' : 'text-white'
              }`}
            >
              {totals.areasWithoutRoutes}
            </p>
            <p className="text-xs text-gray-500">nothing planned at all</p>
          </div>

          <div className="stat-card">
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Unclaimed pickups
            </span>
            <p className="text-2xl font-bold text-white">
              {totals.pendingRequests}
            </p>
            <p className="text-xs text-gray-500">waiting for a collector</p>
          </div>
        </div>
      ) : null}

      {/* ── Coverage gaps ──────────────────────────────────────────────── */}
      {gapAreas.length > 0 ? (
        <div className="card border-yellow-900/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Calendar slots with nobody behind them
          </h2>

          <div className="space-y-3">
            {gapAreas.map((area) => (
              <div key={area.areaId} className="text-sm">
                <p className="text-gray-200 font-medium">
                  {area.areaName}
                  <span className="text-gray-500 font-normal">
                    {' '}
                    — {area.coveredSlots}/{area.scheduleSlots} covered
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {area.gaps.map((gap) => (
                    <span
                      key={`${gap.dayOfWeek}-${gap.timeSlot}`}
                      className={
                        gap.reason === 'no_route' ? 'badge-red' : 'badge-yellow'
                      }
                    >
                      {gap.dayOfWeek} {titleCase(gap.timeSlot)} ·{' '}
                      {GAP_REASONS[gap.reason]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="input-label" htmlFor="route-area">
              Service area
            </label>
            <select
              id="route-area"
              className="select-field"
              value={filters.serviceArea}
              onChange={(event) =>
                updateFilter('serviceArea', event.target.value)
              }
            >
              <option value="">All areas</option>
              {serviceAreas.map((area) => (
                <option key={area._id} value={area._id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label" htmlFor="route-day">
              Day
            </label>
            <select
              id="route-day"
              className="select-field"
              value={filters.dayOfWeek}
              onChange={(event) => updateFilter('dayOfWeek', event.target.value)}
            >
              <option value="">Any day</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label" htmlFor="route-slot">
              Time slot
            </label>
            <select
              id="route-slot"
              className="select-field"
              value={filters.timeSlot}
              onChange={(event) => updateFilter('timeSlot', event.target.value)}
            >
              <option value="">Any slot</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {titleCase(slot)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label" htmlFor="route-assigned">
              Assignment
            </label>
            <select
              id="route-assigned"
              className="select-field"
              value={filters.assigned}
              onChange={(event) => updateFilter('assigned', event.target.value)}
            >
              <option value="">All</option>
              <option value="true">Assigned</option>
              <option value="false">Unassigned</option>
            </select>
          </div>

          <div>
            <label className="input-label" htmlFor="route-active">
              Status
            </label>
            <select
              id="route-active"
              className="select-field"
              value={filters.isActive}
              onChange={(event) => updateFilter('isActive', event.target.value)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <input
              type="text"
              aria-label="Search routes by name"
              placeholder="Search name…"
              className="input-field"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
            <button
              type="button"
              onClick={() => setFilters(emptyFilters())}
              className="btn-ghost shrink-0"
              title="Reset filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Route list ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="card flex items-center justify-center gap-3 py-16">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span className="text-gray-400">Loading routes…</span>
        </div>
      ) : error ? (
        <div className="card border-red-900/50 flex flex-col items-center gap-4 py-12">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-gray-300">{error}</p>
          <button type="button" onClick={loadRoutes} className="btn-secondary">
            Try again
          </button>
        </div>
      ) : routes.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16">
          <RouteIcon className="w-8 h-8 text-gray-600" />
          <p className="text-gray-400">No routes match these filters.</p>
          <button type="button" onClick={openCreate} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Create the first route
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-white">
                      {route.name}
                    </h3>
                    <span className="badge-blue">
                      {route.dayOfWeek} · {titleCase(route.timeSlot)}
                    </span>
                    {route.isActive ? null : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <MapPin className="w-4 h-4" />
                    {route.serviceArea?.name || '—'}
                    <span className="text-gray-700">|</span>
                    {route.stopCount} stops
                  </p>

                  <p className="text-sm mt-2">
                    {route.assignedCollector ? (
                      <span className="text-brand-400 inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        {route.assignedCollector.user?.name}
                        <span className="text-gray-500">
                          ({titleCase(route.assignedCollector.vehicleType)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-yellow-400 inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        No collector assigned
                      </span>
                    )}
                  </p>

                  {route.wasteCategories?.length ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {route.wasteCategories.map((category) => (
                        <span key={category} className="badge-gray">
                          {titleCase(category)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(route)}
                    className="btn-ghost"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openAssign(route)}
                    className="btn-ghost"
                    title="Assign a collector"
                  >
                    <UserCheck className="w-4 h-4" />
                    Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchRoute(route)}
                    className="btn-ghost"
                    title="Assign unclaimed pickups on this slot to this route"
                    disabled={!route.assignedCollector || !route.isActive}
                  >
                    <Send className="w-4 h-4" />
                    Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRoute(route)}
                    className="btn-ghost"
                    title={route.isActive ? 'Deactivate' : 'Activate'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {route.routeDescription ? (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Directions
                  </p>
                  <p className="text-sm text-gray-400 whitespace-pre-line">
                    {route.routeDescription}
                  </p>
                </div>
              ) : null}

              {route.stops?.length ? (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="flex flex-wrap gap-2">
                    {route.stops.map((stop) => (
                      <span
                        key={stop._id || stop.sequence}
                        className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-300"
                      >
                        <span className="text-gray-600 mr-1.5">
                          {stop.sequence}
                        </span>
                        {stop.label}
                        {stop.postalCode || stop.area ? (
                          <span className="text-gray-600">
                            {' '}
                            · {stop.postalCode || stop.area}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* ── Create / edit modal ────────────────────────────────────────── */}
      {editorRoute ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4"
          onClick={closeEditor}
        >
          <form
            onSubmit={saveRoute}
            className="card w-full max-w-3xl my-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-white">
                {editorRoute === 'new' ? 'New route' : `Edit ${editorRoute.name}`}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="btn-ghost"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="input-label" htmlFor="form-name">
                  Route name
                </label>
                <input
                  id="form-name"
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Gulshan North — Monday AM"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </div>

              <div>
                <label className="input-label" htmlFor="form-area">
                  Service area
                </label>
                <select
                  id="form-area"
                  required
                  className="select-field"
                  value={form.serviceArea}
                  disabled={editorRoute !== 'new'}
                  onChange={(event) =>
                    setForm({ ...form, serviceArea: event.target.value })
                  }
                >
                  <option value="">Select an area…</option>
                  {serviceAreas.map((area) => (
                    <option key={area._id} value={area._id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                {editorRoute !== 'new' ? (
                  <p className="text-xs text-gray-600 mt-1">
                    An existing route cannot move to another area.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="input-label" htmlFor="form-day">
                  Day of week
                </label>
                <select
                  id="form-day"
                  className="select-field"
                  value={form.dayOfWeek}
                  onChange={(event) =>
                    setForm({ ...form, dayOfWeek: event.target.value })
                  }
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" htmlFor="form-slot">
                  Time slot
                </label>
                <select
                  id="form-slot"
                  className="select-field"
                  value={form.timeSlot}
                  onChange={(event) =>
                    setForm({ ...form, timeSlot: event.target.value })
                  }
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {titleCase(slot)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <span className="input-label">
                Waste categories{' '}
                <span className="text-gray-600 font-normal">
                  (leave empty for all)
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                {WASTE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={
                      form.wasteCategories.includes(category)
                        ? 'badge-green'
                        : 'badge-gray'
                    }
                  >
                    {titleCase(category)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stop editor — array order is the driving order */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="input-label mb-0">
                  Stops{' '}
                  <span className="text-gray-600 font-normal">
                    (order here is the driving order)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, stops: [...form.stops, emptyStop()] })
                  }
                  className="btn-ghost"
                >
                  <Plus className="w-4 h-4" />
                  Add stop
                </button>
              </div>

              <div className="space-y-3">
                {form.stops.map((stop, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-500 w-6">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Stop label (required)"
                        className="input-field"
                        value={stop.label}
                        onChange={(event) =>
                          updateStop(index, 'label', event.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => moveStop(index, -1)}
                        disabled={index === 0}
                        className="btn-ghost px-2 disabled:opacity-30"
                        aria-label="Move stop up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStop(index, 1)}
                        disabled={index === form.stops.length - 1}
                        className="btn-ghost px-2 disabled:opacity-30"
                        aria-label="Move stop down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="btn-ghost px-2 text-red-400"
                        aria-label="Remove stop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-8">
                      <input
                        type="text"
                        placeholder="Street"
                        className="input-field"
                        value={stop.street}
                        onChange={(event) =>
                          updateStop(index, 'street', event.target.value)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Locality / area"
                        className="input-field"
                        value={stop.area}
                        onChange={(event) =>
                          updateStop(index, 'area', event.target.value)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Postal code"
                        className="input-field"
                        value={stop.postalCode}
                        onChange={(event) =>
                          updateStop(index, 'postalCode', event.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Arrange the stops in the order you want them driven, then
                describe the path to follow in the directions box below.
              </p>
            </div>

            <div className="mb-4">
              <label className="input-label" htmlFor="form-description">
                Route directions
              </label>
              <textarea
                id="form-description"
                rows={4}
                className="input-field"
                placeholder="Describe the path to follow, e.g. Start at Gulshan 1 Circle, take Road 11 north to Road 27, then left onto Kemal Ataturk Ave and finish at Banani Chairman Bari."
                value={form.routeDescription}
                onChange={(event) =>
                  setForm({ ...form, routeDescription: event.target.value })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Written by you and shown to the collector exactly as typed.
              </p>
            </div>

            <div className="mb-6">
              <label className="input-label" htmlFor="form-notes">
                Notes
              </label>
              <textarea
                id="form-notes"
                rows={2}
                className="input-field"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {editorRoute === 'new' ? 'Create route' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* ── Assign modal ───────────────────────────────────────────────── */}
      {assignTarget ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4"
          onClick={() => setAssignTarget(null)}
        >
          <div
            className="card w-full max-w-lg my-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold text-white">Assign collector</h2>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="btn-ghost"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              {assignTarget.name} · {assignTarget.dayOfWeek}{' '}
              {titleCase(assignTarget.timeSlot)}
            </p>

            {isCollectorsLoading ? (
              <div className="flex items-center justify-center gap-3 py-10">
                <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                <span className="text-gray-400">Loading collectors…</span>
              </div>
            ) : collectors.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No active collector covers this service area. Add the area to a
                collector&apos;s profile first.
              </p>
            ) : (
              <div className="space-y-2">
                {collectors.map((collector) => (
                  <button
                    key={collector._id}
                    type="button"
                    onClick={() => assignCollector(collector._id)}
                    disabled={!collector.isAvailable}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700 text-left transition-colors disabled:opacity-40"
                  >
                    <div>
                      <p className="text-gray-100">{collector.user?.name}</p>
                      <p className="text-xs text-gray-500">
                        {titleCase(collector.vehicleType)} ·{' '}
                        {collector.activeTaskCount} active tasks
                        {collector.isAvailable ? '' : ' · unavailable'}
                      </p>
                    </div>
                    <UserCheck className="w-4 h-4 text-brand-400" />
                  </button>
                ))}
              </div>
            )}

            {assignTarget.assignedCollector ? (
              <button
                type="button"
                onClick={() => assignCollector(null)}
                className="btn-secondary w-full mt-4"
              >
                Unassign current collector
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminRoutesPage
