import { useState, useEffect } from 'react'
import { ArrowUpRight, BarChart3, Download, PieChart, ArrowLeft, TrendingUp, Users, Building2, Package, Loader2 } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { Timeline } from '../components/Timeline'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

// Format currency helper
function formatCurrency(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

// Format number helper
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function AnalyticsPage({ subRoute = null, navigate }) {
  const { getAnalyticsData, getSalesAnalytics, getUserAnalytics, getOrderAnalytics, loading } = useAdminApi()
  const { error: showError } = useToast()

  const [period, setPeriod] = useState(30)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [userData, setUserData] = useState(null)
  const [orderData, setOrderData] = useState(null)

  // Fetch analytics overview data
  useEffect(() => {
    if (!subRoute) {
      const fetchData = async () => {
        try {
          const result = await getAnalyticsData({ period })
          if (result.data) {
            setAnalyticsData(result.data)
          } else if (result.error) {
            showError(result.error.message || 'Failed to load analytics data', 5000)
          }
        } catch (error) {
          showError(error.message || 'Failed to load analytics data', 5000)
        }
      }
      fetchData()
    }
  }, [subRoute, period, getAnalyticsData, showError])

  // Fetch sales analytics data
  useEffect(() => {
    if (subRoute === 'sales') {
      const fetchData = async () => {
        try {
          const result = await getSalesAnalytics({ period })
          if (result.data) {
            setSalesData(result.data)
          } else if (result.error) {
            showError(result.error.message || 'Failed to load sales analytics', 5000)
          }
        } catch (error) {
          showError(error.message || 'Failed to load sales analytics', 5000)
        }
      }
      fetchData()
    }
  }, [subRoute, period, getSalesAnalytics, showError])



  // Fetch user analytics data
  useEffect(() => {
    if (subRoute === 'users') {
      const fetchData = async () => {
        try {
          const result = await getUserAnalytics({ period })
          if (result.data) {
            setUserData(result.data)
          } else if (result.error) {
            showError(result.error.message || 'Failed to load user analytics', 5000)
          }
        } catch (error) {
          showError(error.message || 'Failed to load user analytics', 5000)
        }
      }
      fetchData()
    }
  }, [subRoute, period, getUserAnalytics, showError])

  // Fetch order analytics data
  useEffect(() => {
    if (subRoute === 'orders') {
      const fetchData = async () => {
        try {
          const result = await getOrderAnalytics({ period })
          if (result.data) {
            setOrderData(result.data)
          } else if (result.error) {
            showError(result.error.message || 'Failed to load order analytics', 5000)
          }
        } catch (error) {
          showError(error.message || 'Failed to load order analytics', 5000)
        }
      }
      fetchData()
    }
  }, [subRoute, period, getOrderAnalytics, showError])

  // Show Overview (default when subRoute is null)
  if (!subRoute) {
    const highlights = analyticsData?.highlights || []
    const timeline = analyticsData?.timeline || []
    const regionWise = analyticsData?.regionWise || []

    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">Insights & Export Hub</h2>
            <p className="text-sm text-gray-600">
              Slice daily, weekly, and monthly performance metrics with export-ready reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]">
              <PieChart className="h-4 w-4" />
              Custom Cohort
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
              <Download className="h-4 w-4" />
              Export Excel / PDF
            </button>
          </div>
        </header>

        <FilterBar
          filters={[
            { id: 'period', label: `Last ${period} days`, active: true },
            { id: 'region', label: 'All regions' },
            { id: 'user', label: 'Top users' },
          ]}
        />

        {loading && !analyticsData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-3">
              {highlights.length > 0 ? (
                highlights.map((item, index) => {
                  const colors = [
                    { border: 'border-blue-200', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', text: 'text-blue-700' },
                    { border: 'border-purple-200', bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50', text: 'text-purple-700' },
                    { border: 'border-green-200', bg: 'bg-gradient-to-br from-green-50 to-green-100/50', text: 'text-green-700' },
                    { border: 'border-yellow-200', bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50', text: 'text-yellow-700' },
                  ]
                  const color = colors[index % colors.length]
                  return (
                    <div key={item.label || index} className={`rounded-3xl border ${color.border} ${color.bg} p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-xs uppercase tracking-wide ${color.text} font-bold`}>{item.label}</p>
                          <p className="mt-3 text-2xl font-bold text-gray-900">{item.value}</p>
                          {item.change && (
                            <StatusBadge tone="success" className="mt-3">{item.change}</StatusBadge>
                          )}
                        </div>
                        <ArrowUpRight className={`h-5 w-5 ${color.text}`} />
                      </div>
                      <p className="mt-4 text-xs text-gray-600">
                        Quick snapshot across the last {period} days with contextual insights layered for the admin.
                      </p>
                    </div>
                  )
                })
              ) : (
                <div className="lg:col-span-3 rounded-3xl border border-gray-200 bg-white p-6 text-center text-gray-500">
                  No analytics data available for the selected period.
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Timeline events={timeline.length > 0 ? timeline : [{
                id: 'no-events',
                title: 'No recent events',
                timestamp: new Date().toLocaleString('en-IN'),
                description: 'No timeline events available.',
                status: 'completed',
              }]} />
              <div className="space-y-4 rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-bold text-indigo-700">Top Products</h3>
                    <p className="text-sm text-gray-600">Best performing products by revenue.</p>
                  </div>
                </div>
                {analyticsData?.topProducts && analyticsData.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData.topProducts.slice(0, 4).map((product, index) => {
                      const colorMap = [
                        'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50',
                        'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50',
                        'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50',
                        'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50',
                      ]
                      return (
                        <div key={product.productId || index} className={`rounded-2xl border ${colorMap[index % colorMap.length]} p-4`}>
                          <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                            <span>{product.productName || 'Unknown Product'}</span>
                            <span>{formatCurrency(product.totalRevenue || 0)}</span>
                          </div>
                          <p className="mt-2 text-xs text-gray-600">
                            {formatNumber(product.totalQuantity || 0)} {product.category || 'units'} sold • {product.orderCount || 0} orders
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No product data available</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    )
  }

  // Show Sales Analytics
  if (subRoute === 'sales') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">Sales Analytics</h2>
            <p className="text-sm text-gray-600">
              Comprehensive sales performance metrics and revenue insights.
            </p>
          </div>
        </div>

        {loading && !salesData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : salesData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-blue-700 font-bold">Total Revenue</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(salesData.summary?.totalRevenue || 0)}</p>
                <p className="mt-1 text-xs text-blue-600">Last {period} days</p>
              </div>
              <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-green-700 font-bold">Total Orders</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(salesData.summary?.totalOrders || 0)}</p>
                <p className="mt-1 text-xs text-green-600">{salesData.summary?.deliveredOrders || 0} delivered</p>
              </div>
              <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-purple-700 font-bold">Avg Order Value</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(salesData.summary?.averageOrderValue || 0)}</p>
                <p className="mt-1 text-xs text-purple-600">Per order</p>
              </div>
              <div className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-yellow-700 font-bold">Fulfillment Rate</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{Math.round(salesData.summary?.fulfillmentRate || 0)}%</p>
                <p className="mt-1 text-xs text-yellow-600">{salesData.summary?.cancelledOrders || 0} cancelled</p>
              </div>
            </section>

            {/* Top Products */}
            {salesData.topProducts && salesData.topProducts.length > 0 && (
              <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-indigo-700">Top Products by Revenue</h3>
                </div>
                <div className="space-y-3">
                  {salesData.topProducts.slice(0, 10).map((product, index) => (
                    <div key={product.id || index} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.category} • {formatNumber(product.quantity)} units • {product.orderCount} orders</p>
                      </div>
                      <p className="font-bold text-indigo-700">{formatCurrency(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-indigo-200 bg-white p-6 text-center text-gray-500">
            No sales data available for the selected period.
          </div>
        )}
      </div>
    )
  }

  // Show User Analytics
  if (subRoute === 'users') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">User Analytics</h2>
            <p className="text-sm text-gray-600">
              User engagement, growth, and behavior analytics.
            </p>
          </div>
        </div>

        {loading && !userData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : userData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-blue-700 font-bold">Total Users</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(userData.summary?.totalUsers || 0)}</p>
                <p className="mt-1 text-xs text-blue-600">{userData.summary?.activeUsers || 0} active</p>
              </div>
              <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-green-700 font-bold">New Users</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(userData.summary?.newUsersInPeriod || 0)}</p>
                <p className="mt-1 text-xs text-green-600">Last {period} days</p>
              </div>
              <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-purple-700 font-bold">Active Users</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(userData.summary?.activeUsersInPeriod || 0)}</p>
                <p className="mt-1 text-xs text-purple-600">With orders in period</p>
              </div>
              <div className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-yellow-700 font-bold">Avg Orders/User</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{userData.summary?.averageOrdersPerUser?.toFixed(1) || '0.0'}</p>
                <p className="mt-1 text-xs text-yellow-600">{userData.summary?.usersWithAdminId || 0} with Assigned Admin</p>
              </div>
            </section>

            {/* Users by State */}
            {userData.usersByState && userData.usersByState.length > 0 && (
              <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-indigo-700">User Distribution by State</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {userData.usersByState.map((item, index) => {
                    const colorMap = [
                      'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50',
                      'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50',
                      'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50',
                      'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50',
                      'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50',
                    ]
                    return (
                      <div key={item.state || index} className={`rounded-2xl border ${colorMap[index % colorMap.length]} p-4`}>
                        <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                          <span>{item.state}</span>
                          <span>{formatNumber(item.count)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-indigo-200 bg-white p-6 text-center text-gray-500">
            No user data available for the selected period.
          </div>
        )}
      </div>
    )
  }
  // Show Order Analytics
  if (subRoute === 'orders') {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('analytics')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Reporting & Analytics</p>
            <h2 className="text-2xl font-bold text-gray-900">Order Analytics</h2>
            <p className="text-sm text-gray-600">
              Order trends, fulfillment rates, and delivery performance.
            </p>
          </div>
        </div>

        {loading && !orderData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : orderData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-blue-700 font-bold">Total Orders</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(orderData.summary?.totalOrders || 0)}</p>
                <p className="mt-1 text-xs text-blue-600">{orderData.summary?.ordersInPeriod || 0} in period</p>
              </div>
              <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-green-700 font-bold">Delivered</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(orderData.summary?.deliveredOrders || 0)}</p>
                <p className="mt-1 text-xs text-green-600">{Math.round(orderData.summary?.fulfillmentRate || 0)}% fulfillment rate</p>
              </div>
              <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-purple-700 font-bold">Avg Order Value</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(orderData.summary?.averageOrderValue || 0)}</p>
                <p className="mt-1 text-xs text-purple-600">Per order</p>
              </div>
              <div className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6">
                <p className="text-xs uppercase tracking-wide text-yellow-700 font-bold">Escalated</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(orderData.summary?.escalatedOrders || 0)}</p>
                <p className="mt-1 text-xs text-yellow-600">{orderData.summary?.cancelledOrders || 0} cancelled</p>
              </div>
            </section>

            {/* Status Breakdown */}
            {orderData.statusBreakdown && orderData.statusBreakdown.length > 0 && (
              <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-indigo-700">Order Status Breakdown</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {orderData.statusBreakdown.map((item, index) => {
                    const colorMap = [
                      'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50',
                      'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50',
                      'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50',
                      'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50',
                    ]
                    return (
                      <div key={item.status || index} className={`rounded-2xl border ${colorMap[index % colorMap.length]} p-4`}>
                        <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                          <span className="capitalize">{item.status?.replace('_', ' ') || 'Unknown'}</span>
                          <span>{formatNumber(item.count)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-indigo-200 bg-white p-6 text-center text-gray-500">
            No order data available for the selected period.
          </div>
        )}
      </div>
    )
  }

  // Default fallback
  return null
}
