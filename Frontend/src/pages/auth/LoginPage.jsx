import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data = await login(email, password)
      toast.success(data.message || 'Logged in successfully!')
      
      // Redirect based on role
      const role = data.data.user.role
      if (role === 'admin') navigate('/admin/dashboard')
      else if (role === 'collector') navigate('/collector/dashboard')
      else if (role === 'partner') navigate('/partner/dashboard')
      else navigate('/resident/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card-glass border border-gray-800 bg-gray-900/80 p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-emerald-400" />
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400 text-sm">Sign in to your WasteWiseBD account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="input-label" htmlFor="email">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="email"
              type="email"
              required
              className="input-field pl-12"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="password"
              type="password"
              required
              className="input-field pl-12"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full mt-4"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Sign In
              <LogIn className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
          Create one now
        </Link>
      </div>
    </div>
  )
}

export default LoginPage
