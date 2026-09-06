import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ArrowUpDown,
  Loader2,
} from 'lucide-react'
import api from '../../services/api'

const SORT_OPTIONS = [
  { value: 'totalCompleted', label: 'Completed' },
  { value: 'successRate', label: 'Success rate' },
  { value: 'punctualityRate', label: 'Punctuality' },
  { value: 'averageRating', label: 'Rating' },
  { value: 'name', label: 'Name' },
]

const formatPercent = (value) =>
  value === null || value === undefined ? '—' : `${value}%`

const scoreTone = (value) => {
  if (value === null || value === undefined) return 'text-gray-500'
  if (value >= 75) return 'text-brand-400'
  if (value >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="stat-card">
    <div className="flex items-center gap-2 text-gray-500">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
)

const AdminCollectorPerformancePage = () => {
  const [collectors, setCollectors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState('totalCompleted')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchPerformance = async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/admin/collectors/performance')
      if (data.success) setCollectors(data.data.collectors)
    } catch {
      toast.error('Could not load collector performance')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformance()
  }, [])

  const summary = useMemo(() => {
    const activeCollectors = collectors.filter((c) => c.isAvailable).length
    const totalCompleted = collectors.reduce((sum, c) => sum + c.totalCompleted, 0)
    const totalFailed = collectors.reduce((sum, c) => sum + c.totalFailed, 0)
    const rated = collectors.filter((c) => c.averageRating > 0)
    const avgRating = rated.length
      ? (rated.reduce((sum, c) => sum + c.averageRating, 0) / rated.length).toFixed(1)
      : '—'

    return { activeCollectors, totalCompleted, totalFailed, avgRating }
  }, [collectors])

  const sorted = useMemo(() => {
    const list = [...collectors]
    list.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]

      // Nulls sort last regardless of direction, so "no data" never looks
      // like the worst possible score.
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
    return list
  }, [collectors, sortBy, sortOrder])

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Truck className="w-8 h-8 text-brand-400" />
            Collector Performance
          </h1>
          <p className="page-subtitle">
            Completed pickups, punctuality, and ratings across all collectors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Truck} label="Active collectors" value={summary.activeCollectors} />
        <StatCard icon={CheckCircle2} label="Total completed" value={summary.totalCompleted} />
        <StatCard icon={XCircle} label="Total failed" value={summary.totalFailed} />
        <StatCard icon={Star} label="Avg rating" value={summary.avgRating} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-white">All collectors</h2>
          <div className="flex items-center gap-2">
            <select
              className="select-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="btn-ghost"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span className="text-gray-400">Loading...</span>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No collectors found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header text-left py-3 px-4">Collector</th>
                  <th className="table-header text-right py-3 px-4">Completed</th>
                  <th className="table-header text-right py-3 px-4">Failed</th>
                  <th className="table-header text-right py-3 px-4">Success rate</th>
                  <th className="table-header text-right py-3 px-4">Punctuality</th>
                  <th className="table-header text-right py-3 px-4">Complaints</th>
                  <th className="table-header text-right py-3 px-4">Rating</th>
                  <th className="table-header text-right py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.collectorId} className="border-b border-gray-800/60 hover:bg-gray-800/40">
                    <td className="table-cell">
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.employeeId ? `ID: ${c.employeeId}` : c.email}
                      </div>
                    </td>
                    <td className="table-cell text-right">{c.totalCompleted}</td>
                    <td className="table-cell text-right">{c.totalFailed}</td>
                    <td className={`table-cell text-right font-medium ${scoreTone(c.successRate)}`}>
                      {formatPercent(c.successRate)}
                    </td>
                    <td className={`table-cell text-right font-medium ${scoreTone(c.punctualityRate)}`}>
                      {formatPercent(c.punctualityRate)}
                    </td>
                    <td className="table-cell text-right">
                      {c.complaintCount}
                      {c.complaintRate !== null && (
                        <span className="text-gray-500 text-xs"> ({c.complaintRate}%)</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      {c.averageRating > 0 ? `${c.averageRating}/5` : '—'}
                    </td>                    
                    <td className="table-cell text-right">
                      <span className={`badge ${c.isAvailable ? 'badge-green' : 'badge-gray'}`}>
                        {c.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminCollectorPerformancePage