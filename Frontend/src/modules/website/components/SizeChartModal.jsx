import React from 'react'
import { cn } from '../../../lib/cn'

export function SizeChartModal({ isOpen, onClose, product }) {
  if (!isOpen || !product) return null

  const chartData = product.sizeChart || {
    headers: [
      { label: 'Size', key: 's' },
      { label: 'Bust', key: 'b' },
      { label: 'Waist', key: 'w' },
      { label: 'Hip', key: 'h' },
      { label: 'Shoulder', key: 'sh' }
    ],
    rows: [
      { s: 'XS', b: '33.5', w: '28.5', h: '38.0', sh: '13.5' },
      { s: 'S', b: '35.5', w: '30.5', h: '40.0', sh: '14.0' },
      { s: 'M', b: '37.5', w: '32.5', h: '42.0', sh: '14.5' },
      { s: 'L', b: '39.5', w: '34.5', h: '44.0', sh: '15.0' },
      { s: 'XL', b: '41.5', w: '36.5', h: '46.0', sh: '15.5' },
      { s: '2XL', b: '43.5', w: '38.5', h: '48.0', sh: '16.0' }
    ],
    unit: 'inches'
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-[700px] shadow-2xl relative p-8 sm:p-12 overflow-y-auto max-h-[90vh] animate-zoom-in" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-brand/30 hover:text-brand transition-colors p-2 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <div className="text-center mb-10">
          <div className="flex flex-col items-center mb-8">
            <span className="text-2xl font-serif font-bold text-brand leading-none">NOOR E ADAH</span>
            <span className="text-[8px] tracking-[0.4em] font-light text-brand/40 uppercase mt-1">OFFICIAL</span>
          </div>
          <h2 className="text-[14px] font-bold tracking-[0.2em] text-brand uppercase mb-4 underline underline-offset-8 decoration-brand/20">Size Guide</h2>
          <p className="text-xs sm:text-[14px] text-brand/60 leading-relaxed font-medium">
            We have provided the products measurements to help you decide which size to buy
          </p>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse border border-brand/40">
            <thead>
              <tr className="bg-surface-muted/50">
                {chartData.headers.map(header => (
                  <th key={header.key || header.label} className="border border-brand/40 p-3 sm:p-4 text-[10px] sm:text-[13px] font-bold text-brand tracking-widest text-center uppercase">
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-brand/[0.02] transition-colors">
                  {chartData.headers.map(h => (
                    <td key={h.key || h.label} className="border border-brand/40 p-3 sm:p-4 text-center text-[10px] sm:text-[14px] text-brand font-medium uppercase">
                      {row[h.key] || row[h.label.toLowerCase()] || row[h.label] || '--'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center mt-8 text-[10px] sm:text-[12px] tracking-[0.1em] text-brand/40 italic">
          ( all the sizes are mentioned in {chartData.unit || 'inches'} )
        </p>
      </div>
    </div>
  )
}
