import { cn } from '../../../lib/cn'

export function BottomNavItem({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-200 group"
      aria-label={label}
      style={{
        color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
      }}
    >
      <span className="relative flex items-center justify-center transition-all duration-200 p-0.5">
        {icon}
      </span>
      <span className={`text-[11px] font-medium mt-0.5 leading-none transition-all duration-200 tracking-wider ${active ? 'opacity-100 font-semibold' : 'opacity-80'}`}>
        {label}
      </span>
    </button>
  )
}

