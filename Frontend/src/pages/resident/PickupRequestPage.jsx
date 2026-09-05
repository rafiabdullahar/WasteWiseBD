import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Package,
  Plus,
  Trash2,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react'
import api from '../../services/api'

const WASTE_CATEGORIES = [
  'organic',
  'plastic',
  'paper',
  'glass',
  'metal',
  'electronic',
  'hazardous',
]

const STATUS_STYLES = {
  pending: 'badge-yellow',
  assigned: 'badge-blue',
  on_the_way: 'badge-blue',
  collected: 'badge-green',
  failed: 'badge-red',
  cancelled: 'badge-red',
}

const createInitialForm = () => ({
  addressId: '',
  preferredDate: '',
  preferredTimeSlot: 'morning',
  notes: '',
  wasteItems: [
    {
      category: 'organic',
      estimatedQuantity: 1,
    },
  ],
})

const getLocalToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const PickupRequestPage = () => {
  const [requests, setRequests] = useState([])
  const [addresses, setAddresses] = useState([])
  const [formData, setFormData] = useState(createInitialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === formData.addressId),
    [addresses, formData.addressId]
  )

  const fetchRequests = async () => {
    const { data } = await api.get('/residents/pickup-requests')
    setRequests(data?.data?.requests || [])
  }

  const fetchInitialData = async () => {
    setIsLoading(true)

    try {
      const [requestsResponse, profileResponse] = await Promise.all([
        api.get('/residents/pickup-requests'),
        api.get('/residents/profile'),
      ])

      const profile =
        profileResponse?.data?.data?.profile || {}
      const profileAddresses = profile.addresses || []

      setRequests(
        requestsResponse?.data?.data?.requests || []
      )
      setAddresses(profileAddresses)

      const defaultAddress =
        profileAddresses.find((address) => address.isDefault) ||
        profileAddresses[0]

      if (defaultAddress) {
        setFormData((previous) => ({
          ...previous,
          addressId: defaultAddress._id,
        }))
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to load pickup request data'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  const updateWasteItem = (index, field, value) => {
    setFormData((previous) => {
      const wasteItems = previous.wasteItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )

      return {
        ...previous,
        wasteItems,
      }
    })
  }

  const addWasteItem = () => {
    const usedCategories = new Set(
      formData.wasteItems.map((item) => item.category)
    )
    const nextCategory =
      WASTE_CATEGORIES.find(
        (category) => !usedCategories.has(category)
      ) || 'organic'

    setFormData((previous) => ({
      ...previous,
      wasteItems: [
        ...previous.wasteItems,
        {
          category: nextCategory,
          estimatedQuantity: 1,
        },
      ],
    }))
  }

  const removeWasteItem = (index) => {
    setFormData((previous) => ({
      ...previous,
      wasteItems: previous.wasteItems.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.addressId) {
      toast.error('Please select a pickup address')
      return
    }

    if (!selectedAddress?.serviceArea) {
      toast.error(
        'The selected address is not connected to a service area'
      )
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        addressId: formData.addressId,
        preferredDate: formData.preferredDate,
        preferredTimeSlot: formData.preferredTimeSlot,
        notes: formData.notes,
        wasteItems: formData.wasteItems.map((item) => ({
          category: item.category,
          estimatedQuantity: Number(item.estimatedQuantity),
        })),
      }

      const { data } = await api.post(
        '/residents/pickup-requests',
        payload
      )

      toast.success(
        data?.message || 'Pickup request submitted successfully'
      )

      const retainedAddressId = formData.addressId
      setFormData({
        ...createInitialForm(),
        addressId: retainedAddressId,
      })
      setIsFormOpen(false)
      await fetchRequests()
    } catch (error) {
      const validationErrors = error.response?.data?.error
      const firstValidationMessage =
        validationErrors &&
        typeof validationErrors === 'object'
          ? Object.values(validationErrors)[0]
          : null

      toast.error(
        firstValidationMessage ||
          error.response?.data?.message ||
          'Failed to submit pickup request'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async (requestId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this pickup request?'
    )

    if (!confirmed) return

    setCancellingId(requestId)

    try {
      await api.patch(
        `/residents/pickup-requests/${requestId}/cancel`
      )
      toast.success('Pickup request cancelled')
      await fetchRequests()
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to cancel pickup request'
      )
    } finally {
      setCancellingId('')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Waste Pickup Requests</h1>
          <p className="page-subtitle">
            Schedule household waste collection and track every request.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => setIsFormOpen((current) => !current)}
        >
          {isFormOpen ? (
            <>
              <XCircle className="w-5 h-5" />
              Close Form
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              New Request
            </>
          )}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Schedule New Waste Pickup
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              The system will automatically select an available collector
              from the chosen service area.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="input-label">Pickup Address</label>

                {addresses.length === 0 ? (
                  <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-4 text-sm text-yellow-200">
                    Add an address from your Profile before creating a
                    pickup request.
                  </div>
                ) : (
                  <select
                    required
                    className="select-field"
                    value={formData.addressId}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        addressId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select an address</option>
                    {addresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {address.label || 'Address'} — {address.street},{' '}
                        {address.area}
                      </option>
                    ))}
                  </select>
                )}

                {selectedAddress && (
                  <div className="mt-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-brand-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-white">
                          {selectedAddress.street}, {selectedAddress.area},{' '}
                          {selectedAddress.city}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Service area:{' '}
                          {selectedAddress.serviceArea?.name ||
                            (selectedAddress.serviceArea
                              ? 'Assigned'
                              : 'Not assigned')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Preferred Date</label>
                  <div className="relative">
                    <Calendar className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={getLocalToday()}
                      className="input-field pl-10"
                      value={formData.preferredDate}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          preferredDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Time Slot</label>
                  <div className="relative">
                    <Clock className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      className="select-field pl-10"
                      value={formData.preferredTimeSlot}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          preferredTimeSlot: event.target.value,
                        }))
                      }
                    >
                      <option value="morning">
                        Morning (8 AM – 12 PM)
                      </option>
                      <option value="afternoon">
                        Afternoon (12 PM – 4 PM)
                      </option>
                      <option value="evening">
                        Evening (4 PM – 8 PM)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="input-label">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="input-field min-h-28 resize-y"
                  maxLength={500}
                  placeholder="Gate number, access instructions, or other details"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {formData.notes.length}/500
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-white">Waste Items</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Add each waste category and estimated weight.
                  </p>
                </div>

                <button
                  type="button"
                  className="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                  disabled={
                    formData.wasteItems.length >= WASTE_CATEGORIES.length
                  }
                  onClick={addWasteItem}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {formData.wasteItems.map((item, index) => (
                  <div
                    key={`${item.category}-${index}`}
                    className="flex gap-2 items-start"
                  >
                    <select
                      required
                      className="select-field py-2 text-sm flex-1"
                      value={item.category}
                      onChange={(event) =>
                        updateWasteItem(
                          index,
                          'category',
                          event.target.value
                        )
                      }
                    >
                      {WASTE_CATEGORIES.map((category) => (
                        <option
                          key={category}
                          value={category}
                          disabled={formData.wasteItems.some(
                            (otherItem, otherIndex) =>
                              otherIndex !== index &&
                              otherItem.category === category
                          )}
                        >
                          {category.charAt(0).toUpperCase() +
                            category.slice(1)}
                        </option>
                      ))}
                    </select>

                    <div className="relative w-28">
                      <input
                        type="number"
                        required
                        min="0.1"
                        step="0.1"
                        className="input-field py-2 text-sm pr-9"
                        value={item.estimatedQuantity}
                        onChange={(event) =>
                          updateWasteItem(
                            index,
                            'estimatedQuantity',
                            event.target.value
                          )
                        }
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                        kg
                      </span>
                    </div>

                    {formData.wasteItems.length > 1 && (
                      <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Remove waste item"
                        onClick={() => removeWasteItem(index)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-gray-800">
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={
                    isSubmitting ||
                    addresses.length === 0 ||
                    !formData.addressId
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Truck className="w-5 h-5" />
                      Submit Pickup Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Your Pickup Requests
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {requests.length} request{requests.length === 1 ? '' : 's'} found
            </p>
          </div>
          <Package className="w-6 h-6 text-brand-400" />
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No waste pickup requests yet.</p>
            <p className="text-sm text-gray-600 mt-1">
              Create your first request using the button above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const canCancel = ['pending', 'assigned'].includes(
                request.status
              )
              const collectorName =
                request.assignedCollector?.user?.name ||
                'Waiting for assignment'

              return (
                <div
                  key={request._id}
                  className="rounded-xl border border-gray-800 bg-gray-900/60 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-white">
                          {new Date(
                            request.preferredDate
                          ).toLocaleDateString()}
                        </span>
                        <span
                          className={`badge ${
                            STATUS_STYLES[request.status] || 'badge-blue'
                          } capitalize`}
                        >
                          {request.status.replaceAll('_', ' ')}
                        </span>
                        {request.assignmentMethod && (
                          <span className="text-xs text-gray-500 capitalize">
                            {request.assignmentMethod} assignment
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          {request.pickupAddress.street},{' '}
                          {request.pickupAddress.area},{' '}
                          {request.pickupAddress.city}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="capitalize">
                          {request.preferredTimeSlot}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-300 font-medium mb-1">
                          Waste items
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.wasteItems
                            .map(
                              (item) =>
                                `${item.category} (${item.estimatedQuantity} kg)`
                            )
                            .join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="lg:text-right lg:min-w-56">
                      <div className="flex lg:justify-end items-center gap-2 text-sm text-gray-400 mb-1">
                        <UserCheck className="w-4 h-4" />
                        Collector
                      </div>
                      <p className="font-medium text-white">
                        {collectorName}
                      </p>

                      {request.assignedCollector?.vehicleType && (
                        <p className="text-xs text-gray-500 mt-1 capitalize">
                          {request.assignedCollector.vehicleType}
                          {request.assignedCollector.vehicleNumber
                            ? ` • ${request.assignedCollector.vehicleNumber}`
                            : ''}
                        </p>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          className="mt-4 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                          disabled={cancellingId === request._id}
                          onClick={() => handleCancel(request._id)}
                        >
                          {cancellingId === request._id
                            ? 'Cancelling...'
                            : 'Cancel Request'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PickupRequestPage
