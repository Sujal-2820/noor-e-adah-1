import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getTranslation, getBatchTranslations } from '../utils/translation'

const TranslationContext = createContext(null)

const STORAGE_KEY = 'ira_sathi_language'

export function TranslationProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    // Load from localStorage or default to English
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const lang = saved === 'hi' ? 'hi' : 'en'
      console.log('[TranslationContext] Initial language loaded:', lang, 'from localStorage:', saved)
      return lang
    } catch (error) {
      console.error('[TranslationContext] Error loading language:', error)
      return 'en'
    }
  })

  // Save language preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
      console.log('[TranslationContext] Language saved to localStorage:', language)
    } catch (error) {
      console.error('[TranslationContext] Error saving language preference:', error)
    }
  }, [language])

  const setLanguage = useCallback((lang) => {
    console.log('[TranslationContext] setLanguage called with:', lang)
    if (lang === 'en' || lang === 'hi') {
      console.log('[TranslationContext] Setting language to:', lang)
      setLanguageState(lang)
    } else {
      console.warn('[TranslationContext] Invalid language:', lang)
    }
  }, [])

  const translate = useCallback(async (text, forceRefresh = false) => {
    if (language === 'en' || !text) {
      return text
    }
    return await getTranslation(text, language, forceRefresh)
  }, [language])

  const translateBatch = useCallback(async (texts, forceRefresh = false) => {
    if (language === 'en' || !texts || texts.length === 0) {
      return texts
    }
    return await getBatchTranslations(texts, language, forceRefresh)
  }, [language])

  const translateProduct = useCallback((product) => {
    if (language === 'en' || !product) {
      return product
    }

    // Return a new object with Hindi fields mapped to standard fields if they exist
    return {
      ...product,
      name: product.name_hi || product.name,
      description: product.description_hi || product.description,
      shortDescription: product.shortDescription_hi || product.shortDescription,
      category: product.category_hi || product.category,
      brand: product.brand_hi || product.brand,
      tags: (product.tags_hi && product.tags_hi.length > 0) ? product.tags_hi : product.tags,
    }
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      translate,
      translateBatch,
      translateProduct,
      isHindi: language === 'hi',
      isEnglish: language === 'en',
    }),
    [language, setLanguage, translate, translateBatch, translateProduct]
  )

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    // Return a no-op implementation if context is not available
    return {
      language: 'en',
      setLanguage: () => { },
      translate: (text) => Promise.resolve(text),
      translateBatch: (texts) => Promise.resolve(texts),
      translateProduct: (product) => product,
      isHindi: false,
      isEnglish: true,
    }
  }
  return context
}

