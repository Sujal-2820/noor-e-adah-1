import { useState } from 'react'
import { LayoutDashboard, LogOut, Menu } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function AdminLayout({ sidebar, children, onExit }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100">
      <aside
        className={cn(
          'sticky top-0 h-screen flex flex-col transition-all duration-300 ease-in-out',
          open ? 'w-64' : 'w-[4.5rem]',
          'hidden lg:flex bg-[#23282d]',
        )}
        style={{
          boxShadow: 'none',
        }}
      >
        <div className={cn(
          'flex h-16 items-center border-b border-[#32373c] flex-shrink-0',
          open ? 'justify-between px-4' : 'justify-center px-3'
        )}>
          <div className={cn('flex items-center gap-3 overflow-hidden transition-all', open ? 'opacity-100' : 'opacity-0 w-0')}>
            <div className="flex h-8 w-8 items-center justify-center bg-white rounded overflow-hidden flex-shrink-0">
              <img src="/assets/NoorEAdahLogo.png" alt="Noor E Adah" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Noor E Adah</p>
              <p className="text-xs text-[#b4b9be]">Administrator</p>
            </div>
          </div>
          <button
            type="button"
            className={cn(
              'flex items-center justify-center text-[#b4b9be] transition-all duration-200 hover:text-white hover:bg-[#32373c]',
              open ? 'h-8 w-8' : 'h-10 w-10',
            )}
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <Menu className={cn('transition-all', open ? 'h-4 w-4' : 'h-5 w-5')} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-0 no-scrollbar">{sidebar({ condensed: !open, onSignOut: onExit })}</div>
        <div className="border-t border-[#32373c] flex-shrink-0 space-y-0">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-[#b4b9be] hover:bg-[#32373c] hover:text-white transition-colors duration-150"
          >
            <Menu className="h-5 w-5 flex-shrink-0" />
            {open && <span className="text-sm">Collapse menu</span>}
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white bg-[#dc3232] hover:bg-[#c92a2a] transition-colors duration-150"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200/50 bg-white/95 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 lg:hidden"
                onClick={() => setOpen((prev) => !prev)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onExit ? (
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 lg:inline-flex"
                  onClick={onExit}
                >
                  <LogOut className="h-4 w-4" />
                  Exit Admin
                </button>
              ) : null}
              <button
                type="button"
                className="group flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <div className="hidden text-left text-sm leading-tight sm:block">
                  <p className="font-bold text-gray-900">Administrator</p>
                  <p className="text-xs text-gray-500">Account</p>
                </div>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

