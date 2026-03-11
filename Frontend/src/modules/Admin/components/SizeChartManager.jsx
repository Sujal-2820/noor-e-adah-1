import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Ruler, ClipboardPaste, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../../lib/cn'

// ─── Smart Parser ────────────────────────────────────────────────────────────

/**
 * Attempt to detect the separator in a line of text.
 * Priority: tab > pipe > semicolon > comma > 2+ spaces
 */
function detectSeparator(line) {
    if (line.includes('\t')) return '\t'
    if (line.includes('|')) return '|'
    if (line.includes(';')) return ';'
    if (line.includes(',')) return ','
    if (/  +/.test(line)) return /  +/  // regex for 2+ spaces
    return null
}

/**
 * Split a line by the detected separator, trim each cell.
 */
function splitLine(line, sep) {
    let cells
    if (sep instanceof RegExp) {
        cells = line.split(sep)
    } else {
        cells = line.split(sep)
    }
    return cells
        .map(c => c.replace(/^\||\|$/g, '').trim())  // strip leading/trailing pipes
        .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''))
}

/**
 * Remove markdown separator rows like |---|---|---|
 */
function isSeparatorRow(cells) {
    return cells.every(c => /^[-:]+$/.test(c.trim()))
}

/**
 * Parse any pasted text into { headers, rows }
 */
function parsePastedText(raw) {
    const lines = raw
        .split('\n')
        .map(l => l.trimEnd())
        .filter(l => l.trim() !== '')

    if (lines.length === 0) return null

    // Detect separator from the first non-empty line
    const sep = detectSeparator(lines[0]) || '\t'

    const parsed = lines.map(l => splitLine(l, sep))

    // Filter out separator rows (markdown tables)
    const dataRows = parsed.filter(row => !isSeparatorRow(row))

    if (dataRows.length === 0) return null

    // First row = headers
    const rawHeaders = dataRows[0]
    const headers = rawHeaders.map((label, i) => ({
        label: label || `Col ${i + 1}`,
        key: `col_${i}_${Date.now()}`
    }))

    // Remaining rows = data rows
    const rows = dataRows.slice(1).map(row => {
        const obj = {}
        headers.forEach((h, i) => {
            obj[h.key] = row[i] !== undefined ? row[i] : ''
        })
        return obj
    })

    return { headers, rows: rows.length > 0 ? rows : [Object.fromEntries(headers.map(h => [h.key, '']))] }
}

// ─── Paste Import Panel ───────────────────────────────────────────────────────

function PasteImportPanel({ onImport }) {
    const [open, setOpen] = useState(false)
    const [rawText, setRawText] = useState('')
    const [preview, setPreview] = useState(null)
    const [error, setError] = useState(null)
    const textareaRef = useRef(null)

    const handlePaste = (e) => {
        // Allow normal paste, but immediately parse
        const text = e.clipboardData?.getData('text') || e.target.value
        analyze(text)
    }

    const handleChange = (e) => {
        const text = e.target.value
        setRawText(text)
        if (text.trim()) {
            analyze(text)
        } else {
            setPreview(null)
            setError(null)
        }
    }

    const analyze = (text) => {
        try {
            const result = parsePastedText(text)
            if (!result || result.headers.length === 0) {
                setPreview(null)
                setError('Could not detect a tabular structure. Try copying directly from Word / Excel / a table.')
            } else {
                setPreview(result)
                setError(null)
            }
        } catch (err) {
            setPreview(null)
            setError('Parsing error. Please check the pasted content.')
        }
    }

    const handleImport = () => {
        if (!preview) return
        onImport(preview)
        setRawText('')
        setPreview(null)
        setError(null)
        setOpen(false)
    }

    const handleClear = () => {
        setRawText('')
        setPreview(null)
        setError(null)
    }

    return (
        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 overflow-hidden">
            {/* Toggle header */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-50 transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-purple-700">
                    <ClipboardPaste className="h-4 w-4" />
                    Paste & Import Size Chart
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 uppercase tracking-widest">Smart</span>
                </span>
                {open
                    ? <ChevronUp className="h-4 w-4 text-purple-400" />
                    : <ChevronDown className="h-4 w-4 text-purple-400" />
                }
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-4 border-t border-purple-100">
                    <p className="text-xs text-gray-500 pt-3 leading-relaxed">
                        Copy a size chart from <strong>Word, Excel, Google Sheets, or any website</strong> and paste it below.
                        It will be automatically analyzed and converted into a table.
                    </p>

                    {/* Textarea */}
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={rawText}
                            onChange={handleChange}
                            onPaste={handlePaste}
                            rows={6}
                            placeholder={`Paste your size chart here...\n\nExamples that work:\n• Tab-separated (from Excel/Sheets)\n• | Pipe | Tables | (from websites)\n• Comma-separated (CSV)\n• Plain spaced columns`}
                            className="w-full px-4 py-3 rounded-xl border border-purple-200 text-sm text-gray-800 font-mono bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none"
                        />
                        {rawText && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    {preview && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-green-700">
                                <CheckCircle className="h-4 w-4" />
                                Detected {preview.headers.length} column{preview.headers.length !== 1 ? 's' : ''} × {preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''}
                            </div>

                            {/* Preview table */}
                            <div className="overflow-x-auto rounded-xl border border-green-100 bg-white shadow-sm max-h-56 overflow-y-auto">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-green-50 border-b border-green-100">
                                            {preview.headers.map((h, i) => (
                                                <th key={i} className="px-3 py-2 text-left font-bold text-green-800 uppercase tracking-wide whitespace-nowrap border-r border-green-100 last:border-0">
                                                    {h.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.map((row, ri) => (
                                            <tr key={ri} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                {preview.headers.map((h, ci) => (
                                                    <td key={ci} className="px-3 py-1.5 text-gray-700 border-r border-gray-50 last:border-0 whitespace-nowrap">
                                                        {row[h.key] || <span className="text-gray-200">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImport}
                                    className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-100 flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Apply to Size Chart
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Main SizeChartManager ───────────────────────────────────────────────────

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
    const [importFlash, setImportFlash] = useState(false)

    // Sync internal state with props when value changes (e.g. when product data loads)
    useEffect(() => {
        if (value && value.headers && value.rows) {
            // Use JSON stringify for a simple deep comparison to avoid infinite loops
            const current = JSON.stringify({ headers, rows, unit })
            const incoming = JSON.stringify({
                headers: value.headers,
                rows: value.rows,
                unit: value.unit || 'inches'
            })

            if (current !== incoming) {
                setHeaders(value.headers)
                setRows(value.rows)
                setUnit(value.unit || 'inches')
            }
        }
    }, [value])

    useEffect(() => {
        onChange?.({ headers, rows, unit })
    }, [headers, rows, unit])

    const addHeader = () => {
        const newKey = `col_${Date.now()}`
        setHeaders([...headers, { label: 'New Column', key: newKey }])
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

    /** Called when the user confirms an import from PasteImportPanel */
    const handleImport = ({ headers: newHeaders, rows: newRows }) => {
        setHeaders(newHeaders)
        setRows(newRows)
        // Flash feedback
        setImportFlash(true)
        setTimeout(() => setImportFlash(false), 2000)
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

            {/* ── Paste Import Panel ── */}
            <PasteImportPanel onImport={handleImport} />

            {/* ── Table Editor ── */}
            <div className={cn(
                "rounded-2xl border bg-gray-50/50 p-6 overflow-hidden transition-all duration-500",
                importFlash ? "border-green-300 shadow-sm shadow-green-100 bg-green-50/30" : "border-gray-200"
            )}>
                {importFlash && (
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                        <CheckCircle className="h-4 w-4" />
                        Size chart imported successfully!
                    </div>
                )}

                {/* Headers Editor */}
                <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Table Columns</p>
                        <button
                            type="button"
                            onClick={addHeader}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 uppercase tracking-widest flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" /> Add Column
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {headers.map((h) => (
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
