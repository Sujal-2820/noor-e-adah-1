/**
 * Rewards View Component
 * Full page view for users to manage and explore rewards
 * 
 * NEW COMPONENT - Phase 6: Incentive System
 */

import { useState, useEffect } from 'react'
import {
    Gift,
    Award,
    Trophy,
    ChevronRight,
    CheckCircle2,
    Clock,
    Ticket,
    Smartphone,
    Package,
    History,
    SmartphoneIcon,
    Flame,
    Zap,
    ChevronDown,
    MapPin,
    AlertCircle,
    Info,
    Star
} from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { Trans } from '../../../../components/Trans'
import { useUserApi } from '../../hooks/useUserApi'

export function RewardsView({ navigate }) {
    const [activeTab, setActiveTab] = useState('available') // 'available' | 'history'
    const [schemes, setSchemes] = useState([])
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const { getIncentiveSchemes, getIncentiveHistory, claimReward } = useUserApi()

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'available') {
                const res = await getIncentiveSchemes()
                setSchemes(res.data || [])
            } else {
                const res = await getIncentiveHistory()
                setHistory(res.data || [])
            }
        } catch (err) {
            console.error('Failed to load rewards:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleClaim = async (id) => {
        if (!confirm('Do you want to claim this reward? Our team will contact you for fulfillment.')) return
        try {
            await claimReward(id, { notes: 'Claimed from dashboard' })
            alert('Claim request submitted successfully!')
            loadData()
        } catch (err) {
            alert('Failed to claim: ' + err.message)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50 pb-24">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 pt-12 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tight">
                            <Trans>VENDOR ELITE</Trans>
                        </h1>
                        <p className="text-purple-100/80 text-sm font-bold uppercase tracking-widest mt-1">
                            <Trans>REWARDS & MILESTONES</Trans>
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                        <Trophy className="text-amber-400 w-6 h-6" />
                    </div>
                </div>

                <div className="mt-8 relative z-10">
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-5 flex items-center gap-4">
                        <div className="p-3 bg-amber-400 rounded-2xl shadow-lg shadow-amber-400/20">
                            <Zap className="w-6 h-6 text-indigo-900" />
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-tighter"><Trans>Current Status</Trans></p>
                            <h2 className="text-white text-xl font-black uppercase"><Trans>Level 2 Elite</Trans></h2>
                        </div>
                        <div className="ml-auto flex flex-col items-end">
                            <span className="text-amber-400 text-xs font-black uppercase tracking-widest"><Trans>Top 5%</Trans></span>
                            <div className="h-1 w-20 bg-white/20 rounded-full mt-1 overflow-hidden">
                                <div className="h-full w-4/5 bg-amber-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 -mt-8 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl shadow-purple-900/5 p-2 flex gap-2">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-2xl text-sm font-black uppercase transition-all flex items-center justify-center gap-2",
                            activeTab === 'available' ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "text-gray-400 hover:bg-gray-50"
                        )}
                    >
                        <Flame className={cn("w-4 h-4", activeTab === 'available' ? "text-amber-400" : "text-gray-300")} />
                        <Trans>Milestones</Trans>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-2xl text-sm font-black uppercase transition-all flex items-center justify-center gap-2",
                            activeTab === 'history' ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "text-gray-400 hover:bg-gray-50"
                        )}
                    >
                        <History className={cn("w-4 h-4", activeTab === 'history' ? "text-purple-300" : "text-gray-300")} />
                        <Trans>History</Trans>
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 pt-8 space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest"><Trans>Loading Gems...</Trans></p>
                    </div>
                ) : activeTab === 'available' ? (
                    /* Schemes List */
                    <div className="space-y-4">
                        {schemes.length > 0 ? schemes.map((scheme) => (
                            <div key={scheme._id} className="bg-white rounded-[2.5rem] border border-gray-100 p-6 relative overflow-hidden shadow-sm group hover:shadow-xl hover:border-purple-100 transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 group-hover:bg-purple-100 transition-colors" />

                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className={cn(
                                            "w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg",
                                            scheme.rewardType === 'voucher' ? "bg-amber-100 text-amber-600 shadow-amber-100" :
                                                scheme.rewardType === 'smartwatch' ? "bg-indigo-100 text-indigo-600 shadow-indigo-100" :
                                                    "bg-purple-100 text-purple-600 shadow-purple-100"
                                        )}>
                                            {scheme.rewardType === 'voucher' ? <Ticket className="w-7 h-7" /> :
                                                scheme.rewardType === 'membership' ? <Smartphone className="w-7 h-7" /> :
                                                    <Gift className="w-7 h-7" />}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Target Amount</span>
                                            <span className="text-lg font-black text-gray-900 italic">₹{scheme.minPurchaseAmount?.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">{scheme.title}</h3>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed mt-1">{scheme.description}</p>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full w-2/3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" />
                                        </div>
                                        <span className="text-xs font-black text-purple-600 uppercase">66%</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />
                                            ))}
                                            <div className="w-6 h-6 rounded-full border-2 border-white bg-purple-600 flex items-center justify-center text-[8px] font-bold text-white">+12</div>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Expires {scheme.validUntil ? new Date(scheme.validUntil).toLocaleDateString() : 'Never'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-dashed border-gray-200">
                                <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h4 className="text-lg font-black text-gray-900 uppercase italic"><Trans>No Active Milestones</Trans></h4>
                                <p className="text-sm text-gray-500 mt-2 font-medium"><Trans>Check back later for new reward campaigns.</Trans></p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* History List */
                    <div className="space-y-4">
                        {history.length > 0 ? history.map((item) => (
                            <div key={item._id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    item.status === 'pending_approval' ? "bg-amber-50 text-amber-500" :
                                        item.status === 'approved' ? "bg-blue-50 text-blue-500" : "bg-purple-50 text-purple-600"
                                )}>
                                    <Award className="w-6 h-6" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className="text-sm font-black text-gray-900 uppercase italic line-clamp-1">{item.incentiveSnapshot?.title}</h4>
                                        <span className="text-[9px] font-black text-white px-2 py-0.5 rounded bg-gray-900 uppercase tracking-tighter">
                                            {item.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold text-gray-400">{new Date(item.earnedAt).toLocaleDateString()}</p>
                                        <p className="text-[11px] font-black text-purple-600 tracking-wider">
                                            {item.incentiveSnapshot?.rewardType === 'voucher' ? 'CASH' : 'PREMIUM GIFT'}
                                        </p>
                                    </div>
                                </div>

                                {item.status === 'approved' && (
                                    <button
                                        onClick={() => handleClaim(item._id)}
                                        className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200 active:scale-95 transition-all"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )) : (
                            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-dashed border-gray-200">
                                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h4 className="text-lg font-black text-gray-900 uppercase italic"><Trans>No History Yet</Trans></h4>
                                <p className="text-sm text-gray-500 mt-2 font-medium"><Trans>Rewards you earn will appear here.</Trans></p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Info Card */}
            <div className="px-6 mt-10">
                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mb-10" />
                    <Star className="w-10 h-10 text-amber-400 mb-4" />
                    <h3 className="text-xl font-black italic uppercase leading-tight">
                        <Trans>Unlock Exclusive<br />Noor E Adah Partner Benefits</Trans>
                    </h3>
                    <p className="text-indigo-200 text-xs mt-3 font-medium leading-relaxed">
                        <Trans>Increase your monthly stock orders to reach Diamond Status and unlock fully paid group vacations.</Trans>
                    </p>
                    <button className="mt-6 py-3 px-6 bg-white text-indigo-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl">
                        <Trans>Learn More</Trans>
                    </button>
                </div>
            </div>
        </div>
    )
}
