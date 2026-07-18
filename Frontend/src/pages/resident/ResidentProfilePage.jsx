import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save, Plus, Trash2, Home, MapPin, Loader2, User } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const ResidentProfilePage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [serviceAreas, setServiceAreas] = useState([])

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    householdType: 'house',
    preferredWasteCategories: []
  })

  // New Address State
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    street: '',
    area: '',
    city: 'Dhaka',
    postalCode: '',
    serviceArea: '',
    isDefault: false
  })

  const wasteCategoriesList = [
    'organic', 'plastic', 'paper', 'glass', 'metal', 'electronic', 'hazardous'
  ]

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/residents/profile')
      setProfile(data.data.profile)
      setFormData({
        name: data.data.profile.user.name,
        phone: data.data.profile.user.phone || '',
        householdType: data.data.profile.householdType,
        preferredWasteCategories: data.data.profile.preferredWasteCategories || []
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
      await api.put('/residents/profile', formData)
      toast.success('Profile updated successfully')
      fetchProfile()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategoryToggle = (category) => {
    setFormData(prev => {
      const isSelected = prev.preferredWasteCategories.includes(category)
      if (isSelected) {
        return {
          ...prev,
          preferredWasteCategories: prev.preferredWasteCategories.filter(c => c !== category)
        }
      } else {
        return {
          ...prev,
          preferredWasteCategories: [...prev.preferredWasteCategories, category]
        }
      }
    })
  }

  const handleAddAddress = async (e) => {
    e.preventDefault()
    try {
      await api.post('/residents/addresses', newAddress)
      toast.success('Address added successfully')
      setIsAddingAddress(false)
      setNewAddress({
        label: 'Home', street: '', area: '', city: 'Dhaka', postalCode: '', serviceArea: '', isDefault: false
      })
      fetchProfile()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add address')
    }
  }

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      await api.delete(`/residents/addresses/${addressId}`)
      toast.success('Address deleted')
      fetchProfile()
    } catch (error) {
      toast.error('Failed to delete address')
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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Profile Management</h1>
          <p className="page-subtitle">Update your personal details and addresses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Info Form */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-brand-900/50 flex items-center justify-center text-brand-400">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Personal Info</h2>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-5">
            <div>
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="input-label">Email Address (Read Only)</label>
              <input 
                type="email" 
                className="input-field opacity-50 cursor-not-allowed" 
                value={user.email}
                readOnly
              />
            </div>

            <div>
              <label className="input-label">Phone Number</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div>
              <label className="input-label">Household Type</label>
              <select 
                className="select-field"
                value={formData.householdType}
                onChange={e => setFormData({...formData, householdType: e.target.value})}
              >
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="input-label mb-3">Preferred Waste Categories to Recycle</label>
              <div className="flex flex-wrap gap-2">
                {wasteCategoriesList.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      formData.preferredWasteCategories.includes(cat)
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={isSaving} className="btn-primary w-full">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>

        {/* Addresses */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">My Addresses</h2>
              </div>
              <button 
                onClick={() => setIsAddingAddress(!isAddingAddress)}
                className="btn-ghost text-brand-400 hover:text-brand-300"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {isAddingAddress && (
              <form onSubmit={handleAddAddress} className="mb-6 p-4 bg-gray-800 rounded-xl space-y-4 animate-slide-up">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label text-xs">Label</label>
                    <input type="text" className="input-field py-2" placeholder="e.g. Home, Work" value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})} required />
                  </div>
                  <div>
                    <label className="input-label text-xs">Service Area</label>
                    <select className="select-field py-2" value={newAddress.serviceArea} onChange={e => setNewAddress({...newAddress, serviceArea: e.target.value})} required>
                      <option value="">Select Area</option>
                      {serviceAreas.map(sa => (
                        <option key={sa._id} value={sa._id}>{sa.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="input-label text-xs">Street</label>
                    <input type="text" className="input-field py-2" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} required />
                  </div>
                  <div>
                    <label className="input-label text-xs">Area / Thana</label>
                    <input type="text" className="input-field py-2" value={newAddress.area} onChange={e => setNewAddress({...newAddress, area: e.target.value})} required />
                  </div>
                  <div>
                    <label className="input-label text-xs">City</label>
                    <input type="text" className="input-field py-2" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} required />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isDefault" checked={newAddress.isDefault} onChange={e => setNewAddress({...newAddress, isDefault: e.target.checked})} className="rounded bg-gray-700 border-gray-600 text-brand-500 focus:ring-brand-500" />
                  <label htmlFor="isDefault" className="text-sm text-gray-300">Set as default address</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary py-2 px-4 text-sm flex-1">Save Address</button>
                  <button type="button" onClick={() => setIsAddingAddress(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {profile?.addresses?.length === 0 && !isAddingAddress ? (
                <p className="text-gray-500 text-center py-4 text-sm">No addresses added yet.</p>
              ) : (
                profile?.addresses?.map(addr => (
                  <div key={addr._id} className="p-4 rounded-xl border border-gray-800 bg-gray-900 flex items-start justify-between group hover:border-gray-700 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-white">{addr.label}</span>
                        {addr.isDefault && <span className="badge-green ml-2">Default</span>}
                      </div>
                      <p className="text-sm text-gray-400">{addr.street}, {addr.area}, {addr.city}</p>
                      {addr.serviceArea && (
                        <p className="text-xs text-brand-400 mt-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Area: {addr.serviceArea.name}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteAddress(addr._id)}
                      className="text-gray-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResidentProfilePage
