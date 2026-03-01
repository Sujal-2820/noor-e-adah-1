/**
 * User Price Display Component
 * 
 * Shows user-specific pricing with discounts
 * Uses discountUser from product model
 */

import { cn } from '../../../lib/cn'
import { Trans } from '../../../components/Trans'

export function UserPriceDisplay({
    originalPrice,
    discount = 0,
    quantity = 1,
    size = 'md',
    showTotal = false,
    className = ''
}) {
    const discountedPrice = discount > 0
        ? originalPrice * (1 - discount / 100)
        : originalPrice

    const totalOriginal = originalPrice * quantity
    const totalDiscounted = discountedPrice * quantity
    const totalSavings = totalOriginal - totalDiscounted

    const hasDiscount = discount > 0

    const sizeStyles = {
        sm: {
            price: 'text-base',
            original: 'text-xs',
            badge: 'text-[0.55rem] px-1.5 py-0.5'
        },
        md: {
            price: 'text-xl',
            original: 'text-sm',
            badge: 'text-[0.65rem] px-2 py-0.5'
        },
        lg: {
            price: 'text-2xl',
            original: 'text-base',
            badge: 'text-xs px-2.5 py-1'
        }
    }

    const styles = sizeStyles[size]

    if (showTotal) {
        return (
            <div className={cn('space-y-2', className)}>
                <div className="flex items-center justify-between text-gray-600">
                    <span className="text-sm"><Trans>Original Total</Trans></span>
                    <span className={cn('font-medium', hasDiscount && 'line-through opacity-70')}>
                        ₹{totalOriginal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                </div>

                {hasDiscount && (
                    <div className="flex items-center justify-between text-blue-600">
                        <span className="text-sm flex items-center gap-1">
                            <Trans>Cash Discount</Trans>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                                {discount}%
                            </span>
                        </span>
                        <span className="font-medium">
                            -₹{totalSavings.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-base font-semibold text-gray-900">
                        <Trans>Total Amount</Trans>
                    </span>
                    <span className="text-xl font-bold text-[#1d4ed8]">
                        ₹{totalDiscounted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                </div>

                {hasDiscount && totalSavings > 0 && (
                    <div className="text-center py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700">
                            <Trans>You save</Trans>{' '}
                            <span className="font-bold">
                                ₹{totalSavings.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>{' '}
                            <Trans>on this order</Trans>!
                        </p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={cn('flex items-baseline gap-2', className)}>
            <span className={cn('font-bold text-[#1d4ed8]', styles.price)}>
                ₹{discountedPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>

            {hasDiscount && (
                <>
                    <span className={cn('text-gray-500 line-through', styles.original)}>
                        ₹{originalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>

                    <span className={cn(
                        'rounded-lg font-bold text-white bg-red-500 shadow-sm',
                        styles.badge
                    )}>
                        -{discount}% OFF
                    </span>
                </>
            )}
        </div>
    )
}

export function UserCartPriceSummary({ items = [], className = '' }) {
    const subtotal = items.reduce((sum, item) => {
        const itemPrice = item.price || item.priceToUser || 0
        const itemQty = item.quantity || 1
        return sum + (itemPrice * itemQty)
    }, 0)

    const totalDiscount = items.reduce((sum, item) => {
        const itemPrice = item.price || item.priceToUser || 0
        const itemDiscount = item.discount || item.discountUser || 0
        const itemQty = item.quantity || 1
        const savings = (itemPrice * (itemDiscount / 100)) * itemQty
        return sum + savings
    }, 0)

    const grandTotal = subtotal - totalDiscount

    return (
        <div className={cn('space-y-3 px-4 py-5 bg-white rounded-xl border border-gray-200', className)}>
            <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
                <Trans>Price Details</Trans>
            </h3>

            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                        <Trans>Price</Trans> ({items.length} {items.length === 1 ? 'item' : 'items'})
                    </span>
                    <span className="font-medium text-gray-900">
                        ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                </div>

                {totalDiscount > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                            <Trans>Cash Discount</Trans>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        <span className="font-medium text-blue-600">
                            -₹{totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}
            </div>

            <div className="pt-3 border-t-2 border-gray-200">
                <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900"><Trans>Total Amount</Trans></span>
                    <span className="text-xl font-bold text-[#1d4ed8]">
                        ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {totalDiscount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border border-blue-200">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold text-blue-700">
                            <Trans>Total Savings</Trans>: ₹{totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
