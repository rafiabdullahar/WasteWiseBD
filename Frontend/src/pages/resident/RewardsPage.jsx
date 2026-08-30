import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Award, Gift, Loader2, TrendingUp, TrendingDown, X, Copy, Check,
  TreePine, Smartphone, ShoppingBag, Receipt
} from 'lucide-react'
import api from '../../services/api'

// Map catalog icon names (sent by the backend) to lucide components.
const ICONS = { TreePine, Smartphone, ShoppingBag, Receipt, Gift }

const RewardsPage = () => {
  const [balance, setBalance] = useState(0)
  const [summary, setSummary] = useState({ totalEarned: 0, totalRedeemed: 0 })
  const [transactions, setTransactions] = useState([])
  const [catalog, setCatalog] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState(null)
  const [voucher, setVoucher] = useState(null) // { code, reward } after a redeem
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [meRes, catalogRes] = await Promise.all([
        api.get('/rewards/me'),
        api.get('/rewards/catalog'),
      ])
      setBalance(meRes.data.data.balance)
      setSummary(meRes.data.data.summary)
      setTransactions(meRes.data.data.transactions)
      setCatalog(catalogRes.data.data.catalog)
    } catch (error) {
      toast.error('Failed to load rewards')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeem = async (reward) => {
    setRedeemingId(reward.id)
    try {
      const { data } = await api.post('/rewards/redeem', { rewardId: reward.id })
      setBalance(data.data.balance)
      setVoucher({ code: data.data.voucherCode, reward: data.data.reward })
      toast.success('Reward redeemed!')

      // Refresh history + summary so the new redemption shows immediately.
      const meRes = await api.get('/rewards/me')
      setSummary(meRes.data.data.summary)
      setTransactions(meRes.data.data.transactions)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to redeem reward')
    } finally {
      setRedeemingId(null)
    }
  }

  const copyCode = () => {
    if (!voucher) return
    navigator.clipboard?.writeText(voucher.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Green Rewards</h1>
          <p className="page-subtitle">Earn points by recycling and redeem them for eco-rewards.</p>
        </div>
      </div>

      {/* Balance + summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card glow-green border-brand-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-900/50 flex items-center justify-center text-brand-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Points Balance</p>
              <h3 className="text-3xl font-bold text-white">{balance}</h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Earned</p>
              <h3 className="text-2xl font-bold text-white">{summary.totalEarned}</h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Redeemed</p>
              <h3 className="text-2xl font-bold text-white">{summary.totalRedeemed}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Redeem catalog */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Gift className="w-5 h-5 text-brand-400" />
          <h2 className="text-xl font-semibold text-white">Redeem Your Points</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {catalog.map(reward => {
            const Icon = ICONS[reward.icon] || Gift
            const affordable = balance >= reward.cost
            return (
              <div key={reward.id} className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-900/40 flex items-center justify-center text-brand-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{reward.name}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{reward.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-800">
                  <span className="badge badge-green flex gap-1"><Award className="w-3 h-3" /> {reward.cost} pts</span>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!affordable || redeemingId !== null}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {redeemingId === reward.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : affordable ? 'Redeem' : 'Not enough'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Points history */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Points History</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reward activity yet. Complete a recycling pickup to start earning!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="table-header py-3 px-4">Date</th>
                  <th className="table-header py-3 px-4">Activity</th>
                  <th className="table-header py-3 px-4">Type</th>
                  <th className="table-header py-3 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx._id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="table-cell whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell">{tx.description || tx.reason.replace(/_/g, ' ')}</td>
                    <td className="table-cell">
                      <span className={`badge ${tx.type === 'earned' ? 'badge-green' : 'badge-yellow'} capitalize`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`table-cell text-right font-semibold ${tx.type === 'earned' ? 'text-brand-400' : 'text-yellow-400'}`}>
                      {tx.type === 'earned' ? '+' : '-'}{tx.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Voucher modal */}
      {voucher && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setVoucher(null)}
        >
          <div
            className="card border-brand-500/40 max-w-md w-full animate-slide-up glow-green"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-900/50 flex items-center justify-center text-brand-400">
                  <Gift className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Reward Redeemed!</h2>
              </div>
              <button onClick={() => setVoucher(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              You redeemed <span className="text-white font-medium">{voucher.reward.name}</span>. Use this voucher code to claim it:
            </p>
            <div className="flex items-center gap-2 p-4 bg-gray-950 border border-gray-800 rounded-xl mb-4">
              <code className="flex-1 text-lg font-mono font-bold text-brand-300 tracking-widest">{voucher.code}</code>
              <button onClick={copyCode} className="btn-ghost" title="Copy code">
                {copied ? <Check className="w-4 h-4 text-brand-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setVoucher(null)} className="btn-primary w-full">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RewardsPage
