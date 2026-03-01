import { MessageSquare, User, Calendar, CheckCircle, XCircle, Send } from 'lucide-react'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { Timeline } from './Timeline'
import { useState } from 'react'
import { cn } from '../../../lib/cn'

export function SupportTicketModal({ isOpen, onClose, tickets, user, onResolve, onCloseTicket, loading }) {
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')

  if (!tickets || tickets.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Support Tickets" size="lg">
        <div className="py-8 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-sm text-gray-600">No support tickets found for this user.</p>
        </div>
      </Modal>
    )
  }

  const handleReply = () => {
    if (replyText.trim() && selectedTicket) {
      // Handle reply - this would call an API
      console.log('Replying to ticket:', selectedTicket.id, replyText)
      setReplyText('')
    }
  }

  const handleResolve = (ticketId) => {
    if (onResolve) {
      onResolve(ticketId)
    }
  }

  const handleCloseTicket = (ticketId) => {
    if (onCloseTicket) {
      onCloseTicket(ticketId)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Support Tickets - ${user?.name || 'User'}`} size="xl">
      <div className="space-y-6">
        {/* Tickets List */}
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={cn(
                'rounded-xl border p-4 transition-all cursor-pointer',
                selectedTicket?.id === ticket.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50',
              )}
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">Ticket #{ticket.id || ticket.ticketId}</p>
                    <StatusBadge tone={ticket.status === 'resolved' ? 'success' : ticket.status === 'closed' ? 'neutral' : 'warning'}>
                      {ticket.status || 'Open'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{ticket.subject || ticket.title || 'No subject'}</p>
                  <p className="mt-1 text-xs text-gray-500">{ticket.description || ticket.message}</p>
                  {ticket.createdAt && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{ticket.createdAt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Ticket Details */}
        {selectedTicket && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-900">Ticket #{selectedTicket.id || selectedTicket.ticketId}</h4>
                <StatusBadge tone={selectedTicket.status === 'resolved' ? 'success' : selectedTicket.status === 'closed' ? 'neutral' : 'warning'}>
                  {selectedTicket.status || 'Open'}
                </StatusBadge>
              </div>
              <p className="text-sm font-semibold text-gray-900">{selectedTicket.subject || selectedTicket.title}</p>
              <p className="mt-2 text-sm text-gray-700">{selectedTicket.description || selectedTicket.message}</p>
            </div>

            {/* Ticket Timeline */}
            {selectedTicket.conversation && selectedTicket.conversation.length > 0 && (
              <div className="mb-4">
                <h5 className="mb-2 text-xs font-bold text-gray-500">Conversation</h5>
                <Timeline
                  events={selectedTicket.conversation.map((msg, index) => ({
                    id: `msg-${index}`,
                    title: msg.from || 'User',
                    timestamp: msg.timestamp || msg.date || 'N/A',
                    description: msg.message || msg.text,
                    status: msg.from === 'Admin' ? 'completed' : 'pending',
                  }))}
                />
              </div>
            )}

            {/* Reply Section */}
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={!replyText.trim() || loading}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve(selectedTicket.id || selectedTicket.ticketId)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-bold text-green-600 transition-all hover:bg-green-50 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCloseTicket(selectedTicket.id || selectedTicket.ticketId)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

