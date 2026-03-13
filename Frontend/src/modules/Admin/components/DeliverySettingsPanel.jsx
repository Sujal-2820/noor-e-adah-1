import { useState, useEffect } from 'react'
import { Truck, Globe, CheckCircle, XCircle, RefreshCw, Save, AlertCircle } from 'lucide-react'
import { getDeliverySettings, updateDeliverySettings } from '../services/adminApi'

/**
 * DeliverySettingsPanel
 * 
 * Admin panel section for managing Domestic and International
 * delivery charges and delivery times.
 * 
 * All changes are persisted via the backend Settings model.
 * The component uses deep-merge on the backend so partial updates are safe.
 */
export function DeliverySettingsPanel({ onProcessingChange }) {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)

    // Local form state (separate from saved config to allow cancel)
    const [form, setForm] = useState(null)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 4000)
    }

    const loadConfig = async () => {
        setLoading(true)
        try {
            const result = await getDeliverySettings()
            if (result?.success && result.data) {
                setConfig(result.data)
                setForm(JSON.parse(JSON.stringify(result.data))) // deep copy
            }
        } catch (err) {
            showToast('Failed to load delivery settings', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadConfig() }, [])

    const handleSave = async () => {
        setSaving(true)
        if (onProcessingChange) onProcessingChange(true, 'Saving Delivery Settings...')
        try {
            const result = await updateDeliverySettings(form)
            if (result?.success) {
                setConfig(result.data)
                setForm(JSON.parse(JSON.stringify(result.data)))
                showToast('Delivery settings saved successfully ✓', 'success')
            } else {
                showToast(result?.error?.message || result?.message || 'Failed to save', 'error')
            }
        } catch (err) {
            showToast('Network error — please try again', 'error')
        } finally {
            setSaving(false)
            if (onProcessingChange) onProcessingChange(false)
        }
    }

    const handleCancel = () => {
        if (config) setForm(JSON.parse(JSON.stringify(config)))
    }

    const setMode = (mode) => setForm(f => ({ ...f, mode }))

    const setDomestic = (key, value) =>
        setForm(f => ({ ...f, domestic: { ...f.domestic, [key]: value } }))

    const setInternational = (key, value) =>
        setForm(f => ({ ...f, international: { ...f.international, [key]: value } }))

    if (loading) {
        return (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm animate-pulse">
                <div className="h-6 w-48 bg-gray-100 rounded-xl mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    if (!form) return null

    const isDirty = JSON.stringify(form) !== JSON.stringify(config)

    return (
        <div className="rounded-3xl border border-blue-100 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-blue-50 bg-gradient-to-r from-blue-50/60 to-white">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-2xl text-blue-600">
                        <Truck className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Delivery Settings</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Manage charge and time for each zone</p>
                    </div>
                </div>
                <button
                    onClick={loadConfig}
                    className="p-2 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Toast */}
                {toast && (
                    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium border ${
                        toast.type === 'success'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        {toast.message}
                    </div>
                )}

                {/* Mode toggle */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Delivery Mode</label>
                    <div className="flex gap-2">
                        {['flat_rate', 'free'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setMode(mode)}
                                className={`flex-1 py-2.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-200 ${
                                    form.mode === mode
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                                }`}
                            >
                                {mode === 'flat_rate' ? '₹ Flat Rate' : '🎁 Free Delivery'}
                            </button>
                        ))}
                    </div>
                    {form.mode === 'free' && (
                        <p className="mt-2 text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2 font-medium">
                            ✓ All orders will have ₹0 delivery charge in this mode.
                        </p>
                    )}
                </div>

                {/* Domestic Zone */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-bold text-gray-800">Domestic</span>
                        </div>
                        <button
                            onClick={() => setDomestic('isEnabled', !form.domestic.isEnabled)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                                form.domestic.isEnabled
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            {form.domestic.isEnabled
                                ? <><CheckCircle className="h-3 w-3" /> Enabled</>
                                : <><XCircle className="h-3 w-3" /> Disabled</>
                            }
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Delivery Charge (₹)</label>
                            <input
                                type="number"
                                min="0"
                                disabled={form.mode === 'free' || !form.domestic.isEnabled}
                                value={form.domestic.charge ?? ''}
                                onChange={e => setDomestic('charge', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                placeholder="e.g. 150"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Delivery Time</label>
                            <input
                                type="text"
                                disabled={!form.domestic.isEnabled}
                                value={form.domestic.timeLabel ?? ''}
                                onChange={e => setDomestic('timeLabel', e.target.value)}
                                placeholder="e.g. 7-8 days"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                            Free Delivery Above (₹) <span className="text-gray-400 font-normal">— leave blank for never</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            disabled={form.mode === 'free' || !form.domestic.isEnabled}
                            value={form.domestic.minFreeDelivery ?? ''}
                            onChange={e => setDomestic('minFreeDelivery', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="e.g. 2000 (leave blank to disable)"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100">
                        <p className="text-[11px] font-bold text-blue-700">Current Value</p>
                        <p className="text-sm text-blue-900 font-semibold mt-0.5">
                            {form.mode === 'free' ? 'FREE' : `₹${form.domestic.charge ?? 0}`}
                            {' '}·{' '}
                            {form.domestic.timeLabel || '—'}
                        </p>
                    </div>
                </div>

                {/* International Zone */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-bold text-gray-800">International</span>
                        </div>
                        <button
                            onClick={() => setInternational('isEnabled', !form.international.isEnabled)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                                form.international.isEnabled
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                            }`}
                        >
                            {form.international.isEnabled
                                ? <><CheckCircle className="h-3 w-3" /> Enabled</>
                                : <><AlertCircle className="h-3 w-3" /> Coming Soon</>
                            }
                        </button>
                    </div>

                    {!form.international.isEnabled && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium">
                                International delivery is currently disabled. Toggle above to enable and configure.
                            </p>
                        </div>
                    )}

                    {form.international.isEnabled && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Delivery Charge (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.international.charge ?? ''}
                                    onChange={e => setInternational('charge', e.target.value === '' ? null : parseFloat(e.target.value))}
                                    placeholder="e.g. 1500"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Delivery Time</label>
                                <input
                                    type="text"
                                    value={form.international.timeLabel ?? ''}
                                    onChange={e => setInternational('timeLabel', e.target.value)}
                                    placeholder="e.g. 14-21 days"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Save / Cancel */}
                {isDirty && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Discard Changes
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {saving ? (
                                <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="h-4 w-4" /> Save Settings</>
                            )}
                        </button>
                    </div>
                )}

                {!isDirty && config && (
                    <p className="text-center text-xs text-gray-400 font-medium pt-1">Settings are up to date ✓</p>
                )}
            </div>
        </div>
    )
}
