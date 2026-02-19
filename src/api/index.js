import * as sportmonks from './sportmonks'

export const FREE_LEAGUES = sportmonks.FREE_LEAGUES

export const LEAGUES = {
  BBL: {id: '5', name: 'Big Bash League', source: 'sportmonks'},
  T20I: {id: '3', name: 'T20 International', source: 'sportmonks'},
  CSA: {id: '10', name: 'CSA T20 Challenge', source: 'sportmonks'},
}

export async function getAvailableLeagues() {
  try {
    const leagues = await sportmonks.getLeagues()
    return leagues.map(l => ({...l, source: 'sportmonks'}))
  } catch {
    return sportmonks.FREE_LEAGUES.map(l => ({...l, source: 'sportmonks'}))
  }
}

export async function getLiveMatches() {
  try {
    const fixtures = await sportmonks.getLiveFixtures()
    return fixtures.map(m => sportmonks.normalizeMatch(m)).filter(Boolean)
  } catch (error) {
    console.warn('Live fetch failed:', error.message)
    return []
  }
}

export async function getMatchesByLeague(leagueId, options = {}) {
  try {
    const {seasonId, per_page = 50, ...rest} = options
    const data = await sportmonks.getFixtures(leagueId, {
      ...rest,
      seasonId,
      per_page,
    })
    return (data.data || [])
      .map(m => sportmonks.normalizeMatch(m))
      .filter(Boolean)
  } catch (error) {
    console.warn('Fixtures fetch failed:', error.message)
    return []
  }
}

export async function getMatchById(matchId) {
  const [source, id] = matchId.split('-', 2)
  if (source !== 'sm' || !id) return null

  try {
    const match = await sportmonks.getFixtureById(id)
    return sportmonks.normalizeMatch(match)
  } catch (error) {
    console.warn('Fixture fetch failed:', error.message)
    return null
  }
}

export async function getUpcomingMatches(limit = 10) {
  try {
    const fixtures = await sportmonks.getUpcomingFixtures()
    const normalized = fixtures.map(m => sportmonks.normalizeMatch(m))
    return normalized
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, limit)
  } catch (error) {
    console.warn('Upcoming fetch failed:', error.message)
    return []
  }
}

export async function getRecentMatches(limit = 10) {
  const matches = []
  try {
    for (const league of sportmonks.FREE_LEAGUES) {
      const data = await sportmonks.getFixtures(league.id, {
        status: 'completed',
      })
      const normalized = (data.data || [])
        .map(m => sportmonks.normalizeMatch(m))
        .slice(0, 5)
      matches.push(...normalized.filter(Boolean))
    }
  } catch (error) {
    console.warn('Recent fetch failed:', error.message)
  }
  return matches.slice(0, limit)
}

export async function getStandingsByLeague(leagueId, seasonId) {
  if (!seasonId) return []
  try {
    const standingsRaw = await sportmonks.getStandings(seasonId)
    const standings = Array.isArray(standingsRaw)
      ? standingsRaw
      : standingsRaw?.data || standingsRaw?.standings?.data || []
    return standings.map((s, i) => ({
      position: i + 1,
      team: {
        id: s.team?.id?.toString(),
        name: s.team?.name || '',
        logo: s.team?.image_path || '',
      },
      played: s.played || 0,
      won: s.won || 0,
      lost: s.lost || 0,
      drawn: s.draw || 0,
      noResult: s.no_result || 0,
      points: s.points || 0,
      nrr: s.netto_run_rate ?? s.net_run_rate ?? s.nrr ?? 0,
      recentForm: s.recent_form || null,
    }))
  } catch (error) {
    console.warn('Standings fetch failed:', error.message)
    return []
  }
}

export async function getEnrichedStandings(leagueId, seasonId) {
  const standings = await getStandingsByLeague(leagueId, seasonId)
  if (!standings.length) return standings

  const totalTeams = standings.length
  const maxPlayed = Math.max(...standings.map(s => s.played))

  const formMap = {}
  try {
    const data = await sportmonks.getFixtures(leagueId, {
      status: 'completed',
      seasonId,
      per_page: 50,
    })
    const fixtures = (data.data || [])
      .map(m => sportmonks.normalizeMatch(m))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    standings.forEach(row => {
      const teamId = row.team?.id
      if (!teamId) return
      const teamMatches = fixtures.filter(
        m => m.teams?.home?.id === teamId || m.teams?.away?.id === teamId,
      )
      const last5 = teamMatches.slice(0, 5).map(m => {
        if (m.result?.winner === teamId) return 'W'
        if (m.result?.winner && m.result.winner !== teamId) return 'L'
        return 'NR'
      })
      const lastMatch = teamMatches[0] || null
      formMap[teamId] = {recentForm: last5, lastMatch}
    })
  } catch {
    // form enrichment is best-effort
  }

  return standings.map(row => {
    const teamId = row.team?.id
    const enrichment = formMap[teamId] || {}
    return {
      ...row,
      totalTeams,
      maxPlayed,
      recentForm: row.recentForm || enrichment.recentForm || [],
      lastMatch: enrichment.lastMatch || null,
    }
  })
}

export async function getTeamsByLeague(leagueId, seasonId) {
  try {
    const data = await sportmonks.getFixtures(leagueId, {
      status: 'completed',
      seasonId,
    })
    const fixtures = data.data || []
    const teamMap = new Map()
    fixtures.forEach(f => {
      const lt = f.localteam?.data ?? f.localteam
      const vt = f.visitorteam?.data ?? f.visitorteam
      if (lt?.id)
        teamMap.set(lt.id, {
          id: lt.id,
          name: lt.name,
          code: lt.code,
          image_path: lt.image_path,
        })
      if (vt?.id)
        teamMap.set(vt.id, {
          id: vt.id,
          name: vt.name,
          code: vt.code,
          image_path: vt.image_path,
        })
    })
    return Array.from(teamMap.values()).map(t => ({
      id: `sm-${t.id}`,
      name: t.name || '',
      shortName: t.code || '',
      logo: t.image_path || '',
      league: leagueId,
    }))
  } catch (error) {
    console.warn('Teams fetch failed:', error.message)
    return []
  }
}

export async function getTeamById(teamId) {
  const [source, id] = teamId.split('-', 2)
  if (source !== 'sm' || !id) return null

  try {
    const team = await sportmonks.getTeam(id)
    return sportmonks.normalizeTeam(team)
  } catch (error) {
    console.warn('Team fetch failed:', error.message)
    return null
  }
}

export async function getMatchesForTeam(teamId, leagueId, seasonId) {
  const numericId = teamId.replace('sm-', '')
  try {
    const data = await sportmonks.getFixtures(leagueId, {
      status: 'completed',
      seasonId,
    })
    const fixtures = (data.data || []).filter(
      f =>
        f.localteam_id?.toString() === numericId ||
        f.visitorteam_id?.toString() === numericId,
    )
    return fixtures.map(m => sportmonks.normalizeMatch(m)).reverse()
  } catch (error) {
    console.warn('Team matches fetch failed:', error.message)
    return []
  }
}

export async function getSeasonsByLeague(leagueId) {
  try {
    return await sportmonks.getSeasonsByLeague(leagueId)
  } catch (error) {
    console.warn('Seasons fetch failed:', error.message)
    return []
  }
}

export async function searchMatches(query) {
  if (!query || query.length < 2) return []

  const lowerQuery = query.toLowerCase()
  const allMatches = []
  try {
    for (const league of sportmonks.FREE_LEAGUES) {
      const data = await sportmonks.getFixtures(league.id, {
        status: 'completed',
        per_page: 30,
      })
      const fixtures = (data.data || []).slice(0, 30)
      allMatches.push(...fixtures)
    }
  } catch {
    return []
  }

  return allMatches
    .filter(m => {
      const lt = m.localteam?.data ?? m.localteam
      const vt = m.visitorteam?.data ?? m.visitorteam
      const v = m.venue?.data ?? m.venue
      return (
        lt?.name?.toLowerCase().includes(lowerQuery) ||
        vt?.name?.toLowerCase().includes(lowerQuery) ||
        v?.name?.toLowerCase().includes(lowerQuery) ||
        v?.city?.toLowerCase().includes(lowerQuery)
      )
    })
    .slice(0, 20)
    .map(m => sportmonks.normalizeMatch(m))
}

export async function getResultsArchive(leagueId, options = {}) {
  const {
    seasonId,
    teamId,
    dateFrom,
    dateTo,
    tags,
    sortMode = 'newest',
    page = 1,
    perPage = 30,
  } = options
  try {
    const data = await sportmonks.getFixtures(leagueId, {
      status: 'completed',
      seasonId,
      page,
      per_page: perPage,
    })
    let matches = (data.data || [])
      .map(m => sportmonks.normalizeMatch(m))
      .filter(Boolean)

    if (teamId) {
      matches = matches.filter(
        m => m.teams?.home?.id === teamId || m.teams?.away?.id === teamId,
      )
    }
    if (dateFrom || dateTo) {
      const {filterByDateRange} = require('../utils/matchInsights')
      matches = filterByDateRange(matches, dateFrom, dateTo)
    }
    if (tags && tags.length) {
      const {filterByTags} = require('../utils/matchInsights')
      matches = filterByTags(matches, tags)
    }
    const {SORT_MODES} = require('../utils/matchInsights')
    const sorter = SORT_MODES[sortMode] || SORT_MODES.newest
    matches.sort(sorter)

    return matches
  } catch (error) {
    console.warn('Results archive fetch failed:', error.message)
    return []
  }
}

export async function getHeadToHead(teamAId, teamBId, leagueId, seasonId) {
  try {
    const data = await sportmonks.getFixtures(leagueId, {
      status: 'completed',
      seasonId,
      per_page: 50,
    })
    const matches = (data.data || [])
      .map(m => sportmonks.normalizeMatch(m))
      .filter(Boolean)
    const {computeHeadToHead} = require('../utils/matchInsights')
    return computeHeadToHead(teamAId, teamBId, matches)
  } catch (error) {
    console.warn('H2H fetch failed:', error.message)
    return {
      total: 0,
      aWins: 0,
      bWins: 0,
      draws: 0,
      avgScoreA: 0,
      avgScoreB: 0,
      recent5: [],
    }
  }
}

export async function getRelatedMatches(match, leagueId, seasonId) {
  try {
    const data = await sportmonks.getFixtures(leagueId, {
      status: 'completed',
      seasonId,
      per_page: 50,
    })
    const allMatches = (data.data || [])
      .map(m => sportmonks.normalizeMatch(m))
      .filter(Boolean)
    const {findRelatedMatches} = require('../utils/matchInsights')
    return findRelatedMatches(match, allMatches, 6)
  } catch (error) {
    console.warn('Related matches fetch failed:', error.message)
    return []
  }
}

export async function getTeamArchiveStats(teamId, leagueId, seasonId) {
  try {
    const matches = await getMatchesForTeam(teamId, leagueId, seasonId)
    if (!matches.length) return null

    const last10 = matches.slice(0, 10)
    const formLine = last10.map(m => (m.result?.winner === teamId ? 'W' : 'L'))

    const wins = matches.filter(m => m.result?.winner === teamId)
    const losses = matches.filter(
      m => m.result?.winner && m.result.winner !== teamId,
    )

    const bestChases = matches
      .filter(m => {
        const isChaser =
          (m.teams?.away?.id === teamId && m.result?.winner === teamId) ||
          (m.teams?.home?.id === teamId && m.result?.winner === teamId)
        return isChaser && m.insights?.tags?.includes('chase')
      })
      .sort((a, b) => {
        const aRuns =
          a.teams?.home?.id === teamId
            ? a.score?.home?.runs
            : a.score?.away?.runs
        const bRuns =
          b.teams?.home?.id === teamId
            ? b.score?.home?.runs
            : b.score?.away?.runs
        return (bRuns || 0) - (aRuns || 0)
      })
      .slice(0, 3)

    const highestTotals = [...matches]
      .map(m => {
        const isHome = m.teams?.home?.id === teamId
        const runs = isHome ? m.score?.home?.runs : m.score?.away?.runs
        return {match: m, runs: runs || 0}
      })
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3)

    const biggestCollapses = [...matches]
      .filter(m => m.result?.winner && m.result.winner !== teamId)
      .sort((a, b) => {
        const aMargin = a.insights?.sortMetrics?.marginValue ?? 0
        const bMargin = b.insights?.sortMetrics?.marginValue ?? 0
        return bMargin - aMargin
      })
      .slice(0, 3)

    return {
      formLine,
      totalPlayed: matches.length,
      wins: wins.length,
      losses: losses.length,
      bestChases,
      highestTotals: highestTotals.map(h => h.match),
      biggestCollapses,
    }
  } catch (error) {
    console.warn('Team archive stats failed:', error.message)
    return null
  }
}

export {sportmonks}
