import { useState, useEffect } from 'react'
import { useAdminApi } from '../hooks/useAdminApi'

export function NewsletterSubscribers() {
    const { getNewsletterSubscribers } = useAdminApi()
    const [subscribers, setSubscribers] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })

    const fetchSubscribers = async (page = 1) => {
        setLoading(true)
        const result = await getNewsletterSubscribers({ page, limit: 10 })
        if (result.success) {
            setSubscribers(result.data.data || [])
            setPagination(result.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 })
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchSubscribers(pagination.page)
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Newsletter Subscribers</h1>
                    <p className="mt-1 text-sm text-gray-500">View and manage users who have opted in for the newsletter.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                        </div>
                    ) : subscribers.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                            <thead className="bg-[#f0f0f1] dark:bg-white/5">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribed Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-white/10">
                                {subscribers.map((sub, i) => (
                                    <tr key={sub._id || i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{sub.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sub.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {sub.isActive ? 'Active' : 'Unsubscribed'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 text-sm">
                            <p>No subscribers found.</p>
                        </div>
                    )}
                </div>
                {pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                        <button
                            onClick={() => fetchSubscribers(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="px-4 py-2 border rounded-md text-sm cursor-pointer disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm">Page {pagination.page} of {pagination.pages}</span>
                        <button
                            onClick={() => fetchSubscribers(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            className="px-4 py-2 border rounded-md text-sm cursor-pointer disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
