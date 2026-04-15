import { useState, useEffect } from 'react'
import { Package, IndianRupee, Tag, X, Percent, Plus } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { ImageUpload } from './ImageUpload'
import { MarkdownEditor } from './MarkdownEditor'
import { FashionSizeSelector } from './FashionSizeSelector'
import { SizeChartManager } from './SizeChartManager'
import { ProductVideoUpload } from './ProductVideoUpload'
import { getAdminCategories } from '../services/adminApi'
import { useAdminState } from '../context/AdminContext'
import { Search } from 'lucide-react'

export function ProductForm({ product, onSubmit, onCancel, loading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    look: '',
    collection: '',
    shortDescription: '',
    description: '',
    // Price — single price for all sizes
    publicPrice: '',      // price shown to customers
    wholesalePrice: '',   // internal/cost price
    discountPublic: '',   // optional discount %
    // Sizes — each { label, actualStock, displayStock, isAvailable }
    sizes: [],
    brand: '',
    tags: [],
    visibility: 'active',
    showStock: false,
    images: [],
    additionalInformation: '',
    shippingPolicy: `<h2>DOMESTIC SHIPPING POLICY</h2><p>Thankyou for visiting and shopping at Noor E Adah. Following are the terms and condition that constitute our shipping policy.</p><h3>Shipment processing time</h3><p>All orders are processed within 1-2 business Days.orders not shipping or delivered on weekends or holidays.</p><h3>Shipping rates & delivery estimates</h3><table><thead><tr><th>Shipment method</th><th>Estimated delivery time</th><th>Shipment cost</th></tr></thead><tbody><tr><td>Standard Shipping</td><td>5-12 business days</td><td>300/-</td></tr><tr><td>Express Shipping</td><td>2-6 business days</td><td>800/-</td></tr></tbody></table>`,
    faqs: [
      { question: "HOW DO I PLACE AN ORDER?", answer: "You can log on to our website: www.nooreadah.com to place a direct order. In case of any assistance required, please contact us on +91 8851800094." },
      { question: "DO I NEED TO SET UP AN ACCOUNT TO PLACE AN ORDER?", answer: "No, you can guest checkout, but an account helps track orders." },
      { question: "HOW DO I MAKE THE PAYMENT?", answer: "We accept all major credit/debit cards, UPI, and net banking." },
      { question: "HOW DO I TRACK MY ORDER?", answer: "You will receive a tracking link via SMS/Email once it ships." },
      { question: "CAN I ORDER FOR COD (CASH ON DELIVERY)?", answer: "Yes, COD is available for select pin codes." },
      { question: "HOW DO I KNOW MY SIZE?", answer: "Refer to our size chart on the product page." }
    ],
    sizeChart: null,
    relatedProducts: [],
    video: null,
  })

  const { products } = useAdminState()
  const allProducts = products?.data?.products || []
  const [relatedSearch, setRelatedSearch] = useState('')

  const [categories, setCategories] = useState([])       // Shop By Category
  const [looks, setLooks] = useState([])                 // Shop By Look
  const [collections, setCollections] = useState([])     // Shop By Collection
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState({})
  // true when any size has a price override → collapses global pricing section
  const [priceOverrideActive, setPriceOverrideActive] = useState(false)

  // ─── Load taxonomy data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTaxonomy = async () => {
      setLoadingCategories(true)
      try {
        const response = await getAdminCategories()
        if (response.success) {
          // API returns { data: [], grouped: { category:[], look:[], theme:[], collection:[] } }
          const grouped = response.grouped || {}
          setCategories(grouped.category || response.data || [])
          setLooks(grouped.look || [])
          setCollections(grouped.collection || [])
        }
      } catch (error) {
        console.error('Failed to load taxonomy:', error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchTaxonomy()
  }, [])

  // ─── Populate form for editing ───────────────────────────────────────────────
  useEffect(() => {
    if (!product) return

    const images = Array.isArray(product.images)
      ? product.images.map((img, i) => ({
        url: img.url || (typeof img === 'string' ? img : ''),
        publicId: img.publicId || '',
        isPrimary: img.isPrimary === true || (i === 0 && img.isPrimary !== false),
        order: img.order !== undefined ? img.order : i,
      }))
      : []

    // Load sizes — prefer new sizes[] field, fall back to empty
    const sizesData = Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : []

    // If any size already has a price, mark override active
    if (sizesData.some(s => s.price && parseFloat(s.price) > 0)) {
      setPriceOverrideActive(true)
    }

    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category?._id || product.category || '',
      look: product.look?._id || product.look || '',
      collection: product.collection?._id || product.collection || '',
      shortDescription: product.shortDescription || '',
      description: product.description || product.longDescription || '',
      publicPrice: product.publicPrice != null ? String(product.publicPrice) : '',
      wholesalePrice: product.wholesalePrice != null ? String(product.wholesalePrice) : '',
      discountPublic: product.discountPublic != null && product.discountPublic > 0
        ? String(product.discountPublic) : '',
      sizes: sizesData,
      brand: product.brand || '',
      tags: Array.isArray(product.tags) ? product.tags : [],
      visibility: product.isActive !== false ? 'active' : 'inactive',
      showStock: product.showStock === true,
      images,
      additionalInformation: product.additionalInformation || '',
      shippingPolicy: product.shippingPolicy || formData.shippingPolicy,
      faqs: (Array.isArray(product.faqs) && product.faqs.length > 0) ? product.faqs : formData.faqs,
      sizeChart: product.sizeChart || null,
      relatedProducts: Array.isArray(product.relatedProducts) ? product.relatedProducts : [],
      video: product.video || null,
    })
  }, [product, allProducts])

  // ─── Generic field change ────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  // ─── FAQ Management ─────────────────────────────────────────────────────────
  const handleAddFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }))
  }

  const handleRemoveFaq = (index) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }))
  }

  const handleFaqChange = (index, field, value) => {
    setFormData(prev => {
      const newFaqs = [...prev.faqs]
      newFaqs[index] = { ...newFaqs[index], [field]: value }
      return { ...prev, faqs: newFaqs }
    })
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────────
  /**
   * Parse a raw string into individual tags.
   * Splits on comma, semicolon, or newline. Trims, lowercases, deduplicates.
   */
  const parseTagString = (raw) => {
    return raw
      .split(/[,;\n]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
  }

  /** Add one or many tags at once, skipping duplicates. */
  const commitTags = (newTags) => {
    if (!newTags.length) return
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, ...newTags.filter(t => !prev.tags.includes(t))],
    }))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const parsed = parseTagString(tagInput)
      commitTags(parsed)
      setTagInput('')
    } else if (e.key === 'Backspace' && tagInput === '' && formData.tags.length > 0) {
      // Backspace on empty input removes the last tag
      handleRemoveTag(formData.tags[formData.tags.length - 1])
    }
  }

  const handleTagPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || ''
    // Only intercept if the pasted text contains a comma/semicolon/newline
    if (/[,;\n]/.test(pasted)) {
      e.preventDefault()
      const parsed = parseTagString(pasted)
      commitTags(parsed)
      setTagInput('')
    }
    // Otherwise let native paste happen (user pasted a single-word tag)
  }

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}

    if (!formData.name.trim()) e.name = 'Product name is required'
    if (!formData.category) e.category = 'Category is required'
    if (!formData.shortDescription.trim()) e.shortDescription = 'Short description is required'

    // Description — Jodit empty state is '<p><br></p>' or empty string
    const descText = (formData.description || '').replace(/<p><br\s*\/?><\/p>/gi, '').replace(/<[^>]*>/g, '').trim()
    if (!descText) e.description = 'Description is required'

    if (!formData.publicPrice || parseFloat(formData.publicPrice) <= 0)
      e.publicPrice = 'Customer price must be greater than 0'

    if (formData.sizes.length === 0)
      e.sizes = 'Select at least one size'

    // Check each size has display stock ≤ actual stock
    formData.sizes.forEach(s => {
      if (s.displayStock > s.actualStock) {
        e.sizes = `Display stock for size ${s.label} exceeds actual stock`
      }
    })

    setErrors(e)

    if (Object.keys(e).length > 0) {
      // Scroll to the first field with an error, in form order
      const fieldOrder = ['name', 'category', 'shortDescription', 'description', 'publicPrice', 'sizes']
      const firstKey = fieldOrder.find(k => e[k]) || Object.keys(e)[0]

      setTimeout(() => {
        // Try by id first, then by name, then by data-field container
        const el =
          document.getElementById(firstKey) ||
          document.querySelector(`[name="${firstKey}"]`) ||
          document.querySelector(`[data-field="${firstKey}"]`)

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (typeof el.focus === 'function') el.focus()
        }
      }, 100)
      return false
    }
    return true
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    // Total stock = sum of all sizes
    const totalActualStock = formData.sizes.reduce((s, sz) => s + (sz.actualStock || 0), 0)
    const totalDisplayStock = formData.sizes.reduce((s, sz) => s + (sz.displayStock || 0), 0)

    // Per-size pricing: if any size has a price, override global pricing
    const hasSizePrices = formData.sizes.some(s => s.price && parseFloat(s.price) > 0)

    const submitData = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || undefined,
      category: formData.category,
      ...(formData.look && { look: formData.look }),
      ...(formData.collection && { collection: formData.collection }),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description,
      longDescription: formData.description,
      additionalInformation: formData.additionalInformation,
      shippingPolicy: formData.shippingPolicy,
      faqs: formData.faqs.filter(f => f.question.trim() && f.answer.trim()),
      publicPrice: hasSizePrices
        ? (parseFloat(formData.sizes.find(s => s.price && parseFloat(s.price) > 0)?.price) || parseFloat(formData.publicPrice) || 0)
        : (parseFloat(formData.publicPrice) || 0),
      wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
      discountPublic: parseFloat(formData.discountPublic) || 0,
      discountWholesale: parseFloat(formData.discountWholesale) || 0,
      sizes: formData.sizes.map(sz => ({
        label: sz.label,
        actualStock: sz.actualStock || 0,
        displayStock: sz.displayStock || 0,
        isAvailable: sz.isAvailable !== false,
        price: (sz.price !== '' && sz.price !== null) ? parseFloat(sz.price) : undefined,
        discountPublic: (sz.discountPublic !== '' && sz.discountPublic !== null) ? parseFloat(sz.discountPublic) : 0,
      })),
      actualStock: totalActualStock,
      displayStock: totalDisplayStock,
      stock: totalDisplayStock, // legacy compat
      ...(formData.brand.trim() && { brand: formData.brand.trim() }),
      tags: formData.tags.filter(t => t.trim() !== ''),
      isActive: formData.visibility === 'active',
      showStock: formData.showStock === true,
      sizeChart: formData.sizeChart,
      relatedProducts: formData.relatedProducts,
      ...(formData.images.length > 0 && { images: formData.images }),
      ...(formData.video && { video: formData.video }),
    }

    onSubmit(submitData)
  }

  // ─── Shared input class ──────────────────────────────────────────────────────
  const inputCls = (field) => cn(
    'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
    errors[field]
      ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
      : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50'
  )

  // ─── Taxonomy select component ────────────────────────────────────────────────
  const TaxSelect = ({ id, label, name, items, optional = false }) => (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-gray-900">
        {label} {!optional && <span className="text-red-500">*</span>}
        {optional && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
      </label>
      <select
        id={id}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        disabled={loadingCategories || loading}
        className={cn(
          'w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 disabled:opacity-50',
          errors[name]
            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50'
        )}
      >
        <option value="">
          {loadingCategories ? 'Loading...' : `Select ${label}`}
        </option>
        {items.map(item => (
          <option key={item._id || item.id} value={item._id || item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Product Name ─────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-bold text-gray-900">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text" id="name" name="name"
          value={formData.name} onChange={handleChange}
          placeholder="e.g., Noor E Adah Royal Blue Velvet Embroidered Kurta Set"
          className={inputCls('name')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* ── SKU ──────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="sku" className="mb-2 block text-sm font-bold text-gray-900">
          SKU <span className="text-xs font-normal text-gray-400">(optional — auto-generated if blank)</span>
        </label>
        <input
          type="text" id="sku" name="sku"
          value={formData.sku} onChange={handleChange}
          placeholder="e.g., SUVRB16"
          className={inputCls('sku')}
        />
      </div>

      {/* ── Taxonomy Row ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TaxSelect id="category" label="Category" name="category" items={categories} />
        <TaxSelect id="look" label="Look" name="look" items={looks} optional />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TaxSelect id="collection" label="Collection" name="collection" items={collections} optional />
      </div>

      {/* ── Short Description ─────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="shortDescription" className="mb-2 block text-sm font-bold text-gray-900">
          Short Description <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-gray-500">(shown on product cards)</span>
        </label>
        <textarea
          id="shortDescription" name="shortDescription"
          value={formData.shortDescription} onChange={handleChange}
          placeholder="1–2 line summary shown on listing cards"
          rows={2} maxLength={150}
          className={cn(inputCls('shortDescription'), 'resize-none')}
        />
        <p className="mt-1 text-xs text-gray-500">{formData.shortDescription.length}/150</p>
        {errors.shortDescription && <p className="mt-1 text-xs text-red-600">{errors.shortDescription}</p>}
      </div>

      {/* ── Full Description ─────────────────────────────────────────────────── */}
      <div data-field="description">
        <label htmlFor="description" className="mb-2 block text-sm font-bold text-gray-900">
          Description <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-gray-500">(shown on product detail page)</span>
        </label>
        <MarkdownEditor
          value={formData.description}
          onChange={handleChange}
          name="description"
          placeholder="Fabric, occasion, care instructions, styling tips..."
          minRows={5}
          maxRows={15}
          disabled={loading}
          error={!!errors.description}
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      {/* ── Additional Information ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <label htmlFor="additionalInformation" className="mb-2 block text-sm font-bold text-gray-900">
          Additional Information
          <span className="ml-2 text-xs font-normal text-gray-500">(specifications, materials, etc.)</span>
        </label>
        <MarkdownEditor
          value={formData.additionalInformation}
          onChange={handleChange}
          name="additionalInformation"
          placeholder="e.g., Colour: Black, Fabric: Silk..."
          minRows={3}
          disabled={loading}
        />
      </div>

      {/* ── Shipping Policy ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <label htmlFor="shippingPolicy" className="mb-2 block text-sm font-bold text-gray-900">
          Shipping & Delivery Policy
        </label>
        <MarkdownEditor
          value={formData.shippingPolicy}
          onChange={handleChange}
          name="shippingPolicy"
          placeholder="Enter custom shipping policy..."
          minRows={4}
          disabled={loading}
        />
      </div>

      {/* ── FAQs Manager ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <label className="text-sm font-bold text-gray-900">Product FAQs</label>
          <button
            type="button"
            onClick={handleAddFaq}
            className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
          >
            <Plus className="h-3 w-3" /> Add FAQ
          </button>
        </div>
        <div className="space-y-4">
          {formData.faqs.map((faq, index) => (
            <div key={index} className="relative rounded-lg border border-gray-200 bg-white p-4 pt-8">
              <button
                type="button"
                onClick={() => handleRemoveFaq(index)}
                className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="space-y-3">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                  placeholder="Question (e.g., How do I track my order?)"
                  className="w-full border-b border-gray-200 pb-1 text-sm font-bold focus:border-purple-500 focus:outline-none"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                  placeholder="Answer..."
                  rows={2}
                  className="w-full text-sm text-gray-600 focus:outline-none resize-none"
                />
              </div>
            </div>
          ))}
          {formData.faqs.length === 0 && (
            <p className="text-center text-xs text-gray-500 italic">No FAQs added for this product.</p>
          )}
        </div>
      </div>

      {/* Product Media & Reels */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <Package className="h-5 w-5" />
          </span>
          Product Media & Reels
        </h3>

        <div className="space-y-6">
          <ImageUpload
            images={formData.images}
            onChange={(images) => setFormData(prev => ({ ...prev, images }))}
            maxImages={20}
            disabled={loading}
          />

          <div className="pt-4 border-t border-gray-50">
            <ProductVideoUpload
              productId={product?._id || product?.id}
              video={formData.video}
              onChange={(video) => setFormData(prev => ({ ...prev, video }))}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800 uppercase tracking-widest">Pricing Strategy</p>
          {priceOverrideActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700 uppercase tracking-widest shadow-sm border border-amber-200">
              ⚡ Per-Size Overrides Active
            </span>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Customer price / Common Price */}
          <div className="space-y-2">
            <label htmlFor="publicPrice" className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-widest">
              <IndianRupee className="h-3.5 w-3.5 text-purple-600" />
              Common Price <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="number" id="publicPrice" name="publicPrice"
              value={formData.publicPrice} onChange={handleChange}
              placeholder="0.00" min="0" step="0.01"
              className={cn(inputCls('publicPrice'), 'font-bold h-12 text-lg shadow-sm border-2 focus:border-purple-600')}
            />
            <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic">
              Compulsory fallback price used when no specific size is selected or size-specific price is unavailable.
            </p>
            {errors.publicPrice && <p className="mt-1 text-xs text-red-600 font-bold">{errors.publicPrice}</p>}
          </div>

          {/* Cost / Wholesale price */}
          <div>
            <label htmlFor="wholesalePrice" className="mb-2 block text-sm font-bold text-gray-900">
              <IndianRupee className="mr-1 inline h-4 w-4" />
              Cost Price
              <span className="ml-1 text-xs font-normal text-gray-400">(internal)</span>
            </label>
            <input
              type="number" id="wholesalePrice" name="wholesalePrice"
              value={formData.wholesalePrice} onChange={handleChange}
              placeholder="0.00" min="0" step="0.01"
              className={cn(inputCls('wholesalePrice'), '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
            />
          </div>

          {/* Discount % */}
          <div>
            <label htmlFor="discountPublic" className="mb-2 block text-sm font-bold text-gray-900">
              <Percent className="mr-1 inline h-4 w-4" />
              Discount %
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="number" id="discountPublic" name="discountPublic"
              value={formData.discountPublic} onChange={handleChange}
              placeholder="0" min="0" max="100" step="0.1"
              className={cn(inputCls('discountPublic'), '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
            />
            {formData.discountPublic && parseFloat(formData.discountPublic) > 0 && formData.publicPrice && (
              <p className="mt-1 text-xs text-green-600">
                Final: ₹{(parseFloat(formData.publicPrice) * (1 - parseFloat(formData.discountPublic) / 100)).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Size Variants ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-purple-200 bg-white p-5" data-field="sizes">
        <h3 className="mb-4 text-sm font-bold text-gray-900">
          Sizes & Stock <span className="text-red-500">*</span>
        </h3>
        <FashionSizeSelector
          sizes={formData.sizes}
          onChange={sizes => { setFormData(prev => ({ ...prev, sizes })); setErrors(prev => ({ ...prev, sizes: '' })) }}
          onPriceOverrideActive={setPriceOverrideActive}
          errors={errors}
          disabled={loading}
        />
      </div>

      {/* ── Size Chart Manager ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <SizeChartManager
          value={formData.sizeChart}
          onChange={val => setFormData(prev => ({ ...prev, sizeChart: val }))}
        />
      </div>

      {/* ── Related Products ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Search className="h-4 w-4 text-purple-600" />
          Related Products
        </label>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products to link..."
              value={relatedSearch}
              onChange={(e) => setRelatedSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500/20 focus:outline-none bg-gray-50/50"
            />
          </div>

          {relatedSearch && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-inner p-2 space-y-1">
              {allProducts
                .filter(p =>
                  p.id !== product?.id &&
                  !formData.relatedProducts.includes(p.id) &&
                  p.name.toLowerCase().includes(relatedSearch.toLowerCase())
                )
                .map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, relatedProducts: [...prev.relatedProducts, p.id] }))
                      setRelatedSearch('')
                    }}
                    className="w-full flex items-center justify-between p-2 text-left text-xs hover:bg-purple-50 rounded-md group"
                  >
                    <span>{p.name}</span>
                    <Plus className="h-3 w-3 text-purple-600 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {formData.relatedProducts.map(id => {
              const p = allProducts.find(prod => prod.id === id)
              return p ? (
                <div key={id} className="flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[10px] font-bold text-purple-700 shadow-sm transition-all hover:shadow-md">
                  {p.name}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, relatedProducts: prev.relatedProducts.filter(rId => rId !== id) }))}
                    className="hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* ── Brand ─────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="brand" className="mb-2 block text-sm font-bold text-gray-900">
          Brand
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text" id="brand" name="brand"
          value={formData.brand} onChange={handleChange}
          placeholder="e.g., Noor E Adah"
          className={inputCls('brand')}
        />
      </div>

      {/* ── Tags ─────────────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="tagInput" className="mb-2 block text-sm font-bold text-gray-900">
          <Tag className="mr-1 inline h-4 w-4" />
          Tags
          <span className="ml-2 text-xs font-normal text-gray-500">Enter or comma-separate · paste a comma-separated list</span>
        </label>
        <input
          type="text" id="tagInput"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onPaste={handleTagPaste}
          placeholder="e.g., bridal, festive, velvet — or paste: bridal,festive,velvet"
          className={inputCls('tagInput')}
        />
        {formData.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Visibility ───────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="visibility" className="mb-2 block text-sm font-bold text-gray-900">
          Visibility
        </label>
        <select
          id="visibility" name="visibility"
          value={formData.visibility} onChange={handleChange}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <option value="active">Active — visible to customers</option>
          <option value="inactive">Hidden — not visible</option>
        </select>
      </div>

      {/* ── Show Stock ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-gray-900">Show Stock to Customers</p>
          <p className="mt-0.5 text-xs font-normal text-gray-500">
            When enabled, customers see stock count ("Only X left!") when fewer than 10 units remain.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, showStock: !prev.showStock }))}
          disabled={loading}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
            formData.showStock ? 'bg-purple-600' : 'bg-gray-300',
            loading && 'cursor-not-allowed opacity-60'
          )}
          role="switch"
          aria-checked={formData.showStock}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out',
              formData.showStock ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form >
  )
}
