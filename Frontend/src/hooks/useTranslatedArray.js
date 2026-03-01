import { useState, useEffect } from 'react'
import { useTranslation } from '../context/TranslationContext'

/**
 * Hook to translate an array of texts dynamically
 * Automatically re-translates when language changes
 * 
 * Usage:
 * const translatedTexts = useTranslatedArray(['Home', 'Cart', 'Orders'])
 */
export function useTranslatedArray(texts, forceRefresh = false) {
  const { translateBatch, isEnglish, language } = useTranslation()
  const [translatedTexts, setTranslatedTexts] = useState(texts)

  useEffect(() => {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      setTranslatedTexts(texts)
      return
    }

    if (isEnglish) {
      setTranslatedTexts(texts)
      return
    }

    translateBatch(texts, forceRefresh)
      .then((translated) => {
        setTranslatedTexts(translated)
      })
      .catch(() => {
        setTranslatedTexts(texts) // Fallback to original on error
      })
  }, [texts, isEnglish, translateBatch, forceRefresh, language])

  return translatedTexts
}






