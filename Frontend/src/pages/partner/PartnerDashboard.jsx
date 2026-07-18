import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Recycle, ShieldCheck, ShieldX, Clock, Package, Loader2 } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const PartnerDashboard = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, reqRes] = await Promise.all([
          api.get('/partners/profile'),
          api.get('/partners/requests?limit=10')
        ])
        setProfile(profileRes.data.data.partner)
        setRequests(reqRes.data.data.requests)
      } catch (error) {
        // handle silently
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleUpdateStatus = async (requestId, status) => {
    try {
      await api.patch(`/partners/requests/${requestId}/status`, { status })
      toast.success(`Request ${status} successfully`)
      // Refresh
      const { data } = await api.get('/partners/requests?limit=10')
      setRequests(data.data.requests)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Partner Dashboard</h1>
          <p className="page-subtitle">Manage incoming recycling requests for {profile?.organizationName}.</p>
        </div>
        {profile && (
          <div className={`badge ${profile.isVerified ? 'badge-green' : 'badge-yellow'} text-sm px-4 py-2`}>
            {profile.isVerified ? (
              <><ShieldCheck className="w-4 h-4" /> Verified Partner</>
            ) : (
              <><Clock className="w-4 h-4" /> Pending Verification</>
            )}
          </div>
        )}
      </div>

      {!profile?.isVerified && (
        <div className="p-4 rounded-xl border border-yellow-800/50 bg-yellow-900/20 text-yellow-300 flex items-start gap-3">
          <ShieldX className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">Account pending verification</p>
            <p className="text-sm text-yellow-400/80">
              Your account is waiting for admin approval. You will be notified once verified and can then accept recycling requests.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-900/40 flex items-center justify-center text-yellow-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Pending</p>
              <h3 className="text-2xl font-bold text-white">
                {requests.filter(r => r.status === 'assigned').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900/40 flex items-center justify-center text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">In Progress</p>
              <h3 className="text-2xl font-bold text-white">
                {requests.filter(r => ['accepted', 'in_progress'].includes(r.status)).length}
              </h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/40 flex items-center justify-center text-brand-400">
              <Recycle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed</p>
              <h3 className="text-2xl font-bold text-white">
                {requests.filter(r => r.status === 'completed').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Recycling Requests</h2>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Recycle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No recycling requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req._id} className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-white">
                      {new Date(req.preferredDate).toLocaleDateString()}
                    </span>
                    <span className={`badge capitalize ${
                      req.status === 'completed' ? 'badge-green' :
                      req.status === 'assigned' ? 'badge-yellow' :
                      req.status === 'in_progress' || req.status === 'accepted' ? 'badge-blue' :
                      'badge-red'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    <span className="text-gray-300">Items: </span>
                    {req.materials.map(m => `${m.category} (${m.estimatedQuantity}kg)`).join(', ')}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="text-gray-300">Address: </span>
                    {req.pickupAddress.street}, {req.pickupAddress.area}, {req.pickupAddress.city}
                  </p>
                  {req.resident && (
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-300">Resident: </span>
                      {req.resident.name}
                    </p>
                  )}
                </div>

                {/* Action buttons based on status */}
                <div className="flex gap-2 shrink-0">
                  {req.status === 'assigned' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(req._id, 'accepted')}
                        className="px-4 py-2 bg-brand-700 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(req._id, 'rejected')}
                        className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-sm rounded-lg transition-colors font-medium border border-red-800/50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {req.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(req._id, 'in_progress')}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      Start Pickup
                    </button>
                  )}
                  {req.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(req._id, 'completed')}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PartnerDashboard
