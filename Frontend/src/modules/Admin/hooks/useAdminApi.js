/**
 * Custom hook for Admin API integration
 * Provides easy access to API functions with loading states and error handling
 */

import { useState, useCallback } from 'react'
import { useAdminDispatch } from '../context/AdminContext'
import * as adminApi from '../services/adminApi'

export function useAdminApi() {
  const dispatch = useAdminDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callApi = useCallback(
    async (apiFunction, ...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFunction(...args)
        if (result.success) {
          return { success: true, data: result.data, error: null }
        } else {
          setError(result.error)
          return { success: false, data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = { message: err.message || 'An unexpected error occurred' }
        setError(errorMsg)
        return { success: false, data: null, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  // Authentication APIs
  const login = useCallback((credentials) => callApi(adminApi.loginAdmin, credentials), [callApi])

  const logout = useCallback(() => callApi(adminApi.logoutAdmin), [callApi])

  const fetchProfile = useCallback(() => callApi(adminApi.getAdminProfile), [callApi])

  // Dashboard APIs
  const fetchDashboardData = useCallback(
    (params) => {
      return callApi(adminApi.getDashboardData, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_DASHBOARD_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // Product Management APIs
  const getProducts = useCallback(
    (params) => {
      return callApi(adminApi.getProducts, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getProductDetails = useCallback((productId) => callApi(adminApi.getProductDetails, productId), [callApi])

  const createProduct = useCallback(
    (productData) => {
      return callApi(adminApi.createProduct, productData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateProduct = useCallback(
    (productId, productData) => {
      return callApi(adminApi.updateProduct, productId, productData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const deleteProduct = useCallback(
    (productId) => {
      return callApi(adminApi.deleteProduct, productId).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const assignProductToUser = useCallback(
    (productId, assignmentData) => {
      return callApi(adminApi.assignProductToUser, productId, assignmentData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const toggleProductVisibility = useCallback(
    (productId, visibilityData) => {
      return callApi(adminApi.toggleProductVisibility, productId, visibilityData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // User Management APIs
  const getUsers = useCallback(
    (params) => {
      return callApi(adminApi.getUsers, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getUserDetails = useCallback((userId) => callApi(adminApi.getUserDetails, userId), [callApi])

  const approveUser = useCallback(
    (userId, approvalData) => {
      return callApi(adminApi.approveUser, userId, approvalData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectUser = useCallback(
    (userId, rejectionData) => {
      return callApi(adminApi.rejectUser, userId, rejectionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )


  const updateUser = useCallback(
    (userId, userData) => {
      return callApi(adminApi.updateUser, userId, userData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )


  const banUser = useCallback(
    (userId, banData) => {
      return callApi(adminApi.banUser, userId, banData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const unbanUser = useCallback(
    (userId, unbanData) => {
      return callApi(adminApi.unbanUser, userId, unbanData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const deleteUser = useCallback(
    (userId, deleteData) => {
      return callApi(adminApi.deleteUser, userId, deleteData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getUserRankings = useCallback(
    (params) => callApi(adminApi.getUserRankings, params),
    [callApi]
  )

  // User Purchase APIs
  const getUserPurchaseRequests = useCallback(
    (params) => callApi(adminApi.getUserPurchaseRequests, params),
    [callApi],
  )

  const processUserPurchaseStock = useCallback(
    (requestId, deliveryData) => {
      return callApi(adminApi.processUserPurchaseStock, requestId, deliveryData).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const sendUserPurchaseStock = useCallback(
    (requestId, deliveryData) => {
      return callApi(adminApi.sendUserPurchaseStock, requestId, deliveryData).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const confirmUserPurchaseDelivery = useCallback(
    (requestId, deliveryData) => {
      return callApi(adminApi.confirmUserPurchaseDelivery, requestId, deliveryData).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
          dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true }) // Delivery updates stock
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const approveUserPurchase = useCallback(
    (requestId, shortDescription) => {
      return callApi(adminApi.approveUserPurchase, requestId, shortDescription).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectUserPurchase = useCallback(
    (requestId, rejectionData) => {
      return callApi(adminApi.rejectUserPurchase, requestId, rejectionData).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_USERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // User Withdrawal APIs
  const getUserWithdrawalRequests = useCallback((params) => callApi(adminApi.getUserWithdrawalRequests, params), [callApi])

  const createUserWithdrawalPaymentIntent = useCallback(
    (requestId, data) => {
      return callApi(adminApi.createUserWithdrawalPaymentIntent, requestId, data)
    },
    [callApi],
  )

  const approveUserWithdrawal = useCallback(
    (requestId, data) => {
      return callApi(adminApi.approveUserWithdrawal, requestId, data).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectUserWithdrawal = useCallback(
    (requestId, rejectionData) => {
      return callApi(adminApi.rejectUserWithdrawal, requestId, rejectionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const completeUserWithdrawal = useCallback(
    (requestId, completionData) => {
      return callApi(adminApi.completeUserWithdrawal, requestId, completionData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  // Payment History APIs

  // Payment History APIs
  const getPaymentHistory = useCallback((params) => callApi(adminApi.getPaymentHistory, params), [callApi])
  const getPaymentHistoryStats = useCallback((params) => callApi(adminApi.getPaymentHistoryStats, params), [callApi])

  // Order Management APIs
  const getOrders = useCallback(
    (params) => {
      return callApi(adminApi.getOrders, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getOrderDetails = useCallback((orderId) => callApi(adminApi.getOrderDetails, orderId), [callApi])

  const reassignOrder = useCallback(
    (orderId, reassignData) => {
      return callApi(adminApi.reassignOrder, orderId, reassignData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const generateInvoice = useCallback((orderId) => callApi(adminApi.generateInvoice, orderId), [callApi])

  const getCommissions = useCallback(
    (params) => {
      return callApi(adminApi.getCommissions, params)
    },
    [callApi],
  )


  // Operations & Controls APIs
  const getLogisticsSettings = useCallback(() => callApi(adminApi.getLogisticsSettings), [callApi])

  const updateLogisticsSettings = useCallback(
    (settings) => {
      return callApi(adminApi.updateLogisticsSettings, settings).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getEscalatedOrders = useCallback(() => callApi(adminApi.getEscalatedOrders), [callApi])

  const fulfillOrderFromWarehouse = useCallback(
    (orderId, fulfillmentData) => {
      return callApi(adminApi.fulfillOrderFromWarehouse, orderId, fulfillmentData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const revertEscalation = useCallback(
    (orderId, revertData) => {
      return callApi(adminApi.revertEscalation, orderId, revertData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateOrderStatus = useCallback(
    (orderId, statusData) => {
      return callApi(adminApi.updateOrderStatus, orderId, statusData).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getNotifications = useCallback(() => callApi(adminApi.getNotifications), [callApi])

  const createNotification = useCallback(
    (notificationData) => {
      return callApi(adminApi.createNotification, notificationData).then((result) => {
        if (result.data) {
          // Could dispatch a notification update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const updateNotification = useCallback(
    (notificationId, notificationData) => {
      return callApi(adminApi.updateNotification, notificationId, notificationData).then((result) => {
        if (result.data) {
          // Could dispatch a notification update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const deleteNotification = useCallback(
    (notificationId) => {
      return callApi(adminApi.deleteNotification, notificationId).then((result) => {
        if (result.data) {
          // Could dispatch a notification update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  // Analytics & Reports APIs
  const getAnalyticsData = useCallback(
    (params) => {
      return callApi(adminApi.getAnalyticsData, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_ANALYTICS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getSalesAnalytics = useCallback(
    (params) => {
      return callApi(adminApi.getSalesAnalytics, params)
    },
    [callApi],
  )

  const getUserAnalytics = useCallback(
    (params) => {
      return { success: true, data: { summary: {} } } // Mock for removed module
    },
    [],
  )

  const getOrderAnalytics = useCallback(
    (params) => {
      return callApi(adminApi.getOrderAnalytics, params)
    },
    [callApi],
  )

  const exportReports = useCallback((exportData) => callApi(adminApi.exportReports, exportData), [callApi])

  // Review Management APIs
  const getReviews = useCallback((params) => callApi(adminApi.getReviews, params), [callApi])

  const getReviewDetails = useCallback((reviewId) => callApi(adminApi.getReviewDetails, reviewId), [callApi])

  const respondToReview = useCallback(
    (reviewId, data) => {
      return callApi(adminApi.respondToReview, reviewId, data).then((result) => {
        if (result.data) {
          // Could dispatch a review update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const updateReviewResponse = useCallback(
    (reviewId, data) => {
      return callApi(adminApi.updateReviewResponse, reviewId, data).then((result) => {
        if (result.data) {
          // Could dispatch a review update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const deleteReviewResponse = useCallback(
    (reviewId) => {
      return callApi(adminApi.deleteReviewResponse, reviewId).then((result) => {
        if (result.data) {
          // Could dispatch a review update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const moderateReview = useCallback(
    (reviewId, data) => {
      return callApi(adminApi.moderateReview, reviewId, data).then((result) => {
        if (result.data) {
          // Could dispatch a review update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  const deleteReview = useCallback(
    (reviewId) => {
      return callApi(adminApi.deleteReview, reviewId).then((result) => {
        if (result.data) {
          // Could dispatch a review update action if needed
        }
        return result
      })
    },
    [callApi],
  )

  // Task Management APIs
  const fetchTasks = useCallback(
    (params) => {
      return callApi(adminApi.getAdminTasks, params).then((result) => {
        if (result.data) {
          dispatch({ type: 'SET_TASKS_DATA', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const markTaskViewed = useCallback(
    (taskId) => {
      return callApi(adminApi.markTaskAsViewed, taskId).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_TASKS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const markTaskCompleted = useCallback(
    (taskId) => {
      return callApi(adminApi.markTaskAsCompleted, taskId).then((result) => {
        if (result.success) {
          dispatch({ type: 'SET_TASKS_UPDATED', payload: true })
        }
        return result
      })
    },
    [callApi, dispatch],
  )



  return {
    loading,
    error,
    // Authentication
    login,
    logout,
    fetchProfile,
    // Dashboard
    fetchDashboardData,
    // Products
    getProducts,
    getProductDetails,
    createProduct,
    updateProduct,
    deleteProduct,
    assignProductToUser,
    toggleProductVisibility,
    // Users
    getUsers,
    getUserDetails,
    approveUser,
    rejectUser,
    banUser,
    unbanUser,
    deleteUser,
    getUserRankings,
    getPaymentHistory,
    getPaymentHistoryStats,
    // Orders
    getOrders,
    getOrderDetails,
    reassignOrder,
    generateInvoice,
    getCommissions,
    // User Purchases
    getUserPurchaseRequests,
    processUserPurchaseStock,
    sendUserPurchaseStock,
    confirmUserPurchaseDelivery,
    approveUserPurchase,
    rejectUserPurchase,
    // Operations
    getLogisticsSettings,
    updateLogisticsSettings,
    getEscalatedOrders,
    fulfillOrderFromWarehouse,
    revertEscalation,
    updateOrderStatus,
    getNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    // Analytics
    getAnalyticsData,
    getSalesAnalytics,
    getUserAnalytics,
    getOrderAnalytics,
    exportReports,
    // Users (extra)
    updateUser,
    // Reviews
    getReviews,
    getReviewDetails,
    respondToReview,
    updateReviewResponse,
    deleteReviewResponse,
    moderateReview,
    deleteReview,
    // Tasks
    markTaskViewed,
    markTaskCompleted,
    fetchTasks,
    // Categories
    // Categories — use direct call (not callApi) so `grouped` and `types` are preserved
    getCategories: useCallback(async () => {
      try {
        const result = await adminApi.getAdminCategories()
        return result  // { success, data, grouped, types }
      } catch (err) {
        return { success: false, data: [], grouped: {}, error: { message: err.message } }
      }
    }, []),
    getAdminCategories: useCallback(async () => {
      try {
        const result = await adminApi.getAdminCategories()
        return result  // { success, data, grouped, types }
      } catch (err) {
        return { success: false, data: [], grouped: {}, error: { message: err.message } }
      }
    }, []),

    createCategory: useCallback((data) => callApi(adminApi.createCategory, data), [callApi]),
    updateCategory: useCallback((id, data) => callApi(adminApi.updateCategory, id, data), [callApi]),
    deleteCategory: useCallback((id) => callApi(adminApi.deleteCategory, id), [callApi]),
    reorderCategories: useCallback((categories) => callApi(adminApi.reorderCategories, categories), [callApi]),
    // Generic HTTP methods for new APIs
    get: useCallback((endpoint) => callApi(adminApi.apiGet, endpoint), [callApi]),
    post: useCallback((endpoint, data) => callApi(adminApi.apiPost, endpoint, data), [callApi]),
    put: useCallback((endpoint, data) => callApi(adminApi.apiPut, endpoint, data), [callApi]),
    delete: useCallback((endpoint) => callApi(adminApi.apiDelete, endpoint), [callApi]),
  }
}
