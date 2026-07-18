import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save, Recycle, Loader2, MapPin } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const MATERIAL_TYPES = ['organic', 'plastic', 'paper', 'glass', 'metal', 'electronic', 'hazardous']

const PartnerProfilePage = () => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [serviceAreas, setServiceAreas] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    organizationName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
    acceptedMaterials: [],
    serviceAreas: [],
    operatingHours: {
      open: '08:00',
      close: '17:00',
    },
  })

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/partners/profile')
      const p = data.data.partner
      setFormData({
        name: p.user?.name || '',
        phone: p.user?.phone || '',
        organizationName: p.organizationName || '',
        contactPerson: p.contactPerson || '',
        contactEmail: p.contactEmail || '',
        contactPhone: p.contactPhone || '',
        description: p.description || '',
        acceptedMaterials: p.acceptedMaterials || [],
        serviceAreas: p.serviceAreas?.map(a => a._id) || [],
        operatingHours: p.operatingHours || { open: '08:00', close: '17:00' },
      })
    } catch (error) {
      toast.error('Failed to load profile')
    }
  }

  const fetchServiceAreas = async () => {
    try {
      const { data } = await api.get('/service-areas')
      setServiceAreas(data.data.areas)
    } catch (error) { /* silent */ }
  }

  useEffect(() => {
    Promise.all([fetchProfile(), fetchServiceAreas()]).finally(() => setIsLoading(false))
  }, [])

  const handleMaterialToggle = (material) => {
    setFormData(prev => {
      if (prev.acceptedMaterials.includes(material)) {
        return { ...prev, acceptedMaterials: prev.acceptedMaterials.filter(m => m !== material) }
      }
      return { ...prev, acceptedMaterials: [...prev.acceptedMaterials, material] }
    })
  }

  const handleAreaToggle = (areaId) => {
    setFormData(prev => {
      if (prev.serviceAreas.includes(areaId)) {
        return { ...prev, serviceAreas: prev.serviceAreas.filter(id => id !== areaId) }
      }
      return { ...prev, serviceAreas: [...prev.serviceAreas, areaId] }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.put('/partners/profile', formData)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Partner Profile</h1>
          <p className="page-subtitle">Manage your organization details, accepted materials, and service coverage.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Organization Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-brand-900/50 flex items-center justify-center text-brand-400">
              <Recycle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Organization Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="input-label">Account Name</label>
              <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <label className="input-label">Email (Read Only)</label>
              <input type="email" className="input-field opacity-50 cursor-not-allowed" value={user.email} readOnly />
            </div>
            <div>
              <label className="input-label">Phone Number</label>
              <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="input-label">Organization Name</label>
              <input type="text" className="input-field" value={formData.organizationName} onChange={e => setFormData({...formData, organizationName: e.target.value})} required />
            </div>
            <div>
              <label className="input-label">Contact Person</label>
              <input type="text" className="input-field" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
            </div>
            <div>
              <label className="input-label">Contact Email</label>
              <input type="email" className="input-field" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} />
            </div>
            <div>
              <label className="input-label">Contact Phone</label>
              <input type="text" className="input-field" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Description</label>
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="Brief description of your organization and recycling capabilities..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div>
              <label className="input-label">Operating Hours — Open</label>
              <input type="time" className="input-field" value={formData.operatingHours.open} onChange={e => setFormData({...formData, operatingHours: {...formData.operatingHours, open: e.target.value}})} />
            </div>
            <div>
              <label className="input-label">Operating Hours — Close</label>
              <input type="time" className="input-field" value={formData.operatingHours.close} onChange={e => setFormData({...formData, operatingHours: {...formData.operatingHours, close: e.target.value}})} />
            </div>
          </div>
        </div>

        {/* Materials */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Accepted Materials</h2>
          <div className="flex flex-wrap gap-3">
            {MATERIAL_TYPES.map(mat => (
              <button
                key={mat}
                type="button"
                onClick={() => handleMaterialToggle(mat)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                  formData.acceptedMaterials.includes(mat)
                    ? 'bg-brand-600 border border-brand-500 text-white shadow-lg shadow-brand-900/30'
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
          {formData.acceptedMaterials.length === 0 && (
            <p className="text-xs text-yellow-500 mt-3">⚠ Select at least one material type you accept.</p>
          )}
        </div>

        {/* Service Areas */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Service Coverage Areas</h2>
          </div>
          {serviceAreas.length === 0 ? (
            <p className="text-sm text-gray-500">No service areas available. Contact the admin to create them.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {serviceAreas.map(area => (
                <button
                  key={area._id}
                  type="button"
                  onClick={() => handleAreaToggle(area._id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    formData.serviceAreas.includes(area._id)
                      ? 'bg-blue-700 border border-blue-500 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  {area.name} — {area.city}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <button type="submit" disabled={isSaving} className="btn-primary w-full md:w-auto">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Profile</>}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PartnerProfilePage
