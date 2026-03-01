import { Store, Users } from 'lucide-react'
import { useUserDispatch, useUserState } from '../../context/UserContext'

const roles = [
  {
    id: 'user',
    label: 'User',
    description: 'Manage collections, accept orders, track sales.',
    icon: Store,
  },
  {
    id: 'admin',
    label: 'Noor E Adah Partner',
    description: 'Grow your business, refer customers, and track earnings.',
    icon: Users,
  },
]

export function RoleSelect({ onSelect, onBack }) {
  const { role } = useUserState()
  const dispatch = useUserDispatch()

  return (
    <div className="flex min-h-screen flex-col bg-white px-5 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 self-start rounded-full border border-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground"
      >
        Back
      </button>

      <div className="mx-auto w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-semibold text-surface-foreground">Who are you?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us your role to customise the experience. आप User हैं या Noor E Adah Partner?
          </p>
        </div>

        <div className="space-y-4">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_ROLE', payload: item.id })
                onSelect(item.id)
              }}
              className={`flex w-full items-center gap-4 rounded-3xl border px-5 py-4 text-left transition ${role === item.id
                ? 'border-brand bg-brand-soft/70 text-brand shadow-card'
                : 'border-muted/60 bg-white/80 text-surface-foreground hover:border-brand/40'
                }`}
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

