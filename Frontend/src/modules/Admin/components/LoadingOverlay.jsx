import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function LoadingOverlay({ message = 'Please wait...', isVisible = false }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all duration-300 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 max-w-sm w-full mx-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
          <Loader2 className="h-14 w-14 text-indigo-600 animate-spin relative z-10" />
        </div>
        
        <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight text-center">
          {message}
        </h3>
        
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map((i) => (
            <div 
              key={i} 
              className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            ></div>
          ))}
        </div>
        
        <p className="text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-widest text-center">
          Restricting operations during progress
        </p>
      </div>
    </div>
  )
}
