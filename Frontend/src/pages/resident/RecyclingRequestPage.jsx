import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Recycle, Loader2, MapPin, Calendar, Clock, Trash2 } from 'lucide-react'
import api from '../../services/api'

const VALID_MATERIALS = ['organic', 'plastic', 'paper', 'glass', 'metal', 'electronic', 'hazardous']

const RecyclingRequestPage = () => {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Data for dropdowns
  const [addresses, setAddresses] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])

  // Form state
  const [formData, setFormData] = useState({
    addressId: '', // To auto-fill pickupAddress and serviceArea
    preferredDate: '',
    preferredTimeSlot: 'morning',
    notes: '',
    materials: [{ category: 'plastic', estimatedQuantity: 1 }]
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const [reqRes, profileRes, areasRes] = await Promise.all([
        api.get('/recycling'),
        api.get('/residents/profile'),
        api.get('/service-areas')
      ])
      setRequests(reqRes.data.data.requests)
      setAddresses(profileRes.data.data.profile.addresses)
      setServiceAreas(areasRes.data.data.areas)

      // Auto-select default address if exists
      const defaultAddr = profileRes.data.data.profile.addresses.find(a => a.isDefault)
      if (defaultAddr) {
        setFormData(prev => ({ ...prev, addressId: defaultAddr._id }))
      }
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { category: 'paper', estimatedQuantity: 1 }]
    }))
  }

  const handleRemoveMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }))
  }

  const handleMaterialChange = (index, field, value) => {
    setFormData(prev => {
      const newMaterials = [...prev.materials]
      newMaterials[index][field] = value
      return { ...prev, materials: newMaterials }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.addressId) {
      return toast.error('Please select a pickup address')
    }

    const selectedAddr = addresses.find(a => a._id === formData.addressId)
    if (!selectedAddr || !selectedAddr.serviceArea) {
      return toast.error('Selected address does not have a valid service area assigned.')
    }

    const payload = {
      pickupAddress: {
        street: selectedAddr.street,
        area: selectedAddr.area,
        city: selectedAddr.city,
        postalCode: selectedAddr.postalCode
      },
      serviceArea: selectedAddr.serviceArea._id || selectedAddr.serviceArea,
      materials: formData.materials,
      preferredDate: formData.preferredDate,
      preferredTimeSlot: formData.preferredTimeSlot,
      notes: formData.notes
    }

    setIsSubmitting(true)
    try {
      await api.post('/recycling', payload)
      toast.success('Recycling request submitted successfully')
      setIsFormOpen(false)
      
      // Reset form (keep address)
      setFormData(prev => ({
        ...prev,
        preferredDate: '',
        notes: '',
        materials: [{ category: 'plastic', estimatedQuantity: 1 }]
      }))

      // Refresh list
      const { data } = await api.get('/recycling')
      setRequests(data.data.requests)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Recycling Pickups</h1>
          <p className="page-subtitle">Schedule and track your recycling collections.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)} 
          className="btn-primary shrink-0"
        >
          {isFormOpen ? 'Cancel Request' : <><Plus className="w-5 h-5" /> New Request</>}
        </button>
      </div>

      {isFormOpen && (
        <div className="card border-brand-500/30 animate-slide-up">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
            <div className="w-10 h-10 rounded-full bg-brand-900/50 flex items-center justify-center text-brand-400">
              <Recycle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Schedule New Pickup</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Col: Logistics */}
              <div className="space-y-5">
                <div>
                  <label className="input-label flex items-center gap-2"><MapPin className="w-4 h-4"/> Pickup Address</label>
                  {addresses.length === 0 ? (
                    <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm">
                      Please add an address in your Profile first.
                    </div>
                  ) : (
                    <select 
                      className="select-field" 
                      required
                      value={formData.addressId}
                      onChange={e => setFormData({...formData, addressId: e.target.value})}
                    >
                      <option value="">Select Address...</option>
                      {addresses.map(addr => (
                        <option key={addr._id} value={addr._id}>
                          {addr.label} — {addr.street}, {addr.area}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label flex items-center gap-2"><Calendar className="w-4 h-4"/> Date</label>
                    <input 
                      type="date" 
                      required 
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field" 
                      value={formData.preferredDate}
                      onChange={e => setFormData({...formData, preferredDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="input-label flex items-center gap-2"><Clock className="w-4 h-4"/> Time Slot</label>
                    <select 
                      className="select-field" 
                      value={formData.preferredTimeSlot}
                      onChange={e => setFormData({...formData, preferredTimeSlot: e.target.value})}
                    >
                      <option value="morning">Morning (8am - 12pm)</option>
                      <option value="afternoon">Afternoon (12pm - 4pm)</option>
                      <option value="evening">Evening (4pm - 8pm)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Additional Notes (Optional)</label>
                  <textarea 
                    className="input-field min-h-[100px] resize-none" 
                    placeholder="E.g. Call upon arrival, items are in the garage..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              {/* Right Col: Materials */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <label className="input-label !mb-0">Materials to Recycle</label>
                  <button type="button" onClick={handleAddMaterial} className="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4"/> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.materials.map((mat, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <select 
                          className="select-field py-2 text-sm"
                          value={mat.category}
                          onChange={e => handleMaterialChange(idx, 'category', e.target.value)}
                        >
                          {VALID_MATERIALS.map(cat => <option key={cat} value={cat} className="capitalize">{cat}</option>)}
                        </select>
                      </div>
                      <div className="w-24 relative">
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0.1" 
                          required
                          className="input-field py-2 text-sm pr-8"
                          value={mat.estimatedQuantity}
                          onChange={e => handleMaterialChange(idx, 'estimatedQuantity', e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">kg</span>
                      </div>
                      {formData.materials.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveMaterial(idx)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <button type="submit" disabled={isSubmitting || addresses.length === 0} className="btn-primary w-full">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Submit Request'}
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* Requests History List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Your Requests</h2>
        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recycling requests found.</p>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req._id} className="p-5 border border-gray-800 rounded-xl bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-medium">
                      {new Date(req.preferredDate).toLocaleDateString()}
                    </span>
                    <span className={`badge ${
                      ['completed'].includes(req.status) ? 'badge-green' :
                      ['pending', 'assigned'].includes(req.status) ? 'badge-yellow' :
                      ['rejected', 'cancelled'].includes(req.status) ? 'badge-red' :
                      'badge-blue'
                    } capitalize`}>
                      {req.status.replace('_', ' ')}
                    </span>
                    {req.rewardPointsEarned > 0 && (
                      <span className="badge badge-green flex gap-1"><Award className="w-3 h-3"/> +{req.rewardPointsEarned} pts</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-1">
                    <span className="text-gray-300 font-medium">Items:</span> {req.materials.map(m => `${m.category} (${m.estimatedQuantity}kg)`).join(', ')}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="text-gray-300 font-medium">Address:</span> {req.pickupAddress.street}, {req.pickupAddress.area}
                  </p>
                </div>
                <div className="md:text-right border-t border-gray-800 md:border-0 pt-3 md:pt-0">
                  <p className="text-sm text-gray-400 mb-1">Partner Assigned</p>
                  <p className="font-medium text-white">
                    {req.partner ? req.partner.organizationName : 'Pending Assignment'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default RecyclingRequestPage
