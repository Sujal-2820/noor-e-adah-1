import { useEffect } from 'react'
import { AlertTriangle, BarChart3, PieChart, Users } from 'lucide-react'
import { MetricCard } from '../components/MetricCard'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { ProgressList } from '../components/ProgressList'
import { Timeline } from '../components/Timeline'

import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { cn } from '../../../lib/cn'

export function DashboardPage() {
  const { dashboard, tasks } = useAdminState()
  const { fetchDashboardData, fetchTasks } = useAdminApi()

  useEffect(() => {
    fetchDashboardData({ period: '30d' })
    fetchTasks({ limit: 5 })
  }, [fetchDashboardData, fetchTasks])

  // Use data from context
  const dashboardData = dashboard.data || {}
  const { headline = [] } = dashboardData

  return (
    <div className="space-y-8">
      <FilterBar
        filters={[
          { id: 'period', label: 'Last 30 days', active: true },
          { id: 'region', label: 'All regions' },
          { id: 'channel', label: 'All channels' },
        ]}
      />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {headline.map((metric, index) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            trend={metric.trend}
            icon={metric.id === 'users' ? Users : metric.id === 'revenue' ? BarChart3 : PieChart}
            tone={metric.id === 'orders' ? 'warning' : metric.id === 'revenue' ? 'success' : 'default'}
            colorIndex={index}
          />
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-blue-700">Recent Activity</h2>
          <p className="text-xs text-gray-500 mt-1">Monitor the latest system updates and user actions.</p>
          <div className="mt-6 flex h-32 items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-sm text-gray-400 italic">No recent anomalies detected</p>
          </div>
        </div>
        <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-purple-700">System Distribution</h2>
          <p className="text-xs text-gray-500 mt-1">Overview of operational health across regions.</p>
          <div className="mt-6 flex h-32 items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
            <p className="text-sm text-gray-400 italic">Loading analytics...</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="space-y-4 rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-300">
          <header className="flex items-center justify-between border-b border-orange-200 pb-3">
            <div>
              <h3 className="text-lg font-bold text-orange-700">Important Tasks</h3>
              <p className="text-sm text-gray-600">
                Tasks that need your immediate attention.
              </p>
            </div>
            <a
              href="/admin/tasks"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline px-3 py-1 rounded-full bg-orange-50 border border-orange-100 transition-colors"
            >
              View All
            </a>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {tasks.data && tasks.data.filter(t => t.status !== 'completed' || t.priority === 'urgent').slice(0, 4).map((task) => {
              // Determine color based on priority or category
              let color = 'blue';
              if (task.priority === 'urgent' || task.priority === 'high') color = 'red';
              else if (task.category === 'order') color = 'yellow';

              return (
                <div
                  key={task._id}
                  className={cn(
                    'group cursor-pointer rounded-2xl border p-4 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)]',
                    color === 'blue' && 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/30 hover:from-blue-100 hover:to-blue-200/40',
                    color === 'yellow' && 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/30 hover:from-yellow-100 hover:to-yellow-200/40',
                    color === 'green' && 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/30 hover:from-green-100 hover:to-green-200/40',
                    color === 'red' && 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/30 hover:from-red-100 hover:to-red-200/40',
                  )}
                  onClick={() => {
                    if (task.link) {
                      window.location.href = `/admin${task.link}`;
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-blue-900 transition-colors">{task.title}</p>
                    {task.priority === 'urgent' && (
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse mt-1.5" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">{task.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                      color === 'blue' ? "bg-blue-100 text-blue-700" :
                        color === 'yellow' ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                    )}>
                      {task.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {(!tasks.data || tasks.data.length === 0) && (
              <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                <p className="text-sm text-gray-500 italic">No pending tasks found. All clear! 🎉</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

