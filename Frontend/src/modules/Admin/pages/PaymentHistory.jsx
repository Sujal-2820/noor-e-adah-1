import { useState, useEffect, useCallback } from 'react'
import { History, IndianRupee, Filter, Search, Calendar, TrendingUp, TrendingDown, Wallet, Factory, ShieldCheck, Users, X, Loader2 } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Date', accessor: 'date' },
  { Header: 'Activity Type', accessor: 'activityType' },
  { Header: 'Entity', accessor: 'entity' },
  { Header: 'Amount', accessor: 'amount' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Description', accessor: 'description' },
]

// All activity types from PaymentHistory model
const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  // User Payments
  { value: 'user_payment_advance', label: 'User Advance Payments' },
  { value: 'user_payment_remaining', label: 'User Remaining Payments' },
  // User Payments
  { value: 'user_earning_credited', label: 'Earnings Earned' },
  { value: 'user_withdrawal_requested', label: 'User Withdrawal Requests' },
  { value: 'user_withdrawal_approved', label: 'User Withdrawals Approved' },
  { value: 'user_withdrawal_rejected', label: 'User Withdrawals Rejected' },
  { value: 'user_withdrawal_completed', label: 'User Withdrawals Completed' },
  // Admin Payments
  { value: 'admin_commission_credited', label: 'Admin Commission' },
  { value: 'admin_withdrawal_requested', label: 'Admin Withdrawal Requests' },
  { value: 'admin_withdrawal_approved', label: 'Admin Withdrawals Approved' },
  { value: 'admin_withdrawal_rejected', label: 'Admin Withdrawals Rejected' },
  { value: 'admin_withdrawal_completed', label: 'Admin Withdrawals Completed' },
  // Bank Account Operations
  { value: 'bank_account_added', label: 'Bank Account Added' },
  { value: 'bank_account_updated', label: 'Bank Account Updated' },
  { value: 'bank_account_deleted', label: 'Bank Account Deleted' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function PaymentHistoryPage() {
  const { getPaymentHistory, getPaymentHistoryStats, getUsers, getAdmins, getOrders, loading } = useAdminApi()
  const { error: showError } = useToast()

  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({
    totalUserPayments: 0,
    totalUserEarnings: 0,
    totalAdminCommissions: 0,
    totalUserWithdrawals: 0,
    totalAdminWithdrawals: 0,
    totalActivities: 0,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    activityType: 'all',
    status: 'all',
    search: '',
    startDate: '',
    endDate: '',
    userId: '',
    adminId: '',
    orderId: '',
    minAmount: '',
    maxAmount: '',
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Options for entity filters
  const [userOptions, setUserOptions] = useState([])
  const [adminOptions, setAdminOptions] = useState([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [adminSearchQuery, setAdminSearchQuery] = useState('')

  // Fetch entity options for filters
  useEffect(() => {
    const fetchEntityOptions = async () => {
      try {
        // Fetch users for filter dropdown
        const usersResult = await getUsers({ limit: 100 })
        if (usersResult.data?.users) {
          setUserOptions(usersResult.data.users)
        }

        // Fetch admins for filter dropdown
        const adminsResult = await getAdmins({ limit: 100 })
        if (adminsResult.data?.admins) {
          setAdminOptions(adminsResult.data.admins)
        }
      } catch (error) {
        console.error('Failed to fetch entity options:', error)
      }
    }
    fetchEntityOptions()
  }, [getUsers, getAdmins])

  const fetchHistory = useCallback(async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.activityType !== 'all' && { activityType: filters.activityType }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.adminId && { adminId: filters.adminId }),
        ...(filters.orderId && { orderId: filters.orderId }),
      }

      console.log('🔍 [PaymentHistory Frontend] Fetching with params:', params);
      const result = await getPaymentHistory(params)
      console.log('📊 [PaymentHistory Frontend] API Response:', {
        success: result.success,
        historyCount: result.data?.history?.length || 0,
        pagination: result.data?.pagination,
        summary: result.data?.summary,
        hasData: !!result.data,
        hasHistory: !!result.data?.history,
      });

      // Check if we have data (either from result.data.history or result.data directly)
      const historyData = result.data?.history || (Array.isArray(result.data) ? result.data : [])

      if (historyData.length > 0 || result.data) {
        const originalTotal = result.data?.pagination?.total || historyData.length
        let filteredHistoryData = [...historyData]

        // Apply amount range filter on frontend if provided
        // Note: This filters only the current page of results
        if (filters.minAmount || filters.maxAmount) {
          const minAmount = filters.minAmount ? parseFloat(filters.minAmount) : 0
          const maxAmount = filters.maxAmount ? parseFloat(filters.maxAmount) : Infinity
          filteredHistoryData = filteredHistoryData.filter(item => {
            const amount = item.amount || 0
            return amount >= minAmount && amount <= maxAmount
          })
        }

        console.log(`✅ [PaymentHistory Frontend] Setting ${filteredHistoryData.length} history records (from ${historyData.length} total)`);
        setHistory(filteredHistoryData)
        setPagination((prev) => ({
          ...prev,
          // Note: When amount filter is active, total may not be accurate as it only filters current page
          total: (filters.minAmount || filters.maxAmount) ? filteredHistoryData.length : originalTotal,
          totalPages: (filters.minAmount || filters.maxAmount)
            ? (filteredHistoryData.length > 0 ? 1 : 0) // Show as single page when filtering
            : (result.data?.pagination?.totalPages || Math.ceil(originalTotal / prev.limit)),
        }))
      } else if (result.error) {
        console.error('❌ [PaymentHistory Frontend] API Error:', result.error);
        showError(result.error.message || 'Failed to fetch payment history', 5000)
        setHistory([])
      } else {
        console.warn('⚠️ [PaymentHistory Frontend] No data in response:', result);
        setHistory([])
      }
    } catch (error) {
      console.error('❌ [PaymentHistory Frontend] Exception:', error)
      showError(error.message || 'Failed to fetch payment history', 5000)
    }
  }, [getPaymentHistory, pagination.page, pagination.limit, filters, showError])

  const fetchStats = useCallback(async () => {
    try {
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
      }
      console.log('📊 [PaymentHistory Frontend] Fetching stats with params:', params);
      const result = await getPaymentHistoryStats(params)
      console.log('📊 [PaymentHistory Frontend] Stats response:', result);
      if (result.success && result.data) {
        console.log('✅ [PaymentHistory Frontend] Setting stats:', result.data);
        setStats(result.data)
      } else {
        console.warn('⚠️ [PaymentHistory Frontend] Stats response missing data:', result);
      }
    } catch (error) {
      console.error('❌ [PaymentHistory Frontend] Failed to fetch stats:', error)
    }
  }, [getPaymentHistoryStats, filters.startDate, filters.endDate, filters.status])

  useEffect(() => {
    fetchHistory()
    fetchStats()
  }, [fetchHistory, fetchStats])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      activityType: 'all',
      status: 'all',
      search: '',
      startDate: '',
      userId: '',
      adminId: '',
      orderId: '',
      minAmount: '',
      maxAmount: '',
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = () => {
    return filters.activityType !== 'all' ||
      filters.status !== 'all' ||
      filters.search ||
      filters.startDate ||
      filters.endDate ||
      filters.userId ||
      filters.adminId ||
      filters.orderId ||
      filters.minAmount ||
      filters.maxAmount
  }

  const formatCurrency = (value) => {
    if (typeof value === 'string') return value
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
    return `₹${value.toLocaleString('en-IN')}`
  }

  const formatActivityType = (type) => {
    const typeMap = {
      user_payment_advance: 'User Advance Payment',
      user_payment_remaining: 'User Remaining Payment',
      user_earning_credited: 'Earnings Earned',
      admin_commission_credited: 'Admin Commission',
      user_withdrawal_requested: 'User Withdrawal Request',
      user_withdrawal_approved: 'User Withdrawal Approved',
      user_withdrawal_rejected: 'User Withdrawal Rejected',
      user_withdrawal_completed: 'User Withdrawal Completed',
      admin_withdrawal_requested: 'Admin Withdrawal Request',
      admin_withdrawal_approved: 'Admin Withdrawal Approved',
      admin_withdrawal_rejected: 'Admin Withdrawal Rejected',
      admin_withdrawal_completed: 'Admin Withdrawal Completed',
      bank_account_added: 'Bank Account Added',
      bank_account_updated: 'Bank Account Updated',
      bank_account_deleted: 'Bank Account Deleted',
    }
    return typeMap[type] || type
  }

  const getActivityIcon = (type) => {
    if (type.includes('user_payment')) return Users
    if (type.includes('user')) return Factory
    if (type.includes('admin')) return ShieldCheck
    if (type.includes('bank_account')) return Wallet
    return Wallet
  }

  const getActivityColor = (type) => {
    if (type.includes('user_payment')) return 'blue'
    if (type.includes('user_earning')) return 'green'
    if (type.includes('admin_commission')) return 'yellow'
    if (type.includes('withdrawal')) return 'orange'
    if (type.includes('bank_account')) return 'purple'
    return 'gray'
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'date') {
      return {
        ...column,
        Cell: (row) => {
          const date = row.createdAt || row.processedAt
          return date ? new Date(date).toLocaleString('en-IN') : 'N/A'
        },
      }
    }
    if (column.accessor === 'activityType') {
      return {
        ...column,
        Cell: (row) => {
          const Icon = getActivityIcon(row.activityType)
          const color = getActivityColor(row.activityType)
          return (
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', {
                'bg-blue-100 text-blue-600': color === 'blue',
                'bg-green-100 text-green-600': color === 'green',
                'bg-yellow-100 text-yellow-600': color === 'yellow',
                'bg-orange-100 text-orange-600': color === 'orange',
                'bg-purple-100 text-purple-600': color === 'purple',
                'bg-gray-100 text-gray-600': color === 'gray',
              })}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{formatActivityType(row.activityType)}</span>
            </div>
          )
        },
      }
    }
    if (column.accessor === 'entity') {
      return {
        ...column,
        Cell: (row) => {
          if (row.user?.name) {
            return <span className="text-sm">User: {row.user.name} ({row.user.userId || row.user.phone})</span>
          }
          if (row.admin?.name) {
            return <span className="text-sm">Admin: {row.admin.name} ({row.admin.adminId || row.admin.phone})</span>
          }
          if (row.user?.name) {
            return <span className="text-sm">User: {row.user.name} ({row.user.userId || row.user.phone})</span>
          }
          if (row.order?.orderNumber) {
            return <span className="text-sm">Order: {row.order.orderNumber}</span>
          }
          return <span className="text-sm text-gray-400">N/A</span>
        },
      }
    }
    if (column.accessor === 'amount') {
      return {
        ...column,
        Cell: (row) => (
          <span className={cn('text-sm font-bold', {
            'text-green-600': row.activityType.includes('earning') || row.activityType.includes('commission'),
            'text-red-600': row.activityType.includes('withdrawal'),
            'text-blue-600': row.activityType.includes('payment'),
            'text-gray-900': !row.activityType || row.activityType.includes('bank_account'),
          })}>
            {formatCurrency(row.amount || 0)}
          </span>
        ),
      }
    }
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const status = row.status || 'completed'
          const tone = status === 'completed' || status === 'approved' ? 'success'
            : status === 'pending' || status === 'requested' ? 'warning'
              : status === 'rejected' || status === 'failed' || status === 'cancelled' ? 'neutral'
                : 'default'
          return <StatusBadge tone={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'description') {
      return {
        ...column,
        Cell: (row) => (
          <span className="text-sm text-gray-600">
            {row.description || row.formattedDescription || row.metadata?.orderNumber || 'N/A'}
          </span>
        ),
      }
    }
    return column
  })

  // Filter entity options based on search
  const filteredUserOptions = userOptions.filter(user =>
    !userSearchQuery ||
    user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.phone?.includes(userSearchQuery) ||
    user.userId?.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const filteredAdminOptions = adminOptions.filter(admin =>
    !adminSearchQuery ||
    admin.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
    admin.phone?.includes(adminSearchQuery) ||
    admin.adminId?.toLowerCase().includes(adminSearchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Finance • History</p>
          <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
          <p className="text-sm text-gray-600">Complete audit log of all payment, earnings, and withdrawal activities</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-3xl border border-blue-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-gray-600">User Payments</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalUserPayments || 0)}</p>
        </div>
        <div className="rounded-3xl border border-green-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-4 w-4 text-green-600" />
            <p className="text-xs text-gray-600">User Earnings</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalUserEarnings || 0)}</p>
        </div>
        <div className="rounded-3xl border border-yellow-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-yellow-600" />
            <p className="text-xs text-gray-600">Admin Commissions</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalAdminCommissions || 0)}</p>
        </div>
        <div className="rounded-3xl border border-orange-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-gray-600">User Withdrawals</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalUserWithdrawals || 0)}</p>
        </div>
        <div className="rounded-3xl border border-orange-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-gray-600">Admin Withdrawals</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalAdminWithdrawals || 0)}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-gray-600" />
            <p className="text-xs text-gray-600">Total Activities</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.totalActivities || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
            {hasActiveFilters() && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-2 inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="ml-auto text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>

        {/* Basic Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={filters.activityType}
              onChange={(e) => handleFilterChange('activityType', e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-[200px]"
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-[150px]"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="border-none bg-transparent text-sm outline-none"
              placeholder="Start Date"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="border-none bg-transparent text-sm outline-none"
              placeholder="End Date"
            />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 min-w-[250px]">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by description, order number, name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 border-none bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Filter by User</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                {filters.userId && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('userId', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {userSearchQuery && filteredUserOptions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredUserOptions.slice(0, 10).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        handleFilterChange('userId', user.id)
                        setUserSearchQuery('')
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {user.name} ({user.phone || user.userId})
                    </button>
                  ))}
                </div>
              )}
              {filters.userId && (
                <div className="mt-1 flex items-center gap-2 rounded bg-blue-50 px-2 py-1 text-xs">
                  <span className="text-blue-700">
                    {userOptions.find(u => u.id === filters.userId)?.name || 'Selected User'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('userId', '')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            {/* Admin Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Filter by Admin</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search admin..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                {filters.adminId && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('adminId', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {adminSearchQuery && filteredAdminOptions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredAdminOptions.slice(0, 10).map((admin) => (
                    <button
                      key={admin.id}
                      type="button"
                      onClick={() => {
                        handleFilterChange('adminId', admin.id)
                        setAdminSearchQuery('')
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {admin.name} ({admin.phone || admin.adminId})
                    </button>
                  ))}
                </div>
              )}
              {filters.adminId && (
                <div className="mt-1 flex items-center gap-2 rounded bg-yellow-50 px-2 py-1 text-xs">
                  <span className="text-yellow-700">
                    {adminOptions.find(s => s.id === filters.adminId)?.name || 'Selected Admin'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('adminId', '')}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Order ID Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Filter by Order ID</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter order number..."
                  value={filters.orderId}
                  onChange={(e) => handleFilterChange('orderId', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                {filters.orderId && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('orderId', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Amount Range Filters */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Min Amount (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Max Amount (₹)</label>
              <input
                type="number"
                placeholder="No limit"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <DataTable
              columns={tableColumns}
              rows={history}
              emptyState="No payment history found matching your filters"
              loading={loading}
            />
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1 || loading}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
