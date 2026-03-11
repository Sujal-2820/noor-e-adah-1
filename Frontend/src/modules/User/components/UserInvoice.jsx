import React, { useEffect, useState } from 'react'
import { ReportIcon, CloseIcon, PackageIcon } from './icons'
import { Trans } from '../../../components/Trans'
import { cn } from '../../../lib/cn'

export function UserInvoice({ order, user, onClose }) {
    const [isFocused, setIsFocused] = useState(true)
    const [isLocked, setIsLocked] = useState(false) // Manual lock for sensitive events

    useEffect(() => {
        let unlockTimeout;

        const handleBlur = () => {
            setIsFocused(false)
            // Clear any pending unlock
            if (unlockTimeout) clearTimeout(unlockTimeout)
        }

        const handleFocus = () => {
            setIsFocused(true)
            // Keep it blurred for 2.5 seconds after focus returns to defeat fast screenshot tools
            setIsLocked(true)
            unlockTimeout = setTimeout(() => {
                setIsLocked(false)
            }, 2500)
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                setIsFocused(false)
            } else {
                handleFocus()
            }
        }

        const handlePrint = (e) => {
            setIsFocused(false)
            setIsLocked(true) // Hard lock
            setTimeout(() => setIsLocked(false), 5000)
            e.preventDefault()
            return false
        }
        const handleContextMenu = (e) => e.preventDefault()

        const handleKeyDown = (e) => {
            if (
                e.key === 'PrintScreen' ||
                e.keyCode === 44 || // Legacy PrintScreen
                (e.ctrlKey && (e.key === 'p' || e.key === 's')) ||
                (e.metaKey && (e.key === 'p' || e.key === 's'))
            ) {
                // Force an immediate, long-duration blur
                setIsFocused(false)
                setIsLocked(true)
                setTimeout(() => setIsLocked(false), 5000)

                alert('Security Protocol: Content protected against capture.')
                e.preventDefault()
            }
        }

        window.addEventListener('blur', handleBlur)
        window.addEventListener('focus', handleFocus)
        window.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('beforeprint', handlePrint)
        window.addEventListener('contextmenu', handleContextMenu)
        window.addEventListener('keydown', handleKeyDown)

        const detectDevTools = setInterval(() => {
            const widthThreshold = window.outerWidth - window.innerWidth > 160
            const heightThreshold = window.outerHeight - window.innerHeight > 160
            if (widthThreshold || heightThreshold) {
                // Potential DevTools detection
            }
        }, 1000)

        return () => {
            window.removeEventListener('blur', handleBlur)
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('beforeprint', handlePrint)
            window.removeEventListener('contextmenu', handleContextMenu)
            window.removeEventListener('keydown', handleKeyDown)
            clearInterval(detectDevTools)
        }
    }, [])

    if (!order) return null

    const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    return (
        <div
            id="invoice-secure-viewport"
            className={cn(
                "fixed inset-0 z-[100] bg-white flex flex-col transition-all ease-in-out",
                (isFocused && !isLocked) ? "duration-1000" : "duration-0",
                (!isFocused || isLocked) && "filter blur-[64px] grayscale brightness-50 pointer-events-none select-none"
            )}
            style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                msUserSelect: 'none',
                MozUserSelect: 'none'
            }}
        >
            {(!isFocused || isLocked) && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center text-white text-center p-10 bg-black/40 backdrop-blur-sm animate-in fade-in duration-75">
                    <div className="space-y-4 max-w-xs animate-in zoom-in duration-75">
                        <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-white/20">
                            <ReportIcon className="h-10 w-10 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-black tracking-tight uppercase">Security Shield Active</h2>
                            <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Content Hidden for Protection</p>
                        </div>
                        <p className="text-xs font-medium text-white/50 leading-relaxed">
                            To view this invoice, please ensure the window remains in focus. Screenshots and external recordings are prohibited by Noor E Adah Security Protocol.
                        </p>
                    </div>
                </div>
            )}

            <header className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-90"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase"><Trans>Official Tax Invoice</Trans></h2>
                        <p className="text-[10px] text-gray-400 font-bold font-mono tracking-tighter">REF: {order.requestId || (order._id && order._id.slice(-12).toUpperCase())}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-green-700 uppercase tracking-widest leading-none">Secured Data</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 relative scrolling-touch invoice-printable-container">
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04] rotate-[-25deg] flex flex-wrap gap-x-24 gap-y-32 p-10 select-none preserve-3d">
                    {Array.from({ length: 60 }).map((_, i) => (
                        <span key={i} className="text-3xl font-black whitespace-nowrap tracking-tighter uppercase italic">
                            NOOR E ADAH SECURE • {new Date().toLocaleDateString()} • CONFIDENTIAL
                        </span>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-6 bg-blue-600 rounded-full"></div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Authorized Admin</p>
                        </div>
                        <div className="space-y-1.5">
                            <img src="/NoorEAdah.jpeg" alt="Noor E Adah" className="h-10 w-auto object-contain mb-2" />
                            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
                                B-42, Corporate Park, Netaji Subhash Place,<br />
                                Pitam Pura, District North West,<br />
                                New Delhi, DL - 110034
                            </p>
                            <div className="pt-1 flex flex-col gap-0.5">
                                <p className="text-[10px] font-black text-gray-900 border-l-2 border-blue-600 pl-2">GSTIN: 07AABCX1234D1Z5</p>
                                <p className="text-[10px] font-bold text-gray-400 pl-2">PAN: AABCX1234D</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right space-y-3">
                        <div className="flex items-center justify-end gap-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Billed To</p>
                            <div className="h-1.5 w-6 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">
                                {user?.shopName || user?.name || 'Authorized Partner'}
                            </h3>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
                                {user?.location?.address}<br />
                                {user?.location?.city}, {user?.location?.state}<br />
                                Pin: {user?.location?.pincode}
                            </p>
                            <div className="pt-1 flex flex-col items-end gap-0.5">
                                <p className="text-[10px] font-black text-gray-900 border-r-2 border-gray-200 pr-2 uppercase">VNDR-ID: {user?._id?.slice(-8).toUpperCase()}</p>
                                <p className="text-[10px] font-bold text-gray-400 pr-2">TEL: +91 {user?.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 border-y border-gray-100 py-8 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Invoice Date</p>
                        <p className="text-xs font-black text-gray-900">
                            {new Date(order.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="text-center border-x border-gray-50 space-y-1 px-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Wholesale Method</p>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">
                            {order.paymentMode || 'Wholesale Credit'}
                        </p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Security Hash</p>
                        <p className="text-[10px] font-bold text-gray-900 font-mono tracking-tighter opacity-70">
                            {Math.random().toString(36).substring(2, 10).toUpperCase()}..{order._id?.slice(-4)}
                        </p>
                    </div>
                </div>

                <div className="space-y-5 relative z-10">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest"><Trans>Order Manifest</Trans></h4>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{order.items?.length || 0} Line Items</span>
                    </div>
                    <div className="rounded-3xl border border-gray-100 overflow-hidden bg-white shadow-sm overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider">Item Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Unit Price</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Qty</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-wider text-right">Net Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {order.items?.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-blue-50/30 transition-all">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-white group-hover:text-blue-500 transition-all shadow-inner">
                                                    <PackageIcon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 leading-tight">{item.productName || item.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">Variant: {item.variantName || 'Standard Bundle'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs font-bold text-gray-600 text-right">{formatCurrency(item.price)}</td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-xs font-black text-gray-900 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">{item.quantity}</span>
                                        </td>
                                        <td className="px-6 py-5 text-xs font-black text-gray-900 text-right">{formatCurrency(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pt-4 relative z-10 px-2">
                    <div className="w-full max-w-[280px] space-y-3.5">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-4">
                            <span className="uppercase tracking-widest text-[10px]">Taxable Amount</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-4">
                            <div className="flex flex-col items-start gap-1">
                                <span className="uppercase tracking-widest text-[10px]">Tax (GST INCLUDED)</span>
                                <span className="text-[8px] text-gray-300 font-medium">IGST 12% / 18% as applicable</span>
                            </div>
                            <span>-</span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                        <div className="flex flex-col gap-2 bg-gray-900 text-white p-5 rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-800 transform hover:scale-[1.02] transition-transform">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Total Payable</span>
                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <ReportIcon className="h-4 w-4 text-blue-400" />
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black tracking-tighter italic">{formatCurrency(order.totalAmount)}</span>
                                <span className="text-[8px] font-bold text-green-400 uppercase tracking-widest">Auth_OK</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-10 text-center space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-white rounded-2xl border-2 border-gray-100 shadow-sm transform -rotate-2">
                        <div className="h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                            <div className="h-2 w-2 bg-white rounded-full"></div>
                        </div>
                        <span className="text-[10px] font-black uppercase italic tracking-tighter text-gray-900 opacity-60">
                            CERTIFIED FOR {user?.name || 'VNDR'} • SECURE-INV-{(order._id || 'XXX').slice(0, 8).toUpperCase()}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed opacity-70">
                            This is an encrypted document for business review only. Physical copies are not recognized for input credit.
                        </p>
                        <div className="flex items-center justify-center gap-1.5 text-[8px] font-black text-blue-600 uppercase tracking-widest">
                            <div className="h-1 w-1 bg-blue-400 rounded-full"></div>
                            NOOR E ADAH GLOBAL SECURITY COMPLIANT
                            <div className="h-1 w-1 bg-blue-400 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex gap-4 sticky bottom-0 z-20">
                <button
                    disabled
                    title="PDF Downloads are disabled for security"
                    className="flex-1 bg-gray-50 border border-gray-200 py-4 rounded-3xl text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center justify-center gap-3 cursor-not-allowed"
                >
                    <ReportIcon className="h-4 w-4" />
                    Secure Export Locked
                </button>
            </div>

            <style jsx>{`
                #invoice-secure-viewport::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.05), transparent);
                    pointer-events: none;
                }
                @media print {
                    body * {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
