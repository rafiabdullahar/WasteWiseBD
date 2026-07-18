import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save, Truck, Loader2 } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const CollectorProfilePage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [serviceAreas, setServiceAreas] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    employeeId: '',
    vehicleType: 'truck',
    vehicleNumber: '',
    workSchedule: '',
    isAvailable: true,
    serviceAreas: []
  })

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/collectors/profile')
      const p = data.data.profile
      setProfile(p)
      setFormData({
        name: p.user.name,
        phone: p.user.phone || '',
        employeeId: p.employeeId || '',
        vehicleType: p.vehicleType || 'truck',
        vehicleNumber: p.vehicleNumber || '',
        workSchedule: p.workSchedule || '',
        isAvailable: p.isAvailable,
        serviceAreas: p.serviceAreas.map(a => a._id)
      })
    } catch (error) {
      toast.error('Failed to load profile')
    }
  }

  const fetchServiceAreas = async () => {
    try {
      const { data } = await api.get('/service-areas')
      setServiceAreas(data.data.areas)
    } catch (error) {
      // toast.error('Failed to load service areas')
    }
  }

  useEffect(() => {
    Promise.all([fetchProfile(), fetchServiceAreas()]).finally(() => setIsLoading(false))
  }, [])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.put('/collectors/profile', formData)
      toast.success('Profile updated successfully')
      fetchProfile()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAreaToggle = (areaId) => {
    setFormData(prev => {
      const areas = prev.serviceAreas
      if (areas.includes(areaId)) {
        return { ...prev, serviceAreas: areas.filter(id => id !== areaId) }
      } else {
        return { ...prev, serviceAreas: [...areas, areaId] }
      }
    })
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Collector Profile</h1>
          <p className="page-subtitle">Manage your work details, vehicle, and service areas.</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-900/50 flex items-center justify-center text-brand-400">
            <Truck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-white">Professional Details</h2>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="input-label">Full Name</label>
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
              <label className="input-label">Employee ID</label>
              <input type="text" className="input-field" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} placeholder="Optional" />
            </div>

            <div>
              <label className="input-label">Vehicle Type</label>
              <select className="select-field" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="rickshaw">Rickshaw</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="input-label">Vehicle Number</label>
              <input type="text" className="input-field" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="e.g. DHK-1234" />
            </div>

            <div className="md:col-span-2">
              <label className="input-label">Work Schedule</label>
              <input type="text" className="input-field" value={formData.workSchedule} onChange={e => setFormData({...formData, workSchedule: e.target.value})} placeholder="e.g. Mon-Fri, 8am-4pm" />
            </div>

            <div className="md:col-span-2">
              <label className="input-label mb-3">Assigned Service Areas</label>
              {serviceAreas.length === 0 ? (
                <p className="text-sm text-gray-500">No service areas available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map(area => (
                    <button
                      key={area._id}
                      type="button"
                      onClick={() => handleAreaToggle(area._id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        formData.serviceAreas.includes(area._id)
                          ? 'bg-brand-600 border border-brand-500 text-white shadow-lg shadow-brand-900/30'
                          : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                      }`}
                    >
                      {area.name} ({area.city})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="isAvailable" 
                checked={formData.isAvailable} 
                onChange={e => setFormData({...formData, isAvailable: e.target.checked})} 
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-brand-500 focus:ring-brand-500" 
              />
              <label htmlFor="isAvailable" className="font-medium text-white">I am currently available for new assignments</label>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800">
            <button type="submit" disabled={isSaving} className="btn-primary w-full md:w-auto">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Profile</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CollectorProfilePage
