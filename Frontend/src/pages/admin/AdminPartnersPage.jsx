import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldX, Building2, Loader2, Search } from 'lucide-react'
import api from '../../services/api'

const AdminPartnersPage = () => {
  const [partners, setPartners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVerified, setFilterVerified] = useState('')

  const fetchPartners = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterVerified !== '') params.set('isVerified', filterVerified)
      const { data } = await api.get(`/partners?${params.toString()}`)
      setPartners(data.data.partners)
    } catch (error) {
      toast.error('Failed to load partners')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => fetchPartners(), 400)
    return () => clearTimeout(debounce)
  }, [search, filterVerified])

  const handleToggleVerify = async (partnerId, currentStatus) => {
    try {
      const { data } = await api.patch(`/partners/${partnerId}/verify`)
      toast.success(data.message)
      fetchPartners()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Partner Management</h1>
          <p className="page-subtitle">Verify and manage recycling partner organizations.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="badge badge-yellow">
            {partners.filter(p => !p.isVerified).length} Pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by organization name..."
            className="input-field pl-12"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select-field w-full sm:w-52"
          value={filterVerified}
          onChange={e => setFilterVerified(e.target.value)}
        >
          <option value="">All Partners</option>
          <option value="false">Pending Verification</option>
          <option value="true">Verified</option>
        </select>
      </div>

      {/* Partners Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
      ) : partners.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No partners found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {partners.map(p => (
            <div key={p._id} className="card hover:border-gray-700 transition-colors flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-900/50 flex items-center justify-center text-brand-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className={`badge ${p.isVerified ? 'badge-green' : 'badge-yellow'}`}>
                  {p.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{p.organizationName}</h3>
              {p.user && (
                <p className="text-sm text-gray-400 mb-1">{p.user.name} — {p.user.email}</p>
              )}
              {p.contactPhone && (
                <p className="text-sm text-gray-500">{p.contactPhone}</p>
              )}
              {p.description && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2 flex-1">{p.description}</p>
              )}

              {p.acceptedMaterials?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.acceptedMaterials.map(m => (
                    <span key={m} className="badge badge-gray capitalize">{m}</span>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800">
                <button
                  onClick={() => handleToggleVerify(p._id, p.isVerified)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    p.isVerified
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50'
                      : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/30'
                  }`}
                >
                  {p.isVerified ? (
                    <><ShieldX className="w-4 h-4" /> Revoke Verification</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Verify Partner</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminPartnersPage
