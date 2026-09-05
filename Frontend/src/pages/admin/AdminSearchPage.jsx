import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Truck,
  Recycle,
  MessageSquareWarning,
  Users,
  Building2,
  RotateCcw,
} from 'lucide-react'
import api from '../../services/api'

// ============================================================================
// FEATURE 19 — ADVANCED SEARCH & FILTERING (admin)
//
// One page, five searchable entities. Each tab drives its own backend endpoint
// under /api/admin/search/* and renders a result table tailored to that record
// type. Filters are debounced and reset when switching tabs.
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

const PICKUP_STATUSES = [
  'pending',
  'assigned',
  'on_the_way',
  'collected',
  'failed',
  'cancelled',
]

const RECYCLING_STATUSES = [
  'pending',
  'assigned',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
]

const COMPLAINT_STATUSES = ['Open', 'Investigating', 'Resolved', 'Closed']

const COMPLAINT_CATEGORIES = [
  'Missed Pickup',
  'Partial Collection',
  'Wrong Waste Handling',
  'Bin Overflow',
  'Other',
]

const VEHICLE_TYPES = ['truck', 'van', 'rickshaw', 'motorcycle', 'other']

const ORG_TYPES = [
  'recycling_center',
  'scrap_shop',
  'environmental_org',
  'other',
]

const TABS = [
  { key: 'pickup-requests', label: 'Pickup Requests', icon: Truck },
  { key: 'recycling-requests', label: 'Recycling', icon: Recycle },
  { key: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { key: 'collectors', label: 'Collectors', icon: Users },
  { key: 'partners', label: 'Partners', icon: Building2 },
]

const emptyFilters = () => ({
  search: '',
  status: '',
  category: '',
  serviceArea: '',
  partner: '',
  assigned: '',
  area: '',
  vehicleType: '',
  isAvailable: '',
  organizationType: '',
  material: '',
  isVerified: '',
  from: '',
  to: '',
  page: 1,
})

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : '—'

const titleCase = (value) =>
  value
    ? String(value)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '—'

const AdminSearchPage = () => {
  const [activeTab, setActiveTab] = useState('pickup-requests')
  const [filters, setFilters] = useState(emptyFilters)
  const [results, setResults] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [serviceAreas, setServiceAreas] = useState([])
  const [partners, setPartners] = useState([])

  // Reference data for the location + partner dropdowns.
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [areaResponse, partnerResponse] = await Promise.all([
          api.get('/service-areas'),
          api.get('/admin/search/partners?limit=100'),
        ])

        setServiceAreas(areaResponse?.data?.data?.areas || [])
        setPartners(partnerResponse?.data?.data?.partners || [])
      } catch (error) {
        // Non-fatal: the dropdowns just stay empty.
        console.error('Failed to load filter reference data', error)
      }
    }

    loadReferenceData()
  }, [])

  const dataKey = useMemo(() => {
    switch (activeTab) {
      case 'complaints':
        return 'complaints'
      case 'collectors':
        return 'collectors'
      case 'partners':
        return 'partners'
      default:
        return 'requests'
    }
  }, [activeTab])

  const fetchResults = async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      const add = (key, value) => value && params.set(key, value)

      add('search', filters.search)
      add('status', filters.status)
      add('category', filters.category)
      add('serviceArea', filters.serviceArea)
      add('from', filters.from)
      add('to', filters.to)

      if (activeTab === 'pickup-requests') {
        add('assigned', filters.assigned)
      }

      if (activeTab === 'recycling-requests') {
        add('partner', filters.partner)
      }

      if (activeTab === 'complaints') {
        add('area', filters.area)
      }

      if (activeTab === 'collectors') {
        add('vehicleType', filters.vehicleType)
        add('isAvailable', filters.isAvailable)
      }

      if (activeTab === 'partners') {
        add('organizationType', filters.organizationType)
        add('material', filters.material)
        add('isVerified', filters.isVerified)
      }

      params.set('page', filters.page)
      params.set('limit', 20)

      const { data } = await api.get(
        `/admin/search/${activeTab}?${params.toString()}`
      )

      setResults(data?.data?.[dataKey] || [])
      setPagination(
        data?.data?.pagination || {
          total: 0,
          page: 1,
          pages: 1,
          limit: 20,
        }
      )
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Search failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(fetchResults, 400)
    return () => clearTimeout(debounce)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, activeTab])

  const switchTab = (key) => {
    if (key === activeTab) return
    setActiveTab(key)
    setFilters(emptyFilters())
  }

  const updateFilter = (field, value) =>
    setFilters((previous) => ({
      ...previous,
      [field]: value,
      page: 1,
    }))

  const resetFilters = () => setFilters(emptyFilters())

  const searchPlaceholder = useMemo(() => {
    switch (activeTab) {
      case 'complaints':
        return 'Search by resident name, email, or phone...'
      case 'collectors':
        return 'Search by collector name, email, or phone...'
      case 'partners':
        return 'Search by organization name or email...'
      default:
        return 'Search by resident name, email, or phone...'
    }
  }, [activeTab])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Search &amp; Filter</h1>
          <p className="page-subtitle">
            Search across pickup requests, recycling, complaints,
            collectors, and partners.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.key === activeTab

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-brand-900/40 text-brand-300 border-brand-800/60'
                  : 'bg-gray-900/40 text-gray-400 border-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="card space-y-4">
        {/* Text search — every tab has one. */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="input-field pl-12"
            value={filters.search}
            onChange={(event) =>
              updateFilter('search', event.target.value)
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status — pickup / recycling / complaints */}
          {activeTab === 'pickup-requests' && (
            <div>
              <label className="input-label">Status</label>
              <select
                className="select-field"
                value={filters.status}
                onChange={(event) =>
                  updateFilter('status', event.target.value)
                }
              >
                <option value="">All Statuses</option>
                {PICKUP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'recycling-requests' && (
            <div>
              <label className="input-label">Status</label>
              <select
                className="select-field"
                value={filters.status}
                onChange={(event) =>
                  updateFilter('status', event.target.value)
                }
              >
                <option value="">All Statuses</option>
                {RECYCLING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div>
              <label className="input-label">Status</label>
              <select
                className="select-field"
                value={filters.status}
                onChange={(event) =>
                  updateFilter('status', event.target.value)
                }
              >
                <option value="">All Statuses</option>
                {COMPLAINT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category — pickup / recycling (waste) + complaints (its own) */}
          {(activeTab === 'pickup-requests' ||
            activeTab === 'recycling-requests') && (
            <div>
              <label className="input-label">Waste Category</label>
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
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'complaints' && (
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
                {COMPLAINT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service area — pickup / recycling / collectors / partners */}
          {activeTab !== 'complaints' && (
            <div>
              <label className="input-label">Service Area</label>
              <select
                className="select-field"
                value={filters.serviceArea}
                onChange={(event) =>
                  updateFilter('serviceArea', event.target.value)
                }
              >
                <option value="">All Areas</option>
                {serviceAreas.map((area) => (
                  <option key={area._id} value={area._id}>
                    {area.name}
                    {area.city ? ` — ${area.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Complaint area (free text) */}
          {activeTab === 'complaints' && (
            <div>
              <label className="input-label">Area</label>
              <input
                type="text"
                placeholder="e.g. Dhanmondi"
                className="input-field"
                value={filters.area}
                onChange={(event) =>
                  updateFilter('area', event.target.value)
                }
              />
            </div>
          )}

          {/* Assigned — pickup only */}
          {activeTab === 'pickup-requests' && (
            <div>
              <label className="input-label">Assignment</label>
              <select
                className="select-field"
                value={filters.assigned}
                onChange={(event) =>
                  updateFilter('assigned', event.target.value)
                }
              >
                <option value="">All</option>
                <option value="true">Assigned</option>
                <option value="false">Unassigned</option>
              </select>
            </div>
          )}

          {/* Partner — recycling only */}
          {activeTab === 'recycling-requests' && (
            <div>
              <label className="input-label">Partner</label>
              <select
                className="select-field"
                value={filters.partner}
                onChange={(event) =>
                  updateFilter('partner', event.target.value)
                }
              >
                <option value="">All Partners</option>
                {partners.map((partner) => (
                  <option key={partner._id} value={partner._id}>
                    {partner.organizationName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collector-specific */}
          {activeTab === 'collectors' && (
            <>
              <div>
                <label className="input-label">Vehicle Type</label>
                <select
                  className="select-field"
                  value={filters.vehicleType}
                  onChange={(event) =>
                    updateFilter('vehicleType', event.target.value)
                  }
                >
                  <option value="">All Vehicles</option>
                  {VEHICLE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {titleCase(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Availability</label>
                <select
                  className="select-field"
                  value={filters.isAvailable}
                  onChange={(event) =>
                    updateFilter('isAvailable', event.target.value)
                  }
                >
                  <option value="">All</option>
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
            </>
          )}

          {/* Partner-specific */}
          {activeTab === 'partners' && (
            <>
              <div>
                <label className="input-label">Organization Type</label>
                <select
                  className="select-field"
                  value={filters.organizationType}
                  onChange={(event) =>
                    updateFilter('organizationType', event.target.value)
                  }
                >
                  <option value="">All Types</option>
                  {ORG_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {titleCase(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Accepted Material</label>
                <select
                  className="select-field"
                  value={filters.material}
                  onChange={(event) =>
                    updateFilter('material', event.target.value)
                  }
                >
                  <option value="">All Materials</option>
                  {WASTE_CATEGORIES.map((material) => (
                    <option key={material} value={material}>
                      {titleCase(material)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Verification</label>
                <select
                  className="select-field"
                  value={filters.isVerified}
                  onChange={(event) =>
                    updateFilter('isVerified', event.target.value)
                  }
                >
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Pending</option>
                </select>
              </div>
            </>
          )}

          {/* Date range — records with a meaningful date (not collectors/partners) */}
          {(activeTab === 'pickup-requests' ||
            activeTab === 'recycling-requests' ||
            activeTab === 'complaints') && (
            <>
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
            </>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn-ghost text-sm inline-flex items-center gap-1.5"
            onClick={resetFilters}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No results match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ResultsTable tab={activeTab} rows={results} />
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              Showing{' '}
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )}{' '}
              of {pagination.total}
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

// ─── Result tables (one shape per entity) ───────────────────────────────────

const StatusBadge = ({ status }) => {
  const styleMap = {
    pending: 'badge-yellow',
    assigned: 'badge-blue',
    accepted: 'badge-blue',
    on_the_way: 'badge-blue',
    in_progress: 'badge-blue',
    collected: 'badge-green',
    completed: 'badge-green',
    failed: 'badge-red',
    rejected: 'badge-red',
    cancelled: 'badge-gray',
    Open: 'badge-yellow',
    Investigating: 'badge-blue',
    Resolved: 'badge-green',
    Closed: 'badge-gray',
  }

  return (
    <span
      className={`badge ${styleMap[status] || 'badge-blue'} capitalize`}
    >
      {String(status).replaceAll('_', ' ')}
    </span>
  )
}

const ResultsTable = ({ tab, rows }) => {
  if (tab === 'pickup-requests') {
    return (
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="table-header py-3 px-4">Resident</th>
            <th className="table-header py-3 px-4">Service Area</th>
            <th className="table-header py-3 px-4">Date</th>
            <th className="table-header py-3 px-4">Collector</th>
            <th className="table-header py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {rows.map((row) => (
            <tr key={row._id} className="hover:bg-gray-800/20">
              <td className="table-cell font-medium text-white">
                {row.resident?.name || '—'}
              </td>
              <td className="table-cell text-gray-400">
                {row.serviceArea?.name || '—'}
              </td>
              <td className="table-cell text-gray-400">
                {formatDate(row.preferredDate)}
              </td>
              <td className="table-cell text-gray-400">
                {row.assignedCollector?.user?.name || 'Unassigned'}
              </td>
              <td className="table-cell">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (tab === 'recycling-requests') {
    return (
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="table-header py-3 px-4">Resident</th>
            <th className="table-header py-3 px-4">Service Area</th>
            <th className="table-header py-3 px-4">Date</th>
            <th className="table-header py-3 px-4">Partner</th>
            <th className="table-header py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {rows.map((row) => (
            <tr key={row._id} className="hover:bg-gray-800/20">
              <td className="table-cell font-medium text-white">
                {row.resident?.name || '—'}
              </td>
              <td className="table-cell text-gray-400">
                {row.serviceArea?.name || '—'}
              </td>
              <td className="table-cell text-gray-400">
                {formatDate(row.preferredDate)}
              </td>
              <td className="table-cell text-gray-400">
                {row.partner?.organizationName || 'Unassigned'}
              </td>
              <td className="table-cell">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (tab === 'complaints') {
    return (
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="table-header py-3 px-4">Resident</th>
            <th className="table-header py-3 px-4">Category</th>
            <th className="table-header py-3 px-4">Area</th>
            <th className="table-header py-3 px-4">Missed Date</th>
            <th className="table-header py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {rows.map((row) => (
            <tr key={row._id} className="hover:bg-gray-800/20">
              <td className="table-cell font-medium text-white">
                {row.resident?.name || '—'}
              </td>
              <td className="table-cell text-gray-400">{row.category}</td>
              <td className="table-cell text-gray-400">{row.area}</td>
              <td className="table-cell text-gray-400">
                {formatDate(row.missedDate)}
              </td>
              <td className="table-cell">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (tab === 'collectors') {
    return (
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="table-header py-3 px-4">Name</th>
            <th className="table-header py-3 px-4">Vehicle</th>
            <th className="table-header py-3 px-4">Service Areas</th>
            <th className="table-header py-3 px-4">Completed</th>
            <th className="table-header py-3 px-4">Available</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {rows.map((row) => (
            <tr key={row._id} className="hover:bg-gray-800/20">
              <td className="table-cell font-medium text-white">
                {row.user?.name || '—'}
                <span className="block text-xs text-gray-500">
                  {row.user?.email}
                </span>
              </td>
              <td className="table-cell text-gray-400 capitalize">
                {row.vehicleType || '—'}
              </td>
              <td className="table-cell text-gray-400">
                {(row.serviceAreas || [])
                  .map((area) => area.name)
                  .join(', ') || '—'}
              </td>
              <td className="table-cell text-gray-400">
                {row.totalCompleted || 0}
              </td>
              <td className="table-cell">
                <span
                  className={`badge ${
                    row.isAvailable ? 'badge-green' : 'badge-gray'
                  }`}
                >
                  {row.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // partners
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-gray-800">
          <th className="table-header py-3 px-4">Organization</th>
          <th className="table-header py-3 px-4">Type</th>
          <th className="table-header py-3 px-4">Materials</th>
          <th className="table-header py-3 px-4">Handled</th>
          <th className="table-header py-3 px-4">Verified</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800/50">
        {rows.map((row) => (
          <tr key={row._id} className="hover:bg-gray-800/20">
            <td className="table-cell font-medium text-white">
              {row.organizationName}
              <span className="block text-xs text-gray-500">
                {row.contactEmail}
              </span>
            </td>
            <td className="table-cell text-gray-400 capitalize">
              {String(row.organizationType || '').replaceAll('_', ' ')}
            </td>
            <td className="table-cell text-gray-400 capitalize">
              {(row.acceptedMaterials || []).join(', ') || '—'}
            </td>
            <td className="table-cell text-gray-400">
              {row.totalRequestsHandled || 0}
            </td>
            <td className="table-cell">
              <span
                className={`badge ${
                  row.isVerified ? 'badge-green' : 'badge-yellow'
                }`}
              >
                {row.isVerified ? 'Verified' : 'Pending'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default AdminSearchPage
