import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Recycle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Cpu,
  Wine,
  AlertTriangle,
  Wrench,
  Leaf,
  ShoppingBag,
  FileText,
} from 'lucide-react'


const CATEGORY_STYLES = [
  {
    match: ['e-waste', 'electronic'],
    icon: Cpu,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-950/40 text-amber-400 border-amber-900/50',
    accentBorder: 'border-l-amber-500',
    glow: 'shadow-[0_0_30px_-10px_rgba(245,158,11,0.35)]',
  },
  {
    match: ['glass'],
    icon: Wine,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    badge: 'bg-cyan-950/40 text-cyan-400 border-cyan-900/50',
    accentBorder: 'border-l-cyan-500',
    glow: 'shadow-[0_0_30px_-10px_rgba(34,211,238,0.35)]',
  },
  {
    match: ['hazardous'],
    icon: AlertTriangle,
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-400',
    badge: 'bg-red-950/40 text-red-400 border-red-900/50',
    accentBorder: 'border-l-red-500',
    glow: 'shadow-[0_0_30px_-10px_rgba(248,113,113,0.35)]',
  },
  {
    match: ['metal'],
    icon: Wrench,
    iconBg: 'bg-slate-500/15',
    iconColor: 'text-slate-300',
    badge: 'bg-slate-800/60 text-slate-300 border-slate-600/50',
    accentBorder: 'border-l-slate-400',
    glow: 'shadow-[0_0_30px_-10px_rgba(148,163,184,0.3)]',
  },
  {
    match: ['organic'],
    icon: Leaf,
    iconBg: 'bg-green-500/15',
    iconColor: 'text-green-400',
    badge: 'bg-green-950/40 text-green-400 border-green-900/50',
    accentBorder: 'border-l-green-500',
    glow: 'shadow-[0_0_30px_-10px_rgba(74,222,128,0.35)]',
  },
  {
    match: ['plastic'],
    icon: ShoppingBag,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
    accentBorder: 'border-l-blue-500',
    glow: 'shadow-[0_0_30px_-10px_rgba(96,165,250,0.35)]',
  },
  {
    match: ['paper'],
    icon: FileText,
    iconBg: 'bg-yellow-500/15',
    iconColor: 'text-yellow-400',
    badge: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
    accentBorder: 'border-l-yellow-500',
    glow: 'shadow-[0_0_30px_-10px_rgba(250,204,21,0.35)]',
  },
]

const DEFAULT_STYLE = {
  icon: Recycle,
  iconBg: 'bg-brand-600/20',
  iconColor: 'text-brand-500',
  badge: 'bg-brand-950/40 text-brand-400 border-brand-900/50',
  accentBorder: 'border-l-brand-500',
  glow: 'shadow-[0_0_30px_-10px_rgba(52,211,153,0.35)]',
}

const getCategoryStyle = (title = '') => {
  const lower = title.toLowerCase()
  return CATEGORY_STYLES.find((c) => c.match.some((m) => lower.includes(m))) || DEFAULT_STYLE
}

const ResidentGuidelinesPage = () => {
  const [guidelines, setGuidelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const fetchGuidelines = async () => {
      try {
        const { data } = await api.get('/guidelines')
        if (data.success) setGuidelines(data.data.guidelines)
      } catch {
        toast.error('Could not load disposal guidelines')
      } finally {
        setLoading(false)
      }
    }
    fetchGuidelines()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Waste Disposal Guidelines</h1>
        <p className="text-gray-400">How to prepare each type of waste before collection.</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid gap-4">
          {guidelines.map((g, i) => {
            const isOpen = expanded === g._id
            const style = getCategoryStyle(g.title)
            const CategoryIcon = style.icon

            return (
              <div
                key={g._id}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`card-glass border-l-4 ${style.accentBorder} animate-fade-in transition-all duration-300 ${
                  isOpen ? style.glow : 'hover:-translate-y-0.5 hover:shadow-lg'
                }`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : g._id)}
                  className="w-full flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${style.iconBg} ${
                        isOpen ? 'scale-110' : ''
                      }`}
                    >
                      <CategoryIcon className={`w-5 h-5 ${style.iconColor}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold">{g.title}</p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${style.badge}`}
                      >
                        {g.isRecyclable ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {g.isRecyclable ? 'Recyclable' : 'Not recyclable'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-4 animate-fade-in">
                    <p className="text-gray-300 text-sm leading-relaxed">{g.instructions}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl p-4 bg-green-950/20 border border-green-900/30">
                        <p className="text-xs font-semibold text-green-400 mb-3 tracking-wide">DO</p>
                        <ul className="space-y-2.5">
                          {g.doList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl p-4 bg-red-950/20 border border-red-900/30">
                        <p className="text-xs font-semibold text-red-400 mb-3 tracking-wide">DON'T</p>
                        <ul className="space-y-2.5">
                          {g.dontList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ResidentGuidelinesPage