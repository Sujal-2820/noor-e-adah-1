import { useState, useRef } from 'react'
import { Video, Upload, X, Loader2, Play, Pause, Trash2, Clock } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { uploadProductVideo, deleteProductVideo } from '../services/adminApi'

/**
 * Product Video Upload Component
 * Specifically for vertical reels/videos.
 *
 * Behaviour:
 *  - If `productId` exists (editing): uploads immediately to Cloudinary.
 *  - If `productId` is absent (new product): holds the file in local state and
 *    calls onChange({ _pendingFile: File }) so the parent (Products.jsx) can
 *    upload it after the product is created.  No blocking error is shown.
 *  - Uploading a reel is always OPTIONAL.
 *
 * @param {string}   productId - Product ID (may be undefined when adding a new product)
 * @param {Object}   video     - Existing video object {url, publicId, thumbnail}
 * @param {Function} onChange  - Called with video object, null (removed), or { _pendingFile }
 * @param {boolean}  disabled  - Disable all interaction
 */
export function ProductVideoUpload({ productId, video, onChange, disabled = false }) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    // Preview of a locally-selected file (before product exists)
    const [pendingFile, setPendingFile] = useState(null)
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null)

    const videoRef = useRef(null)
    const fileInputRef = useRef(null)

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Basic validation
        if (!file.type.startsWith('video/')) {
            setError('Please select a valid video file.')
            return
        }

        // Max 100MB
        if (file.size > 100 * 1024 * 1024) {
            setError('Video file size too large. Max 100MB allowed.')
            return
        }

        setError(null)

        // ── No productId yet (new product) — queue locally ──
        if (!productId) {
            const previewUrl = URL.createObjectURL(file)
            setPendingFile(file)
            setPendingPreviewUrl(previewUrl)
            // Notify parent that there's a pending file to upload after save
            onChange?.({ _pendingFile: file })
            return
        }

        // ── Product exists — upload now ──
        setUploading(true)
        try {
            const result = await uploadProductVideo(productId, file)
            if (result.success) {
                onChange?.(result.data)
            } else {
                setError(result.error?.message || 'Failed to upload video.')
            }
        } catch (err) {
            setError('An error occurred during upload. Please try again.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemove = async () => {
        if (disabled) return

        // Remove a pending (not yet uploaded) file — just clear local state
        if (pendingFile) {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
            setPendingFile(null)
            setPendingPreviewUrl(null)
            onChange?.(null)
            return
        }

        if (!productId || !video) return
        if (!window.confirm('Are you sure you want to remove this video?')) return

        try {
            const result = await deleteProductVideo(productId)
            if (result.success) {
                onChange?.(null)
            } else {
                setError(result.error?.message || 'Failed to delete video.')
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        }
    }

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause()
            else videoRef.current.play()
            setIsPlaying(!isPlaying)
        }
    }

    // What to render as the video preview:
    // 1. Already-uploaded video from Cloudinary
    // 2. Locally-selected pending file (blob URL)
    const displayVideo = video?.url ? video : pendingFile ? { url: pendingPreviewUrl } : null

    return (
        <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-900">
                <Video className="mr-1 inline h-4 w-4" />
                Product Reel (Vertical Video)
                <span className="text-xs font-normal text-gray-500 ml-2">
                    Optional · 9:16 ratio recommended · max 100MB
                </span>
            </label>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Pending-file notice (shown when product hasn't been saved yet) */}
            {pendingFile && !video?.url && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-medium text-amber-700">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Reel selected — it will be uploaded automatically when you save the product.
                </div>
            )}

            {displayVideo ? (
                <div className="relative aspect-[9/16] w-full max-w-[240px] rounded-xl border-2 border-gray-300 overflow-hidden bg-black group">
                    <video
                        ref={videoRef}
                        src={displayVideo.url}
                        className="w-full h-full object-cover"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        playsInline
                        muted
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={togglePlay}
                            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                        >
                            {isPlaying
                                ? <Pause className="h-8 w-8 fill-current" />
                                : <Play className="h-8 w-8 fill-current translate-x-0.5" />
                            }
                        </button>
                    </div>

                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10 shadow-lg"
                            title="Remove video"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                        {pendingFile ? 'Queued — saves with product' : 'Associated with Product'}
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                    className={cn(
                        "aspect-[9/16] w-full max-w-[240px] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer",
                        uploading ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-100",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                            <div className="text-center">
                                <span className="block text-sm font-bold text-purple-700">Uploading Reel...</span>
                                <span className="text-[10px] text-purple-500">Cloudinary is optimizing for HLS</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-4 rounded-full bg-white shadow-sm border border-gray-100">
                                <Upload className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="text-center px-4">
                                <span className="block text-sm font-bold text-gray-700">Add Vertical Reel</span>
                                <span className="text-[10px] text-gray-500">MP4, MOV · Optional</span>
                            </div>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="video/*"
                        className="hidden"
                        disabled={disabled || uploading}
                    />
                </div>
            )}
        </div>
    )
}
