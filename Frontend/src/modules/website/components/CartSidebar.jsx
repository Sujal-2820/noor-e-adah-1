import { useMemo, useEffect, useRef, useState } from 'react'

import { useNavigate, Link } from 'react-router-dom'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { SizeChartModal } from './SizeChartModal'
import { cn } from '../../../lib/cn'


export function CartSidebar() {
    const navigate = useNavigate()
    const dispatch = useWebsiteDispatch()
    const { cart, cartOpen } = useWebsiteState()
    const { updateCartItem, removeFromCart, fetchProductDetails } = useWebsiteApi()
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false)
    const [chartProduct, setChartProduct] = useState(null)
    const [isChartLoading, setIsChartLoading] = useState(false)
    const sidebarRef = useRef(null)


    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') dispatch({ type: 'SET_CART_OPEN', payload: false })
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [dispatch])

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target) && cartOpen) {
                dispatch({ type: 'SET_CART_OPEN', payload: false })
            }
        }
        if (cartOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.body.style.overflow = 'hidden' // Prevent scrolling when cart is open
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.body.style.overflow = 'unset'
        }
    }, [cartOpen, dispatch])

    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice || item.price || 0) * item.quantity, 0)
        return { subtotal }
    }, [cart])

    const handleUpdateQuantity = async (cartItemId, newQuantity) => {
        if (newQuantity < 1) return
        try {
            await updateCartItem(cartItemId, newQuantity)
        } catch (error) {
            console.error('Error updating quantity:', error)
        }
    }

    const handleRemove = async (cartItemId) => {
        try {
            await removeFromCart(cartItemId)
        } catch (error) {
            console.error('Error removing item:', error)
        }
    }

    const handleCheckout = () => {
        dispatch({ type: 'SET_CART_OPEN', payload: false })
        navigate('/checkout')
    }

    const handleViewCart = () => {
        dispatch({ type: 'SET_CART_OPEN', payload: false })
        navigate('/cart')
    }

    const handleOpenSizeChart = async (productId) => {
        setIsChartLoading(true)
        try {
            const res = await fetchProductDetails(productId)
            if (res.data) {
                setChartProduct(res.data)
                setIsSizeChartOpen(true)
            }
        } catch (error) {
            console.error('Failed to load size chart:', error)
        } finally {
            setIsChartLoading(false)
        }
    }


    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] transition-opacity duration-500 ease-in-out",
                    cartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />

            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className={cn(
                    "fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-[70] shadow-2xl transition-transform duration-500 ease-out flex flex-col",
                    cartOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-muted/10">
                    <h2 className="text-[14px] font-bold tracking-[0.1em] uppercase text-brand">Shopping cart</h2>
                    <button
                        onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
                        className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase text-brand/40 hover:text-brand transition-colors group"
                    >
                        <svg
                            className="w-4 h-4 transition-transform group-hover:rotate-90"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                        Close
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-calm-entry">
                            <svg className="w-16 h-16 text-brand/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                            <div>
                                <h3 className="text-[16px] font-bold tracking-[0.05em] text-brand mb-2">Your Cart is empty</h3>
                                <p className="text-[11px] text-brand/40 tracking-[0.02em] font-medium leading-relaxed">
                                    You haven't added anything to your cart yet.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    dispatch({ type: 'SET_CART_OPEN', payload: false })
                                    navigate('/home/shop')
                                }}
                                className="bg-brand text-white px-10 py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300 transform hover:-translate-y-1 block"
                            >
                                Start Explore
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {cart.map((item) => (
                                <div key={item.id || item.productId} className="flex gap-6 group">
                                    <div className="w-24 aspect-[3/4] bg-muted/5 overflow-hidden flex-shrink-0 border border-brand/5">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <Link
                                                    to={`/product/${item.productId}`}
                                                    onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
                                                    className="text-[12px] font-bold tracking-[0.05em] uppercase text-brand hover:text-accent transition-colors leading-tight pr-4"
                                                >
                                                    {item.name} {item.variantAttributes?.Size ? `- ${item.variantAttributes.Size}` : ''}
                                                </Link>
                                                <button
                                                    onClick={() => handleRemove(item.id || item.cartItemId)}
                                                    className="text-brand/20 hover:text-red-500 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 6L6 18M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="mt-2 text-right">
                                                <button 
                                                    onClick={() => handleOpenSizeChart(item.productId)}
                                                    disabled={isChartLoading}
                                                    className="text-[10px] font-bold tracking-widest uppercase text-brand/40 hover:text-accent underline underline-offset-4 disabled:opacity-50"
                                                >
                                                    {isChartLoading ? 'Loading...' : 'Size chart'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-4">
                                            <div className="flex items-center border border-brand/10 h-9">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.id || item.cartItemId, item.quantity - 1)}
                                                    className="px-2.5 hover:bg-muted/5 transition-colors text-brand/40"
                                                >
                                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M20 12H4" />
                                                    </svg>
                                                </button>
                                                <span className="w-8 text-center text-[11px] font-bold text-brand">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.id || item.cartItemId, item.quantity + 1)}
                                                    className="px-2.5 hover:bg-muted/5 transition-colors text-brand/40"
                                                >
                                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="text-[12px] font-bold tracking-[0.1em] text-brand">
                                                <span className="text-brand/30 mr-2">{item.quantity} ×</span> ₹{(item.unitPrice || item.price || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="p-8 border-t border-muted/10 bg-white space-y-4">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-[14px] font-bold tracking-[0.1em] uppercase text-brand">Subtotal:</span>
                            <span className="text-[18px] font-bold tracking-[0.05em] text-brand">
                                ₹{totals.subtotal.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleViewCart}
                                className="w-full border-2 border-brand py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-brand hover:text-white transition-all duration-300"
                            >
                                View Cart
                            </button>
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-brand text-white py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300 shadow-lg shadow-brand/10"
                            >
                                Checkout
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Size Chart Modal */}
            <SizeChartModal 
                isOpen={isSizeChartOpen} 
                onClose={() => { setIsSizeChartOpen(false); setChartProduct(null); }} 
                product={chartProduct} 
            />
        </>

    )
}
