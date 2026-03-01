import { cn } from '../../../lib/cn'

const rowHoverColors = [
  'hover:bg-blue-50',
  'hover:bg-purple-50',
  'hover:bg-green-50',
  'hover:bg-yellow-50',
  'hover:bg-red-50',
  'hover:bg-pink-50',
]

export function DataTable({ columns = [], rows = [], emptyState = 'No data available', className }) {
  return (
    <div className={cn('overflow-visible rounded-3xl border border-gray-200 bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]', className)}>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-left text-xs font-bold uppercase tracking-wide text-white">
          <tr>
            {columns.map((column) => (
              <th key={column.accessor} className="px-4 py-4">
                {column.Header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-sm text-gray-500">
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-all duration-200 hover:text-gray-900 focus-within:bg-blue-50',
                  rowHoverColors[index % rowHoverColors.length],
                )}
              >
                {columns.map((column) => (
                  <td key={column.accessor} className="px-4 py-4 align-top text-gray-900 font-medium">
                    {typeof column.Cell === 'function' ? column.Cell(row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

