export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatScore(runs, wickets, overs) {
  if (runs === undefined || runs === null) return '-'
  const wicketStr =
    wickets !== undefined && wickets !== null ? `/${wickets}` : ''
  const oversStr = overs !== undefined && overs !== null ? ` (${overs})` : ''
  return `${runs}${wicketStr}${oversStr}`
}

export function formatOvers(overs) {
  if (overs === undefined || overs === null) return '-'
  return `${overs} ov`
}

export function formatRunRate(runRate) {
  if (runRate === undefined || runRate === null) return '-'
  return Number(runRate).toFixed(2)
}

export function formatNetRunRate(nrr) {
  if (nrr === undefined || nrr === null) return '-'
  const num = Number(nrr)
  return num >= 0 ? `+${num.toFixed(3)}` : num.toFixed(3)
}

export function formatPercentage(value) {
  if (value === undefined || value === null) return '-'
  return `${Number(value).toFixed(1)}%`
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

export function deslugify(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export function truncate(text, maxLength = 50) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`
}

export function formatSeasonName(season) {
  if (!season) return 'Unknown Season'

  if (
    season.name &&
    !/^\d+$/.test(season.name) &&
    season.name !== String(season.league_id)
  ) {
    const name = season.name.trim()
    const yearMatch = name.match(/\b(20\d{2})\b/)
    if (yearMatch) return name
    return name
  }

  const code = season.code || season.league_code || ''
  const year = season.year || season.starting_at?.slice(0, 4) || ''

  if (year) {
    const y = parseInt(year, 10)
    const nextYear = String(y + 1).slice(-2)
    const label = code ? `${code} ${y}/${nextYear}` : `Season ${y}/${nextYear}`
    return label
  }

  const id = season.id?.toString() || ''
  if (code) return `${code} Season ${id}`

  return `Season ${id}`
}
