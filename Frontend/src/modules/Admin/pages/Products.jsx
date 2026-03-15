import { useState, useEffect, useCallback } from 'react'
import { Layers3, MapPin, ToggleRight, Edit2, Trash2, ArrowLeft, Package, MoreVertical } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { ProductForm } from '../components/ProductForm'
import { ProductAttributesModal } from '../components/ProductAttributesModal'
import { useAdminState, useAdminDispatch } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { uploadProductVideo } from '../services/adminApi'
import { cn } from '../../../lib/cn'
import { NewArrivalsManager } from '../components/NewArrivalsManager'

const columns = [
  { Header: 'Product', accessor: 'name' },
  { Header: 'Actual Stock', accessor: 'actualStock' },
  { Header: 'User Stock', accessor: 'userStock' },
  { Header: 'User Price', accessor: 'userPrice' },
  { Header: 'Expiry / Batch', accessor: 'expiry' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Visibility', accessor: 'visibility' },
  { Header: 'Actions', accessor: 'actions' },
]

export function ProductsPage({ subRoute = null, navigate }) {
  const { products } = useAdminState()
  const dispatch = useAdminDispatch()
  const { getProducts, createProduct, updateProduct, deleteProduct, toggleProductVisibility, loading } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productsList, setProductsList] = useState([])
  const [allProductsList, setAllProductsList] = useState([])
  const [showAttributesModal, setShowAttributesModal] = useState(false)
  const [selectedProductForAttributes, setSelectedProductForAttributes] = useState(null)
  const [openActionsDropdown, setOpenActionsDropdown] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')

  const regionColors = [
    { border: 'border-green-200', bg: 'bg-gradient-to-br from-green-50 to-green-100/50', text: 'text-green-700', progress: 'bg-gradient-to-r from-green-500 to-green-600' },
    { border: 'border-yellow-200', bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50', text: 'text-yellow-700', progress: 'bg-gradient-to-r from-yellow-500 to-yellow-600' },
    { border: 'border-blue-200', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', text: 'text-blue-700', progress: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { border: 'border-purple-200', bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50', text: 'text-purple-700', progress: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { border: 'border-indigo-200', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', text: 'text-indigo-700', progress: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
    { border: 'border-orange-200', bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50', text: 'text-orange-700', progress: 'bg-gradient-to-r from-orange-500 to-orange-600' },
  ]

  // Format product data for display
  const formatProductForDisplay = (product) => {
    // Get actual stock
    const actualStockValue = typeof product.actualStock === 'number'
      ? product.actualStock
      : parseFloat(product.actualStock?.replace(/[^\d.]/g, '') || '0')

    // Get display stock (user stock)
    const displayStockValue = typeof product.displayStock === 'number'
      ? product.displayStock
      : parseFloat(product.displayStock?.replace(/[^\d.]/g, '') || product.stock?.replace(/[^\d.]/g, '') || '0')

    const stockUnit = product.weight?.unit || product.stockUnit || 'kg'
    const actualStockFormatted = `${actualStockValue.toLocaleString('en-IN')} ${stockUnit}`
    const userStockFormatted = `${displayStockValue.toLocaleString('en-IN')} ${stockUnit}`

    const userPrice = Math.round(typeof product.userPrice === 'number' ? product.userPrice : parseFloat(product.userPrice?.replace(/[₹,]/g, '') || product.priceToUser || '0'))

    // Format expiry date
    let expiryFormatted = product.expiry || ''
    if (product.expiry && product.expiry.includes('-')) {
      const date = new Date(product.expiry)
      expiryFormatted = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    }

    // Include batch number if available
    if (product.batchNumber) {
      expiryFormatted = expiryFormatted ? `${expiryFormatted} (${product.batchNumber})` : product.batchNumber
    }

    const visibility = product.isActive !== false ? 'Active' : 'Inactive'

    return {
      ...product,
      actualStock: actualStockFormatted,
      userStock: userStockFormatted,
      userPrice: `₹${userPrice.toLocaleString('en-IN')}`,
      expiry: expiryFormatted,
      visibility: visibility,
    }
  }

  // Fetch products
  const fetchProducts = useCallback(async () => {
    const result = await getProducts()
    if (result.data?.products) {
      const formatted = result.data.products.map(formatProductForDisplay)
      setAllProductsList(formatted)
    } else {
      setAllProductsList([])
    }
  }, [getProducts])

  // Filter products based on subRoute
  useEffect(() => {
    if (subRoute === 'active') {
      setProductsList(allProductsList.filter((p) => p.visibility === 'Active' || p.isActive !== false))
    } else if (subRoute === 'inactive') {
      setProductsList(allProductsList.filter((p) => p.visibility === 'Inactive' || p.isActive === false))
    } else {
      setProductsList(allProductsList)
    }
  }, [subRoute, allProductsList])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    if (products.updated) {
      fetchProducts()
      dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: false })
    }
  }, [products.updated, fetchProducts, dispatch])

  const handleEditProduct = (product) => {
    // Find original product data (before formatting)
    const originalProduct = products.data?.products?.find((p) => p.id === product.id) || product
    setSelectedProduct(originalProduct)
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return
    try {
      setIsProcessing(true)
      setProcessingMessage('Deleting Product...')
      const result = await deleteProduct(productId)
      if (result.data) {
        // Optimistic update
        setAllProductsList(prev => prev.filter(p => p.id !== productId))
        setProductsList(prev => prev.filter(p => p.id !== productId))
        fetchProducts()
        success('Product deleted successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to delete product'
        // Check if it's a warning (product has active assignments)
        if (errorMessage.includes('active user assignment')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to delete product', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleVisibility = async (product) => {
    try {
      setIsProcessing(true)
      setProcessingMessage('Updating Visibility...')
      const currentVisibility = product.visibility === 'Active' || product.visibility === 'active' ? 'active' : 'inactive'
      const newVisibility = currentVisibility === 'active' ? 'inactive' : 'active'

      const result = await toggleProductVisibility(product.id, { visibility: newVisibility })
      if (result.data) {
        fetchProducts()
        success(`Product visibility set to ${newVisibility === 'active' ? 'Active' : 'Inactive'}!`, 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to update product visibility'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to update product visibility', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFormSubmit = async (formData) => {
    try {
      // Detect a pending video file (selected before the product was saved)
      const pendingVideoFile = formData.video?._pendingFile instanceof File
        ? formData.video._pendingFile
        : null

      // Strip _pendingFile from the payload — the backend doesn't accept File objects
      const cleanFormData = pendingVideoFile
        ? { ...formData, video: null }
        : formData

      setIsProcessing(true)
      setProcessingMessage(selectedProduct ? 'Updating Product...' : 'Creating Product...')

      if (selectedProduct) {
        // Update existing product
        const result = await updateProduct(selectedProduct.id, cleanFormData)
        if (result.data) {
          setSelectedProduct(null)
          fetchProducts()
          success('Product updated successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to update product'
          if (errorMessage.includes('validation') || errorMessage.includes('required')) {
            showWarning(errorMessage, 5000)
          } else {
            showError(errorMessage, 5000)
          }
        } else {
          showError('Unexpected response from server. Please try again.', 5000)
        }
      } else {
        // Create new product
        const result = await createProduct(cleanFormData)
        if (result.data) {
          const newProductId = result.data.product?._id || result.data.product?.id || result.data._id || result.data.id

          // ── Upload pending reel now that we have a product ID ──
          if (pendingVideoFile && newProductId) {
            try {
              const videoResult = await uploadProductVideo(newProductId, pendingVideoFile)
              if (!videoResult.success) {
                showWarning('Product saved! However, the reel could not be uploaded. You can add it from the Edit Product screen.', 6000)
              }
            } catch (videoErr) {
              showWarning('Product saved! However, the reel upload failed. You can add it from the Edit Product screen.', 6000)
            }
          }

          setSelectedProduct(null)
          fetchProducts()
          success('Product created successfully!', 3000)
          if (navigate) {
            setTimeout(() => { navigate('products') }, 500)
          }
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to create product'
          if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('duplicate')) {
            showWarning(errorMessage, 5000)
          } else {
            showError(errorMessage, 5000)
          }
        } else {
          showError('Unexpected response from server. Please try again.', 5000)
        }
      }
    } catch (error) {
      console.error('Error in handleFormSubmit:', error)
      showError(error.message || 'Failed to save product', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'name') {
      return {
        ...column,
        Cell: (row) => {
          const originalProduct = products.data?.products?.find((p) => p.id === row.id) || row
          const hasAttributes = originalProduct.attributeStocks &&
            Array.isArray(originalProduct.attributeStocks) &&
            originalProduct.attributeStocks.length > 0

          return (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{row.name}</span>
              {hasAttributes && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForAttributes(originalProduct)
                    setShowAttributesModal(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 transition-all hover:border-blue-500 hover:bg-blue-100"
                  title={`View ${originalProduct.attributeStocks.length} attribute variant(s)`}
                >
                  <Package className="h-3 w-3" />
                  {originalProduct.attributeStocks.length} variant{originalProduct.attributeStocks.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )
        },
      }
    }
    if (column.accessor === 'visibility') {
      return {
        ...column,
        Cell: (row) => (
          <StatusBadge tone={row.visibility === 'Active' ? 'success' : 'warning'}>
            {row.visibility}
          </StatusBadge>
        ),
      }
    }
    if (column.accessor === 'region') {
      return {
        ...column,
        Cell: (row) => (
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-3 py-1 text-xs text-blue-700 font-bold shadow-[0_2px_8px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <MapPin className="h-3.5 w-3.5" />
            {row.region}
          </div>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalProduct = products.data?.products?.find((p) => p.id === row.id) || row
          // Check if product has attributes
          const hasAttributes = originalProduct.attributeStocks &&
            Array.isArray(originalProduct.attributeStocks) &&
            originalProduct.attributeStocks.length > 0



          const isDropdownOpen = openActionsDropdown === row.id
          const actionItems = []

          if (hasAttributes) {
            actionItems.push({
              label: 'View Attributes',
              icon: Package,
              onClick: () => {
                setSelectedProductForAttributes(originalProduct)
                setShowAttributesModal(true)
                setOpenActionsDropdown(null)
              },
              className: 'text-blue-700 hover:bg-blue-50'
            })
          }

          actionItems.push({
            label: 'Edit Product',
            icon: Edit2,
            onClick: () => {
              handleEditProduct(originalProduct)
              setOpenActionsDropdown(null)
            },
            className: 'text-gray-700 hover:bg-gray-50'
          })

          actionItems.push({
            label: 'Delete Product',
            icon: Trash2,
            onClick: () => {
              handleDeleteProduct(row.id)
              setOpenActionsDropdown(null)
            },
            className: 'text-red-700 hover:bg-red-50'
          })

          return (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenActionsDropdown(isDropdownOpen ? null : row.id)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                title="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenActionsDropdown(null)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                    {actionItems.map((item, index) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!item.disabled) {
                              item.onClick()
                            }
                          }}
                          disabled={item.disabled}
                          className={cn(
                            'w-full flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                            item.className,
                            item.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      )
                    })}
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

  // Show full-screen form view when subRoute is 'add' or when editing
  if (subRoute === 'new-arrivals') {
    return <NewArrivalsManager onBack={() => navigate('products')} />
  }

  if (subRoute === 'add' || selectedProduct) {
    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedProduct(null)
              if (navigate) navigate('products')
            }}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 2 • Master Product Management</p>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedProduct
                ? 'Update product details, pricing, and stock information.'
                : 'Create a new product entry with pricing, stock, and visibility settings.'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <ProductForm
            product={selectedProduct}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setSelectedProduct(null)
              if (navigate) navigate('products')
            }}
            loading={loading}
          />
        </div>
        <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
      </div>
    )
  }

  // Show products list view
  const getPageTitle = () => {
    if (subRoute === 'active') return 'Active Products'
    if (subRoute === 'inactive') return 'Inactive Products'
    return 'Central Catalogue Control'
  }

  const getPageDescription = () => {
    if (subRoute === 'active') return 'View and manage all active products in the catalogue.'
    if (subRoute === 'inactive') return 'View and manage all inactive products in the catalogue.'
    return 'Manage pricing, stock distribution, and regional visibility with batch-level precision.'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 2 • Master Product Management</p>
          <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm text-gray-600">
            {getPageDescription()}
          </p>
        </div>
      </div>

      <FilterBar
        filters={[
          { id: 'region', label: 'All regions', active: true },
          { id: 'visibility', label: 'Active status' },
          { id: 'expiry', label: 'Expiry alerts' },
        ]}
      />

      <DataTable
        columns={tableColumns}
        rows={productsList}
        emptyState="No products found in the catalogue"
      />

      {/* Attributes Modal */}
      <ProductAttributesModal
        productId={selectedProductForAttributes?._id || selectedProductForAttributes?.id}
        productName={selectedProductForAttributes?.name}
        isOpen={showAttributesModal}
        onClose={() => {
          setShowAttributesModal(false)
          setSelectedProductForAttributes(null)
          fetchProducts() // Refresh to get updated stock
        }}
      />

      <div className="space-y-6">
        <div className="space-y-3 rounded-3xl border border-orange-200 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <header className="border-b border-orange-200 pb-3">
            <h3 className="text-lg font-bold text-orange-700">Visibility Controls</h3>
            <p className="text-sm text-gray-600">
              Toggle product availability and orchestrate upcoming launches or sunset batches.
            </p>
          </header>
          {productsList.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {productsList.map((product) => {
                const originalProduct = products.data?.products?.find((p) => p.id === product.id) || product
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-600">Batch expiry • {product.expiry}</p>
                    </div>
                    <button
                      onClick={() => handleToggleVisibility(originalProduct)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-all duration-200 hover:scale-105',
                        product.visibility === 'Active'
                          ? 'border-green-200 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_8px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]'
                          : 'border-gray-200 bg-white text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700'
                      )}
                    >
                      <ToggleRight className="h-4 w-4" />
                      {product.visibility === 'Active' ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 italic py-8">No products available for visibility control.</p>
          )}
        </div>
      </div>
      <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
    </div>
  )
}

