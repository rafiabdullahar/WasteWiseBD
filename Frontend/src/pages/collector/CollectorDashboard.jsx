import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Star, Truck } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const CollectorDashboard = () => {
  const { user } = useAuth()
  const [performance, setPerformance] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const { data } = await api.get('/collectors/performance')
        setPerformance(data.data.performance)
      } catch (error) {
        // handle error
      } finally {
        setIsLoading(false)
      }
    }
    fetchPerformance()
  }, [])

  if (isLoading) return null

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Collector Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}. Here is your performance overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/50 flex items-center justify-center text-brand-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed</p>
              <h3 className="text-2xl font-bold text-white">{performance?.totalCompleted || 0}</h3>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-900/50 flex items-center justify-center text-red-400">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Failed</p>
              <h3 className="text-2xl font-bold text-white">{performance?.totalFailed || 0}</h3>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center text-blue-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Success Rate</p>
              <h3 className="text-2xl font-bold text-white">{performance?.successRate || '0.0%'}</h3>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-900/50 flex items-center justify-center text-yellow-400">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Avg Rating</p>
              <h3 className="text-2xl font-bold text-white">{performance?.averageRating || 0}/5</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Today's Assigned Tasks</h2>
        <div className="text-center py-12">
          <p className="text-gray-500">Waste collection task management is coming in a future update.</p>
        </div>
      </div>
    </div>
  )
}

export default CollectorDashboard
