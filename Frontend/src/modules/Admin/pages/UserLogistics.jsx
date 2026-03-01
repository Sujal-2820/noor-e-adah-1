import { useState, useEffect, useCallback } from 'react'
import { Truck, Package, CheckCircle, Clock, Search, MapPin, Building2, User, Eye, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

const columns = [
    { Header: 'Request ID', accessor: 'id' },
    { Header: 'User', accessor: 'userName' },
    { Header: 'Location', accessor: 'location' },
    { Header: 'Items', accessor: 'itemsCount' },
    { Header: 'Amount', accessor: 'totalAmount' },
    { Header: 'Status', accessor: 'status' },
    { Header: 'Delivery', accessor: 'deliveryStatus' },
    { Header: 'Actions', accessor: 'actions' },
]

export function UserLogisticsPage({ navigate }) {
    const {
        getUserPurchaseRequests,
        processUserPurchaseStock,
        sendUserPurchaseStock,
        confirmUserPurchaseDelivery,
        loading
    } = useAdminApi()
    const { success, error: showError } = useToast()

    const [purchases, setPurchases] = useState([])
    const [filters, setFilters] = useState({
        status: 'approved',
        deliveryStatus: 'All',
        search: '',
    })
    const [currentView, setCurrentView] = useState(null) // 'detail'
    const [selectedPurchase, setSelectedPurchase] = useState(null)
    const [notes, setNotes] = useState('')

    const fetchPurchases = useCallback(async () => {
        const params = {
            status: filters.status,
            search: filters.search,
        }
        console.log('[UserLogistics] Fetching purchases with params:', params)
        const result = await getUserPurchaseRequests(params)
        console.log('[UserLogistics] API Result:', result)

        if (result.success && result.data?.purchases) {
            console.log('[UserLogistics] Purchases received:', result.data.purchases.length)
            // Filter by deliveryStatus frontend-side if not supported by backend yet
            let list = result.data.purchases
            if (filters.deliveryStatus !== 'All') {
                list = list.filter(p => (p.deliveryStatus || 'pending') === filters.deliveryStatus.toLowerCase())
            }
            console.log('[UserLogistics] After filtering:', list.length)
            setPurchases(list)
        } else {
            console.error('[UserLogistics] Failed to fetch purchases:', result.error)
            setPurchases([])
        }
    }, [getUserPurchaseRequests, filters])

    useEffect(() => {
        fetchPurchases()
    }, [fetchPurchases])

    const handleProcessOrder = async (id) => {
        const res = await processUserPurchaseStock(id, { deliveryNotes: notes || 'Order is being processed and packed.' })
        if (res.success) {
            success('Order marked as processing')
            setNotes('')
            fetchPurchases()
        } else {
            showError(res.error?.message || 'Failed to update status')
        }
    }

    const handleDispatchOrder = async (id) => {
        const res = await sendUserPurchaseStock(id, { deliveryNotes: notes || 'Stock has been dispatched.' })
        if (res.success) {
            success('Order marked as dispatched (In-Transit)')
            setNotes('')
            fetchPurchases()
        } else {
            showError(res.error?.message || 'Failed to update status')
        }
    }

    const handleConfirmDelivery = async (id) => {
        const res = await confirmUserPurchaseDelivery(id, { deliveryNotes: notes || 'Stock delivered and verified.' })
        if (res.success) {
            success('Order confirmed as delivered! Inventory updated.')
            setNotes('')
            fetchPurchases()
        } else {
            showError(res.error?.message || 'Failed to update status')
        }
    }

    const tableData = purchases.map(p => ({
        ...p,
        id: p.stockPurchaseId || p.requestId || p.id,
        userName: p.user?.name || 'Unknown',
        location: p.user?.location?.city || p.user?.region || 'Unknown',
        itemsCount: p.items?.length || 0,
        totalAmount: `₹${(p.totalAmount || 0).toLocaleString('en-IN')}`,
        status: p.status,
        deliveryStatus: p.deliveryStatus || 'pending',
    }))

    const tableColumns = columns.map(col => {
        if (col.accessor === 'status') {
            return {
                ...col,
                Cell: (row) => {
                    const tone = row.status === 'approved' ? 'success' : row.status === 'pending' ? 'warning' : 'neutral'
                    return <StatusBadge tone={tone}>{row.status}</StatusBadge>
                }
            }
        }
        if (col.accessor === 'deliveryStatus') {
            return {
                ...col,
                Cell: (row) => {
                    const status = row.deliveryStatus || 'pending'
                    const configs = {
                        pending: { tone: 'neutral', icon: Clock, label: 'Pending' },
                        processing: { tone: 'warning', icon: Package, label: 'Processing' },
                        in_transit: { tone: 'info', icon: Truck, label: 'Dispatched' },
                        delivered: { tone: 'success', icon: CheckCircle, label: 'Delivered' },
                    }
                    const config = configs[status] || configs.pending
                    return (
                        <div className="flex items-center gap-2">
                            <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
                        </div>
                    )
                }
            }
        }
        if (col.accessor === 'actions') {
            return {
                ...col,
                Cell: (row) => (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSelectedPurchase(row)
                                setCurrentView('detail')
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                            title="View & Update"
                        >
                            <Eye className="h-5 w-5" />
                        </button>
                    </div>
                )
            }
        }
        return col
    })

    if (currentView === 'detail' && selectedPurchase) {
        const p = selectedPurchase
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setCurrentView(null)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Logistics List
                </button>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Purchase Request Details</h2>
                                    <p className="text-sm text-gray-500 mt-1">ID: {p.id}</p>
                                </div>
                                <StatusBadge tone={p.deliveryStatus === 'delivered' ? 'success' : 'info'}>
                                    {p.deliveryStatus?.toUpperCase()}
                                </StatusBadge>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Package className="h-4 w-4 text-blue-500" />
                                        Requested Items
                                    </h3>
                                    <div className="overflow-hidden rounded-xl border border-gray-100">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                                                <tr>
                                                    <th className="px-4 py-3">Product</th>
                                                    <th className="px-4 py-3 text-right">Qty</th>
                                                    <th className="px-4 py-3 text-right">Price</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {p.items?.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50">
                                                        <td className="px-4 py-3 font-medium text-gray-900">{item.productId?.name || 'Unknown Product'}</td>
                                                        <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right text-gray-600">₹{(item.price || 0).toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{(item.totalPrice || 0).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                    <div>
                                        <p className="text-xs text-blue-600 uppercase font-bold mb-1">Total Order Value</p>
                                        <p className="text-2xl font-black text-gray-900">{p.totalAmount}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-blue-600 uppercase font-bold mb-1">Payment Mode</p>
                                        <StatusBadge tone="neutral">{p.paymentMode || 'Standard Payment'}</StatusBadge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Update Status Actions */}
                        {p.status === 'approved' && p.deliveryStatus !== 'delivered' && (
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Truck className="h-24 w-24" />
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <RefreshCw className="h-5 w-5 text-green-500" />
                                    Update Logistics Status
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Notes (Internal/User visible)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add courier name, tracking ID or delivery status notes..."
                                            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        {p.deliveryStatus === 'pending' && (
                                            <button
                                                onClick={() => handleProcessOrder(p._id || p.requestId)}
                                                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-200 active:scale-95"
                                            >
                                                <Package className="h-5 w-5" />
                                                Mark Processing (Packing)
                                            </button>
                                        )}

                                        {(p.deliveryStatus === 'pending' || p.deliveryStatus === 'processing') && (
                                            <button
                                                onClick={() => handleDispatchOrder(p._id || p.requestId)}
                                                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                                            >
                                                <Truck className="h-5 w-5" />
                                                Dispatch Stock (In Transit)
                                            </button>
                                        )}

                                        {p.deliveryStatus === 'in_transit' && (
                                            <button
                                                onClick={() => handleConfirmDelivery(p._id || p.requestId)}
                                                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 transition-all shadow-md shadow-green-200 active:scale-95"
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                                Confirm Final Delivery
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {p.deliveryStatus === 'delivered' && (
                            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-green-900">Delivery Completed</h3>
                                <p className="text-sm text-green-700 mt-1">This stock request has been successfully delivered and added to user's inventory.</p>
                                {p.deliveredAt && (
                                    <p className="text-xs text-green-600 mt-2">Delivered on: {new Date(p.deliveredAt).toLocaleString('en-IN')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">User Info</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{p.userName}</p>
                                        <p className="text-xs text-gray-500">{p.user?.phone || 'No phone'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Region</p>
                                        <p className="text-sm font-bold text-gray-900">{p.location}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Delivery Progress</h3>
                            <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                                {[
                                    { step: 'pending', label: 'Order Approved', active: true },
                                    { step: 'processing', label: 'Packing', active: ['processing', 'in_transit', 'delivered'].includes(p.deliveryStatus) },
                                    { step: 'in_transit', label: 'Dispatched', active: ['in_transit', 'delivered'].includes(p.deliveryStatus) },
                                    { step: 'delivered', label: 'Delivered', active: p.deliveryStatus === 'delivered' },
                                ].map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-4 relative z-10">
                                        <div className={cn(
                                            "h-10 w-10 flex items-center justify-center rounded-full border-2 bg-white transition-colors duration-300",
                                            s.active ? "border-green-500 text-green-500" : "border-gray-200 text-gray-300"
                                        )}>
                                            {s.active ? <CheckCircle className="h-5 w-5" /> : idx + 1}
                                        </div>
                                        <span className={cn("text-sm font-bold", s.active ? "text-gray-900" : "text-gray-400")}>
                                            {s.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {p.deliveryNotes && (
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                <h3 className="text-sm font-bold text-gray-500 mb-2">Latest Logistics Note</h3>
                                <p className="text-xs text-gray-700 italic">"{p.deliveryNotes}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">User Logistics</h1>
                    <p className="text-sm text-gray-500">Manage stock dispatch and delivery for user stock purchase requests.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-lg">
                        Phase 3: Logistics Automation
                    </span>
                </div>
            </div>

            <FilterBar
                filters={[
                    { id: 'status', label: 'All Requests', active: filters.status === 'All' },
                    { id: 'status', label: 'Approved only', active: filters.status === 'approved' },
                ]}
                onFilterChange={(f) => setFilters(prev => ({ ...prev, status: f.label.includes('Approved') ? 'approved' : 'All' }))}
            />

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search User name or Request ID..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 focus:bg-white transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        value={filters.deliveryStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, deliveryStatus: e.target.value }))}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 focus:bg-white outline-none"
                    >
                        <option value="All">All Logistics Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="In_Transit">Dispatched</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                    <button
                        onClick={fetchPurchases}
                        className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <DataTable
                    columns={tableColumns}
                    rows={tableData}
                    loading={loading}
                    emptyMessage="No matching stock purchase requests found for logistics."
                />
            </div>
        </div>
    )
}
