/**
 * Match Insights Engine
 *
 * Derives storytelling metadata from normalized match data:
 * highlights chips, story arc, finish classification, sort metrics,
 * key moments (powerplay, wicket clusters, partnerships, death overs,
 * turning point), and upset/close/high/low tags.
 */

// ── Thresholds ──────────────────────────────────────────────────────
const T20_HIGH_TOTAL = 180
const T20_LOW_TOTAL = 120
const CLOSE_RUN_MARGIN = 15
const CLOSE_WICKET_MARGIN = 2
const POWERPLAY_OVERS = 6
const DEATH_OVER_START = 16

// ── Helpers ─────────────────────────────────────────────────────────

function parseMargin(marginStr) {
  if (!marginStr) return null
  const runMatch = marginStr.match(/(\d+)\s*run/i)
  if (runMatch) return {type: 'runs', value: Number(runMatch[1])}
  const wktMatch = marginStr.match(/(\d+)\s*wicket/i)
  if (wktMatch) return {type: 'wickets', value: Number(wktMatch[1])}
  if (/super\s*over/i.test(marginStr)) return {type: 'superOver', value: 0}
  if (/tie/i.test(marginStr)) return {type: 'tie', value: 0}
  return null
}

function groupBallsByOver(balls) {
  const byOver = {}
  ;(balls || []).forEach(b => {
    const o = b.over ?? 0
    if (!byOver[o]) byOver[o] = []
    byOver[o].push(b)
  })
  return byOver
}

// ── Core generators ─────────────────────────────────────────────────

function classifyFinish(match) {
  const margin = parseMargin(match.result?.margin)
  if (!margin) return 'standard'
  if (margin.type === 'superOver') return 'superOver'
  if (margin.type === 'tie') return 'tie'
  if (margin.type === 'runs' && margin.value <= CLOSE_RUN_MARGIN)
    return 'closeRuns'
  if (margin.type === 'wickets' && margin.value <= CLOSE_WICKET_MARGIN)
    return 'closeWickets'
  if (margin.type === 'runs' && margin.value > 50) return 'bigWin'
  return 'standard'
}

function isCloseMatch(match) {
  const ft = classifyFinish(match)
  return ['closeRuns', 'closeWickets', 'superOver', 'tie'].includes(ft)
}

function isHighScoring(match) {
  const {home, away} = match.score || {}
  return (
    (home?.runs || 0) >= T20_HIGH_TOTAL || (away?.runs || 0) >= T20_HIGH_TOTAL
  )
}

function isLowScoring(match) {
  const {home, away} = match.score || {}
  const homeR = home?.runs ?? 999
  const awayR = away?.runs ?? 999
  return homeR <= T20_LOW_TOTAL && awayR <= T20_LOW_TOTAL && homeR > 0
}

function isUpset(match, standings) {
  if (!standings || !standings.length) return false
  const winnerId = match.result?.winner
  if (!winnerId) return false
  const posMap = {}
  standings.forEach(s => {
    posMap[s.team?.id] = s.position
  })
  const homePos = posMap[match.teams?.home?.id]
  const awayPos = posMap[match.teams?.away?.id]
  if (!homePos || !awayPos) return false
  const loserPos = winnerId === match.teams.home?.id ? awayPos : homePos
  const winnerPos = winnerId === match.teams.home?.id ? homePos : awayPos
  return winnerPos > loserPos + 2
}

function wasSuccessfulChase(match) {
  const winner = match.result?.winner
  if (!winner) return false
  const {home, away} = match.score || {}
  const firstBat =
    (home?.overs || 0) > 0 && (away?.overs || 0) > 0
      ? (home?.runs || 0) > 0
        ? 'home'
        : 'away'
      : null
  if (!firstBat) return false
  const chaser = firstBat === 'home' ? 'away' : 'home'
  const chaserTeamId = match.teams?.[chaser]?.id
  return chaserTeamId === winner
}

function lastOverFinish(match) {
  const {home, away} = match.score || {}
  const chaserOvers = wasSuccessfulChase(match)
    ? away?.overs || home?.overs || 0
    : 0
  return chaserOvers >= 19.0
}

// ── Highlights chips ────────────────────────────────────────────────

export function generateHighlights(match, standings) {
  const chips = []
  const ft = classifyFinish(match)

  if (ft === 'superOver') chips.push('Super Over')
  else if (ft === 'tie') chips.push('Tie')
  else if (isCloseMatch(match)) chips.push('Close finish')

  if (wasSuccessfulChase(match)) chips.push('Successful chase')
  if (lastOverFinish(match)) chips.push('Last over finish')
  if (isHighScoring(match)) chips.push('High scoring')
  if (isLowScoring(match)) chips.push('Low scoring')
  if (isUpset(match, standings)) chips.push('Upset')
  if (ft === 'bigWin') chips.push('Dominant win')

  const margin = parseMargin(match.result?.margin)
  if (margin?.type === 'wickets' && margin.value >= 8) chips.push('One-sided')

  return chips.slice(0, 3)
}

// ── Match story arc ─────────────────────────────────────────────────

export function generateStory(match) {
  const {home} = match.score || {}
  const homeTeam =
    match.teams?.home?.shortName || match.teams?.home?.name || 'Team A'
  const awayTeam =
    match.teams?.away?.shortName || match.teams?.away?.name || 'Team B'

  const firstInnings = `${homeTeam} posted ${home?.runs || 0}/${
    home?.wickets || 0
  }`
  let turningPoint = ''
  const finish = match.result?.margin || ''

  const margin = parseMargin(match.result?.margin)
  if (margin?.type === 'runs' && margin.value <= 10) {
    turningPoint = 'The chase went down to the wire'
  } else if (margin?.type === 'wickets' && margin.value <= 2) {
    turningPoint = 'Wickets fell in a cluster during the chase'
  } else if (margin?.type === 'superOver') {
    turningPoint = 'Scores level — Super Over decided it'
  } else if (wasSuccessfulChase(match)) {
    turningPoint = `${awayTeam} chased it down`
  } else {
    turningPoint = `${homeTeam} defended their total`
  }

  return {firstInnings, turningPoint, finish}
}

// ── Key moments ─────────────────────────────────────────────────────

function computePowerplayScore(batting, balls) {
  if (!balls || !balls.length) {
    if (!batting || !batting.length) return null
    return null
  }
  const ppBalls = balls.filter(b => (b.over ?? 99) < POWERPLAY_OVERS)
  const runs = ppBalls.reduce((s, b) => s + (b.runs || 0), 0)
  const wickets = ppBalls.reduce((s, b) => s + (b.wickets || 0), 0)
  return {runs, wickets, overs: POWERPLAY_OVERS}
}

function computeWicketClusters(balls) {
  if (!balls || !balls.length) return []
  const wicketBalls = balls.filter(b => b.wickets > 0)
  if (wicketBalls.length < 2) return []

  const clusters = []
  let current = [wicketBalls[0]]
  for (let i = 1; i < wicketBalls.length; i++) {
    const gap = (wicketBalls[i].over || 0) - (wicketBalls[i - 1].over || 0)
    if (gap <= 2) {
      current.push(wicketBalls[i])
    } else {
      if (current.length >= 2) clusters.push([...current])
      current = [wicketBalls[i]]
    }
  }
  if (current.length >= 2) clusters.push(current)

  return clusters.map(c => ({
    wickets: c.length,
    fromOver: c[0].over,
    toOver: c[c.length - 1].over,
    description: `${c.length} wickets in overs ${c[0].over}-${
      c[c.length - 1].over
    }`,
  }))
}

function computeBiggestPartnership(batting) {
  if (!batting || !batting.length) return null
  let best = null
  for (const innings of batting) {
    if (!Array.isArray(innings)) continue
    for (let i = 0; i < innings.length - 1; i++) {
      const combined = (innings[i].runs || 0) + (innings[i + 1].runs || 0)
      if (!best || combined > best.runs) {
        best = {
          runs: combined,
          player1: innings[i].playerName,
          player2: innings[i + 1].playerName,
        }
      }
    }
  }
  return best
}

function computeDeathOversRuns(balls) {
  if (!balls || !balls.length) return null
  const deathBalls = balls.filter(b => (b.over ?? 0) >= DEATH_OVER_START)
  if (!deathBalls.length) return null
  const runs = deathBalls.reduce((s, b) => s + (b.runs || 0), 0)
  const wickets = deathBalls.reduce((s, b) => s + (b.wickets || 0), 0)
  return {runs, wickets, overs: `${DEATH_OVER_START}-20`}
}

function computeTurningPointOver(balls) {
  if (!balls || !balls.length) return null
  const byOver = groupBallsByOver(balls)
  const overs = Object.keys(byOver)
    .map(Number)
    .sort((a, b) => a - b)

  let bestOver = null
  let bestImpact = 0

  for (const o of overs) {
    const overBalls = byOver[o]
    const wickets = overBalls.reduce((s, b) => s + (b.wickets || 0), 0)
    const runs = overBalls.reduce((s, b) => s + (b.runs || 0), 0)
    const impact =
      wickets * 15 +
      (runs >= 15 ? runs : 0) +
      (runs <= 2 && wickets === 0 ? 5 : 0)
    if (impact > bestImpact) {
      bestImpact = impact
      bestOver = {
        over: o,
        runs,
        wickets,
        description:
          wickets > 0
            ? `Over ${o}: ${wickets} wicket${
                wickets > 1 ? 's' : ''
              } and ${runs} runs — momentum shifted`
            : `Over ${o}: ${runs} runs scored — big over changed the game`,
      }
    }
  }
  return bestOver
}

export function generateKeyMoments(match) {
  const moments = {}
  moments.powerplay = computePowerplayScore(match.batting, match.balls)
  moments.wicketClusters = computeWicketClusters(match.balls)
  moments.biggestPartnership = computeBiggestPartnership(match.batting)
  moments.deathOvers = computeDeathOversRuns(match.balls)
  moments.turningPoint = computeTurningPointOver(match.balls)
  return moments
}

// ── Sort metrics ────────────────────────────────────────────────────

export function generateSortMetrics(match) {
  const margin = parseMargin(match.result?.margin)
  let closeness = 999
  if (margin) {
    if (margin.type === 'superOver' || margin.type === 'tie') closeness = 0
    else if (margin.type === 'runs') closeness = margin.value
    else if (margin.type === 'wickets') closeness = margin.value * 10
  }

  const totalRuns =
    (match.score?.home?.runs || 0) + (match.score?.away?.runs || 0)
  const totalWickets =
    (match.score?.home?.wickets || 0) + (match.score?.away?.wickets || 0)
  const highestChase = wasSuccessfulChase(match)
    ? Math.max(match.score?.home?.runs || 0, match.score?.away?.runs || 0)
    : 0

  return {
    closeness,
    totalRuns,
    totalWickets,
    highestChase,
    marginValue: margin?.value ?? 999,
    marginType: margin?.type ?? '',
  }
}

// ── Tags for filtering ──────────────────────────────────────────────

export function generateTags(match, standings) {
  const tags = []
  if (isCloseMatch(match)) tags.push('close')
  if (isHighScoring(match)) tags.push('high-scoring')
  if (isLowScoring(match)) tags.push('low-scoring')
  if (isUpset(match, standings)) tags.push('upset')
  if (wasSuccessfulChase(match)) tags.push('chase')
  if (classifyFinish(match) === 'superOver') tags.push('super-over')
  if (classifyFinish(match) === 'bigWin') tags.push('dominant')
  return tags
}

// ── Master function: attach all insights to a match ─────────────────

export function computeMatchInsights(match, standings) {
  if (!match || match.status !== 'completed') return null
  return {
    highlights: generateHighlights(match, standings),
    story: generateStory(match),
    finishType: classifyFinish(match),
    tags: generateTags(match, standings),
    sortMetrics: generateSortMetrics(match),
    keyMoments: generateKeyMoments(match),
  }
}

// ── 30-second summary ────────────────────────────────────────────────

export function summarizeForThirtySeconds(match) {
  if (!match || match.status !== 'completed') return null
  const insights = match.insights
  if (!insights) return null

  const homeTeam =
    match.teams?.home?.shortName || match.teams?.home?.name || 'Team A'
  const awayTeam =
    match.teams?.away?.shortName || match.teams?.away?.name || 'Team B'
  const homeRuns = match.score?.home?.runs || 0
  const homeWkts = match.score?.home?.wickets || 0
  const awayRuns = match.score?.away?.runs || 0
  const awayWkts = match.score?.away?.wickets || 0

  const line1 = `${homeTeam} posted ${homeRuns}/${homeWkts}. ${awayTeam} replied with ${awayRuns}/${awayWkts}.`

  let line2 = ''
  if (insights.story?.turningPoint) {
    line2 = insights.story.turningPoint
  } else if (insights.keyMoments?.turningPoint?.description) {
    line2 = insights.keyMoments.turningPoint.description
  }

  let line3 = ''
  if (match.result?.margin) {
    line3 = match.result.margin
  }
  if (match.manOfMatch?.name) {
    line3 += line3
      ? ` — MoM: ${match.manOfMatch.name}`
      : `MoM: ${match.manOfMatch.name}`
  }

  return [line1, line2, line3].filter(Boolean)
}

// ── Momentum data (per-over runs/wickets for sparkline) ──────────────

export function computeMomentumData(balls) {
  if (!balls || !balls.length) return []
  const byOver = groupBallsByOver(balls)
  const overs = Object.keys(byOver)
    .map(Number)
    .sort((a, b) => a - b)

  return overs.map(o => {
    const overBalls = byOver[o]
    const runs = overBalls.reduce((s, b) => s + (b.runs || 0), 0)
    const wickets = overBalls.reduce((s, b) => s + (b.wickets || 0), 0)
    let phase = 'middle'
    if (o < POWERPLAY_OVERS) phase = 'powerplay'
    else if (o >= DEATH_OVER_START) phase = 'death'
    return {over: o, runs, wickets, phase}
  })
}

// ── Fall of wickets data ─────────────────────────────────────────────

export function computeFallOfWickets(balls) {
  if (!balls || !balls.length) return []
  let totalRuns = 0
  let wicketNum = 0
  const fow = []

  const sorted = [...balls].sort((a, b) => {
    const overDiff = (a.over || 0) - (b.over || 0)
    if (overDiff !== 0) return overDiff
    return (a.ball || 0) - (b.ball || 0)
  })

  for (const b of sorted) {
    totalRuns += b.runs || 0
    if (b.wickets > 0) {
      wicketNum++
      fow.push({
        wicketNum,
        over: b.over || 0,
        ball: b.ball || 0,
        runs: totalRuns,
        batsmanName: b.batsmanName || '',
      })
    }
  }
  return fow
}

// ── Sort comparators ────────────────────────────────────────────────

export const SORT_MODES = {
  newest: (a, b) => new Date(b.date) - new Date(a.date),
  closest: (a, b) =>
    (a.insights?.sortMetrics?.closeness ?? 999) -
    (b.insights?.sortMetrics?.closeness ?? 999),
  biggestWin: (a, b) =>
    (b.insights?.sortMetrics?.marginValue ?? 0) -
    (a.insights?.sortMetrics?.marginValue ?? 0),
  mostWickets: (a, b) =>
    (b.insights?.sortMetrics?.totalWickets ?? 0) -
    (a.insights?.sortMetrics?.totalWickets ?? 0),
  highestChase: (a, b) =>
    (b.insights?.sortMetrics?.highestChase ?? 0) -
    (a.insights?.sortMetrics?.highestChase ?? 0),
}

// ── Filter helpers ──────────────────────────────────────────────────

export function filterByTags(matches, activeTags) {
  if (!activeTags || !activeTags.length) return matches
  return matches.filter(m =>
    activeTags.every(tag => m.insights?.tags?.includes(tag)),
  )
}

export function filterByDateRange(matches, from, to) {
  return matches.filter(m => {
    const d = new Date(m.date)
    if (from && d < new Date(from)) return false
    if (to && d > new Date(to)) return false
    return true
  })
}

export function filterByTeam(matches, teamId) {
  if (!teamId) return matches
  return matches.filter(
    m => m.teams?.home?.id === teamId || m.teams?.away?.id === teamId,
  )
}

// ── Related matches ─────────────────────────────────────────────────

export function findRelatedMatches(targetMatch, allMatches, limit = 6) {
  if (!targetMatch || !allMatches?.length) return []

  const scored = allMatches
    .filter(m => m.id !== targetMatch.id && m.status === 'completed')
    .map(m => {
      let score = 0
      const sameHome = m.teams?.home?.id === targetMatch.teams?.home?.id
      const sameAway = m.teams?.away?.id === targetMatch.teams?.away?.id
      const sameTeams =
        (sameHome && sameAway) ||
        (m.teams?.home?.id === targetMatch.teams?.away?.id &&
          m.teams?.away?.id === targetMatch.teams?.home?.id)
      if (sameTeams) score += 50
      else if (
        sameHome ||
        sameAway ||
        m.teams?.home?.id === targetMatch.teams?.away?.id ||
        m.teams?.away?.id === targetMatch.teams?.home?.id
      )
        score += 20

      if (m.league?.season === targetMatch.league?.season) score += 15
      if (m.league?.id === targetMatch.league?.id) score += 10

      const targetFinish = targetMatch.insights?.finishType
      if (targetFinish && m.insights?.finishType === targetFinish) score += 10

      return {match: m, score}
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(s => s.match)
}

// ── Head-to-head aggregate ──────────────────────────────────────────

export function computeHeadToHead(teamAId, teamBId, matches) {
  const meetings = (matches || []).filter(m => {
    const ids = [m.teams?.home?.id, m.teams?.away?.id]
    return (
      ids.includes(teamAId) && ids.includes(teamBId) && m.status === 'completed'
    )
  })

  let aWins = 0
  let bWins = 0
  let totalA = 0
  let totalB = 0

  meetings.forEach(m => {
    if (m.result?.winner === teamAId) aWins++
    else if (m.result?.winner === teamBId) bWins++

    const aIsHome = m.teams?.home?.id === teamAId
    totalA += aIsHome ? m.score?.home?.runs || 0 : m.score?.away?.runs || 0
    totalB += aIsHome ? m.score?.away?.runs || 0 : m.score?.home?.runs || 0
  })

  return {
    total: meetings.length,
    aWins,
    bWins,
    draws: meetings.length - aWins - bWins,
    avgScoreA: meetings.length ? Math.round(totalA / meetings.length) : 0,
    avgScoreB: meetings.length ? Math.round(totalB / meetings.length) : 0,
    recent5: meetings.slice(-5).reverse(),
  }
}
