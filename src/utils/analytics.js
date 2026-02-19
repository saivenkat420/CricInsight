/**
 * Analytics Instrumentation
 *
 * Lightweight event tracking for retention metrics:
 * - D1 / D7 retention (session timestamps)
 * - Pages per session
 * - Matches viewed per session
 * - Second match detail open rate
 * - Save/follow conversion rate
 *
 * Events are stored in localStorage and can be exported
 * to any analytics backend when one is configured.
 */

const ANALYTICS_KEY = 'cricket-app-analytics'
const SESSION_KEY = 'cricket-app-session'

function getStore() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY)
    return raw
      ? JSON.parse(raw)
      : {
          firstVisit: null,
          sessions: [],
          events: [],
        }
  } catch {
    return {firstVisit: null, sessions: [], events: []}
  }
}

function saveStore(store) {
  try {
    const trimmed = {
      ...store,
      events: store.events.slice(-500),
      sessions: store.sessions.slice(-100),
    }
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed))
  } catch {
    /* storage full */
  }
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

function ensureSession() {
  let session = getSession()
  if (!session) {
    session = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      startedAt: new Date().toISOString(),
      pageViews: 0,
      matchDetailViews: 0,
      favoriteActions: 0,
    }
    saveSession(session)

    const store = getStore()
    if (!store.firstVisit) store.firstVisit = new Date().toISOString()
    store.sessions.push({
      id: session.id,
      date: session.startedAt,
    })
    saveStore(store)
  }
  return session
}

// ── Public API ──────────────────────────────────────────

export function trackPageView(pageName) {
  const session = ensureSession()
  session.pageViews++
  saveSession(session)

  const store = getStore()
  store.events.push({
    type: 'page_view',
    page: pageName,
    sessionId: session.id,
    timestamp: new Date().toISOString(),
  })
  saveStore(store)
}

export function trackMatchDetailView(matchId) {
  const session = ensureSession()
  session.matchDetailViews++
  saveSession(session)

  const store = getStore()
  store.events.push({
    type: 'match_detail_view',
    matchId,
    sessionId: session.id,
    isSecondView: session.matchDetailViews > 1,
    timestamp: new Date().toISOString(),
  })
  saveStore(store)
}

export function trackFavoriteAction(entityType, entityId, action) {
  const session = ensureSession()
  session.favoriteActions++
  saveSession(session)

  const store = getStore()
  store.events.push({
    type: 'favorite_action',
    entityType,
    entityId,
    action,
    sessionId: session.id,
    timestamp: new Date().toISOString(),
  })
  saveStore(store)
}

export function trackSearch(query, resultCount) {
  const session = ensureSession()
  const store = getStore()
  store.events.push({
    type: 'search',
    query,
    resultCount,
    sessionId: session.id,
    timestamp: new Date().toISOString(),
  })
  saveStore(store)
}

export function trackFilterChange(filterName, filterValue) {
  const store = getStore()
  const session = ensureSession()
  store.events.push({
    type: 'filter_change',
    filterName,
    filterValue,
    sessionId: session.id,
    timestamp: new Date().toISOString(),
  })
  saveStore(store)
}

export function trackEvent(eventType, data = {}) {
  const store = getStore()
  const session = ensureSession()
  store.events.push({
    type: eventType,
    ...data,
    sessionId: session.id,
    timestamp: new Date().toISOString(),
  })
  saveStore(store)
}

// ── Funnel computation ───────────────────────────────────

export function getConversionFunnels() {
  const store = getStore()
  const events = store.events

  const savedViewCreated = events.filter(e => e.type === 'saved_view_create')
    .length
  const savedViewUsed = events.filter(e => e.type === 'saved_view_load').length
  const matchOpenAfterSaved = events.filter(
    e => e.type === 'match_detail_view' && e.fromSavedView,
  ).length

  const followSuggested = events.filter(e => e.type === 'follow_suggest_shown')
    .length
  const followActioned = events.filter(
    e => e.type === 'follow_suggest_followed',
  ).length

  const digestShown = events.filter(e => e.type === 'digest_preview_shown')
    .length
  const digestClicked = events.filter(e => e.type === 'digest_preview_click')
    .length

  return {
    savedViewFunnel: {
      created: savedViewCreated,
      used: savedViewUsed,
      matchOpen: matchOpenAfterSaved,
    },
    followFunnel: {
      suggested: followSuggested,
      followed: followActioned,
      conversionRate:
        followSuggested > 0
          ? ((followActioned / followSuggested) * 100).toFixed(1)
          : 0,
    },
    digestFunnel: {
      shown: digestShown,
      clicked: digestClicked,
      clickRate:
        digestShown > 0 ? ((digestClicked / digestShown) * 100).toFixed(1) : 0,
    },
  }
}

// ── Metrics computation ─────────────────────────────────

export function getRetentionMetrics() {
  const store = getStore()
  const session = getSession()
  const now = new Date()

  const firstVisit = store.firstVisit ? new Date(store.firstVisit) : null
  const daysSinceFirst = firstVisit
    ? Math.floor((now - firstVisit) / (1000 * 60 * 60 * 24))
    : 0

  const sessionDates = store.sessions.map(s => new Date(s.date).toDateString())
  const uniqueDays = new Set(sessionDates).size

  const d1Retained = daysSinceFirst >= 1 && uniqueDays >= 2
  const d7Retained = daysSinceFirst >= 7 && uniqueDays >= 3

  const totalEvents = store.events.length
  const matchViews = store.events.filter(e => e.type === 'match_detail_view')
    .length
  const secondViews = store.events.filter(
    e => e.type === 'match_detail_view' && e.isSecondView,
  ).length
  const favoriteEvents = store.events.filter(e => e.type === 'favorite_action')
    .length

  return {
    daysSinceFirst,
    totalSessions: store.sessions.length,
    uniqueActiveDays: uniqueDays,
    d1Retained,
    d7Retained,
    currentSession: session
      ? {
          pageViews: session.pageViews,
          matchDetailViews: session.matchDetailViews,
          favoriteActions: session.favoriteActions,
        }
      : null,
    allTime: {
      totalEvents,
      matchDetailViews: matchViews,
      secondMatchDetailRate:
        matchViews > 0 ? ((secondViews / matchViews) * 100).toFixed(1) : 0,
      favoriteActions: favoriteEvents,
    },
  }
}

export function exportAnalyticsData() {
  return getStore()
}
