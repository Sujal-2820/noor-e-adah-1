/**
 * Optimized Translation Utility
 * 1. Checks local hi.json dictionary first (Free)
 * 2. Uses Backend Proxy for security (Hides API Key)
 * 3. Size-limited cache to avoid LocalStorage limit (Self-cleaning)
 */

import hiDictionary from '../locales/hi.json';

const API_URL = import.meta.env.VITE_API_URL || '';
const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || '';
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const TRANSLATION_CACHE_KEY = 'ira_sathi_translation_cache';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CACHE_SIZE = 1000; // Max number of entries to avoid 5MB limit

// Load cache from localStorage
function getCache() {
  try {
    const cached = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('[Translation] Error loading cache:', error);
  }
  return {};
}

// Save cache with self-cleaning logic
function saveCache(cache) {
  try {
    const keys = Object.keys(cache);

    // Self-clean if cache gets too large
    if (keys.length > MAX_CACHE_SIZE) {
      console.log('[Translation] Cache limit reached. Cleaning oldest entries...');
      // Sort by timestamp and keep latest
      const sortedKeys = keys.sort((a, b) => cache[b].timestamp - cache[a].timestamp);
      const newCache = {};
      sortedKeys.slice(0, MAX_CACHE_SIZE).forEach(key => {
        newCache[key] = cache[key];
      });
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(newCache));
    } else {
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error('[Translation] Error saving cache (likely storage full):', error);
    // If it fails, clear everything as a fallback
    localStorage.removeItem(TRANSLATION_CACHE_KEY);
  }
}

function getCacheKey(text, targetLang) {
  return `${targetLang}:${text}`;
}

function isCacheValid(entry) {
  if (!entry || !entry.timestamp) return false;
  return Date.now() - entry.timestamp < CACHE_EXPIRY;
}

// Check local dictionary
function checkDictionary(text, lang) {
  if (lang === 'hi' && hiDictionary[text]) {
    return hiDictionary[text];
  }
  return null;
}

/**
 * Get translation for a single text
 */
export async function getTranslation(text, targetLang = 'hi', forceRefresh = false) {
  if (!text || typeof text !== 'string') return text;
  if (targetLang === 'en') return text;

  const trimmedText = text.trim();
  if (!trimmedText) return text;

  // 1. Check hi.json dictionary first (FREE)
  const dictionaryMatch = checkDictionary(trimmedText, targetLang);
  if (dictionaryMatch) return dictionaryMatch;

  // 2. Check cache (unless force refresh)
  if (!forceRefresh) {
    const cache = getCache();
    const cacheKey = getCacheKey(trimmedText, targetLang);
    const cached = cache[cacheKey];
    if (isCacheValid(cached)) return cached.translated;
  }

  // 3. Call Google Translate API directly if key is available
  if (GOOGLE_TRANSLATE_API_KEY) {
    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: trimmedText,
          target: targetLang,
          format: 'text',
          source: 'en'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data.data.translations[0].translatedText;

        // Save to cache
        const cache = getCache();
        const cacheKey = getCacheKey(trimmedText, targetLang);
        cache[cacheKey] = { translated, timestamp: Date.now() };
        saveCache(cache);

        return translated;
      }
    } catch (apiError) {
      console.warn('[Translation] Direct API call failed:', apiError);
    }
  }

  // 4. Fallback: Return original text if direct API fails or key is missing
  return text;
}

/**
 * Get translations for multiple texts (batch)
 */
export async function getBatchTranslations(texts, targetLang = 'hi', forceRefresh = false) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return texts || [];
  if (targetLang === 'en') return texts;

  const results = [];
  const textsToTranslate = [];
  const indices = [];
  const cache = getCache();

  texts.forEach((text, index) => {
    if (!text || typeof text !== 'string') {
      results[index] = text;
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      results[index] = text;
      return;
    }

    const dictMatch = checkDictionary(trimmedText, targetLang);
    if (dictMatch) {
      results[index] = dictMatch;
      return;
    }

    if (!forceRefresh) {
      const cacheKey = getCacheKey(trimmedText, targetLang);
      const cached = cache[cacheKey];
      if (isCacheValid(cached)) {
        results[index] = cached.translated;
        return;
      }
    }

    textsToTranslate.push(trimmedText);
    indices.push(index);
  });

  if (textsToTranslate.length === 0) return results;

  // 1. Try Direct API if key available
  if (GOOGLE_TRANSLATE_API_KEY) {
    try {
      const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: textsToTranslate,
          target: targetLang,
          format: 'text',
          source: 'en'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const translations = data.data.translations;

        translations.forEach((t, i) => {
          const originalIndex = indices[i];
          const translated = t.translatedText;
          results[originalIndex] = translated;

          const cacheKey = getCacheKey(textsToTranslate[i], targetLang);
          cache[cacheKey] = { translated, timestamp: Date.now() };
        });
        saveCache(cache);
        return results;
      }
    } catch (apiError) {
      console.warn('[Translation] Direct batch API call failed:', apiError);
    }
  }

  // 2. Fallback: Return original texts if direct API fails
  return results.map((r, i) => r === undefined ? texts[i] : r);
}

export function clearTranslationCache() {
  localStorage.removeItem(TRANSLATION_CACHE_KEY);
}
