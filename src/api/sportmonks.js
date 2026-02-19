import {getCache, setCache, getCacheTTL} from '../utils/cache'
import {computeMatchInsights} from '../utils/matchInsights'

const API_BASE = '/api'

export const FREE_LEAGUES = [
  {id: 5, name: 'Big Bash League', code: 'BBL', country: 'Australia'},
  {id: 3, name: 'T20 International', code: 'T20I', country: 'International'},
  {id: 10, name: 'CSA T20 Challenge', code: 'CSA', country: 'South Africa'},
]

export function isConfigured() {
  return true
}

async function fetchApi(path, params = {}) {
  const url = new URL(path, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value)
    }
  })

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    if (
      response.status === 500 &&
      (data.error || '').toLowerCase().includes('not configured')
    ) {
      throw new Error('API not configured')
    }
    const errMsg =
      data.error ||
      data?.message?.message ||
      (typeof data?.message === 'string' ? data.message : null) ||
      `API error: ${response.status}`
    throw new Error(errMsg)
  }
  return data
}

export async function getLeagues() {
  const cacheKey = 'sportmonks:leagues'
  const cached = getCache(cacheKey)
  if (cached) return cached

  try {
    const data = await fetchApi(`${API_BASE}/leagues`)
    const leagues = data.data || []
    const filtered = leagues.filter(l =>
      FREE_LEAGUES.some(fl => fl.id === l.id),
    )
    setCache(
      cacheKey,
      filtered.length ? filtered : FREE_LEAGUES,
      getCacheTTL('team'),
    )
    return filtered.length ? filtered : FREE_LEAGUES
  } catch {
    return FREE_LEAGUES
  }
}

export async function getFixtures(leagueId, options = {}) {
  const {status, page = 1, per_page = 20} = options
  const seasonPart = options.seasonId || 'all'
  const cacheKey = `sportmonks:fixtures:${leagueId}:${
    status || 'all'
  }:${seasonPart}:${page}:${per_page}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const params = {leagueId, page, per_page}
  if (status) params.status = status
  if (options.seasonId) params.seasonId = options.seasonId

  const data = await fetchApi(`${API_BASE}/fixtures`, params)
  const ttl =
    status === 'completed'
      ? getCacheTTL('archive')
      : status === 'live'
      ? getCacheTTL('live')
      : getCacheTTL('recent')
  setCache(cacheKey, data, ttl)
  return data
}

export async function getFixtureById(fixtureId) {
  const cacheKey = `sportmonks:fixture:${fixtureId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/fixtures/${fixtureId}`)
  const match = data.data
  const ttl =
    match?.status === 'Finished'
      ? getCacheTTL('historical')
      : getCacheTTL('live')
  setCache(cacheKey, match, ttl)
  return match
}

export async function getLiveFixtures() {
  const cacheKey = 'sportmonks:live'
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/live`)
  const fixtures = data.data || []
  setCache(cacheKey, fixtures, getCacheTTL('live'))
  return fixtures
}

export async function getStandings(seasonId) {
  const cacheKey = `sportmonks:standings:${seasonId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/standings/${seasonId}`)
  const standings = data.data || []
  setCache(cacheKey, standings, getCacheTTL('standings'))
  return standings
}

export async function getTeam(teamId) {
  const cacheKey = `sportmonks:team:${teamId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/teams/${teamId}`)
  const team = data.data
  setCache(cacheKey, team, getCacheTTL('team'))
  return team
}

export async function getSeasonsByLeague(leagueId) {
  const cacheKey = `sportmonks:seasons:${leagueId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/seasons/${leagueId}`)
  const league = data.data
  const seasonsRaw = league?.seasons
  const seasons = Array.isArray(seasonsRaw)
    ? seasonsRaw
    : seasonsRaw?.data || []
  setCache(cacheKey, seasons, getCacheTTL('team'))
  return seasons
}

export async function getResults(options = {}) {
  const {
    leagueId,
    seasonId,
    page = 1,
    per_page = 30,
    dateFrom,
    dateTo,
  } = options
  const params = {page, per_page}
  if (leagueId) params.leagueId = leagueId
  if (seasonId) params.seasonId = seasonId
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo

  const cacheKey = `sportmonks:results:${JSON.stringify(params)}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/results`, params)
  setCache(cacheKey, data, getCacheTTL('archive'))
  return data
}

export async function getUpcomingFixtures() {
  const cacheKey = 'sportmonks:upcoming'
  const cached = getCache(cacheKey)
  if (cached) return cached

  const data = await fetchApi(`${API_BASE}/upcoming`)
  const fixtures = data.data || []
  setCache(cacheKey, fixtures, getCacheTTL('recent'))
  return fixtures
}

function toArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return val.data || []
}

function getPlayerName(obj) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return (
    obj.fullname ||
    [obj.firstname, obj.lastname].filter(Boolean).join(' ') ||
    obj.name ||
    ''
  )
}

function buildPlayerMap(lineup) {
  const arr = toArray(lineup)
  const map = {}
  arr.forEach(p => {
    const player = p.data ?? p
    const id = player.id ?? player.player_id
    if (id) {
      map[String(id)] = getPlayerName(player) || player.fullname || ''
    }
  })
  return map
}

function extractBatting(batting, playerMap) {
  const arr = toArray(batting)
  if (!arr.length) return []
  const byInnings = {}
  arr.forEach(b => {
    const inningsKey = b.scoreboard ?? b.innings_id ?? b.innings ?? 0
    if (!byInnings[inningsKey]) byInnings[inningsKey] = []
    const pid = b.player_id ?? b.batsman_id
    const playerName =
      getPlayerName(resolveInclude(b.batsman)) ||
      getPlayerName(resolveInclude(b.player)) ||
      b.fullname ||
      (pid && playerMap[String(pid)]) ||
      ''
    byInnings[inningsKey].push({
      playerId: pid?.toString(),
      playerName: playerName || `Player ${pid || '?'}`,
      teamId: b.team_id?.toString(),
      runs: b.score ?? b.runs ?? 0,
      balls: b.ball ?? b.balls ?? 0,
      fours: b.four_x ?? b.fours ?? 0,
      sixes: b.six_x ?? b.sixes ?? 0,
      strikeRate:
        (b.ball ?? b.balls ?? 0) > 0
          ? (
              ((b.score ?? b.runs ?? 0) / (b.ball ?? b.balls ?? 0)) *
              100
            ).toFixed(1)
          : '-',
      out: !!(
        b.catch_stump_player_id ||
        b.batsmanout_id ||
        b.bowling_player_id
      ),
      howOut: b.result?.name || b.result || '',
    })
  })
  return Object.values(byInnings).map(innings => innings)
}

function extractBowling(bowling, playerMap) {
  const arr = toArray(bowling)
  if (!arr.length) return []
  const byInnings = {}
  arr.forEach(b => {
    const inningsKey = b.scoreboard ?? b.innings_id ?? b.innings ?? 0
    if (!byInnings[inningsKey]) byInnings[inningsKey] = []
    const pid = b.player_id ?? b.bowler_id
    const playerName =
      getPlayerName(resolveInclude(b.player)) ||
      getPlayerName(resolveInclude(b.bowler)) ||
      b.fullname ||
      (pid && playerMap[String(pid)]) ||
      ''
    const overs = b.overs ?? 0
    const runs = b.runs ?? 0
    byInnings[inningsKey].push({
      playerId: pid?.toString(),
      playerName: playerName || `Player ${pid || '?'}`,
      teamId: b.team_id?.toString(),
      overs,
      maidens: b.medians ?? b.maidens ?? 0,
      runs,
      wickets: b.wickets ?? 0,
      economy: overs > 0 ? (runs / overs).toFixed(1) : '-',
      noalls: b.noball ?? 0,
      wides: b.wide ?? 0,
    })
  })
  return Object.values(byInnings).map(innings => innings)
}

function extractBalls(balls, playerMap) {
  const arr = toArray(balls)
  if (!arr.length) return []
  return arr.map(b => {
    const batsmanId = b.batsman_one_on_creeze_id ?? b.batsman_id
    const bowlerId = b.bowler_id
    const batsmanName =
      getPlayerName(resolveInclude(b.batsman)) ||
      b.batsman_name ||
      (batsmanId && playerMap[String(batsmanId)]) ||
      ''
    const bowlerName =
      getPlayerName(resolveInclude(b.bowler)) ||
      b.bowler_name ||
      (bowlerId && playerMap[String(bowlerId)]) ||
      ''
    return {
      over: b.ball ?? 0,
      ball: 0,
      runs: b.score?.runs ?? b.runs ?? 0,
      wickets: b.score?.is_wicket ? 1 : b.wickets ?? 0,
      batsmanName: batsmanName || '—',
      bowlerName: bowlerName || '—',
      extras: b.score?.noball_runs || b.score?.wide || b.score?.leg_bye || '',
    }
  })
}

function resolveInclude(obj) {
  if (!obj) return null
  return obj.data ?? obj
}

export function normalizeMatch(match) {
  if (!match) return null

  const homeTeam = resolveInclude(match.localteam) || {}
  const awayTeam = resolveInclude(match.visitorteam) || {}
  const runs = toArray(match.runs)
  const getTeamId = r => String(r.team_id ?? r.team?.id ?? '')
  const homeId = String(match.localteam_id ?? homeTeam.id ?? '')
  const awayId = String(match.visitorteam_id ?? awayTeam.id ?? '')
  const homeRunsList = runs
    .filter(r => getTeamId(r) === homeId)
    .sort((a, b) => (a.inning ?? 0) - (b.inning ?? 0))
  const awayRunsList = runs
    .filter(r => getTeamId(r) === awayId)
    .sort((a, b) => (a.inning ?? 0) - (b.inning ?? 0))
  const homeTotal = homeRunsList.reduce(
    (s, r) => s + (r.score ?? r.total ?? 0),
    0,
  )
  const awayTotal = awayRunsList.reduce(
    (s, r) => s + (r.score ?? r.total ?? 0),
    0,
  )
  const homeWickets = homeRunsList.reduce((s, r) => s + (r.wickets ?? 0), 0)
  const awayWickets = awayRunsList.reduce((s, r) => s + (r.wickets ?? 0), 0)
  const homeOvers = homeRunsList.reduce((s, r) => Math.max(s, r.overs ?? 0), 0)
  const awayOvers = awayRunsList.reduce((s, r) => Math.max(s, r.overs ?? 0), 0)

  let status = 'upcoming'
  if (match.status === 'Finished') {
    status = 'completed'
  } else if (
    ['1st Innings', '2nd Innings', 'Innings Break'].includes(match.status)
  ) {
    status = 'live'
  }

  const playerMap = buildPlayerMap(match.lineup)
  const battingRaw = match.batting ?? match.battings
  const bowlingRaw = match.bowling ?? match.bowlings
  const ballsRaw = match.balls

  const normalized = {
    id: `sm-${match.id}`,
    source: 'sportmonks',
    league: {
      id: match.league_id?.toString(),
      name: resolveInclude(match.league)?.name || match.league?.name || '',
      season: match.season_id?.toString(),
    },
    status,
    date: match.starting_at,
    venue: {
      name: resolveInclude(match.venue)?.name || match.venue?.name || '',
      city: resolveInclude(match.venue)?.city || match.venue?.city || '',
      country:
        resolveInclude(resolveInclude(match.venue)?.country)?.name ||
        match.venue?.country?.name ||
        '',
    },
    teams: {
      home: {
        id: homeTeam.id?.toString(),
        name: homeTeam.name || '',
        shortName: homeTeam.code || homeTeam.short_code || '',
        logo: homeTeam.image_path || homeTeam.logo_path || '',
      },
      away: {
        id: awayTeam.id?.toString(),
        name: awayTeam.name || '',
        shortName: awayTeam.code || awayTeam.short_code || '',
        logo: awayTeam.image_path || awayTeam.logo_path || '',
      },
    },
    score: {
      home: {runs: homeTotal, wickets: homeWickets, overs: homeOvers},
      away: {runs: awayTotal, wickets: awayWickets, overs: awayOvers},
    },
    round: match.round || '',
    type: match.type || '',
    result: {
      winner: match.winner_team_id?.toString() || '',
      margin: match.note || '',
      method: match.super_over ? 'Super Over' : match.draw_noresult || '',
    },
    manOfMatch: (() => {
      const mom =
        resolveInclude(match.manofmatch) ||
        match.man_of_match ||
        match.manofmatch
      if (!mom) return null
      return {
        id: mom.id?.toString(),
        name: getPlayerName(mom) || mom.fullname || '',
      }
    })(),
    tossWinner:
      resolveInclude(match.tosswon)?.name ||
      match.tosswon?.name ||
      resolveInclude(match.tosswon)?.code ||
      match.tosswon?.code ||
      '',
    tossDecision: match.elected || match.toss_decision,
    umpire1:
      resolveInclude(match.firstumpire)?.fullname ||
      match.firstumpire?.fullname,
    umpire2:
      resolveInclude(match.secondumpire)?.fullname ||
      match.secondumpire?.fullname,
    batting: extractBatting(battingRaw, playerMap),
    bowling: extractBowling(bowlingRaw, playerMap),
    balls: extractBalls(ballsRaw, playerMap),
    raw: match,
  }

  normalized.insights = computeMatchInsights(normalized) || null
  return normalized
}

export function normalizeTeam(team) {
  if (!team) return null

  const squadRaw = team.squad
  const squadArr = Array.isArray(squadRaw) ? squadRaw : squadRaw?.data || []

  return {
    id: `sm-${team.id}`,
    name: team.name || '',
    shortName: team.code || team.short_code || '',
    logo: team.image_path || team.logo_path || '',
    league: team.league_id?.toString() || '',
    squad: squadArr.map(player => ({
      id: player.id?.toString(),
      name: player.fullname || '',
      role: player.position?.name || '',
      nationality: player.country?.name || '',
    })),
    stats: {},
  }
}
