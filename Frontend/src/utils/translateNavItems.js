/**
 * Utility to translate navigation items
 * Automatically translates labels and descriptions when language changes
 */

import { useMemo } from 'react'
import { useTranslatedArray } from '../hooks/useTranslatedArray'

/**
 * Hook to translate navigation items
 * 
 * Usage:
 * const translatedItems = useTranslatedNavItems(NAV_ITEMS)
 */
export function useTranslatedNavItems(items) {
  // Extract all labels and descriptions
  const labels = useMemo(() => items.map(item => item.label), [items])
  const descriptions = useMemo(() => items.map(item => item.description || ''), [items])
  
  // Translate them
  const translatedLabels = useTranslatedArray(labels)
  const translatedDescriptions = useTranslatedArray(descriptions)
  
  // Combine back into items
  return useMemo(() => {
    return items.map((item, index) => ({
      ...item,
      label: translatedLabels[index] || item.label,
      description: translatedDescriptions[index] || item.description,
    }))
  }, [items, translatedLabels, translatedDescriptions])
}






