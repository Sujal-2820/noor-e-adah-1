import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, AlertCircle, ExternalLink, Filter, Search, Calendar, User, ShoppingBag, Truck, Info, MoreVertical } from 'lucide-react'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { StatusBadge } from '../components/StatusBadge'
import { DataTable } from '../components/DataTable'
import { cn } from '../../../lib/cn'

const columns = [
    { Header: 'Task', accessor: 'title' },
    { Header: 'Category', accessor: 'category' },
    { Header: 'Priority', accessor: 'priority' },
    { Header: 'Description', accessor: 'description' },
    { Header: 'Created', accessor: 'createdAt' },
    { Header: 'Status', accessor: 'status' },
    { Header: 'Action', accessor: 'action' },
]

export default function TasksPage({ navigate }) {
    const { tasks } = useAdminState()
    const { fetchTasks, markTaskViewed, markTaskCompleted, loading } = useAdminApi()

    const [activeTab, setActiveTab] = useState('pending')
    const [filterList, setFilterList] = useState([])
    const [openActionsDropdown, setOpenActionsDropdown] = useState(null)

    const loadTasks = useCallback(async () => {
        await fetchTasks({ status: activeTab === 'all' ? '' : activeTab })
    }, [fetchTasks, activeTab])

    useEffect(() => {
        loadTasks()
    }, [loadTasks])

    // Refresh when tasks are updated
    useEffect(() => {
        if (tasks.updated) {
            loadTasks()
        }
    }, [tasks.updated, loadTasks])

    const handleTaskAction = async (task) => {
        // Navigate to the target screen
        if (task.link) {
            // Mark as viewed if it was pending
            if (task.status === 'pending') {
                await markTaskViewed(task._id)
            }

            // Navigate to the link (assuming navigate function works with string routes)
            const route = task.link.startsWith('/') ? task.link.substring(1) : task.link
            navigate(route)
        }
    }

    const handleCompleteTask = async (taskId) => {
        await markTaskCompleted(taskId)
        loadTasks()
    }

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'user': return <Truck className="h-4 w-4" />
            case 'admin': return <User className="h-4 w-4" />
            case 'order': return <ShoppingBag className="h-4 w-4" />
            case 'finance': return <Info className="h-4 w-4" />
            default: return <Info className="h-4 w-4" />
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
            case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
            case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
            default: return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    const tableColumns = columns.map(col => {
        if (col.accessor === 'title') {
            return {
                ...col,
                Cell: (row) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{row.title}</span>
                        <span className="text-xs text-gray-500 font-medium">#{row.taskId}</span>
                    </div>
                )
            }
        }
        if (col.accessor === 'category') {
            return {
                ...col,
                Cell: (row) => (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 uppercase tracking-tight">
                        {getCategoryIcon(row.category)}
                        {row.category}
                    </div>
                )
            }
        }
        if (col.accessor === 'priority') {
            return {
                ...col,
                Cell: (row) => (
                    <div className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase border", getPriorityColor(row.priority))}>
                        {row.priority}
                    </div>
                )
            }
        }
        if (col.accessor === 'status') {
            return {
                ...col,
                Cell: (row) => (
                    <StatusBadge
                        status={row.status === 'pending' ? 'warning' : row.status === 'viewed' ? 'info' : 'success'}
                        label={row.status}
                    />
                )
            }
        }
        if (col.accessor === 'createdAt') {
            return {
                ...col,
                Cell: (row) => (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(row.createdAt).toLocaleDateString()}
                    </div>
                )
            }
        }
        if (col.accessor === 'action') {
            return {
                ...col,
                Cell: (row) => {
                    const isDropdownOpen = openActionsDropdown === row._id

                    const actionItems = [
                        {
                            label: 'Go to Task',
                            icon: ExternalLink,
                            onClick: () => {
                                handleTaskAction(row)
                                setOpenActionsDropdown(null)
                            },
                            className: 'text-blue-600 hover:bg-blue-50'
                        }
                    ]

                    if (row.status !== 'completed') {
                        actionItems.push({
                            label: 'Mark as Completed',
                            icon: CheckCircle,
                            onClick: () => {
                                handleCompleteTask(row._id)
                                setOpenActionsDropdown(null)
                            },
                            className: 'text-green-600 hover:bg-green-50'
                        })
                    }

                    return (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenActionsDropdown(isDropdownOpen ? null : row._id)
                                }}
                                className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all border border-gray-200 shadow-sm"
                                title="Actions"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setOpenActionsDropdown(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                        {actionItems.map((item, index) => {
                                            const Icon = item.icon
                                            return (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (!item.disabled) {
                                                            item.onClick()
                                                        }
                                                    }}
                                                    disabled={item.disabled}
                                                    className={cn(
                                                        'w-full flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                                                        item.className,
                                                        item.disabled && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    <span>{item.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )
                }
            }
        }
        return col
    })

    const tableRows = (tasks.data || []).map(task => ({
        id: task._id,
        ...task
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin TODO Center</h1>
                    <p className="text-sm text-gray-600 mt-1 font-medium">Manage and track your operational priorities</p>
                </div>

                {tasks.pendingCount > 0 && (
                    <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-2xl flex items-center gap-2 animate-pulse">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-bold text-orange-700">{tasks.pendingCount} Pending Tasks</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
                {['pending', 'viewed', 'completed', 'all'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all duration-200",
                            activeTab === tab
                                ? "bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-visible">
                {loading && !tasks.data ? (
                    <div className="p-20 text-center">
                        <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-gray-500 font-bold">Synchronizing Tasks...</p>
                    </div>
                ) : (
                    <DataTable
                        columns={tableColumns}
                        rows={tableRows}
                        emptyState={`No ${activeTab} tasks found.`}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-3xl text-white shadow-xl">
                    <Clock className="h-8 w-8 mb-4 opacity-80" />
                    <h3 className="text-lg font-bold">Operational Speed</h3>
                    <p className="text-sm opacity-90 mt-1">Faster task resolution improves partner satisfaction and platform growth.</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-3xl text-white shadow-xl">
                    <Truck className="h-8 w-8 mb-4 opacity-80" />
                    <h3 className="text-lg font-bold">User Onboarding</h3>
                    <p className="text-sm opacity-90 mt-1">90% of tasks usually revolve around user verified application reviews.</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-3xl text-white shadow-xl">
                    <ShoppingBag className="h-8 w-8 mb-4 opacity-80" />
                    <h3 className="text-lg font-bold">Order Fulfillment</h3>
                    <p className="text-sm opacity-90 mt-1">Escalated orders require immediate attention to maintain delivery SLAs.</p>
                </div>
            </div>
        </div>
    )
}
