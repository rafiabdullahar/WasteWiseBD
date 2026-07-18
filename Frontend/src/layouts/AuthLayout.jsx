import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { Outlet } from 'react-router-dom'

/**
 * AuthLayout — centered card layout used for Login and Register pages.
 * Features a green gradient background with a glass-morphism form card.
 */
const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden px-4">
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand header */}
      <Link to="/" className="flex items-center gap-3 mb-8 group">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/50 group-hover:scale-105 transition-transform">
          <Leaf className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-2xl font-bold text-gradient">WasteWiseBD</span>
      </Link>

      {/* Page content (Login / Register form) */}
      <div className="w-full max-w-md animate-slide-up">
        <Outlet />
      </div>

      <p className="mt-8 text-gray-600 text-sm">
        © {new Date().getFullYear()} WasteWiseBD. All rights reserved.
      </p>
    </div>
  )
}

export default AuthLayout
