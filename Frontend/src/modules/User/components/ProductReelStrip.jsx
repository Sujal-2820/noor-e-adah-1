import { useRef, useState, useEffect } from 'react'
import { Play, ShoppingBag } from 'lucide-react'
import { cn } from '../../../lib/cn'

/**
 * Optimized Video Player for Vertical Reels
 * Uses IntersectionObserver to play/pause automatically
 */
function ReelItem({ product, onNavigate, onAddToCart }) {
    const videoRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)

    useEffect(() => {
        // Auto-play when in view, pause when out of view
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (videoRef.current) {
                        videoRef.current.play().catch(err => console.log("Auto-play blocked", err))
                        setHasStarted(true)
                    }
                } else {
                    if (videoRef.current) {
                        videoRef.current.pause()
                    }
                }
            },
            { threshold: 0.6 }
        )

        if (videoRef.current) observer.observe(videoRef.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            className="relative flex-none w-[180px] sm:w-[220px] aspect-[9/16] rounded-2xl overflow-hidden bg-gray-100 shadow-xl group cursor-pointer select-none border border-white/10"
            onClick={() => onNavigate(product.id || product._id)}
        >
            {/* Optimized Placeholder/Poster */}
            <img
                src={product.video?.thumbnail || (product.images?.[0]?.url)}
                alt={product.name}
                className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
                    (isPlaying || hasStarted) ? "opacity-0" : "opacity-100"
                )}
            />

            <video
                ref={videoRef}
                src={product.video?.url}
                loop
                muted
                playsInline
                preload="metadata"
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-700",
                    (isPlaying || hasStarted) ? "opacity-100" : "opacity-0"
                )}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Overlay UI */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-16 z-20 pointer-events-none">
                <h4 className="text-white text-sm font-bold truncate mb-1 shadow-sm">{product.name}</h4>
                <div className="flex items-center justify-between">
                    <span className="text-white text-base font-black tracking-tight">₹{(product.userPrice || product.price || 0).toLocaleString('en-IN')}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product.id || product._id);
                        }}
                        className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all scale-95 group-hover:scale-110 pointer-events-auto border border-white/20"
                    >
                        <ShoppingBag className="h-4.5 w-4.5" />
                    </button>
                </div>
            </div>

            {/* Play/Pause state indicators */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="p-3.5 bg-black/20 backdrop-blur-md rounded-full text-white scale-110 opacity-80">
                        <Play className="h-8 w-8 fill-current translate-x-0.5" />
                    </div>
                </div>
            )}

            {/* Badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-full text-[8px] text-white font-black tracking-widest flex items-center gap-1.5 z-40 border border-white/10 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                Featured Reel
            </div>
        </div>
    )
}

export function ProductReelStrip({ products = [], onNavigate, onAddToCart, title = "Trending Reels" }) {
    // Only show products with videos
    const reelProducts = (products || []).filter(p => p.video && p.video.url)

    if (reelProducts.length === 0) return null

    return (
        <section className="py-10 px-4 sm:px-0 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="px-2 mb-8 flex items-end justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-10 bg-purple-600 rounded-full shadow-[0_0_12px_rgba(147,51,234,0.3)]" />
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1.5 uppercase italic">{title}</h3>
                        <p className="text-[11px] text-purple-600 font-bold uppercase tracking-[0.2em] opacity-80">Exclusive Vertical Production</p>
                    </div>
                </div>
                <div className="flex gap-1.5 pb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-200" />
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                </div>
            </div>

            <div className="relative group">
                {/* Horizontal Scroll Area */}
                <div className="flex gap-5 overflow-x-auto px-2 pb-8 no-scrollbar snap-x snap-mandatory scroll-smooth">
                    {reelProducts.map((product) => (
                        <div key={product.id || product._id} className="snap-start">
                            <ReelItem
                                product={product}
                                onNavigate={onNavigate}
                                onAddToCart={onAddToCart}
                            />
                        </div>
                    ))}
                </div>

                {/* Fade indicators for scroll */}
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/40 to-transparent pointer-events-none group-hover:from-white/20 transition-all duration-500" />
            </div>
        </section>
    )
}

function VideoIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m22 8-6 4 6 4V8Z" />
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        </svg>
    )
}
