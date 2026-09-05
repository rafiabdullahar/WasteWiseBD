import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart3,
  Recycle,
  Trash2,
  Gauge,
  CalendarRange,
  RotateCcw,
  Loader2,
  AlertCircle,
  MapPin,
  ChevronRight,
  X,
  TrendingUp,
  Truck,
  MessageSquareWarning,
} from 'lucide-react'
import api from '../../services/api'

// ============================================================================
// FEATURE 16 — AREA-WISE WASTE ANALYTICS (admin)
//
// A single reporting screen backed by three endpoints:
//
//   /analytics/overview        headline totals, category mix, monthly trend
//   /analytics/areas           the area comparison table
//   /analytics/areas/:id       drill-down, loaded on demand when a row is opened
//
// One filter object drives all three, so narrowing the window or the waste
// category re-scopes every number on the page at once.
// ============================================================================

const WASTE_CATEGORIES = [
  'organic',
  'plastic',
  'paper',
  'glass',
  'metal',
  'electronic',
  'hazardous',
]

const SORT_OPTIONS = [
  { value: 'generated', label: 'Waste generated' },
  { value: 'recycling', label: 'Recycling rate' },
  { value: 'efficiency', label: 'Service efficiency' },
  { value: 'requests', label: 'Total requests' },
  { value: 'complaints', label: 'Complaints' },
  { value: 'name', label: 'Area name' },
]

const emptyFilters = () => ({
  from: '',
  to: '',
  category: '',
  city: '',
  sortBy: 'generated',
  sortOrder: 'desc',
})

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatKg = (value) => `${Number(value || 0).toLocaleString()} kg`

// Rates are null for areas with no measurable activity — show a dash rather
// than a 0% that would read as a real (bad) result.
const formatPercent = (value) =>
  value === null || value === undefined ? '—' : `${value}%`

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : '—'

const titleCase = (value) =>
  value
    ? String(value)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '—'

// Colour the efficiency score so an admin can scan the table for problems.
const scoreTone = (score) => {
  if (score === null || score === undefined) return 'badge-gray'
  if (score >= 75) return 'badge-green'
  if (score >= 50) return 'badge-yellow'
  return 'badge-red'
}

// ─── Presentational building blocks ───────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, hint, tone = 'text-white' }) => (
  <div className="stat-card">
    <div className="flex items-center gap-2 text-gray-500">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">
        {label}
      </span>
    </div>
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
  </div>
)

// A labelled proportional bar. No chart library is used anywhere in this
// project, so the bars are plain elements sized as a percentage of the row max.
const MeterRow = ({ label, value, max, caption, barClass = 'bg-brand-500' }) => {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-medium text-gray-400">{caption}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass} transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

const SectionCard = ({ title, subtitle, icon: Icon, children, action }) => (
  <div className="card">
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-3">
        {Icon ? <Icon className="w-5 h-5 text-brand-400 mt-0.5" /> : null}
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
)

const EmptyState = ({ message }) => (
  <p className="text-sm text-gray-500 py-8 text-center">{message}</p>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminAnalyticsPage = () => {
  const [filters, setFilters] = useState(emptyFilters)
  const [serviceAreas, setServiceAreas] = useState([])

  const [overview, setOverview] = useState(null)
  const [areas, setAreas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [areaDetail, setAreaDetail] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Reference data for the city dropdown — derived from the areas the admin
  // has already configured, so no separate endpoint is needed.
  useEffect(() => {
    const loadServiceAreas = async () => {
      try {
        const response = await api.get('/service-areas?includeInactive=true')
        setServiceAreas(response?.data?.data?.areas || [])
      } catch {
        // Non-fatal: the city filter just stays empty.
        setServiceAreas([])
      }
    }

    loadServiceAreas()
  }, [])

  const cities = useMemo(
    () => [...new Set(serviceAreas.map((area) => area.city).filter(Boolean))].sort(),
    [serviceAreas]
  )

  // Strip blank values so the backend falls back to its own defaults instead
  // of validating empty strings.
  const activeParams = useMemo(() => {
    const params = {}

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params[key] = value
      }
    })

    return params
  }, [filters])

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      // Both reports share the same filters, so they are fetched together.
      const [overviewResponse, areasResponse] = await Promise.all([
        api.get('/analytics/overview', { params: activeParams }),
        api.get('/analytics/areas', { params: activeParams }),
      ])

      setOverview(overviewResponse?.data?.data || null)
      setAreas(areasResponse?.data?.data?.areas || [])
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message || 'Failed to generate the report'

      setError(message)
      setOverview(null)
      setAreas([])
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [activeParams])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Drill-down is loaded lazily, and re-loaded when the shared filters change
  // so the panel never contradicts the table behind it.
  useEffect(() => {
    if (!selectedAreaId) {
      setAreaDetail(null)
      return
    }

    const loadAreaDetail = async () => {
      setIsDetailLoading(true)

      try {
        const response = await api.get(`/analytics/areas/${selectedAreaId}`, {
          params: activeParams,
        })

        setAreaDetail(response?.data?.data || null)
      } catch (requestError) {
        toast.error(
          requestError?.response?.data?.message || 'Failed to load area details'
        )
        setSelectedAreaId(null)
      } finally {
        setIsDetailLoading(false)
      }
    }

    loadAreaDetail()
  }, [selectedAreaId, activeParams])

  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const resetFilters = () => {
    setFilters(emptyFilters())
    setSelectedAreaId(null)
  }

  const totals = overview?.totals
  const meta = overview?.meta

  const maxCategoryKg = Math.max(
    ...(overview?.categoryBreakdown || []).map((row) => row.totalKg),
    0
  )

  const maxTrendKg = Math.max(
    ...(overview?.monthlyTrend || []).map((row) => row.totalKg),
    0
  )

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="section-header flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-brand-400" />
            Area-wise Waste Analytics
          </h1>
          <p className="page-subtitle">
            Waste generation, recycling rates, collection frequency and service
            efficiency across every service area.
          </p>
        </div>

        {meta ? (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Reporting period
            </p>
            <p className="text-sm text-gray-300">
              {formatDate(meta.period.from)} → {formatDate(meta.period.to)}
            </p>
            <p className="text-xs text-gray-500">
              {meta.period.days} days · {meta.period.weeks} weeks
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="input-label" htmlFor="analytics-from">
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              className="input-field"
              value={filters.from}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </div>

          <div>
            <label className="input-label" htmlFor="analytics-to">
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              className="input-field"
              value={filters.to}
              onChange={(event) => updateFilter('to', event.target.value)}
            />
          </div>

          <div>
            <label className="input-label" htmlFor="analytics-category">
              Waste category
            </label>
            <select
              id="analytics-category"
              className="select-field"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
            >
              <option value="">All categories</option>
              {WASTE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label" htmlFor="analytics-city">
              City
            </label>
            <select
              id="analytics-city"
              className="select-field"
              value={filters.city}
              onChange={(event) => updateFilter('city', event.target.value)}
            >
              <option value="">All cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label" htmlFor="analytics-sort">
              Rank by
            </label>
            <select
              id="analytics-sort"
              className="select-field"
              value={filters.sortBy}
              onChange={(event) => updateFilter('sortBy', event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <select
              aria-label="Sort direction"
              className="select-field"
              value={filters.sortOrder}
              onChange={(event) => updateFilter('sortOrder', event.target.value)}
            >
              <option value="desc">High → low</option>
              <option value="asc">Low → high</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="btn-ghost shrink-0"
              title="Reset filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Quantities are resident-declared estimates, not weighed measurements.
          Defaults to the last 180 days when no dates are chosen.
        </p>
      </div>

      {/* ── Loading / error / empty ────────────────────────────────────── */}
      {isLoading ? (
        <div className="card flex items-center justify-center gap-3 py-16">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span className="text-gray-400">Generating report…</span>
        </div>
      ) : error ? (
        <div className="card border-red-900/50 flex flex-col items-center gap-4 py-12">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-gray-300">{error}</p>
          <button type="button" onClick={loadReport} className="btn-secondary">
            Try again
          </button>
        </div>
      ) : !areas.length ? (
        <div className="card flex flex-col items-center gap-3 py-16">
          <MapPin className="w-8 h-8 text-gray-600" />
          <p className="text-gray-400">
            No service areas match these filters.
          </p>
          <p className="text-sm text-gray-600">
            Create service areas first, or widen the filters above.
          </p>
        </div>
      ) : (
        <>
          {/* ── Headline totals ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={Trash2}
              label="Waste handled"
              value={formatKg(totals.totalGeneratedKg)}
              hint={`${formatKg(totals.collectedQuantityKg)} collected · ${formatKg(
                totals.recycledQuantityKg
              )} recycled`}
            />

            <StatCard
              icon={Recycle}
              label="Recycling rate"
              value={formatPercent(totals.recyclingRate)}
              hint={`${totals.completedRecyclingRequests} of ${totals.recyclingRequests} recycling requests completed`}
              tone="text-brand-400"
            />

            <StatCard
              icon={CalendarRange}
              label="Collection frequency"
              value={`${totals.actualCollectionsPerWeek}/wk`}
              hint={`${totals.scheduledCollectionsPerWeek} scheduled slots per week`}
            />

            <StatCard
              icon={Gauge}
              label="Service efficiency"
              value={formatPercent(totals.efficiencyScore)}
              hint={`${formatPercent(totals.fulfillmentRate)} fulfilled · ${formatPercent(
                totals.complaintRate
              )} complaint rate`}
              tone={
                totals.efficiencyScore === null
                  ? 'text-gray-500'
                  : totals.efficiencyScore >= 75
                    ? 'text-brand-400'
                    : totals.efficiencyScore >= 50
                      ? 'text-yellow-400'
                      : 'text-red-400'
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Waste mix by category ──────────────────────────────── */}
            <SectionCard
              title="Waste by category"
              subtitle="Collected as general waste vs. diverted to recycling"
              icon={Trash2}
            >
              {overview.categoryBreakdown.length === 0 ? (
                <EmptyState message="No waste recorded in this period." />
              ) : (
                <div className="space-y-4">
                  {overview.categoryBreakdown.map((row) => (
                    <MeterRow
                      key={row.category}
                      label={titleCase(row.category)}
                      value={row.totalKg}
                      max={maxCategoryKg}
                      caption={`${formatKg(row.totalKg)} · ${row.shareOfTotal}% of total · ${formatPercent(
                        row.recyclingRate
                      )} recycled`}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Monthly trend ──────────────────────────────────────── */}
            <SectionCard
              title="Monthly trend"
              subtitle="Waste handled per month across the selected areas"
              icon={TrendingUp}
            >
              {overview.monthlyTrend.length === 0 ? (
                <EmptyState message="Not enough history for a trend line." />
              ) : (
                <div className="space-y-4">
                  {overview.monthlyTrend.map((row) => (
                    <MeterRow
                      key={row.month}
                      label={row.label}
                      value={row.totalKg}
                      max={maxTrendKg}
                      caption={`${formatKg(row.totalKg)} · ${row.collections} collections · ${formatPercent(
                        row.recyclingRate
                      )} recycled`}
                      barClass="bg-emerald-500"
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Area comparison table ──────────────────────────────────── */}
          <SectionCard
            title="Area comparison"
            subtitle={`${overview.coverage.activeAreas} of ${overview.coverage.totalAreas} areas had activity in this period`}
            icon={MapPin}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="table-header text-left py-3 px-4">Area</th>
                    <th className="table-header text-right py-3 px-4">
                      Waste handled
                    </th>
                    <th className="table-header text-right py-3 px-4">Share</th>
                    <th className="table-header text-right py-3 px-4">
                      Recycling
                    </th>
                    <th className="table-header text-right py-3 px-4">
                      Collections / wk
                    </th>
                    <th className="table-header text-right py-3 px-4">
                      Fulfilled
                    </th>
                    <th className="table-header text-right py-3 px-4">
                      Complaints
                    </th>
                    <th className="table-header text-right py-3 px-4">
                      Efficiency
                    </th>
                    <th className="table-header text-right py-3 px-4" />
                  </tr>
                </thead>

                <tbody>
                  {areas.map((area) => (
                    <tr
                      key={area.areaId}
                      className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedAreaId(area.areaId)}
                    >
                      <td className="table-cell">
                        <div className="font-medium text-white">
                          {area.areaName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {area.city}
                          {area.isActive ? '' : ' · inactive'}
                        </div>
                      </td>

                      <td className="table-cell text-right">
                        {formatKg(area.totalGeneratedKg)}
                      </td>

                      <td className="table-cell text-right text-gray-500">
                        {area.shareOfTotalWaste}%
                      </td>

                      <td className="table-cell text-right">
                        {formatPercent(area.recyclingRate)}
                      </td>

                      <td className="table-cell text-right">
                        {area.actualCollectionsPerWeek}
                        <span className="text-gray-600">
                          {' '}
                          / {area.scheduledCollectionsPerWeek}
                        </span>
                      </td>

                      <td className="table-cell text-right">
                        {area.hasActivity
                          ? `${area.collectedRequests}/${area.actionableRequests}`
                          : '—'}
                      </td>

                      <td className="table-cell text-right">
                        {area.totalComplaints}
                      </td>

                      <td className="table-cell text-right">
                        <span className={scoreTone(area.efficiencyScore)}>
                          {formatPercent(area.efficiencyScore)}
                        </span>
                      </td>

                      <td className="table-cell text-right">
                        <ChevronRight className="w-4 h-4 text-gray-600 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {/* ── Drill-down panel ───────────────────────────────────────────── */}
      {selectedAreaId ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4"
          onClick={() => setSelectedAreaId(null)}
        >
          <div
            className="card w-full max-w-4xl my-8"
            onClick={(event) => event.stopPropagation()}
          >
            {isDetailLoading || !areaDetail ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                <span className="text-gray-400">Loading area report…</span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {areaDetail.area.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {areaDetail.area.city}
                      {areaDetail.area.district
                        ? ` · ${areaDetail.area.district}`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAreaId(null)}
                    className="btn-ghost"
                    aria-label="Close area report"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    icon={Trash2}
                    label="Waste handled"
                    value={formatKg(areaDetail.metrics.totalGeneratedKg)}
                  />
                  <StatCard
                    icon={Recycle}
                    label="Recycling rate"
                    value={formatPercent(areaDetail.metrics.recyclingRate)}
                  />
                  <StatCard
                    icon={CalendarRange}
                    label="Avg turnaround"
                    value={`${areaDetail.metrics.avgCompletionHours} h`}
                  />
                  <StatCard
                    icon={Gauge}
                    label="Efficiency"
                    value={formatPercent(areaDetail.metrics.efficiencyScore)}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Collectors working this area */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-400" />
                      Collectors in this area
                    </h3>

                    {areaDetail.collectors.length === 0 ? (
                      <EmptyState message="No collector was assigned work here in this period." />
                    ) : (
                      <div className="space-y-3">
                        {areaDetail.collectors.map((collector) => (
                          <div
                            key={collector.collectorId}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="text-gray-200">{collector.name}</p>
                              <p className="text-xs text-gray-500">
                                {collector.collectedRequests} collected ·{' '}
                                {collector.failedRequests} failed
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-300">
                                {formatKg(collector.collectedQuantityKg)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatPercent(collector.successRate)} success
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Complaint mix */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <MessageSquareWarning className="w-4 h-4 text-yellow-400" />
                      Complaints raised
                    </h3>

                    {areaDetail.complaints.length === 0 ? (
                      <EmptyState message="No complaints were filed for this area." />
                    ) : (
                      <div className="space-y-3">
                        {areaDetail.complaints.map((complaint) => (
                          <div
                            key={complaint.category}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-gray-200">
                              {complaint.category}
                            </span>
                            <span className="text-gray-500">
                              {complaint.total} total ·{' '}
                              {formatPercent(complaint.resolutionRate)} resolved
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category split */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">
                      Waste by category
                    </h3>

                    {areaDetail.categoryBreakdown.length === 0 ? (
                      <EmptyState message="No waste recorded here in this period." />
                    ) : (
                      <div className="space-y-3">
                        {areaDetail.categoryBreakdown.map((row) => (
                          <MeterRow
                            key={row.category}
                            label={titleCase(row.category)}
                            value={row.totalKg}
                            max={Math.max(
                              ...areaDetail.categoryBreakdown.map(
                                (item) => item.totalKg
                              )
                            )}
                            caption={formatKg(row.totalKg)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Weekly plan behind the observed frequency */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">
                      Weekly collection calendar
                    </h3>

                    {areaDetail.schedule.schedules.length === 0 ? (
                      <EmptyState message="No collection schedule is configured for this area." />
                    ) : (
                      <div className="space-y-2">
                        {areaDetail.schedule.schedules.map((schedule) => (
                          <div
                            key={schedule._id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-gray-200">
                              {schedule.dayOfWeek}
                            </span>
                            <span className="text-gray-500">
                              {titleCase(schedule.timeSlot)}
                              {schedule.wasteCategories?.length
                                ? ` · ${schedule.wasteCategories
                                    .map(titleCase)
                                    .join(', ')}`
                                : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminAnalyticsPage
