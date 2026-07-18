import { useState, useEffect } from 'react'
import { Users, Recycle, ShieldCheck, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import api from '../../services/api'

const StatCard = ({ icon: Icon, label, value, color = 'brand', sub }) => (
  <div className="stat-card">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-900/50 text-${color}-400`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-white">{value ?? '—'}</h3>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
)

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard')
        setStats(data.data)
      } catch (error) {
        // handle
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  const recycling = stats?.recycling?.byStatus || {}

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform-wide overview and management.</p>
        </div>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">Users</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Total Users" value={stats?.users?.total} color="blue" />
          <StatCard icon={Users} label="Residents" value={stats?.users?.residents} color="brand" />
          <StatCard icon={Users} label="Collectors" value={stats?.users?.collectors} color="blue" />
          <StatCard icon={Users} label="Partners" value={stats?.users?.partners} color="emerald" sub={`${stats?.partners?.pendingVerification} pending verification`} />
        </div>
      </div>

      {/* Recycling Stats */}
      <div>
        <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">Recycling Requests</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={TrendingUp} label="Total Requests" value={stats?.recycling?.total} color="brand" />
          <StatCard icon={AlertCircle} label="Pending" value={recycling.pending || 0} color="yellow" />
          <StatCard icon={Recycle} label="In Progress" value={(recycling.in_progress || 0) + (recycling.assigned || 0) + (recycling.accepted || 0)} color="blue" />
          <StatCard icon={ShieldCheck} label="Completed" value={recycling.completed || 0} color="brand" />
        </div>
      </div>

      {/* Recent Users */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Recently Joined Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="table-header py-3 px-4">Name</th>
                <th className="table-header py-3 px-4">Email</th>
                <th className="table-header py-3 px-4">Role</th>
                <th className="table-header py-3 px-4">Joined</th>
                <th className="table-header py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentUsers?.map(u => (
                <tr key={u._id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="table-cell font-medium text-white">{u.name}</td>
                  <td className="table-cell">{u.email}</td>
                  <td className="table-cell">
                    <span className={`badge capitalize ${
                      u.role === 'admin' ? 'badge-red' :
                      u.role === 'collector' ? 'badge-blue' :
                      u.role === 'partner' ? 'badge-yellow' :
                      'badge-green'
                    }`}>{u.role}</span>
                  </td>
                  <td className="table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="table-cell">
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
