import { useState, useEffect, useCallback } from 'react'
import { Star, MessageSquare, Eye, EyeOff, CheckCircle, XCircle, Send, Edit2, Trash2, Filter, Search, MoreVertical } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Product', accessor: 'product' },
  { Header: 'User', accessor: 'user' },
  { Header: 'Rating', accessor: 'rating' },
  { Header: 'Comment', accessor: 'comment' },
  { Header: 'Date', accessor: 'date' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Response', accessor: 'hasResponse' },
  { Header: 'Actions', accessor: 'actions' },
]

export function ReviewsPage({ subRoute = null, navigate }) {
  const { getReviews, getReviewDetails, respondToReview, updateReviewResponse, deleteReviewResponse, moderateReview, deleteReview, loading } = useAdminApi()
  const { success, error: showError } = useToast()

  const [reviewsList, setReviewsList] = useState([])
  const [allReviewsList, setAllReviewsList] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [editingResponse, setEditingResponse] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [filters, setFilters] = useState({
    productId: '',
    userId: '',
    rating: '',
    hasResponse: '',
    isApproved: '',
    isVisible: '',
    search: '',
  })

  // Fetch reviews - only when server-side filters change
  const serverFilters = JSON.stringify({
    productId: filters.productId,
    userId: filters.userId,
    rating: filters.rating,
    hasResponse: filters.hasResponse,
    isApproved: filters.isApproved,
    isVisible: filters.isVisible
  })

  const fetchReviews = useCallback(async () => {
    try {
      const params = {}
      if (filters.productId && filters.productId.trim()) params.productId = filters.productId.trim()
      if (filters.userId && filters.userId.trim()) params.userId = filters.userId.trim()
      if (filters.rating && filters.rating.trim()) params.rating = filters.rating.trim()
      if (filters.hasResponse && filters.hasResponse.trim()) params.hasResponse = filters.hasResponse.trim()
      if (filters.isApproved !== '' && filters.isApproved !== undefined) params.isApproved = filters.isApproved
      if (filters.isVisible !== '' && filters.isVisible !== undefined) params.isVisible = filters.isVisible

      const result = await getReviews(params)
      if (result.data?.reviews) {
        const formatted = result.data.reviews.map(formatReviewForDisplay)
        setAllReviewsList(formatted)
      } else if (result.error) {
        showError(result.error.message || 'Failed to fetch reviews')
      } else {
        setAllReviewsList([])
      }
    } catch (error) {
      showError(error.message || 'Failed to fetch reviews')
    }
  }, [getReviews, serverFilters, showError])

  // Format review for display
  const formatReviewForDisplay = (review) => {
    const productName = review.productId?.name || 'Unknown Product'
    const userName = review.userId?.name || 'Anonymous'
    const userPhone = review.userId?.phone || ''
    const rating = review.rating || 0
    const comment = review.comment || 'No comment'
    const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : 'N/A'

    const status = []
    if (review.isApproved) status.push('Approved')
    else status.push('Pending')
    if (!review.isVisible) status.push('Hidden')

    const hasResponse = review.adminResponse?.response ? 'Yes' : 'No'

    return {
      ...review,
      product: productName,
      user: `${userName}${userPhone ? ` (${userPhone})` : ''}`,
      rating,
      comment: comment.length > 50 ? comment.substring(0, 50) + '...' : comment,
      fullComment: comment,
      date,
      status: status.join(', '),
      hasResponse,
      isApproved: review.isApproved,
      isVisible: review.isVisible,
    }
  }

  // Filter reviews based on search
  useEffect(() => {
    let filtered = allReviewsList

    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(review =>
        review.product?.toLowerCase().includes(searchLower) ||
        review.user?.toLowerCase().includes(searchLower) ||
        review.fullComment?.toLowerCase().includes(searchLower)
      )
    }

    setReviewsList(filtered)
  }, [filters.search, allReviewsList])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Handle respond to review
  const handleRespondToReview = async (review) => {
    setSelectedReview(review)
    setResponseText(review.adminResponse?.response || '')
    setEditingResponse(!!review.adminResponse?.response)
    setShowResponseModal(true)
  }

  // Submit response
  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      showError('Response text is required')
      return
    }

    try {
      let result
      if (editingResponse) {
        result = await updateReviewResponse(selectedReview._id, { response: responseText })
      } else {
        result = await respondToReview(selectedReview._id, { response: responseText })
      }

      if (result.data) {
        success(editingResponse ? 'Response updated successfully' : 'Response added successfully')
        setShowResponseModal(false)
        setResponseText('')
        setSelectedReview(null)
        fetchReviews()
      } else if (result.error) {
        showError(result.error.message || 'Failed to submit response')
      }
    } catch (error) {
      showError(error.message || 'Failed to submit response')
    }
  }

  // Delete response
  const handleDeleteResponse = async (review) => {
    if (!confirm('Are you sure you want to delete this response?')) return

    try {
      const result = await deleteReviewResponse(review._id)
      if (result.data) {
        success('Response deleted successfully')
        fetchReviews()
      } else if (result.error) {
        showError(result.error.message || 'Failed to delete response')
      }
    } catch (error) {
      showError(error.message || 'Failed to delete response')
    }
  }

  // Moderate review
  const handleModerateReview = async (review, action) => {
    let updateData = {}

    if (action === 'approve') {
      updateData.isApproved = true
    } else if (action === 'reject') {
      updateData.isApproved = false
    } else if (action === 'hide') {
      updateData.isVisible = false
    } else if (action === 'show') {
      updateData.isVisible = true
    }

    try {
      const result = await moderateReview(review._id, updateData)
      if (result.data) {
        success('Review moderated successfully')
        fetchReviews()
      } else if (result.error) {
        showError(result.error.message || 'Failed to moderate review')
      }
    } catch (error) {
      showError(error.message || 'Failed to moderate review')
    }
  }

  // Delete review
  const handleDeleteReview = async (review) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return

    try {
      const result = await deleteReview(review._id)
      if (result.data) {
        success('Review deleted successfully')
        fetchReviews()
      } else if (result.error) {
        showError(result.error.message || 'Failed to delete review')
      }
    } catch (error) {
      showError(error.message || 'Failed to delete review')
    }
  }

  // Render rating stars
  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-4 w-4',
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            )}
          />
        ))}
        <span className="ml-1 text-sm font-semibold text-gray-700">{rating}</span>
      </div>
    )
  }

  // Format table columns with Cell functions
  const tableColumns = columns.map((column) => {
    if (column.accessor === 'product') {
      return {
        ...column,
        Cell: (row) => (
          <div className="font-semibold text-gray-900">{row.product}</div>
        ),
      }
    }
    if (column.accessor === 'user') {
      return {
        ...column,
        Cell: (row) => (
          <div className="text-sm text-gray-700">{row.user}</div>
        ),
      }
    }
    if (column.accessor === 'rating') {
      return {
        ...column,
        Cell: (row) => renderStars(row.rating),
      }
    }
    if (column.accessor === 'comment') {
      return {
        ...column,
        Cell: (row) => (
          <div className="max-w-xs text-sm text-gray-600" title={row.fullComment}>
            {row.comment}
          </div>
        ),
      }
    }
    if (column.accessor === 'date') {
      return {
        ...column,
        Cell: (row) => <div className="text-sm text-gray-600">{row.date}</div>,
      }
    }
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => (
          <div className="flex items-center gap-2">
            <StatusBadge
              status={row.isApproved ? 'approved' : 'pending'}
              label={row.isApproved ? 'Approved' : 'Pending'}
            />
            {!row.isVisible && (
              <StatusBadge status="hidden" label="Hidden" />
            )}
          </div>
        ),
      }
    }
    if (column.accessor === 'hasResponse') {
      return {
        ...column,
        Cell: (row) => (
          <div className="flex items-center gap-1">
            {row.hasResponse === 'Yes' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Yes</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">No</span>
              </>
            )}
          </div>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const review = reviewsList.find(r => (r._id || r.id) === row.id) || row
          const isOpen = activeDropdown === row.id

          return (
            <div className={cn("relative", isOpen ? "z-50" : "z-0")}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveDropdown(isOpen ? null : row.id)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                title="View Actions"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {isOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActiveDropdown(null)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50 py-2 overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                    <button
                      onClick={() => {
                        handleRespondToReview(review)
                        setActiveDropdown(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {review.hasResponse === 'Yes' ? 'Edit Response' : 'Respond'}
                    </button>

                    {review.hasResponse === 'Yes' && (
                      <button
                        onClick={() => {
                          handleDeleteResponse(review)
                          setActiveDropdown(null)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Response
                      </button>
                    )}

                    <div className="h-px bg-gray-100 my-1" />

                    {review.isVisible ? (
                      <button
                        onClick={() => {
                          handleModerateReview(review, 'hide')
                          setActiveDropdown(null)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide Review
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleModerateReview(review, 'show')
                          setActiveDropdown(null)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Show Review
                      </button>
                    )}

                    {!review.isApproved && (
                      <button
                        onClick={() => {
                          handleModerateReview(review, 'approve')
                          setActiveDropdown(null)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve Review
                      </button>
                    )}

                    <button
                      onClick={() => {
                        handleDeleteReview(review)
                        setActiveDropdown(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Review
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        },
      }
    }
    return column
  })

  // Format table rows - ensure each row has an id
  const tableRows = reviewsList.map((review) => ({
    id: review._id || review.id, // DataTable needs an id field
    ...review,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Reviews</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and respond to product reviews</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          {
            label: 'Search',
            type: 'search',
            value: filters.search,
            onChange: (value) => setFilters(prev => ({ ...prev, search: value })),
            placeholder: 'Search by product, user, or comment...',
          },
          {
            label: 'Rating',
            type: 'select',
            value: filters.rating,
            onChange: (value) => setFilters(prev => ({ ...prev, rating: value })),
            options: [
              { value: '', label: 'All Ratings' },
              { value: '5', label: '5 Stars' },
              { value: '4', label: '4 Stars' },
              { value: '3', label: '3 Stars' },
              { value: '2', label: '2 Stars' },
              { value: '1', label: '1 Star' },
            ],
          },
          {
            label: 'Has Response',
            type: 'select',
            value: filters.hasResponse,
            onChange: (value) => setFilters(prev => ({ ...prev, hasResponse: value })),
            options: [
              { value: '', label: 'All' },
              { value: 'true', label: 'With Response' },
              { value: 'false', label: 'Without Response' },
            ],
          },
          {
            label: 'Status',
            type: 'select',
            value: filters.isApproved,
            onChange: (value) => setFilters(prev => ({ ...prev, isApproved: value })),
            options: [
              { value: '', label: 'All' },
              { value: 'true', label: 'Approved' },
              { value: 'false', label: 'Pending' },
            ],
          },
        ]}
      />

      {/* Reviews Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading reviews...
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            rows={tableRows}
            emptyState="No reviews found"
          />
        )}
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingResponse ? 'Edit Response' : 'Respond to Review'}
                </h2>
                <button
                  onClick={() => {
                    setShowResponseModal(false)
                    setResponseText('')
                    setSelectedReview(null)
                    setEditingResponse(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Review Details */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedReview.product}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedReview.user}</p>
                  </div>
                  {renderStars(selectedReview.rating)}
                </div>
                <p className="text-sm text-gray-700">{selectedReview.fullComment}</p>
                <p className="text-xs text-gray-500">{selectedReview.date}</p>
              </div>

              {/* Response Textarea */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Response <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response to this review..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none resize-none"
                  rows={6}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {responseText.length}/1000 characters
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSubmitResponse}
                  disabled={!responseText.trim() || loading}
                  className={cn(
                    'flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                    !responseText.trim() || loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md'
                  )}
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Submitting...' : editingResponse ? 'Update Response' : 'Send Response'}
                </button>
                <button
                  onClick={() => {
                    setShowResponseModal(false)
                    setResponseText('')
                    setSelectedReview(null)
                    setEditingResponse(false)
                  }}
                  className="py-3 px-6 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

