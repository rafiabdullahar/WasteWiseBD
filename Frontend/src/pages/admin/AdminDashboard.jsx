import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  Recycle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Star,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import api from '../../services/api'

const CARD_STYLES = {
  brand: 'bg-brand-900/50 text-brand-400',
  blue: 'bg-blue-900/50 text-blue-400',
  yellow: 'bg-yellow-900/50 text-yellow-400',
  emerald: 'bg-emerald-900/50 text-emerald-400',
  red: 'bg-red-900/50 text-red-400',
  purple: 'bg-purple-900/50 text-purple-400',
}

const StatCard = ({ icon: Icon, label, value, color = 'brand', sub }) => (
  <div className="stat-card">
    <div className="flex items-center gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          CARD_STYLES[color] || CARD_STYLES.brand
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <h3 className="text-2xl font-bold text-white">{value ?? '—'}</h3>
        {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  </div>
)

const formatNumber = (value) => Number(value || 0).toLocaleString()
const formatKg = (value) => `${Number(value || 0).toLocaleString()} kg`
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`

const formatMonth = (year, month) =>
  new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

const EmptyRow = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
      {message}
    </td>
  </tr>
)

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data } = await api.get('/admin/dashboard')
      setStats(data.data)
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Could not load dashboard information. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-900/60">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              Dashboard unavailable
            </h2>
            <p className="mt-2 text-gray-400">{error}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const users = stats?.users || {}
  const partners = stats?.partners || {}
  const collectors = stats?.collectors || {}
  const recycling = stats?.recycling || {}
  const operations = stats?.operations || {}
  const recyclingByStatus = recycling.byStatus || {}
  const topPerformers = collectors.topPerformers || []
  const materialBreakdown = recycling.materialBreakdown || []
  const monthlyTrend = recycling.monthlyTrend || []
  const recentUsers = stats?.recentUsers || []

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Real-time platform, recycling and collector performance overview.
          </p>
        </div>

        <button type="button" className="btn-secondary" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section>
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-gray-400">
          Platform overview
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={formatNumber(users.total)}
            color="blue"
            sub={`${formatNumber(users.inactive)} inactive account(s)`}
          />
          <StatCard
            icon={UserCheck}
            label="Active Users"
            value={formatNumber(users.active)}
            color="brand"
            sub={`${formatNumber(users.residents)} residents`}
          />
          <StatCard
            icon={Truck}
            label="Available Collectors"
            value={formatNumber(collectors.available)}
            color="purple"
            sub={`${formatNumber(collectors.unavailable)} unavailable`}
          />
          <StatCard
            icon={ShieldCheck}
            label="Verified Partners"
            value={formatNumber(partners.verified)}
            color="emerald"
            sub={`${formatNumber(partners.pendingVerification)} pending verification`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-gray-400">
          Recycling operations
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Total Requests"
            value={formatNumber(recycling.total)}
            color="brand"
          />
          <StatCard
            icon={Clock3}
            label="Pending Requests"
            value={formatNumber(recycling.pending)}
            color="yellow"
            sub={`${formatNumber(operations.pendingActions)} total pending action(s)`}
          />
          <StatCard
            icon={Activity}
            label="Active Requests"
            value={formatNumber(recycling.active)}
            color="blue"
            sub="Assigned, accepted or in progress"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed Requests"
            value={formatNumber(recycling.completed)}
            color="emerald"
            sub={`${formatNumber(recycling.unsuccessful)} rejected/cancelled`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-gray-400">
          Environmental and operational impact
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Scale}
            label="Completed Recyclables"
            value={formatKg(recycling.completedQuantityKg)}
            color="emerald"
            sub="Estimated quantity from completed requests"
          />
          <StatCard
            icon={Recycle}
            label="Requested Quantity"
            value={formatKg(recycling.totalRequestedQuantityKg)}
            color="brand"
          />
          <StatCard
            icon={CheckCircle2}
            label="Request Completion Rate"
            value={formatPercent(recycling.completionRate)}
            color="blue"
          />
          <StatCard
            icon={Gauge}
            label="Operational Efficiency"
            value={formatPercent(operations.operationalEfficiency)}
            color="purple"
            sub="Average of available completion metrics"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-gray-400">
          Collector performance
        </h2>
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CheckCircle2}
            label="Completed Tasks"
            value={formatNumber(collectors.totalCompleted)}
            color="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Failed Tasks"
            value={formatNumber(collectors.totalFailed)}
            color="red"
          />
          <StatCard
            icon={TrendingUp}
            label="Task Success Rate"
            value={formatPercent(collectors.successRate)}
            color="blue"
          />
          <StatCard
            icon={Star}
            label="Average Rating"
            value={Number(collectors.averageRating || 0).toFixed(2)}
            color="yellow"
            sub="Out of 5"
          />
        </div>

        <div className="card">
          <h3 className="mb-6 text-xl font-semibold text-white">
            Top Collector Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header px-4 py-3">Collector</th>
                  <th className="table-header px-4 py-3">Vehicle</th>
                  <th className="table-header px-4 py-3">Completed</th>
                  <th className="table-header px-4 py-3">Failed</th>
                  <th className="table-header px-4 py-3">Rating</th>
                  <th className="table-header px-4 py-3">Availability</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.length === 0 ? (
                  <EmptyRow
                    colSpan={6}
                    message="No collector performance data available yet."
                  />
                ) : (
                  topPerformers.map((collector) => (
                    <tr
                      key={collector._id}
                      className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/20"
                    >
                      <td className="table-cell">
                        <p className="font-medium text-white">
                          {collector.user?.name || 'Unknown collector'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {collector.employeeId || collector.user?.email || '—'}
                        </p>
                      </td>
                      <td className="table-cell capitalize">
                        {collector.vehicleType || '—'}
                      </td>
                      <td className="table-cell">
                        {formatNumber(collector.totalCompleted)}
                      </td>
                      <td className="table-cell">
                        {formatNumber(collector.totalFailed)}
                      </td>
                      <td className="table-cell">
                        {Number(collector.averageRating || 0).toFixed(2)}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${
                            collector.isAvailable ? 'badge-green' : 'badge-red'
                          }`}
                        >
                          {collector.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="card">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Material Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header px-4 py-3">Material</th>
                  <th className="table-header px-4 py-3">Items</th>
                  <th className="table-header px-4 py-3">Requested</th>
                  <th className="table-header px-4 py-3">Completed</th>
                </tr>
              </thead>
              <tbody>
                {materialBreakdown.length === 0 ? (
                  <EmptyRow
                    colSpan={4}
                    message="No recycling material data available yet."
                  />
                ) : (
                  materialBreakdown.map((item) => (
                    <tr
                      key={item.category}
                      className="border-b border-gray-800/50"
                    >
                      <td className="table-cell capitalize font-medium text-white">
                        {item.category}
                      </td>
                      <td className="table-cell">
                        {formatNumber(item.requestItems)}
                      </td>
                      <td className="table-cell">{formatKg(item.quantityKg)}</td>
                      <td className="table-cell">
                        {formatKg(item.completedQuantityKg)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Six-Month Recycling Trend
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header px-4 py-3">Month</th>
                  <th className="table-header px-4 py-3">Requests</th>
                  <th className="table-header px-4 py-3">Completed</th>
                  <th className="table-header px-4 py-3">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrend.length === 0 ? (
                  <EmptyRow colSpan={4} message="No monthly trend data available yet." />
                ) : (
                  monthlyTrend.map((item) => (
                    <tr
                      key={`${item.year}-${item.month}`}
                      className="border-b border-gray-800/50"
                    >
                      <td className="table-cell font-medium text-white">
                        {formatMonth(item.year, item.month)}
                      </td>
                      <td className="table-cell">
                        {formatNumber(item.totalRequests)}
                      </td>
                      <td className="table-cell">
                        {formatNumber(item.completedRequests)}
                      </td>
                      <td className="table-cell">{formatKg(item.quantityKg)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-6 text-xl font-semibold text-white">
          Recently Joined Users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="table-header px-4 py-3">Name</th>
                <th className="table-header px-4 py-3">Email</th>
                <th className="table-header px-4 py-3">Role</th>
                <th className="table-header px-4 py-3">Joined</th>
                <th className="table-header px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <EmptyRow colSpan={5} message="No users available yet." />
              ) : (
                recentUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/20"
                  >
                    <td className="table-cell font-medium text-white">
                      {user.name}
                    </td>
                    <td className="table-cell">{user.email}</td>
                    <td className="table-cell">
                      <span
                        className={`badge capitalize ${
                          user.role === 'admin'
                            ? 'badge-red'
                            : user.role === 'collector'
                              ? 'badge-blue'
                              : user.role === 'partner'
                                ? 'badge-yellow'
                                : 'badge-green'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          user.isActive ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-right text-xs text-gray-600">
        Last generated:{' '}
        {operations.generatedAt
          ? new Date(operations.generatedAt).toLocaleString()
          : '—'}
      </p>
    </div>
  )
}

export default AdminDashboard
