import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../context/TranslationContext'

/**
 * Trans Component
 * 
 * Automatically translates its children text content
 * Re-renders when language changes
 * Usage: <Trans>Hello World</Trans>
 * 
 * Note: Only works with string children. For dynamic content with variables,
 * split the text and use multiple Trans components: <Trans>Add</Trans> ₹{amount} <Trans>more</Trans>
 */
export function Trans({ children, forceRefresh = false }) {
  const { translate, isEnglish, language } = useTranslation()

  const [translatedText, setTranslatedText] = useState(children)
  const [isTranslating, setIsTranslating] = useState(false)
  const previousTextRef = useRef(children)
  const previousLanguageRef = useRef(language)

  useEffect(() => {
    if (typeof children !== 'string') return
    const text = children.trim()

    // Skip if text and language haven't changed
    if (text === previousTextRef.current && language === previousLanguageRef.current) {
      return
    }

    previousTextRef.current = text
    previousLanguageRef.current = language

    if (isEnglish || !text) {
      setTranslatedText(children)
      setIsTranslating(false)
      return
    }

    // Don't translate if it's an entity ID
    if (/^[A-Z]{2,4}-[\dA-Z-]+$/i.test(text)) {
      setTranslatedText(text)
      setIsTranslating(false)
      return
    }

    setIsTranslating(true)

    translate(text, forceRefresh)
      .then((translated) => {
        console.log(`[Trans] Translated: "${text}" → "${translated}"`)
        setTranslatedText(translated)
        setIsTranslating(false)
      })
      .catch((error) => {
        console.error('[Trans] Translation error:', error)
        setTranslatedText(children) // Fallback to original on error
        setIsTranslating(false)
      })
  }, [children, isEnglish, translate, forceRefresh, language])

  // Show original text while translating (or show translated immediately if already cached)
  return <>{isTranslating && !translatedText ? children : translatedText}</>
}

