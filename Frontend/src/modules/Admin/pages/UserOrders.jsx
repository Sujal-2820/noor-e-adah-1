import { useState, useEffect, useCallback } from 'react'
import { Package, ArrowLeft, RefreshCw, Truck, CheckCircle, Clock } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

const columns = [
    { Header: 'Order ID', accessor: 'orderId' },
    { Header: 'User', accessor: 'userName' },
    { Header: 'Amount', accessor: 'amount' },
    { Header: 'Status', accessor: 'status' },
    { Header: 'Delivery', accessor: 'deliveryStatus' },
    { Header: 'Date', accessor: 'date' },
    { Header: 'Actions', accessor: 'actions' },
]

export function UserOrdersPage({ navigate }) {
    const {
        getUserPurchaseRequests,
        processUserPurchaseStock,
        sendUserPurchaseStock,
        confirmUserPurchaseDelivery,
        loading
    } = useAdminApi()
    const { success, error: showError } = useToast()

    const [orders, setOrders] = useState([])
    const [refreshing, setRefreshing] = useState(false)

    const fetchOrders = useCallback(async () => {
        setRefreshing(true)
        const result = await getUserPurchaseRequests({ status: 'approved' })
        if (result.success && result.data?.purchases) {
            setOrders(result.data.purchases)
        } else {
            setOrders([])
        }
        setRefreshing(false)
    }, [getUserPurchaseRequests])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    const handleUpdateStatus = async (orderId, action) => {
        let result
        if (action === 'processing') {
            result = await processUserPurchaseStock(orderId, { deliveryNotes: 'Order is being processed.' })
        } else if (action === 'dispatch') {
            result = await sendUserPurchaseStock(orderId, { deliveryNotes: 'Stock has been dispatched.' })
        } else if (action === 'delivered') {
            result = await confirmUserPurchaseDelivery(orderId, { deliveryNotes: 'Stock delivered successfully.' })
        }

        if (result?.success) {
            success(`Order status updated to ${action}`)
            fetchOrders()
        } else {
            showError(result?.error?.message || 'Failed to update status')
        }
    }

    const getStatusButton = (order) => {
        const deliveryStatus = (order.deliveryStatus || 'pending').toLowerCase()

        if (deliveryStatus === 'pending') {
            return (
                <button
                    onClick={() => handleUpdateStatus(order._id || order.id, 'processing')}
                    disabled={loading}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    <Clock className="h-3 w-3" />
                    Mark Processing
                </button>
            )
        } else if (deliveryStatus === 'processing') {
            return (
                <button
                    onClick={() => handleUpdateStatus(order._id || order.id, 'dispatch')}
                    disabled={loading}
                    className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                    <Truck className="h-3 w-3" />
                    Mark Dispatched
                </button>
            )
        } else if (deliveryStatus === 'in_transit') {
            return (
                <button
                    onClick={() => handleUpdateStatus(order._id || order.id, 'delivered')}
                    disabled={loading}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                    <CheckCircle className="h-3 w-3" />
                    Mark Delivered
                </button>
            )
        } else {
            return <span className="text-xs text-gray-500">Completed</span>
        }
    }

    const tableData = orders.map(order => ({
        orderId: `#${(order._id || order.id || '').slice(-8)}`,
        userName: order.userId?.name || order.user?.name || 'Unknown',
        amount: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
        status: order.status || 'pending',
        deliveryStatus: order.deliveryStatus || 'pending',
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A',
        actions: getStatusButton(order),
        _id: order._id || order.id,
    }))

    const tableColumns = columns.map(col => {
        if (col.accessor === 'status') {
            return {
                ...col,
                Cell: (row) => (
                    <StatusBadge tone={row.status === 'approved' ? 'success' : 'warning'}>
                        {row.status}
                    </StatusBadge>
                )
            }
        }
        if (col.accessor === 'deliveryStatus') {
            return {
                ...col,
                Cell: (row) => {
                    const status = (row.deliveryStatus || 'pending').toLowerCase()
                    const toneMap = {
                        pending: 'warning',
                        processing: 'info',
                        in_transit: 'warning',
                        delivered: 'success'
                    }
                    return (
                        <StatusBadge tone={toneMap[status] || 'neutral'}>
                            {status.replace('_', ' ')}
                        </StatusBadge>
                    )
                }
            }
        }
        if (col.accessor === 'actions') {
            return {
                ...col,
                Cell: (row) => row.actions
            }
        }
        return col
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">User Management</p>
                    <h2 className="text-2xl font-bold text-gray-900">User Orders</h2>
                    <p className="text-sm text-gray-600">
                        Manage delivery status for approved user stock purchases
                    </p>
                </div>
                <button
                    onClick={fetchOrders}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm font-bold text-gray-900">No User Orders</p>
                    <p className="mt-2 text-xs text-gray-600">
                        {refreshing ? 'Loading...' : 'No approved user orders found.'}
                    </p>
                </div>
            ) : (
                <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <DataTable
                        columns={tableColumns}
                        rows={tableData}
                        emptyState="No orders found"
                    />
                </div>
            )}
        </div>
    )
}
