import { Clock, XCircle, CheckCircle } from 'lucide-react'

export function UserStatusMessage({ status, userId, onBack }) {
  const isPending = status === 'pending'
  const isRejected = status === 'rejected'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-sm text-center">
          {/* Brand Identity */}
          <div className="flex flex-col items-center mb-8 border-b border-blue-50 pb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-blue-100 p-2 overflow-hidden">
              <img src="/NoorEAdah.jpeg" alt="Noor E Adah" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-lg font-black text-slate-900 tracking-tighter uppercase">Noor E <span className="text-accent">Adah</span></span>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Premium Fashion</span>
            </div>
          </div>

          {isPending && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-6">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Waiting for Approval</h1>
              {userId && (
                <p className="text-sm text-gray-500 mb-4">
                  Your Noor E Adah Partner ID: <span className="font-bold text-accent">{userId}</span>
                </p>
              )}
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Thank you for joining us! Your application is currently under review. You can access the partner dashboard once approved.
              </p>
            </>
          )}

          {isRejected && (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Application Status</h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                We regret to inform you that your profile was not approved by the administrative team at this time.
              </p>
            </>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

