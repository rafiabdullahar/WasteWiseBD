import { Link } from 'react-router-dom'
import { Leaf, ArrowRight, ShieldCheck, Recycle, Map, Users } from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">WasteWiseBD</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-950 border border-brand-800 text-brand-400 text-sm font-medium mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          Smart Waste Management for Bangladesh
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white max-w-4xl tracking-tight mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Cleaner cities through <br className="hidden md:block" />
          <span className="text-gradient">smarter recycling.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 animate-slide-up" style={{ animationDelay: '200ms' }}>
          Connect with collectors, schedule recycling pickups, and earn green rewards. 
          Join the movement towards a sustainable and cleaner Bangladesh today.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <Link to="/register" className="btn-primary">
            Join as Resident
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/register?role=partner" className="btn-secondary">
            Become a Partner
          </Link>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-24 max-w-6xl w-full animate-slide-up" style={{ animationDelay: '400ms' }}>
          {[
            { icon: Map, title: 'Smart Routing', desc: 'Optimized collection areas' },
            { icon: Recycle, title: 'Recycling', desc: 'Direct partner connections' },
            { icon: ShieldCheck, title: 'Rewards', desc: 'Earn points for segregating' },
            { icon: Users, title: 'Community', desc: 'Transparent reporting' },
          ].map((f, i) => (
            <div key={i} className="card-glass flex flex-col items-center text-center p-6 hover:border-brand-500/50 transition-colors">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 text-brand-400">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default LandingPage
