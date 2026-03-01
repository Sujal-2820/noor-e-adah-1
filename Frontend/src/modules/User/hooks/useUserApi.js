/**
 * Custom hook for User API integration
 * Provides easy access to API functions with loading states and error handling
 */

import { useState, useCallback } from 'react'
import { useUserDispatch } from '../context/UserContext'
import * as userApi from '../services/userApi'

export function useUserApi() {
  const dispatch = useUserDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callApi = useCallback(
    async (apiFunction, ...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFunction(...args)
        if (result.success) {
          // Extract data from response: { success: true, data: {...} } -> {...}
          const responseData = result.data || result
          return { data: responseData, error: null }
        } else {
          const error = result.error || { message: 'An error occurred' }
          setError(error)
          return { data: null, error: error }
        }
      } catch (err) {
        // Handle errors from handleResponse function
        const errorMsg = err.error?.message || err.message || 'An unexpected error occurred'
        const errorObj = err.error || { message: errorMsg }
        setError(errorObj)
        return { data: null, error: errorObj }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  // Authentication APIs
  const login = useCallback((credentials) => callApi(userApi.loginUser, credentials), [callApi])

  const logout = useCallback(() => callApi(userApi.logoutUser), [callApi])

  const fetchProfile = useCallback(() => callApi(userApi.getUserProfile), [callApi])

  const updateUserProfile = useCallback((data) => callApi(userApi.updateUserProfile, data), [callApi])

  // Dashboard APIs
  const fetchDashboardData = useCallback(() => {
    return callApi(userApi.fetchDashboardData).then((result) => {
      if (result.data) {
        // Backend returns { data: { overview: {...} } }, so extract overview
        dispatch({ type: 'SET_DASHBOARD_OVERVIEW', payload: result.data.overview || result.data })
      }
      return result
    })
  }, [callApi, dispatch])

  // Orders APIs
  const getOrders = useCallback((params) => callApi(userApi.getOrders, params), [callApi])

  const getOrderDetails = useCallback((orderId) => callApi(userApi.getOrderDetails, orderId), [callApi])

  const acceptOrder = useCallback(
    (orderId, notes) => {
      return callApi(userApi.acceptOrder, orderId, notes).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'pending' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const confirmOrderAcceptance = useCallback(
    (orderId, data) => {
      return callApi(userApi.confirmOrderAcceptance, orderId, data).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'awaiting' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const cancelOrderAcceptance = useCallback(
    (orderId, data) => {
      return callApi(userApi.cancelOrderAcceptance, orderId, data).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'pending' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectOrder = useCallback(
    (orderId, reasonData) => {
      return callApi(userApi.rejectOrder, orderId, reasonData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'rejected' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const acceptOrderPartially = useCallback(
    (orderId, partialData) => {
      return callApi(userApi.acceptOrderPartially, orderId, partialData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'partially_accepted' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const escalateOrderPartial = useCallback(
    (orderId, escalationData) => {
      return callApi(userApi.escalateOrderPartial, orderId, escalationData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'partially_accepted' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateOrderStatus = useCallback(
    (orderId, statusData) => {
      return callApi(userApi.updateOrderStatus, orderId, statusData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: statusData.status } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getOrderStats = useCallback((params) => callApi(userApi.getOrderStats, params), [callApi])

  // Product APIs (for viewing and ordering products)
  const getProducts = useCallback((params) => callApi(userApi.getProducts, params), [callApi])

  const getProductDetails = useCallback((productId) => callApi(userApi.getProductDetails, productId), [callApi])

  // Inventory APIs
  const getInventory = useCallback((params) => callApi(userApi.getInventory, params), [callApi])

  const getInventoryItemDetails = useCallback((itemId) => callApi(userApi.getInventoryItemDetails, itemId), [callApi])

  const updateInventoryStock = useCallback(
    (itemId, stockData) => {
      return callApi(userApi.updateInventoryStock, itemId, stockData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_INVENTORY_STOCK', payload: { itemId, stock: stockData.quantity } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getInventoryStats = useCallback(() => callApi(userApi.getInventoryStats), [callApi])

  // Notification APIs
  const getNotifications = useCallback((params) => callApi(userApi.getNotifications, params), [callApi])

  const markNotificationAsRead = useCallback((notificationId) => callApi(userApi.markNotificationAsRead, notificationId), [callApi])

  const markAllNotificationsAsRead = useCallback(() => callApi(userApi.markAllNotificationsAsRead), [callApi])

  const deleteNotification = useCallback((notificationId) => callApi(userApi.deleteNotification, notificationId), [callApi])

  // Earnings APIs
  const getEarningsSummary = useCallback(() => callApi(userApi.getEarningsSummary), [callApi])

  const getEarningsHistory = useCallback((params) => callApi(userApi.getEarningsHistory, params), [callApi])

  const getEarningsByOrders = useCallback((params) => callApi(userApi.getEarningsByOrders, params), [callApi])

  const getBalance = useCallback(() => callApi(userApi.getBalance), [callApi])

  // Withdrawal Request APIs
  const requestWithdrawal = useCallback(
    (withdrawalData) => {
      return callApi(userApi.requestWithdrawal, withdrawalData).then((result) => {
        if (result.data) {
          // Refresh earnings summary after withdrawal request
          getEarningsSummary()
        }
        return result
      })
    },
    [callApi, getEarningsSummary],
  )

  const getWithdrawals = useCallback((params) => callApi(userApi.getWithdrawals, params), [callApi])

  // Stock Purchase APIs
  const requestStockPurchase = useCallback(
    (purchaseData) => {
      return callApi(userApi.requestStockPurchase, purchaseData).then((result) => {
        if (result.data) {
          // Additional logic after stock purchase request if needed
        }
        return result
      })
    },
    [callApi],
  )

  const getStockPurchases = useCallback((params) => callApi(userApi.getStockPurchases, params), [callApi])

  const getStockPurchaseDetails = useCallback((purchaseId) => callApi(userApi.getStockPurchaseDetails, purchaseId), [callApi])

  // Bank Account APIs
  const addBankAccount = useCallback((data) => callApi(userApi.addBankAccount, data), [callApi])

  const getBankAccounts = useCallback(() => callApi(userApi.getBankAccounts), [callApi])

  const updateBankAccount = useCallback((accountId, data) => callApi(userApi.updateBankAccount, accountId, data), [callApi])

  const deleteBankAccount = useCallback((accountId) => callApi(userApi.deleteBankAccount, accountId), [callApi])

  // Reports APIs
  const getReports = useCallback((params) => callApi(userApi.getReports, params), [callApi])

  const getPerformanceAnalytics = useCallback((params) => callApi(userApi.getPerformanceAnalytics, params), [callApi])

  const getRegionAnalytics = useCallback(() => callApi(userApi.getRegionAnalytics), [callApi])

  return {
    loading,
    error,
    // Authentication
    login,
    logout,
    fetchProfile,
    updateUserProfile,
    // Dashboard
    fetchDashboardData,
    // Orders
    getOrders,
    getOrderDetails,
    acceptOrder,
    confirmOrderAcceptance,
    cancelOrderAcceptance,
    acceptOrderPartially,
    rejectOrder,
    escalateOrderPartial,
    updateOrderStatus,
    getOrderStats,
    // Products
    getProducts,
    getProductDetails,
    // Inventory
    getInventory,
    getInventoryItemDetails,
    updateInventoryStock,
    getInventoryStats,
    // Earnings
    getEarningsSummary,
    getEarningsHistory,
    getEarningsByOrders,
    getBalance,
    // Withdrawals
    requestWithdrawal,
    getWithdrawals,
    // Bank Accounts
    addBankAccount,
    getBankAccounts,
    updateBankAccount,
    deleteBankAccount,
    // Stock Purchases
    requestStockPurchase,
    getStockPurchases,
    getStockPurchaseDetails,
    // Reports
    getReports,
    getPerformanceAnalytics,
    getRegionAnalytics,
    // Notifications
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  }
}

