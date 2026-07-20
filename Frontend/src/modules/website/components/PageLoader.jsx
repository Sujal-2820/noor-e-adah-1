import React from 'react'
import logo from '../../../assets/NoorEAdahLogo.png'
import { cn } from '../../../lib/cn'

export function PageLoader({ className }) {
    return (
        <div className={cn(
            "fixed inset-0 z-[9999] bg-[#FAFAFA] flex flex-col items-center justify-center transition-opacity duration-700",
            className
        )}>
            <div className="relative flex flex-col items-center animate-calm-entry">
                {/* Pulsing ring behind the logo for a subtle, ethereal effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand/5 rounded-full animate-ping opacity-20 duration-1000 -z-10 blur-xl"></div>

                {/* Main Logo */}
                <img
                    src={logo}
                    alt="Noor E Adah Loading"
                    className="w-32 md:w-48 h-auto object-contain animate-pulse-slow drop-shadow-xl z-10"
                />

                {/* Elegant loading text & abstract line */}
                <div className="mt-8 flex flex-col items-center gap-3">
                    <p className="text-[10px] md:text-xs font-semibold tracking-[0.4em] uppercase text-brand/70 animate-pulse">
                        Curating Elegance
                    </p>
                    <div className="w-16 h-[1px] bg-accent/30 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-brand animate-[slide_2s_ease-in-out_infinite]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
