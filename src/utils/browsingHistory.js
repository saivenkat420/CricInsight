/**
 * Browsing History Tracker
 *
 * Persists recently viewed matches, teams, and filter states to localStorage
 * for "Continue where you left off" and personalized feed.
 */

const HISTORY_KEY = 'cricket-app-history'
const MAX_ITEMS = 20

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : {matches: [], teams: [], lastFilters: null}
  } catch {
    return {matches: [], teams: [], lastFilters: null}
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    /* storage full */
  }
}

export function recordMatchView(matchSummary) {
  const h = getHistory()
  h.matches = [
    matchSummary,
    ...h.matches.filter(m => m.id !== matchSummary.id),
  ].slice(0, MAX_ITEMS)
  saveHistory(h)
}

export function recordTeamView(teamSummary) {
  const h = getHistory()
  h.teams = [
    teamSummary,
    ...h.teams.filter(t => t.id !== teamSummary.id),
  ].slice(0, MAX_ITEMS)
  saveHistory(h)
}

export function recordLastFilters(filters) {
  const h = getHistory()
  h.lastFilters = filters
  saveHistory(h)
}

export function getRecentMatchViews(limit = 5) {
  return getHistory().matches.slice(0, limit)
}

export function getRecentTeamViews(limit = 5) {
  return getHistory().teams.slice(0, limit)
}

export function getLastFilters() {
  return getHistory().lastFilters
}

export function clearBrowsingHistory() {
  localStorage.removeItem(HISTORY_KEY)
}
