import { useState, useEffect } from 'react'
import { useTranslation } from '../context/TranslationContext'

/**
 * Hook to translate text dynamically
 * Automatically re-translates when language changes
 * 
 * Usage:
 * const translatedText = useTranslatedText('Hello World')
 */
export function useTranslatedText(text, forceRefresh = false) {
  const { translate, isEnglish, language } = useTranslation()
  const [translatedText, setTranslatedText] = useState(text)

  useEffect(() => {
    if (!text || typeof text !== 'string') {
      setTranslatedText(text)
      return
    }

    if (isEnglish) {
      setTranslatedText(text)
      return
    }

    // Don't translate entity IDs
    if (/^[A-Z]{2,4}-[\dA-Z-]+$/i.test(text.trim())) {
      setTranslatedText(text)
      return
    }

    translate(text, forceRefresh)
      .then((translated) => {
        setTranslatedText(translated)
      })
      .catch(() => {
        setTranslatedText(text) // Fallback to original on error
      })
  }, [text, isEnglish, translate, forceRefresh, language])

  return translatedText
}






