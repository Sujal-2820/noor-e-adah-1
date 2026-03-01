import { MapPin } from 'lucide-react'
import { cn } from '../../../lib/cn'

/**
 * UserMap Component
 * Displays user location on a map
 * For now, uses a static map image. Can be replaced with Google Maps, Mapbox, etc.
 */
export function UserMap({ user, className }) {
  const { location, region, name } = user || {}

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100', className)}>
      <div
        className={cn(
          'flex h-full min-h-[200px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 text-center',
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <MapPin className="h-8 w-8" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-bold text-gray-900">{name || 'User Location'}</p>
          <p className="text-xs text-gray-600">{region || 'Location not available'}</p>
          <div className="pt-2">
            <p className="text-[0.7rem] font-medium text-gray-500 uppercase tracking-widest">Address</p>
            <p className="text-xs text-gray-700 max-w-[200px] mx-auto">
              {location?.address || 'No address provided'}
            </p>
            <p className="text-xs text-gray-700">
              {location?.city}, {location?.state} {location?.pincode}
            </p>
          </div>
          <div className="mt-4 inline-block rounded-full bg-green-50 px-3 py-1 text-[0.65rem] font-bold text-green-700 border border-green-100">
            Market Coverage: Unlimited
          </div>
        </div>
      </div>
    </div>
  )
}

