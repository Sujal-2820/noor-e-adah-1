import { useState, useEffect } from 'react'
import { useTranslation } from '../context/TranslationContext'

/**
 * TransText Component
 * 
 * Translates dynamic text values (like product names, descriptions from API)
 * Usage: <TransText>{product.name}</TransText>
 */
export function TransText({ children, forceRefresh = false }) {
  const { translate, isEnglish, language } = useTranslation()
  const [translatedText, setTranslatedText] = useState(children)

  useEffect(() => {
    // Only translate string children
    if (typeof children !== 'string') {
      setTranslatedText(children)
      return
    }

    if (isEnglish || !children) {
      setTranslatedText(children)
      return
    }

    const text = children.trim()
    
    if (!text) {
      setTranslatedText(children)
      return
    }
    
    // Don't translate if it's an entity ID
    if (/^[A-Z]{2,4}-[\dA-Z-]+$/i.test(text)) {
      setTranslatedText(text)
      return
    }
    
    // Translate the text
    translate(text, forceRefresh)
      .then((translated) => {
        setTranslatedText(translated)
      })
      .catch(() => {
        setTranslatedText(children) // Fallback to original on error
      })
  }, [children, isEnglish, translate, forceRefresh, language])

  return <>{translatedText}</>
}






