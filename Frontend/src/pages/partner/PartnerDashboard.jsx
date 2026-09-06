import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Recycle,
  ShieldCheck,
  ShieldX,
  Clock,
  Package,
  Loader2,
  MapPin,
  Inbox,
} from 'lucide-react'
import api from '../../services/api'

const PartnerDashboard = () => {
  const [profile, setProfile] = useState(null)
  const [available, setAvailable] = useState([])
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const fetchAll = async () => {
    const [profileRes, ownRes, availableRes] = await Promise.all([
      api.get('/partners/profile'),
      api.get('/partners/requests?limit=20'),
      // The available pool is only meaningful for verified partners; the
      // endpoint returns 403 otherwise, so we swallow that case.
      api
        .get('/partners/requests/available?limit=20')
        .catch(() => ({ data: { data: { requests: [] } } })),
    ])

    setProfile(profileRes.data.data.partner)
    setRequests(ownRes.data.data.requests)
    setAvailable(availableRes.data.data.requests || [])
  }

  useEffect(() => {
    const load = async () => {
      try {
        await fetchAll()
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to load dashboard'
        )
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const refresh = async () => {
    try {
      await fetchAll()
    } catch (error) {
      // non-fatal on refresh
    }
  }

  const handleClaim = async (requestId) => {
    setBusyId(requestId)
    try {
      await api.patch(`/partners/requests/${requestId}/claim`)
      toast.success('Request claimed')
      await refresh()
    } catch (error) {
      // 409 = another partner beat us to it.
      toast.error(
        error.response?.data?.message || 'Failed to claim request'
      )
      // Refresh so the now-claimed request disappears from the pool.
      await refresh()
    } finally {
      setBusyId('')
    }
  }

  const handleUpdateStatus = async (requestId, status) => {
    setBusyId(requestId)
    try {
      await api.patch(`/partners/requests/${requestId}/status`, { status })
      toast.success(`Request updated`)
      await refresh()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update status'
      )
    } finally {
      setBusyId('')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  const isVerified = profile?.isVerified

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Partner Dashboard</h1>
          <p className="page-subtitle">
            Manage recycling requests for {profile?.organizationName}.
          </p>
        </div>
        {profile && (
          <div
            className={`badge ${
              isVerified ? 'badge-green' : 'badge-yellow'
            } text-sm px-4 py-2`}
          >
            {isVerified ? (
              <>
                <ShieldCheck className="w-4 h-4" /> Verified Partner
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" /> Pending Verification
              </>
            )}
          </div>
        )}
      </div>

      {!isVerified && (
        <div className="p-4 rounded-xl border border-yellow-800/50 bg-yellow-900/20 text-yellow-300 flex items-start gap-3">
          <ShieldX className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">Account pending verification</p>
            <p className="text-sm text-yellow-400/80">
              Your account is waiting for admin approval. Once verified, new
              recycling requests in your service areas will appear here for you
              to accept.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-900/40 flex items-center justify-center text-yellow-400">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">
                Available in Your Area
              </p>
              <h3 className="text-2xl font-bold text-white">
                {available.length}
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
                {
                  requests.filter((r) =>
                    ['accepted', 'in_progress'].includes(r.status)
                  ).length
                }
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
                {requests.filter((r) => r.status === 'completed').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Available pool */}
      {isVerified && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Available Requests
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Open requests in your service areas. First to accept gets the
                job.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {available.length} available
            </span>
          </div>

          {available.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">
                No open requests in your area right now.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {available.map((req) => (
                <div
                  key={req._id}
                  className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-white">
                        {new Date(req.preferredDate).toLocaleDateString()}
                      </span>
                      <span className="badge badge-yellow capitalize">
                        pending
                      </span>
                      {req.serviceArea?.name && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {req.serviceArea.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-300">Items: </span>
                      {req.materials
                        .map(
                          (m) => `${m.category} (${m.estimatedQuantity}kg)`
                        )
                        .join(', ')}
                    </p>
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-300">Address: </span>
                      {req.pickupAddress.street}, {req.pickupAddress.area},{' '}
                      {req.pickupAddress.city}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <button
                      disabled={busyId === req._id}
                      onClick={() => handleClaim(req._id)}
                      className="px-4 py-2 bg-brand-700 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                      {busyId === req._id ? 'Accepting...' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claimed / own requests */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Your Requests</h2>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Recycle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">
              You have not accepted any requests yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req._id}
                className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-white">
                      {new Date(req.preferredDate).toLocaleDateString()}
                    </span>
                    <span
                      className={`badge capitalize ${
                        req.status === 'completed'
                          ? 'badge-green'
                          : req.status === 'in_progress' ||
                            req.status === 'accepted'
                          ? 'badge-blue'
                          : req.status === 'pending'
                          ? 'badge-yellow'
                          : 'badge-red'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    <span className="text-gray-300">Items: </span>
                    {req.materials
                      .map((m) => `${m.category} (${m.estimatedQuantity}kg)`)
                      .join(', ')}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="text-gray-300">Address: </span>
                    {req.pickupAddress.street}, {req.pickupAddress.area},{' '}
                    {req.pickupAddress.city}
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
                  {req.status === 'accepted' && (
                    <>
                      <button
                        disabled={busyId === req._id}
                        onClick={() =>
                          handleUpdateStatus(req._id, 'in_progress')
                        }
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        Start Pickup
                      </button>
                      <button
                        disabled={busyId === req._id}
                        onClick={() =>
                          handleUpdateStatus(req._id, 'rejected')
                        }
                        className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-sm rounded-lg transition-colors font-medium border border-red-800/50 disabled:opacity-50"
                      >
                        Release
                      </button>
                    </>
                  )}
                  {req.status === 'in_progress' && (
                    <button
                      disabled={busyId === req._id}
                      onClick={() =>
                        handleUpdateStatus(req._id, 'completed')
                      }
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors font-medium disabled:opacity-50"
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
