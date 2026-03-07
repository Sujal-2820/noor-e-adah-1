import { useMemo, useState, useEffect, useRef } from 'react'
import { useUserState } from '../../../context/UserContext'
import { PlusIcon, MinusIcon, TrashIcon, TruckIcon, ChevronRightIcon, HelpCircleIcon } from '../../../../../components/shared/catalog'
import { cn } from '../../../../../lib/cn'
import { useUserApi } from '../../../hooks/useUserApi'
import { getPrimaryImageUrl } from '../../../../../utils/productImages'
import { Trans } from '../../../../../components/Trans'
import { TransText } from '../../../../../components/TransText'

export function UserCartView({ onUpdateQuantity, onRemove, onCheckout, onAddToCart, onNavigateToProduct }) {
    const { cart, settings, deliveryConfig } = useUserState()
    const MIN_VENDOR_PURCHASE = settings?.minimumUserPurchase || 50000
    const [suggestedProducts, setSuggestedProducts] = useState([])
    const [cartProducts, setCartProducts] = useState({})
    const [expandedVariants, setExpandedVariants] = useState({})
    const fetchingProductsRef = useRef(new Set())
    const { getProducts, getProductDetails, getRepaymentRules } = useUserApi()

    // Credit Cycle States
    const [sliderProgress, setSliderProgress] = useState(0)
    const [repaymentRules, setRepaymentRules] = useState({
        discountTiers: [
            { start: 0, end: 15, rate: 5, name: 'Early Bird' },
            { start: 16, end: 30, rate: 2, name: 'Standard' }
        ],
        interestTiers: [
            { start: 45, end: 60, rate: 2, name: 'Late Fee' },
            { start: 61, end: 180, rate: 5, name: 'Extended Late' }
        ]
    })

    // Optimistic quantity state for instant UI updates
    const [optimisticQuantities, setOptimisticQuantities] = useState({})

    // Sync optimistic quantities when cart updates
    useEffect(() => {
        const newOptimisticQuantities = {}
        cart.forEach(item => {
            const id = `${item.productId}-${JSON.stringify(item.variantAttributes || {})}`
            newOptimisticQuantities[id] = item.quantity
        })
        setOptimisticQuantities(newOptimisticQuantities)
    }, [cart])

    // Fetch suggested products (exclude items already in cart)
    useEffect(() => {
        const loadSuggested = async () => {
            try {
                const cartProductIds = cart.map((item) => item.productId)
                const result = await getProducts({ limit: 20 })
                if (result.data?.products) {
                    const available = result.data.products.filter(
                        (p) => !cartProductIds.includes(p._id || p.id)
                    )
                    // Shuffle and take 8
                    const shuffled = [...available].sort(() => Math.random() - 0.5)
                    setSuggestedProducts(shuffled.slice(0, 8))
                }
            } catch (error) {
                console.error('Error loading suggested products:', error)
            }
        }

        if (cart.length > 0) {
            loadSuggested()
        }
    }, [cart, getProducts])

    // Fetch product details for cart items
    useEffect(() => {
        const loadCartProducts = async () => {
            setCartProducts(currentProducts => {
                const productsToFetch = cart.filter(item =>
                    !currentProducts[item.productId] && !fetchingProductsRef.current.has(item.productId)
                )

                if (productsToFetch.length === 0) {
                    return currentProducts
                }

                productsToFetch.forEach(item => fetchingProductsRef.current.add(item.productId))

                productsToFetch.forEach(async (item) => {
                    try {
                        const result = await getProductDetails(item.productId)
                        if (result.data?.product) {
                            setCartProducts(prev => ({
                                ...prev,
                                [item.productId]: result.data.product
                            }))
                        }
                    } catch (error) {
                        console.error(`Error loading product ${item.productId}:`, error)
                    } finally {
                        fetchingProductsRef.current.delete(item.productId)
                    }
                })

                return currentProducts
            })
        }

        if (cart.length > 0) {
            loadCartProducts()
        } else {
            setCartProducts({})
            fetchingProductsRef.current.clear()
        }
    }, [cart, getProductDetails])

    // Fetch repayment rules
    useEffect(() => {
        const loadRules = async () => {
            try {
                const rulesResult = await getRepaymentRules()
                if (rulesResult.data && (rulesResult.data.discountTiers?.length || rulesResult.data.interestTiers?.length)) {
                    setRepaymentRules(rulesResult.data)
                }
            } catch (error) {
                console.error('Error loading repayment rules:', error)
            }
        }
        loadRules()
    }, [getRepaymentRules])

    // Derived tiers for calculation
    const discountTiers = useMemo(() => {
        const tiers = repaymentRules.discountTiers || []
        return tiers.map(t => ({
            start: t.start,
            end: t.end,
            rate: t.rate,
            label: t.name || `${t.start}-${t.end} days`
        }))
    }, [repaymentRules.discountTiers])

    const interestTiers = useMemo(() => {
        const tiers = repaymentRules.interestTiers || []
        return tiers.map(t => ({
            start: t.start,
            end: t.end,
            rate: t.rate,
            label: t.name || `After ${t.start} days`
        }))
    }, [repaymentRules.interestTiers])

    // Segmented slider logic for even distribution
    const segments = useMemo(() => {
        const items = []
        discountTiers.forEach(t => items.push({ ...t, type: 'discount' }))

        const lastDiscount = discountTiers.length > 0 ? discountTiers[discountTiers.length - 1].end : -1
        const firstInterest = interestTiers.length > 0 ? interestTiers[0].start : 999
        if (firstInterest > lastDiscount + 1) {
            items.push({
                start: lastDiscount + 1,
                end: firstInterest - 1,
                label: 'Standard Window',
                type: 'none',
                rate: 0
            })
        }

        interestTiers.forEach(t => items.push({ ...t, type: 'interest' }))
        return items
    }, [discountTiers, interestTiers])


    // Group items by productId
    const groupedCartItems = useMemo(() => {
        const grouped = {}

        cart.forEach((item) => {
            const product = cartProducts[item.productId]

            // Robust unit price calculation
            let unitPrice = item.unitPrice || item.price || 0
            if (!unitPrice && product) {
                unitPrice = product.priceToUser || product.price || 0
            }
            if (isNaN(unitPrice)) unitPrice = 0

            const variantAttrs = item.variantAttributes || {}
            const hasVariants = variantAttrs && typeof variantAttrs === 'object' && Object.keys(variantAttrs).length > 0
            const key = item.productId

            if (!grouped[key]) {
                grouped[key] = {
                    productId: item.productId,
                    product,
                    name: item.name || product?.name || 'Product',
                    image: product ? getPrimaryImageUrl(product) : (item.image || 'https://via.placeholder.com/400'),
                    variants: [],
                    hasVariants: false,
                }
            }

            const variantItem = {
                ...item,
                id: `${item.productId}-${JSON.stringify(variantAttrs)}`,
                unitPrice: Number(unitPrice),
                variantAttributes: variantAttrs,
                hasVariants,
            }

            grouped[key].variants.push(variantItem)

            if (hasVariants) {
                grouped[key].hasVariants = true
            }
        })

        return Object.values(grouped)
    }, [cart, cartProducts])

    const totals = useMemo(() => {
        const subtotal = groupedCartItems.reduce((sum, group) => {
            return sum + group.variants.reduce((variantSum, variant) => {
                const variantId = variant.id
                const rawQty = optimisticQuantities[variantId] !== undefined
                    ? optimisticQuantities[variantId]
                    : variant.quantity

                const quantity = Number(rawQty) || 0
                const price = Number(variant.unitPrice) || 0

                return variantSum + (price * quantity)
            }, 0)
        }, 0)

        // Compute delivery from live config (domestic by default)
        const domConfig = deliveryConfig?.domestic || {}
        const isFreeThreshold = domConfig.minFreeDelivery !== null && domConfig.minFreeDelivery !== undefined
            ? subtotal >= domConfig.minFreeDelivery
            : false
        const delivery = (deliveryConfig?.mode === 'free' || isFreeThreshold || !domConfig.isEnabled)
            ? 0
            : (Number(domConfig.charge) || 0)
        const deliveryTimeLabel = domConfig.timeLabel || '7-8 days'
        const deliveryEnabled = domConfig.isEnabled !== false

        const total = subtotal + delivery
        const meetsMinimum = (Number(total) || 0) >= MIN_VENDOR_PURCHASE

        return {
            subtotal: Number(subtotal) || 0,
            delivery: Number(delivery) || 0,
            deliveryTimeLabel,
            deliveryEnabled,
            total: Number(total) || 0,
            meetsMinimum,
            shortfall: meetsMinimum ? 0 : MIN_VENDOR_PURCHASE - (Number(total) || 0),
        }
    }, [groupedCartItems, optimisticQuantities, MIN_VENDOR_PURCHASE])

    const totalSubtotal = totals.subtotal

    const creditCalculation = useMemo(() => {
        const progress = parseFloat(sliderProgress)
        const segmentCount = segments.length
        if (segmentCount === 0) return { rate: 0, amount: 0, final: totalSubtotal, label: 'No rules', type: 'none', days: 0 }

        const portionSize = 100 / segmentCount
        const segmentIndex = Math.min(Math.floor(progress / portionSize), segmentCount - 1)
        const segment = segments[segmentIndex]

        let progressInSegment
        if (progress >= 100) {
            progressInSegment = 1
        } else {
            progressInSegment = (progress % portionSize) / portionSize
        }

        const range = segment.end - segment.start
        const days = Math.round(segment.start + (progressInSegment * range))

        const rate = segment.rate
        const amount = (totalSubtotal * rate) / 100
        const final = segment.type === 'discount' ? totalSubtotal - amount : segment.type === 'interest' ? totalSubtotal + amount : totalSubtotal

        return {
            rate,
            amount,
            final,
            label: segment.label,
            type: segment.type,
            days
        }
    }, [sliderProgress, segments, totalSubtotal])

    const totalItemsCount = useMemo(() => {
        return groupedCartItems.reduce((sum, group) => sum + group.variants.length, 0)
    }, [groupedCartItems])

    if (groupedCartItems.length === 0) {
        return (
            <div className="user-cart-view user-cart-view space-y-4">
                <div className="text-center py-12">
                    <p className="text-lg font-semibold text-gray-700 mb-2"><Trans>Your catalog cart is empty</Trans></p>
                    <p className="text-sm text-gray-500"><Trans>Browse the admin catalog to add stock</Trans></p>
                </div>
            </div>
        )
    }

    return (
        <div className="user-cart-view user-cart-view space-y-6 pb-24">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-1"><Trans>Bulk Order Cart</Trans></h2>
                <p className="text-sm text-gray-500">{totalItemsCount} {totalItemsCount === 1 ? <Trans>item</Trans> : <Trans>items</Trans>}</p>
            </div>

            <div className="space-y-4">
                {groupedCartItems.map((group, groupIndex) => (
                    <div
                        key={group.productId || `cart-group-${groupIndex}`}
                        className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                    >
                        {/* Product Header */}
                        <div className="flex gap-3 p-4 border-b border-gray-50">
                            <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-gray-50">
                                <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2"><TransText>{group.name}</TransText></h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase"><Trans>Wholesale Stock</Trans></span>
                                </div>
                            </div>
                        </div>

                        {/* Variants List */}
                        <div className="p-4 space-y-3">
                            {group.variants.map((variant, variantIdx) => {
                                const variantId = variant.id
                                const isExpanded = expandedVariants[variantId] || false

                                return (
                                    <div key={variantId} className="rounded-xl bg-gray-50/50 border border-gray-100 overflow-hidden">
                                        {/* Variant Header */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedVariants(prev => ({ ...prev, [variantId]: !prev[variantId] }))}
                                            className="w-full flex items-start justify-between gap-3 p-3 hover:bg-white transition-colors"
                                        >
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-gray-900"><Trans>Package</Trans> {variantIdx + 1}</span>
                                                </div>

                                                {variant.variantAttributes && Object.keys(variant.variantAttributes).length > 0 && (
                                                    <div className="text-xs text-gray-600">
                                                        {Object.entries(variant.variantAttributes).map(([key, value]) => (
                                                            <span key={key} className="mr-2">
                                                                <span className="font-medium">{key}:</span> {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="text-sm font-bold text-blue-600 mt-1">
                                                    ₹{(variant.unitPrice || 0).toLocaleString('en-IN')} <span className="text-[10px] text-gray-500 font-normal">/ unit</span>
                                                </div>
                                            </div>
                                            <ChevronRightIcon
                                                className={cn(
                                                    "h-4 w-4 text-gray-400 transition-transform shrink-0",
                                                    isExpanded && "rotate-90"
                                                )}
                                            />
                                        </button>

                                        {isExpanded && (
                                            <div className="px-3 pb-3 bg-white border-t border-gray-50">
                                                <div className="pt-2 text-[10px] text-gray-500 italic">
                                                    <Trans>Standard wholesale packaging applicable for this item.</Trans>
                                                </div>
                                            </div>
                                        )}

                                        {/* Controls */}
                                        <div className="flex items-center justify-between gap-3 p-3 border-t border-gray-50 bg-gray-50/30">
                                            <div className="flex items-center gap-2 border border-gray-200 rounded-xl bg-white">
                                                <button
                                                    type="button"
                                                    className="p-1.5 hover:bg-gray-50 transition-colors"
                                                    onClick={() => {
                                                        const currentQty = optimisticQuantities[variantId] !== undefined ? optimisticQuantities[variantId] : variant.quantity
                                                        const newQty = Math.max(1, currentQty - 1)
                                                        setOptimisticQuantities(prev => ({ ...prev, [variantId]: newQty }))
                                                        onUpdateQuantity(variant.productId, variant.variantAttributes, newQty)
                                                    }}
                                                    disabled={(optimisticQuantities[variantId] !== undefined ? optimisticQuantities[variantId] : variant.quantity) <= 1}
                                                >
                                                    <MinusIcon className="h-4 w-4" />
                                                </button>
                                                <span className="px-2 text-sm font-semibold text-gray-900 min-w-[2rem] text-center">
                                                    {optimisticQuantities[variantId] !== undefined ? optimisticQuantities[variantId] : variant.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="p-1.5 hover:bg-gray-50 transition-colors"
                                                    onClick={() => {
                                                        const currentQty = optimisticQuantities[variantId] !== undefined ? optimisticQuantities[variantId] : variant.quantity
                                                        const newQty = currentQty + 1
                                                        setOptimisticQuantities(prev => ({ ...prev, [variantId]: newQty }))
                                                        onUpdateQuantity(variant.productId, variant.variantAttributes, newQty)
                                                    }}
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="text-right flex-1">
                                                <div className="text-base font-bold text-gray-900">
                                                    ₹{((variant.unitPrice || 0) * (optimisticQuantities[variantId] !== undefined ? optimisticQuantities[variantId] : variant.quantity)).toLocaleString('en-IN')}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                onClick={() => onRemove(variant.productId, variant.variantAttributes)}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Cash Discount Benefits - Collective Cart Logic */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden p-4 space-y-6">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700 tracking-wide">
                            <Trans>Collective Cash Benefits</Trans>
                        </h3>
                        <button className="text-gray-400 p-1">
                            <HelpCircleIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-tight">
                        <Trans>Repayment timeline and rates for your credit order settlement.</Trans>
                    </p>
                </div>

                {/* Timeline Slider */}
                <div className="relative pt-10 px-2 pb-2">
                    <div
                        className="absolute top-[-6px] pointer-events-none z-10 flex flex-col items-center"
                        style={{
                            left: `${sliderProgress}%`,
                            transform: `translateX(-${sliderProgress}%)`
                        }}
                    >
                        <div className={cn(
                            "px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-bold text-white whitespace-nowrap flex flex-col items-center gap-0.5 border border-white/20 transition-colors duration-200",
                            creditCalculation.type === 'discount' ? "bg-gradient-to-r from-blue-600 to-indigo-600" :
                                creditCalculation.type === 'interest' ? "bg-gradient-to-r from-red-500 to-rose-600" :
                                    "bg-blue-700"
                        )}>
                            <div className="flex items-center gap-1">
                                {creditCalculation.type === 'discount' ? '-' : creditCalculation.type === 'interest' ? '+' : ''}
                                {creditCalculation.rate}%
                                <span className="text-[8px] opacity-80 font-black tracking-tighter uppercase">
                                    {creditCalculation.type === 'discount' ? 'Disc' : creditCalculation.type === 'interest' ? 'Int' : 'Fee'}
                                </span>
                            </div>
                            <div className="h-[2px] w-4 bg-white/30 rounded-full"></div>
                            <span className="text-[8px] opacity-70 uppercase tracking-widest font-black">Day {creditCalculation.days}</span>
                        </div>
                        <div
                            className={cn(
                                "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] absolute -bottom-[5px]",
                                creditCalculation.type === 'discount' ? "border-t-indigo-600" :
                                    creditCalculation.type === 'interest' ? "border-t-rose-600" :
                                        "border-t-blue-700"
                            )}
                            style={{
                                left: `${sliderProgress}%`,
                                transform: 'translateX(-50%)'
                            }}
                        ></div>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={sliderProgress}
                        onChange={(e) => setSliderProgress(e.target.value)}
                        className={cn(
                            "w-full h-2 rounded-lg appearance-none cursor-pointer transition-colors shadow-inner relative z-0",
                            creditCalculation.type === 'interest' ? "accent-red-500 bg-red-100" :
                                creditCalculation.type === 'discount' ? "accent-blue-500 bg-blue-100" :
                                    "accent-blue-700 bg-blue-100"
                        )}
                    />

                    {/* Marker Info Card */}
                    <div className="flex items-center mt-8 p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden min-h-[70px]">
                        <div className={cn(
                            "absolute top-0 left-0 w-1 h-full",
                            creditCalculation.type === 'discount' ? "bg-blue-500" : creditCalculation.type === 'interest' ? "bg-red-500" : "bg-gray-300"
                        )}></div>
                        <div className="flex-1 min-w-0 pr-2">
                            <p className="text-xs font-semibold text-gray-900 leading-tight">{creditCalculation.label}</p>
                            <p className="text-[8px] font-medium text-gray-400 capitalize">Day {creditCalculation.days}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 shrink-0"></div>
                        <div className="px-3 text-center shrink-0">
                            <p className={cn(
                                "text-xs font-semibold",
                                creditCalculation.type === 'discount' ? "text-blue-600" : creditCalculation.type === 'interest' ? "text-red-600" : "text-gray-900"
                            )}>{creditCalculation.rate}%</p>
                            <p className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">
                                {creditCalculation.type === 'interest' ? 'Int' : 'Disc'}
                            </p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 shrink-0"></div>
                        <div className="pl-3 text-right shrink-0">
                            <p className="text-sm font-bold text-blue-700">₹{creditCalculation.final.toFixed(0)}</p>
                            <p className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">Payable</p>
                        </div>
                    </div>
                </div>

                {/* Pricing Details Breakdown */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase ml-1"><Trans>Cart Pricing Breakdown</Trans></h4>
                    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
                        <table className="w-full text-[10px] sm:text-xs">
                            <thead className="bg-[#D1DCE2]/50 border-b border-gray-100">
                                <tr className="text-gray-700 font-bold">
                                    <th className="p-2.5 text-left font-bold uppercase tracking-tighter"><Trans>Item</Trans></th>
                                    <th className="p-2.5 text-right font-bold uppercase tracking-tighter"><Trans>Rate</Trans></th>
                                    <th className="p-2.5 text-right font-bold uppercase tracking-tighter bg-gray-50/50"><Trans>Total</Trans></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr>
                                    <td className="p-2.5 text-gray-600 font-medium"><Trans>Order Subtotal</Trans></td>
                                    <td className="p-2.5 text-right font-medium">₹{totals.subtotal.toLocaleString('en-IN')}</td>
                                    <td className="p-2.5 text-right font-semibold text-gray-900 bg-gray-50/30">₹{totals.subtotal.toFixed(0)}</td>
                                </tr>
                                {creditCalculation.type !== 'none' && (
                                    <tr>
                                        <td className="p-2.5 text-gray-600 font-medium whitespace-nowrap">
                                            {creditCalculation.type === 'discount' ? <Trans>Cash Discount</Trans> : <Trans>Interest Fee</Trans>}
                                        </td>
                                        <td className="p-2.5 text-right font-medium">{creditCalculation.rate}%</td>
                                        <td className={cn(
                                            "p-2.5 text-right font-semibold bg-gray-50/30",
                                            creditCalculation.type === 'discount' ? "text-blue-600" : "text-red-600"
                                        )}>
                                            {creditCalculation.type === 'discount' ? '-' : '+'} ₹{creditCalculation.amount.toFixed(0)}
                                        </td>
                                    </tr>
                                )}
                                <tr className="bg-blue-50/30 border-t-2 border-blue-100">
                                    <td className="p-3 font-semibold text-gray-900"><Trans>Total Payable</Trans></td>
                                    <td className="p-3 text-right"></td>
                                    <td className="p-3 text-right font-bold text-blue-700 text-sm bg-blue-50/50">₹{creditCalculation.final.toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>



            {!totals.meetsMinimum && (
                <div className="mx-4 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 shadow-sm">
                    <p className="text-xs font-semibold text-amber-700 text-center">
                        <Trans>Minimum bulk purchase of</Trans> ₹{MIN_VENDOR_PURCHASE.toLocaleString('en-IN')} <Trans>required.</Trans>
                        <br />
                        <Trans>Add</Trans> ₹{totals.shortfall.toLocaleString('en-IN')} <Trans>more to proceed.</Trans>
                    </p>
                </div>
            )}

            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 -mx-4 z-10 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
                <button
                    type="button"
                    className={cn(
                        'w-full py-4 px-6 rounded-2xl text-base font-bold transition-all duration-200',
                        totals.meetsMinimum
                            ? 'bg-blue-600 text-white shadow-lg active:scale-95'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    )}
                    onClick={onCheckout}
                    disabled={!totals.meetsMinimum}
                >
                    {totals.meetsMinimum ? <Trans>Proceed to Checkout</Trans> : `Add ₹${totals.shortfall.toLocaleString('en-IN')} more`}
                </button>
            </div>

            {suggestedProducts.length > 0 && (
                <div className="pt-4 pb-12">
                    <h3 className="text-base font-bold text-gray-900 mb-3 ml-1"><Trans>Other Catalog Items</Trans></h3>
                    <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-4 px-4">
                        {suggestedProducts.map((product) => (
                            <div
                                key={product._id || product.id}
                                className="flex-shrink-0 w-36 bg-white rounded-xl border border-gray-100 p-2 shadow-sm"
                                onClick={() => onNavigateToProduct?.(product._id || product.id)}
                            >
                                <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 mb-2">
                                    <img src={getPrimaryImageUrl(product)} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                                <h4 className="text-[10px] font-bold text-gray-900 line-clamp-1 mb-1"><TransText>{product.name}</TransText></h4>
                                <p className="text-[12px] font-bold text-blue-600">
                                    ₹{((product.attributeStocks && product.attributeStocks.length > 0)
                                        ? Math.min(...product.attributeStocks.map(a => a.userPrice))
                                        : (product.priceToUser || product.price || 0)).toLocaleString('en-IN')}
                                </p>
                                <button className="w-full mt-2 py-1 text-[10px] font-bold text-blue-600 border border-blue-600 rounded-lg">
                                    <Trans>View</Trans>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
