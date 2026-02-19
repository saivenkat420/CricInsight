const memoryCache = new Map()

const TTL = {
  live: 30 * 1000,
  recent: 5 * 60 * 1000,
  historical: 24 * 60 * 60 * 1000,
  standings: 5 * 60 * 1000,
  team: 15 * 60 * 1000,
  archive: 24 * 60 * 60 * 1000,
  insights: 24 * 60 * 60 * 1000,
}

export function getCacheTTL(type) {
  return TTL[type] || TTL.recent
}

export function setCache(key, data, ttl = TTL.recent) {
  const entry = {
    data,
    expiry: Date.now() + ttl,
  }
  memoryCache.set(key, entry)

  try {
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {
    console.warn('Session storage full, using memory cache only')
  }
}

export function getCache(key) {
  const memEntry = memoryCache.get(key)
  if (memEntry && memEntry.expiry > Date.now()) {
    return memEntry.data
  }

  try {
    const stored = sessionStorage.getItem(key)
    if (stored) {
      const entry = JSON.parse(stored)
      if (entry.expiry > Date.now()) {
        memoryCache.set(key, entry)
        return entry.data
      }
      sessionStorage.removeItem(key)
    }
  } catch {
    console.warn('Failed to read from session storage')
  }

  memoryCache.delete(key)
  return null
}

export function clearCache(keyPattern) {
  if (keyPattern) {
    const regex = new RegExp(keyPattern)
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key)
        try {
          sessionStorage.removeItem(key)
        } catch {
          console.warn('Failed to clear session storage item')
        }
      }
    }
  } else {
    memoryCache.clear()
    try {
      sessionStorage.clear()
    } catch {
      console.warn('Failed to clear session storage')
    }
  }
}

export function isCached(key) {
  return getCache(key) !== null
}
