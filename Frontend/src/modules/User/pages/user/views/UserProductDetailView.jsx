import { useState, useMemo, useEffect, useRef } from 'react'
import { StarIcon, HeartIcon, PlusIcon, MinusIcon, ChevronLeftIcon, CartIcon, HelpCircleIcon } from '../../../../../components/shared/catalog'
import { cn } from '../../../../../lib/cn'
import { useUserApi } from '../../../hooks/useUserApi'
import { useUserState, useUserDispatch } from '../../../context/UserContext'
import { Trans } from '../../../../../components/Trans'
import { TransText } from '../../../../../components/TransText'
import { MarkdownRenderer } from '../../../../../components/MarkdownRenderer'

export function UserProductDetailView({ productId, onAddToCart, onBuyNow, onToggleFavourite, favourites = [], onBack, onCartClick }) {
    const { getProductDetails, getRepaymentRules } = useUserApi()
    const { cart } = useUserState()
    const dispatch = useUserDispatch()

    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [quantity, setQuantity] = useState(10) // Standard user start quantity
    const [selectedAttributes, setSelectedAttributes] = useState({})
    const [selectedAttributeStock, setSelectedAttributeStock] = useState(null)
    const [daysElapsed, setDaysElapsed] = useState(0) // Slider value
    const [selectedImage, setSelectedImage] = useState(0)
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

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true)
            try {
                // Fetch product details and repayment rules in parallel
                const [productResult, rulesResult] = await Promise.all([
                    getProductDetails(productId),
                    getRepaymentRules()
                ])

                if (productResult.data) {
                    const productData = productResult.data.product || productResult.data
                    setProduct(productData)

                    // Track recently viewed
                    try {
                        const KEY = 'user_recently_viewed'
                        const existing = JSON.parse(localStorage.getItem(KEY) || '[]')
                        // Remove if exists, then add to front
                        const updated = [productId, ...existing.filter(id => id !== productId)].slice(0, 10)
                        localStorage.setItem(KEY, JSON.stringify(updated))
                    } catch (e) {
                        console.error('Error tracking recently viewed:', e)
                    }

                    if (productData.attributeStocks?.length > 0) {
                        // Find the smallest/cheapest one to match Home view default
                        const cheapest = [...productData.attributeStocks]
                            .sort((a, b) => (a.userPrice || 0) - (b.userPrice || 0))[0]

                        setSelectedAttributeStock(cheapest)
                        if (cheapest?.attributes) {
                            setSelectedAttributes(cheapest.attributes instanceof Map ? Object.fromEntries(cheapest.attributes) : cheapest.attributes)
                        }
                    }
                }

                if (rulesResult.data && (rulesResult.data.discountTiers?.length || rulesResult.data.interestTiers?.length)) {
                    setRepaymentRules(rulesResult.data)
                }
            } catch (error) {
                console.error('Error loading user product data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadInitialData()
    }, [productId])

    const currentPrice = useMemo(() => {
        if (!product) return 0
        if (selectedAttributeStock) return selectedAttributeStock.userPrice || product.priceToUser || 0
        return product.priceToUser || 0
    }, [product, selectedAttributeStock])

    const totalPrice = currentPrice * quantity

    const maxDays = useMemo(() => {
        const lastDiscount = discountTiers.length > 0 ? discountTiers[discountTiers.length - 1].end : 0
        const lastInterest = interestTiers.length > 0 ? interestTiers[interestTiers.length - 1].end : 0
        return Math.max(180, lastDiscount, lastInterest)
    }, [discountTiers, interestTiers])

    // Segmented slider logic for even distribution
    const segments = useMemo(() => {
        const items = []
        discountTiers.forEach(t => items.push({ ...t, type: 'discount' }))

        // Check for Neutral Zone
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

    // Current Days derived from Slider Progress (0-100)
    const [sliderProgress, setSliderProgress] = useState(0)

    const calculation = useMemo(() => {
        const progress = parseFloat(sliderProgress)
        const segmentCount = segments.length
        if (segmentCount === 0) return { rate: 0, amount: 0, final: totalPrice, label: 'No rules', type: 'none', days: 0 }

        // Find which segment we are in based on progress (0-100)
        // Each segment occupies 100/segmentCount portion of the slider
        const portionSize = 100 / segmentCount
        const segmentIndex = Math.min(Math.floor(progress / portionSize), segmentCount - 1)
        const segment = segments[segmentIndex]

        // Calculate progress within the specific segment (0 to 1)
        // For the last segment at 100%, it should be exactly 1
        let progressInSegment
        if (progress >= 100) {
            progressInSegment = 1
        } else {
            progressInSegment = (progress % portionSize) / portionSize
        }

        const range = segment.end - segment.start
        const days = Math.round(segment.start + (progressInSegment * range))

        const rate = segment.rate
        const amount = (totalPrice * rate) / 100
        const final = segment.type === 'discount' ? totalPrice - amount : segment.type === 'interest' ? totalPrice + amount : totalPrice

        return {
            rate,
            amount,
            final,
            label: segment.label,
            type: segment.type,
            days
        }
    }, [sliderProgress, segments, totalPrice])

    const getAttributeDisplayName = (attr) => {
        if (attr.attributes) {
            const values = Object.values(attr.attributes instanceof Map ? Object.fromEntries(attr.attributes) : attr.attributes)
            if (values.length > 0) return values.join(', ')
        }
        return `${attr.sizeValue || ''}${attr.sizeUnit || ''}`
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>
    if (!product) return <div className="p-8 text-center text-gray-500">Product not found</div>

    const images = product.images?.length > 0 ? product.images.map(img => img.url) : [product.primaryImage || 'https://via.placeholder.com/400']

    return (
        <div className="bg-white min-h-screen pb-24">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-blue-800 text-white flex items-center px-4 z-50">
                <button onClick={onBack} className="p-1">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="flex-1 text-center font-bold truncate px-2 text-sm sm:text-base">
                    <TransText>{product.name}</TransText>
                </h1>
                <button onClick={onCartClick} className="p-2 relative">
                    <CartIcon className="h-6 w-6" />
                    {cart.length > 0 && (
                        <span className="absolute top-1 right-1 bg-white text-blue-800 text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-blue-800">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                    )}
                </button>
            </header>

            <div className="pt-14 overflow-x-hidden">
                {/* Image Gallery */}
                <div className="relative aspect-square bg-white border-b border-brand/5">
                    <img
                        src={images[selectedImage]}
                        alt={product.name}
                        className="w-full h-full object-contain p-4"
                    />
                    <button className="absolute top-4 right-4 p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-brand/40 border border-brand/10 active:scale-90 transition-transform">
                        <HeartIcon className="h-6 w-6" filled={favourites.includes(productId)} />
                    </button>

                    {/* In Stock Badge */}
                    <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-semibold rounded-lg shadow-lg border border-blue-500/50">
                        <Trans>Product in stock</Trans>
                    </div>
                </div>

                {/* Dot Pagination or Thumbnails */}
                {images.length > 1 ? (
                    <div className="flex gap-3 overflow-x-auto px-4 py-4 no-scrollbar scroll-smooth">
                        {images.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedImage(i)}
                                className={cn(
                                    "flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all bg-white flex items-center justify-center p-1.5",
                                    i === selectedImage ? "border-brand scale-105 shadow-md" : "border-brand/10 opacity-60 hover:opacity-100"
                                )}
                            >
                                <img src={img} alt={`view ${i}`} className="w-full h-full object-contain" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-2" />
                )}

                {/* Info Section */}
                <div className="px-1.5 space-y-3">
                    <div className="flex justify-between items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-brand/10 shadow-sm">
                        <div className="space-y-0.5 flex-1 min-w-0">
                            <h2 className="text-base font-semibold text-brand tracking-tight leading-tight line-clamp-2"><TransText>{product.name}</TransText></h2>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-gray-400 line-through text-[9px] font-medium">₹{(currentPrice * 1.5).toFixed(0)}</p>
                            <p className="text-lg font-bold text-blue-700">₹{currentPrice.toFixed(0)}</p>
                        </div>
                    </div>

                    {/* Attributes */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase ml-1"><Trans>Variations</Trans></h3>
                        <div className="flex flex-wrap gap-2">
                            {product.attributeStocks?.map((attr, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setSelectedAttributeStock(attr)
                                        if (attr.attributes) {
                                            setSelectedAttributes(attr.attributes instanceof Map ? Object.fromEntries(attr.attributes) : attr.attributes)
                                        }
                                    }}
                                    className={cn(
                                        "p-2.5 rounded-xl border-2 transition-all cursor-pointer min-w-[80px] text-center shadow-sm",
                                        selectedAttributeStock === attr
                                            ? "border-brand bg-brand/5 text-brand ring-2 ring-brand/5"
                                            : "border-brand/10 bg-white text-brand/50 hover:border-brand/30"
                                    )}
                                >
                                    <p className="font-semibold text-xs leading-tight">{getAttributeDisplayName(attr)}</p>
                                    <p className="text-[10px] font-medium mt-0.5 opacity-80">₹{attr.userPrice}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-3 bg-gray-50 inline-flex p-1 rounded-full border border-brand/10 shadow-inner">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-brand/70 active:scale-90 transition-transform border border-brand/10"
                        >
                            <MinusIcon className="h-3 w-3" />
                        </button>
                        <span className="text-base font-semibold w-8 text-center text-gray-900">{quantity}</span>
                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 active:scale-90 transition-transform border border-gray-100"
                        >
                            <PlusIcon className="h-3 w-3" />
                        </button>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent my-2"></div>

                    {/* Cash Discount Benefits */}
                    <div className="space-y-6 pt-2">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-700 tracking-wide">
                                    <Trans>Cash discount benefits</Trans>
                                </h3>
                                <button className="text-gray-400 p-1">
                                    <HelpCircleIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium leading-tight">
                                <Trans>Timeline and rates apply to your credit repayment cycle when using credit for purchase.</Trans>
                            </p>
                        </div>

                        {/* Timeline Slider */}
                        <div className="relative pt-10 px-2 pb-2">
                            {/* Dynamic Tooltip - Premium Floating Version */}
                            <div
                                className="absolute top-0 pointer-events-none z-10 flex flex-col items-center"
                                style={{
                                    left: `${sliderProgress}%`,
                                    // High-performance transform without transition to avoid lag
                                    transform: `translateX(-${sliderProgress}%)`
                                }}
                            >
                                <div className={cn(
                                    "px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-bold text-white whitespace-nowrap flex flex-col items-center gap-0.5 border border-white/20 transition-colors duration-200",
                                    calculation.type === 'discount' ? "bg-gradient-to-r from-blue-600 to-indigo-600" :
                                        calculation.type === 'interest' ? "bg-gradient-to-r from-red-500 to-rose-600" :
                                            "bg-blue-700"
                                )}>
                                    <div className="flex items-center gap-1">
                                        {calculation.type === 'discount' ? '-' : calculation.type === 'interest' ? '+' : ''}
                                        {calculation.rate}%
                                        <span className="text-[8px] opacity-80 font-black tracking-tighter uppercase">
                                            {calculation.type === 'discount' ? 'Disc' : calculation.type === 'interest' ? 'Int' : 'Fee'}
                                        </span>
                                    </div>
                                    <div className="h-[2px] w-4 bg-white/30 rounded-full"></div>
                                    <span className="text-[8px] opacity-70 uppercase tracking-widest font-black">Day {calculation.days}</span>
                                </div>
                                {/* Tooltip Arrow - Positioned absolutely to always point to the slider thumb */}
                                <div
                                    className={cn(
                                        "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] absolute -bottom-[5px]",
                                        calculation.type === 'discount' ? "border-t-indigo-600" :
                                            calculation.type === 'interest' ? "border-t-rose-600" :
                                                "border-t-blue-700"
                                    )}
                                    style={{
                                        // Counteract the parent's translateX to keep arrow centered on pointer
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
                                    calculation.type === 'interest' ? "accent-red-500 bg-red-100" :
                                        calculation.type === 'discount' ? "accent-blue-500 bg-blue-100" :
                                            "accent-blue-700 bg-blue-100"
                                )}
                            />
                            {/* Marker Info */}
                            <div className="flex items-center mt-8 p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden min-h-[70px]">
                                <div className={cn(
                                    "absolute top-0 left-0 w-1 h-full",
                                    calculation.type === 'discount' ? "bg-blue-500" : calculation.type === 'interest' ? "bg-red-500" : "bg-gray-300"
                                )}></div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-xs font-semibold text-gray-900 leading-tight">{calculation.label}</p>
                                    <p className="text-[8px] font-medium text-gray-400 capitalize">Day {calculation.days}</p>
                                </div>
                                <div className="w-px h-8 bg-gray-200 shrink-0"></div>
                                <div className="px-3 text-center shrink-0">
                                    <p className={cn(
                                        "text-xs font-semibold",
                                        calculation.type === 'discount' ? "text-blue-600" : calculation.type === 'interest' ? "text-red-600" : "text-gray-900"
                                    )}>{calculation.rate}%</p>
                                    <p className="text-[8px] font-medium text-gray-400">
                                        {calculation.type === 'interest' ? 'Interest' : 'Discount'}
                                    </p>
                                </div>
                                <div className="w-px h-8 bg-gray-200 shrink-0"></div>
                                <div className="pl-3 text-right shrink-0">
                                    <p className="text-sm font-bold text-blue-700">₹{calculation.final.toFixed(0)}</p>
                                    <p className="text-[8px] font-medium text-gray-400">Payable</p>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Details Table */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-semibold text-brand/50 tracking-widest uppercase ml-1"><Trans>Pricing breakdown</Trans></h4>
                            <div className="rounded-2xl border border-brand/10 overflow-hidden shadow-sm bg-white">
                                <table className="w-full text-[10px] sm:text-xs">
                                    <thead className="bg-[#D1DCE2]/20 border-b border-brand/10">
                                        <tr className="text-brand font-bold">
                                            <th className="p-2.5 text-left font-bold uppercase tracking-tighter">Item</th>
                                            <th className="p-2.5 text-right font-bold uppercase tracking-tighter">Rate</th>
                                            <th className="p-2.5 text-right font-bold uppercase tracking-tighter bg-gray-50/50">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        <tr>
                                            <td className="p-2.5 text-gray-600 font-medium">Selling Price</td>
                                            <td className="p-2.5 text-right font-medium">₹{currentPrice.toFixed(0)}</td>
                                            <td className="p-2.5 text-right font-semibold text-gray-900 bg-gray-50/30">₹{totalPrice.toFixed(0)}</td>
                                        </tr>
                                        {calculation.type !== 'none' && (
                                            <tr>
                                                <td className="p-2.5 text-gray-600 font-medium">
                                                    {calculation.type === 'discount' ? 'Cash Discount' : 'Interest Fee'}
                                                </td>
                                                <td className="p-2.5 text-right font-medium">{calculation.rate}%</td>
                                                <td className={cn(
                                                    "p-2.5 text-right font-semibold bg-gray-50/30",
                                                    calculation.type === 'discount' ? "text-blue-600" : "text-red-600"
                                                )}>
                                                    {calculation.type === 'discount' ? '-' : '+'} ₹{calculation.amount.toFixed(0)}
                                                </td>
                                            </tr>
                                        )}
                                        <tr className="bg-blue-50/30 border-t-2 border-blue-100">
                                            <td className="p-3 font-semibold text-gray-900">Final Payable</td>
                                            <td className="p-3 text-right"></td>
                                            <td className="p-3 text-right font-bold text-blue-700 text-sm bg-blue-50/50">₹{calculation.final.toFixed(0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Timeline Rule Summary */}
                        <div className="space-y-4 bg-blue-50/30 p-4 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mt-10"></div>
                            <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-widest"><Trans>Payment Timeline Rules</Trans></h4>
                            <div className="space-y-3">
                                {/* Discount Tiers */}
                                {discountTiers.map((tier, idx) => (
                                    <div key={`d-${idx}`} className="flex justify-between items-center text-[10px] bg-white/60 p-2 rounded-xl border border-blue-100 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{tier.label}</span>
                                            <span className="text-[8px] text-gray-400 font-medium uppercase">PAY WITHIN {tier.end} DAYS</span>
                                        </div>
                                        <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{tier.rate}% DISCOUNT</span>
                                    </div>
                                ))}

                                {/* Neutral Tier (Calculated) */}
                                {discountTiers.length > 0 && interestTiers.length > 0 && (
                                    <div className="flex justify-between items-center text-[10px] p-2 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl mx-2">
                                        <span className="text-gray-400 font-medium italic uppercase tracking-tighter">Standard Window (0% Fee)</span>
                                        <span className="font-semibold text-gray-400">Day {Math.max(...discountTiers.map(t => t.end)) + 1} - {Math.min(...interestTiers.map(t => t.start)) - 1}</span>
                                    </div>
                                )}

                                {/* Interest Tiers */}
                                {interestTiers.map((tier, idx) => (
                                    <div key={`i-${idx}`} className="flex justify-between items-center text-[10px] bg-red-50/40 p-2 rounded-xl border border-red-100 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{tier.label}</span>
                                            <span className="text-[8px] text-gray-400 font-medium uppercase">AFTER {tier.start} DAYS</span>
                                        </div>
                                        <span className="font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">{tier.rate}% INTEREST</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-brand/10">
                        <h4 className="text-sm font-semibold text-brand/50 tracking-wide"><Trans>Product description</Trans></h4>
                        <div className="text-xs text-brand/70 leading-relaxed product-description-html bg-brand/5 p-4 rounded-2xl border border-brand/10">
                            <MarkdownRenderer content={product.description || product.shortDescription} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] backdrop-blur-md bg-white/95">
                <button className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-500 border-r border-gray-50">
                    <HeartIcon className="h-5 w-5" filled={favourites.includes(productId)} />
                    <span className="text-[10px] font-bold"><Trans>Wishlist</Trans></span>
                </button>
                <button
                    onClick={() => onAddToCart?.(productId, quantity, selectedAttributes, currentPrice)}
                    className="flex-[2] bg-blue-800 text-white flex items-center justify-center gap-2 active:bg-blue-900 transition-colors"
                >
                    <CartIcon className="h-5 w-5" />
                    <span className="font-bold text-sm uppercase tracking-wide"><Trans>Add to Cart</Trans></span>
                </button>
            </footer>
        </div>
    )
}
