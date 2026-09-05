import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  User,
  XCircle,
} from 'lucide-react'
import api from '../../services/api'

const WASTE_CATEGORIES = [
  'organic',
  'plastic',
  'paper',
  'glass',
  'metal',
  'electronic',
  'hazardous',
]

const STATUS_STYLES = {
  collected: 'badge-green',
  failed: 'badge-red',
  cancelled: 'badge-gray',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Collected & Failed' },
  { value: 'collected', label: 'Collected' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const createInitialFilters = () => ({
  status: '',
  category: '',
  from: '',
  to: '',
  page: 1,
})

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : '—'

const CollectorHistoryPage = () => {
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  })
  const [filters, setFilters] = useState(createInitialFilters)
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      params.set('page', filters.page)
      params.set('limit', 10)

      const { data } = await api.get(
        `/collectors/history?${params.toString()}`
      )

      setHistory(data?.data?.history || [])
      setSummary(data?.data?.summary || null)
      setPagination(
        data?.data?.pagination || {
          total: 0,
          page: 1,
          pages: 1,
          limit: 10,
        }
      )
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load work history'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const updateFilter = (field, value) =>
    setFilters((previous) => ({
      ...previous,
      [field]: value,
      page: 1,
    }))

  const resetFilters = () => setFilters(createInitialFilters())

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Collection History</h1>
          <p className="page-subtitle">
            Your completed and failed pickup tasks.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-900/40 flex items-center justify-center text-brand-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Tasks</p>
                <h3 className="text-2xl font-bold text-white">
                  {summary.totalRecords}
                </h3>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-900/40 flex items-center justify-center text-green-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Collected</p>
                <h3 className="text-2xl font-bold text-white">
                  {summary.collected}
                </h3>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-900/40 flex items-center justify-center text-red-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Failed</p>
                <h3 className="text-2xl font-bold text-white">
                  {summary.failed}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="input-label">Status</label>
            <select
              className="select-field"
              value={filters.status}
              onChange={(event) =>
                updateFilter('status', event.target.value)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Category</label>
            <select
              className="select-field"
              value={filters.category}
              onChange={(event) =>
                updateFilter('category', event.target.value)
              }
            >
              <option value="">All Categories</option>
              {WASTE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">From</label>
            <input
              type="date"
              className="input-field"
              value={filters.from}
              onChange={(event) =>
                updateFilter('from', event.target.value)
              }
            />
          </div>

          <div>
            <label className="input-label">To</label>
            <input
              type="date"
              className="input-field"
              value={filters.to}
              onChange={(event) =>
                updateFilter('to', event.target.value)
              }
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* History list */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">
              No history records match your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`badge ${
                          STATUS_STYLES[entry.status] || 'badge-blue'
                        } capitalize`}
                      >
                        {String(entry.status).replaceAll('_', ' ')}
                      </span>

                      {entry.serviceArea && (
                        <span className="text-xs text-gray-500">
                          {entry.serviceArea}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-white">
                      <User className="w-4 h-4 text-gray-500" />
                      {entry.resident}
                      {entry.residentPhone && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Phone className="w-3.5 h-3.5" />
                          {entry.residentPhone}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(entry.preferredDate)}
                      </span>

                      <span className="flex items-center gap-2 capitalize">
                        <Clock className="w-4 h-4" />
                        {entry.preferredTimeSlot || '—'}
                      </span>

                      {entry.address && (
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {entry.address}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-300 font-medium mb-1 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Items ({entry.totalQuantity} kg)
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.items.length
                          ? entry.items
                              .map(
                                (item) =>
                                  `${item.category} (${item.quantity} kg)`
                              )
                              .join(', ')
                          : '—'}
                      </p>
                    </div>

                    {entry.status === 'failed' &&
                      entry.failureReason && (
                        <p className="text-sm text-red-400">
                          Reason: {entry.failureReason}
                        </p>
                      )}
                  </div>

                  <div className="lg:text-right lg:min-w-48">
                    <p className="text-sm text-gray-400">Completed</p>
                    <p className="font-medium text-white">
                      {formatDate(entry.completedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-1 pt-5 mt-5 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} •{' '}
              {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: f.page - 1 }))
                }
                className="btn-ghost disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="flex items-center px-3 text-sm text-gray-300">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: f.page + 1 }))
                }
                className="btn-ghost disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CollectorHistoryPage
