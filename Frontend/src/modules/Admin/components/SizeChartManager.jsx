import { useState, useEffect } from 'react'
import { Plus, X, GripVertical, Settings2, Trash2, Ruler } from 'lucide-react'
import { cn } from '../../../lib/cn'

/**
 * SizeChartManager
 * 
 * Props:
 *  value    — { headers: [{label, key}], rows: [Object], unit: string }
 *  onChange — called with updated value
 */
export function SizeChartManager({ value, onChange }) {
    const [headers, setHeaders] = useState(value?.headers || [
        { label: 'Size', key: 'size' },
        { label: 'Bust', key: 'bust' },
        { label: 'Waist', key: 'waist' },
        { label: 'Hip', key: 'hip' },
        { label: 'Shoulder', key: 'shoulder' }
    ])

    const [rows, setRows] = useState(value?.rows || [
        { size: 'S', bust: '', waist: '', hip: '', shoulder: '' }
    ])

    const [unit, setUnit] = useState(value?.unit || 'inches')

    useEffect(() => {
        onChange?.({ headers, rows, unit })
    }, [headers, rows, unit])

    const addHeader = () => {
        const newKey = `col_${Date.now()}`
        setHeaders([...headers, { label: 'New Column', key: newKey }])
        // Add the key to all rows
        setRows(rows.map(row => ({ ...row, [newKey]: '' })))
    }

    const removeHeader = (key) => {
        if (headers.length <= 1) return
        setHeaders(headers.filter(h => h.key !== key))
        setRows(rows.map(row => {
            const newRow = { ...row }
            delete newRow[key]
            return newRow
        }))
    }

    const updateHeaderLabel = (key, label) => {
        setHeaders(headers.map(h => h.key === key ? { ...h, label } : h))
    }

    const addRow = () => {
        const newRow = {}
        headers.forEach(h => { newRow[h.key] = '' })
        setRows([...rows, newRow])
    }

    const removeRow = (index) => {
        if (rows.length <= 1) {
            // Don't remove the last row, just clear it
            const clearedRow = {}
            headers.forEach(h => { clearedRow[h.key] = '' })
            setRows([clearedRow])
            return
        }
        setRows(rows.filter((_, i) => i !== index))
    }

    const updateCell = (rowIndex, colKey, val) => {
        setRows(rows.map((row, i) => i === rowIndex ? { ...row, [colKey]: val } : row))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Ruler className="h-4 w-4 text-purple-600" />
                    Size Chart Configuration
                </label>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Unit:</span>
                    <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                        {['inches', 'cm'].map(u => (
                            <button
                                key={u}
                                type="button"
                                onClick={() => setUnit(u)}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-md",
                                    unit === u
                                        ? "bg-purple-600 text-white shadow-sm"
                                        : "text-gray-500 hover:bg-gray-50"
                                )}
                            >
                                {u}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 overflow-hidden">
                {/* Headers Editor */}
                <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Define Table Columns</p>
                        <button
                            type="button"
                            onClick={addHeader}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 uppercase tracking-widest flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" /> Add Column
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {headers.map((h, i) => (
                            <div key={h.key} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                                <input
                                    type="text"
                                    value={h.label}
                                    onChange={(e) => updateHeaderLabel(h.key, e.target.value)}
                                    className="w-20 bg-transparent text-xs font-bold text-gray-700 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeHeader(h.key)}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dynamic Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {headers.map(h => (
                                    <th key={h.key} className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center border-r border-gray-200 last:border-0">
                                        {h.label}
                                    </th>
                                ))}
                                <th className="w-10 p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-gray-100 last:border-0">
                                    {headers.map(h => (
                                        <td key={h.key} className="p-1 border-r border-gray-100 last:border-0">
                                            <input
                                                type="text"
                                                value={row[h.key] || ''}
                                                onChange={(e) => updateCell(rowIndex, h.key, e.target.value)}
                                                className="w-full p-2 text-center text-xs font-medium text-gray-700 bg-transparent focus:bg-purple-50 focus:outline-none placeholder:text-gray-200"
                                                placeholder="--"
                                            />
                                        </td>
                                    ))}
                                    <td className="p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(rowIndex)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button
                        type="button"
                        onClick={addRow}
                        className="w-full py-3 text-[10px] font-bold text-gray-400 hover:text-purple-600 hover:bg-purple-50/50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 border-t border-gray-100"
                    >
                        <Plus className="h-3 w-3" /> Add Row
                    </button>
                </div>
            </div>

            <p className="text-[11px] text-gray-400 italic">
                * Admin can configure headers (columns) and rows. All measurements will be displayed in {unit}.
            </p>
        </div>
    )
}
