import { useMemo, useState, useEffect } from 'react'
import { useUserState, useUserDispatch } from '../../../context/UserContext'
import {
    MapPinIcon,
    CreditCardIcon,
    TruckIcon,
    ChevronRightIcon,
    CheckIcon,
    PackageIcon,
    EditIcon
} from '../../../../../components/shared/catalog'
import { cn } from '../../../../../lib/cn'
import { useUserApi } from '../../../hooks/useUserApi'
import { getPrimaryImageUrl } from '../../../../../utils/productImages'
import { Trans } from '../../../../../components/Trans'
import { TransText } from '../../../../../components/TransText'

export function UserCheckoutView({ onBack, onOrderPlaced }) {
    const { cart, profile, settings } = useUserState()
    const dispatch = useUserDispatch()
    const { requestStockPurchase, updateUserProfile } = useUserApi()

    const [loading, setLoading] = useState(false)

    // Address Editing State
    const [isEditingAddress, setIsEditingAddress] = useState(false)
    const [tempLocation, setTempLocation] = useState({
        address: profile?.location?.address || '',
        city: profile?.location?.city || '',
        state: profile?.location?.state || '',
        pincode: profile?.location?.pincode || ''
    })
    const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)

    // Wholesale Order Requirements (New)
    const [reason, setReason] = useState('')
    const [bankDetails, setBankDetails] = useState({
        accountName: '',
        accountNumber: '',
        bankName: '',
        ifsc: '',
        branch: ''
    })
    const [confirmationText, setConfirmationText] = useState('')
    const [policyAccepted, setPolicyAccepted] = useState(false)



    const handleUpdateAddress = async () => {
        if (!tempLocation) return
        setIsUpdatingAddress(true)
        try {
            const result = await updateUserProfile({ location: tempLocation })
            if (result.data) {
                dispatch({
                    type: 'UPDATE_PROFILE',
                    payload: { location: tempLocation }
                })
                setIsEditingAddress(false)
            } else {
                alert(result.error?.message || 'Failed to update address')
            }
        } catch (err) {
            console.error('Address update error:', err)
            alert('An error occurred while updating the address.')
        } finally {
            setIsUpdatingAddress(false)
        }
    }

    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
        const delivery = 0
        const finalTotal = subtotal + delivery

        return { subtotal, delivery, total: finalTotal }
    }, [cart])

    const isFormValid = useMemo(() => {
        if (cart.length === 0) return false
        if (!reason || reason.trim().length < 10) return false
        // Bank details validation for cash payments
        const requiredBankFields = ['accountName', 'accountNumber', 'bankName', 'ifsc']
        const bankValid = requiredBankFields.every(field => bankDetails[field] && bankDetails[field].trim().length > 0)
        if (!bankValid) return false
        if (!profile.location?.address) return false
        return true
    }, [cart, reason, bankDetails, profile.location])

    const handlePlaceOrder = async () => {
        setLoading(true)
        try {
            const orderData = {
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    attributeCombination: item.variantAttributes || {}
                })),
                totalAmount: totals.total,
                paymentMode: 'cash',
                notes: 'Stock Order',
                reason: reason.trim(),
                bankDetails: {
                    accountName: bankDetails.accountName.trim(),
                    accountNumber: bankDetails.accountNumber.trim(),
                    bankName: bankDetails.bankName.trim(),
                    ifsc: bankDetails.ifsc.trim().toUpperCase(),
                    branch: bankDetails.branch.trim()
                },
            }

            const result = await requestStockPurchase(orderData)
            if (result.data) {
                dispatch({ type: 'CLEAR_CART' })
                onOrderPlaced(result.data)
            } else {
                alert(result.error?.message || 'Failed to place order')
            }
        } catch (err) {
            console.error('Order placement error:', err)
            alert('An error occurred while placing the order.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="user-checkout-view user-checkout-view space-y-6 pb-24">
            <header className="flex items-center gap-3 mb-2">
                <button onClick={onBack} className="p-2 -ml-2">
                    <ChevronRightIcon className="h-5 w-5 rotate-180 text-gray-400" />
                </button>
                <h2 className="text-xl font-bold text-gray-900"><Trans>Order Review</Trans></h2>
            </header>

            {/* Delivery Address */}
            <section className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-900"><Trans>Delivery Location</Trans></h3>
                    </div>
                    {!isEditingAddress && (
                        <button
                            onClick={() => setIsEditingAddress(true)}
                            className="text-xs font-bold text-blue-600 flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-lg"
                        >
                            <EditIcon className="h-3 w-3" />
                            <Trans>Change</Trans>
                        </button>
                    )}
                </div>

                {isEditingAddress ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top duration-300">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Complete Address</label>
                                <textarea
                                    value={tempLocation.address}
                                    onChange={(e) => setTempLocation(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                                    rows={2}
                                    placeholder="Building, Street, Landmark..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">City</label>
                                    <input
                                        type="text"
                                        value={tempLocation.city}
                                        onChange={(e) => setTempLocation(prev => ({ ...prev, city: e.target.value }))}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                        placeholder="City"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">State</label>
                                    <input
                                        type="text"
                                        value={tempLocation.state}
                                        onChange={(e) => setTempLocation(prev => ({ ...prev, state: e.target.value }))}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                        placeholder="State"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Pincode</label>
                                <input
                                    type="text"
                                    value={tempLocation.pincode}
                                    onChange={(e) => setTempLocation(prev => ({ ...prev, pincode: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                    placeholder="Pincode"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditingAddress(false)}
                                className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-50 rounded-xl"
                            >
                                <Trans>Cancel</Trans>
                            </button>
                            <button
                                disabled={!tempLocation.address || !tempLocation.city || !tempLocation.state || !tempLocation.pincode || isUpdatingAddress}
                                onClick={handleUpdateAddress}
                                className={cn(
                                    "flex-2 py-2 px-4 text-xs font-bold rounded-xl transition-all",
                                    (!tempLocation.address || !tempLocation.city || !tempLocation.state || !tempLocation.pincode || isUpdatingAddress)
                                        ? "bg-gray-100 text-gray-400"
                                        : "bg-blue-600 text-white"
                                )}
                            >
                                {isUpdatingAddress ? <Trans>Saving...</Trans> : <Trans>Save Address</Trans>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-bold text-gray-800">{profile.name}</p>
                        <p>{profile.location?.address}</p>
                        <p>{profile.location?.city}, {profile.location?.state} - {profile.location?.pincode}</p>
                        <p className="pt-1 font-medium text-gray-400">{profile.phone}</p>
                    </div>
                )}
            </section>

            {/* Order Summary */}
            <section className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <PackageIcon className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900"><Trans>Stock Items</Trans></h3>
                </div>
                <div className="space-y-4">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0">
                                {item.image ? (
                                    <img src={item.image} alt={item.name || 'Product'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                        <PackageIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 line-clamp-1">
                                    <TransText>{item.name || 'Product'}</TransText>
                                </p>
                                {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        {Object.entries(item.variantAttributes).map(([key, value], i) => (
                                            <span key={key}>
                                                {i > 0 && ' • '}
                                                <span className="font-medium">{key}:</span> {value}
                                            </span>
                                        ))}
                                    </p>
                                )}
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {item.quantity} units × ₹{(item.unitPrice || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className="text-right font-bold text-xs text-gray-900">
                                ₹{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-IN')}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Payment Info */}
            <section className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900"><Trans>Instant Payment</Trans></h3>
                </div>
                <p className="text-[11px] text-gray-500"><Trans>Pay for your stock order to process delivery.</Trans></p>
            </section>

            {/* Wholesale Order Requirements Section */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 ml-1"><Trans>Wholesale Order Information</Trans></h3>

                {/* Reason for Request - ALWAYS SHOWN */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                        <Trans>Reason for Stock Request</Trans> <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe why you need this stock (minimum 10 characters)"
                        rows={3}
                        className={cn(
                            "w-full px-3 py-2 border rounded-xl text-xs resize-none focus:outline-none focus:ring-2 transition-all",
                            reason.trim().length >= 10
                                ? "border-blue-200 focus:ring-blue-500 focus:border-blue-500"
                                : "border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        )}
                    />
                    <p className={cn(
                        "text-[10px] mt-1 font-medium",
                        reason.trim().length >= 10 ? "text-blue-600" : "text-gray-400"
                    )}>
                        {reason.trim().length}/10 characters minimum
                    </p>
                </div>

                {/* Bank Account Details */}
                {true && (
                    <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Trans>Billing Bank Account Details</Trans> <span className="text-red-500">*</span>
                        </h4>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Account Holder Name */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                                    <Trans>Account Holder Name</Trans>
                                </label>
                                <input
                                    type="text"
                                    value={bankDetails.accountName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                    placeholder="Enter account holder name"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Account Number */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                                    <Trans>Account Number</Trans>
                                </label>
                                <input
                                    type="text"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                    placeholder="Enter account number"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Bank Name */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                                    <Trans>Bank Name</Trans>
                                </label>
                                <input
                                    type="text"
                                    value={bankDetails.bankName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                    placeholder="Enter bank name"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* IFSC Code */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                                    <Trans>IFSC Code</Trans>
                                </label>
                                <input
                                    type="text"
                                    value={bankDetails.ifsc}
                                    onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                                    placeholder="Enter IFSC code"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Branch (Optional) */}
                            <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                                    <Trans>Branch</Trans> <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={bankDetails.branch}
                                    onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                                    placeholder="Enter branch name"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

            </section>

            {/* Summary Card */}
            <section className="p-4 rounded-2xl bg-gray-900 text-white shadow-xl">
                <div className="space-y-3">
                    <div className="flex justify-between text-xs opacity-70">
                        <span><Trans>Order Subtotal</Trans></span>
                        <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-px bg-white/10 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold"><Trans>Final Amount</Trans></span>
                        <span className="text-xl font-black text-blue-400">₹{totals.total.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </section>

            {/* Confirm Button */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 -mx-4 z-10 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
                <button
                    disabled={loading || !isFormValid}
                    onClick={handlePlaceOrder}
                    className={cn(
                        "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                        loading || !isFormValid
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-700 text-white shadow-lg active:scale-95 hover:bg-blue-800"
                    )}
                >
                    {loading ? <Trans>Processing...</Trans> : (
                        <>
                            <CheckIcon className="h-5 w-5" />
                            <span><Trans>Place Order & Pay</Trans></span>
                        </>
                    )}
                </button>

                {/* Validation Error Messages - Conditional based on Payment Mode */}
                {!loading && !isFormValid && (
                    <div className="text-[10px] text-red-500 font-medium text-center mt-2 space-y-0.5">
                        {cart.length === 0 && <p><Trans>• Cart is empty</Trans></p>}
                        {reason.trim().length < 10 && <p><Trans>• Reason must be at least 10 characters</Trans></p>}
                        {(!bankDetails.accountName.trim() || !bankDetails.accountNumber.trim() || !bankDetails.bankName.trim() || !bankDetails.ifsc.trim()) && (
                            <p><Trans>• Complete bank details are required</Trans></p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

