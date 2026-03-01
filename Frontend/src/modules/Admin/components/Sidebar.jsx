import { useState } from 'react'
import { BarChart3, Bell, Building2, Factory, Home, Layers3, Layers, Users2, Wallet, Settings, IndianRupee, History, ChevronRight, ImageIcon, Star, ListTodo } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useAdminState } from '../context/AdminContext'

const links = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview & important updates',
    color: 'blue',
    suboptions: []
  },
  {
    id: 'tasks',
    label: 'TODO Tasks',
    icon: ListTodo,
    description: 'Operational tasks and priorities',
    color: 'orange',
    suboptions: []
  },
  {
    id: 'products',
    label: 'Products',
    icon: Layers3,
    description: 'All products list',
    color: 'purple',
    suboptions: [
      { id: 'products/add', label: 'Add Products' },
      { id: 'products/active', label: 'Active Products' },
      { id: 'products/inactive', label: 'Inactive Products' },
    ]
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: Layers,
    description: 'Manage product categories',
    color: 'purple',
    suboptions: [
      { id: 'categories/add', label: 'Add Category' },
    ]
  },
  {
    id: 'offers',
    label: 'Offers',
    icon: ImageIcon,
    description: 'Manage carousels and special offers',
    color: 'purple',
    suboptions: []
  },
  {
    id: 'reviews',
    label: 'Reviews',
    icon: Star,
    description: 'Manage product reviews and ratings',
    color: 'purple',
    suboptions: []
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: Building2,
    description: 'Approvals & delivery',
    color: 'red',
    suboptions: [
      { id: 'orders/all', label: 'ALL' },
      { id: 'orders/escalated', label: 'Escalated Orders' },
      { id: 'orders/processing', label: 'Processing Orders' },
      { id: 'orders/completed', label: 'Completed' },
    ]
  },
  {
    id: 'users',
    label: 'Users',
    icon: Factory,
    description: 'Manage customers & account statuses',
    color: 'green',
    suboptions: [
      { id: 'users/all', label: 'All Users' },
      { id: 'users/orders', label: 'User Orders' },
      { id: 'users/rankings', label: 'User Rankings' },
    ]
  },
  {
    id: 'payment-history',
    label: 'Payment History',
    icon: History,
    description: 'Complete audit log of all transactions',
    color: 'indigo',
    suboptions: []
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Settings,
    description: 'Logistics, escalations & notifications',
    color: 'teal',
    suboptions: [
      { id: 'operations/notifications/add', label: 'Add Notifications' },
      { id: 'operations/delivery-timeline/update', label: 'Update Delivery Timeline' },
    ]
  },
  {
    id: 'push-notifications',
    label: 'Push Notifications',
    icon: Bell,
    description: 'Send push notifications to devices',
    color: 'indigo',
    suboptions: []
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Area & group patterns',
    color: 'indigo',
    suboptions: [
      { id: 'analytics/sales', label: 'Sales Analytics' },
      { id: 'analytics/users', label: 'User Analytics' },
      { id: 'analytics/orders', label: 'Order Analytics' },
    ]
  },
]

const colorStyles = {
  blue: {
    active: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-50 hover:border-blue-300',
  },
  purple: {
    active: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-50 hover:border-purple-300',
  },
  green: {
    active: 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:bg-green-50 hover:border-green-300',
  },
  yellow: {
    active: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-50 hover:border-yellow-300',
  },
  orange: {
    active: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-50 hover:border-orange-300',
  },
  red: {
    active: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    hover: 'hover:bg-red-50 hover:border-red-300',
  },
  pink: {
    active: 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-50 hover:border-pink-300',
  },
  indigo: {
    active: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-50 hover:border-indigo-300',
  },
  teal: {
    active: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-50 hover:border-teal-300',
  },
  cyan: {
    active: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    hover: 'hover:bg-cyan-50 hover:border-cyan-300',
  },
}

export function Sidebar({ active, onNavigate, condensed = false, onSignOut }) {
  const { tasks } = useAdminState?.() || { tasks: { pendingCount: 0 } }
  const [expandedItems, setExpandedItems] = useState(new Set())

  const toggleExpand = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isParentActive = (id, suboptions) => {
    if (active === id) return true
    if (suboptions && suboptions.length > 0) {
      return suboptions.some((sub) => {
        if (sub.id === active) return true
        if (active.startsWith(sub.id + '/')) return true
        return false
      })
    }
    return active.startsWith(id + '/')
  }

  const isSuboptionActive = (subId) => {
    return active === subId || active.startsWith(subId + '/')
  }

  return (
    <nav className="mt-2">
      {links.map(({ id, label, icon: Icon, description, color, suboptions = [] }) => {
        const hasSuboptions = suboptions && suboptions.length > 0
        const isExpanded = expandedItems.has(id)
        const isActive = isParentActive(id, suboptions)

        return (
          <div key={id}>
            <button
              type="button"
              onClick={() => {
                if (hasSuboptions) {
                  toggleExpand(id)
                }
                onNavigate(id)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none',
                isActive
                  ? 'bg-[#2271b1] text-white border-l-4 border-[#2271b1]'
                  : 'text-[#b4b9be] hover:bg-[#32373c] hover:text-white',
                id === 'tasks' && tasks?.pendingCount > 0 && !isActive && 'animate-pulse bg-orange-900/40 text-orange-400 font-bold',
                condensed && 'justify-center'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-[#b4b9be]')} />
                {id === 'tasks' && tasks?.pendingCount > 0 && !isActive && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500 shadow-sm border border-white"></span>
                  </span>
                )}
              </div>
              {!condensed && (
                <>
                  <span className={cn('text-sm', isActive ? 'text-white font-medium' : (id === 'tasks' && tasks?.pendingCount > 0 ? 'text-orange-400' : 'text-[#b4b9be]'))}>
                    {label}
                  </span>
                  {hasSuboptions && (
                    <span className={cn('ml-auto transition-transform duration-200', isExpanded && 'rotate-90')}>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </>
              )}
            </button>
            {hasSuboptions && isExpanded && !condensed && (
              <div className="bg-[#1d2327]">
                {suboptions.map((sub) => {
                  const isSubActive = isSuboptionActive(sub.id)
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate(sub.id)
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 pl-11 pr-3 py-2 text-left text-sm transition-colors duration-150',
                        isSubActive
                          ? 'bg-[#2271b1]/20 text-[#72aee6]'
                          : 'text-[#b4b9be] hover:bg-[#32373c] hover:text-white',
                      )}
                    >
                      <span className={isSubActive ? 'text-white' : 'text-[#b4b9be]'}>
                        {sub.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
