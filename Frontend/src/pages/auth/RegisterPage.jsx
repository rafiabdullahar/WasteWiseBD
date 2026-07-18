import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { UserPlus, Mail, Lock, User, Phone, Home, Truck, Recycle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  { id: 'resident', label: 'Resident', icon: Home, desc: 'Schedule pickups & recycle' },
  { id: 'collector', label: 'Collector', icon: Truck, desc: 'Manage collection routes' },
  { id: 'partner', label: 'Partner', icon: Recycle, desc: 'Receive recyclable materials' },
]

const RegisterPage = () => {
  const [searchParams] = useSearchParams()
  const defaultRole = searchParams.get('role') || 'resident'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.some(r => r.id === defaultRole) ? defaultRole : 'resident',
    householdType: 'house',
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = { ...formData }
      // Remove householdType if not a resident
      if (payload.role !== 'resident') {
        delete payload.householdType
      }

      const data = await register(payload)
      toast.success(data.message || 'Account created successfully!')
      
      // Redirect based on role
      if (payload.role === 'collector') navigate('/collector/dashboard')
      else if (payload.role === 'partner') navigate('/partner/dashboard')
      else navigate('/resident/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card-glass border border-gray-800 bg-gray-900/80 p-8 shadow-2xl relative overflow-hidden mt-8 md:mt-0 max-h-[90vh] overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-emerald-400" />
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-gray-400 text-sm">Join WasteWiseBD today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {ROLES.map((role) => {
            const Icon = role.icon
            const isSelected = formData.role === role.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                  isSelected 
                    ? 'bg-brand-900/40 border-brand-500 text-brand-400' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{role.label}</span>
              </button>
            )
          })}
        </div>

        <div>
          <label className="input-label" htmlFor="name">
            {formData.role === 'partner' ? 'Organization Name' : 'Full Name'}
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="name"
              name="name"
              type="text"
              required
              className="input-field pl-12"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="email">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input-field pl-12"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="phone">Phone Number (Optional)</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="phone"
              name="phone"
              type="text"
              className="input-field pl-12"
              placeholder="+880 1XX XXX XXXX"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        {formData.role === 'resident' && (
          <div>
            <label className="input-label" htmlFor="householdType">Household Type</label>
            <select
              id="householdType"
              name="householdType"
              className="select-field"
              value={formData.householdType}
              onChange={handleChange}
            >
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="commercial">Commercial</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        <div>
          <label className="input-label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input-field pl-12"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters.</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full mt-6"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Create Account
              <UserPlus className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  )
}

export default RegisterPage
