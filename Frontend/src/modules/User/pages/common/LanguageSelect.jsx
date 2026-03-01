import { useUserDispatch, useUserState } from '../../context/UserContext'

const languages = [
  { id: 'en', label: 'English', description: 'Continue in English' },
  { id: 'hi', label: 'हिन्दी', description: 'Hindi / हिन्दी में आगे बढ़ें' },
]

export function LanguageSelect({ onContinue }) {
  const { language } = useUserState()
  const dispatch = useUserDispatch()

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-white px-5 py-10">
      <div className="w-full max-w-sm space-y-10 text-center">
        <div>
          <h1 className="text-3xl font-semibold text-surface-foreground">Choose Language</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            कृपया अपनी भाषा चुनें। Select the language to continue with the user experience.
          </p>
        </div>
        <div className="space-y-4">
          {languages.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: lang.id })}
              className={`w-full rounded-3xl border px-6 py-4 text-left transition ${
                language === lang.id
                  ? 'border-brand bg-brand-soft/70 text-brand shadow-card'
                  : 'border-muted/60 bg-white/80 text-surface-foreground hover:border-brand/40'
              }`}
            >
              <p className="text-lg font-semibold">{lang.label}</p>
              <p className="text-xs text-muted-foreground">{lang.description}</p>
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="w-full max-w-sm rounded-full bg-brand px-6 py-3 text-base font-semibold text-brand-foreground shadow-card"
      >
        Continue
      </button>
    </div>
  )
}

