import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Recycle, ArrowRight, Award, History, Clock } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const ResidentDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    rewardPoints: 0,
    activeRequests: 0,
    completedRequests: 0,
  })
  const [recentRequests, setRecentRequests] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, recyclingRes] = await Promise.all([
          api.get('/residents/profile'),
          api.get('/recycling?limit=5')
        ])
        
        const profile = profileRes.data.data.profile
        const requests = recyclingRes.data.data.requests

        setStats({
          rewardPoints: profile.totalRewardPoints,
          activeRequests: requests.filter(r => ['pending', 'assigned', 'accepted', 'in_progress'].includes(r.status)).length,
          completedRequests: requests.filter(r => r.status === 'completed').length
        })
        setRecentRequests(requests)
      } catch (error) {
        // Handle error silently or show toast
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name.split(' ')[0]}!</h1>
          <p className="page-subtitle">Here's what's happening with your waste management today.</p>
        </div>
        <Link to="/resident/recycling" className="btn-primary shrink-0">
          <Recycle className="w-5 h-5" />
          Schedule Pickup
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/50 flex items-center justify-center text-brand-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Reward Points</p>
              <h3 className="text-2xl font-bold text-white">{stats.rewardPoints}</h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Active Requests</p>
              <h3 className="text-2xl font-bold text-white">{stats.activeRequests}</h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed Recycles</p>
              <h3 className="text-2xl font-bold text-white">{stats.completedRequests}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Recent Recycling Requests</h2>
          <Link to="/resident/recycling" className="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
              <Recycle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No requests yet</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              Start recycling and earning green rewards by scheduling your first pickup.
            </p>
            <Link to="/resident/recycling" className="btn-secondary">
              Schedule Pickup
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header py-3 px-4">Date</th>
                  <th className="table-header py-3 px-4">Items</th>
                  <th className="table-header py-3 px-4">Partner</th>
                  <th className="table-header py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map(req => (
                  <tr key={req._id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="table-cell">
                      {new Date(req.preferredDate).toLocaleDateString()}
                      <span className="block text-xs text-gray-500 capitalize">{req.preferredTimeSlot}</span>
                    </td>
                    <td className="table-cell max-w-[200px] truncate">
                      {req.materials.map(m => m.category).join(', ')}
                    </td>
                    <td className="table-cell">
                      {req.partner ? req.partner.organizationName : <span className="text-gray-500 italic">Finding partner...</span>}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        ['completed'].includes(req.status) ? 'badge-green' :
                        ['pending', 'assigned'].includes(req.status) ? 'badge-yellow' :
                        ['rejected', 'cancelled'].includes(req.status) ? 'badge-red' :
                        'badge-blue'
                      } capitalize`}>
                        {req.status.replace('_', ' ')}
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

export default ResidentDashboard
