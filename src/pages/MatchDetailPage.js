import {useState, useEffect, useRef} from 'react'
import {useParams, useHistory, Link} from 'react-router-dom'
import {getMatchById, getRelatedMatches} from '../api'
import {formatDate, formatScore} from '../utils/formatters'
import {
  summarizeForThirtySeconds,
  computeFallOfWickets,
} from '../utils/matchInsights'
import {recordMatchView} from '../utils/browsingHistory'
import {
  trackPageView,
  trackMatchDetailView,
  trackEvent,
} from '../utils/analytics'
import {Skeleton} from '../components/Skeleton'
import MatchStoryBar from '../components/MatchStoryBar'
import MomentumSparkline from '../components/MomentumSparkline'
import MatchCard from '../components/MatchCard'
import './MatchDetailPage.css'

const TABS = [
  {id: 'summary', label: 'Summary'},
  {id: 'scorecard', label: 'Scorecard'},
  {id: 'moments', label: 'Key Moments'},
  {id: 'h2h', label: 'Head-to-Head'},
]

function MatchDetailPage() {
  const {matchId} = useParams()
  const history = useHistory()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [related, setRelated] = useState([])
  const [expandedInnings, setExpandedInnings] = useState({})

  useEffect(() => {
    loadMatch()
    setActiveTab('summary')
    trackPageView('match_detail')
    trackMatchDetailView(matchId)
  }, [matchId])

  const loadMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMatchById(matchId)
      if (!data) {
        setError('Match not found')
      } else {
        setMatch(data)
        recordMatchView({
          id: data.id,
          title: `${
            data.teams?.home?.shortName || data.teams?.home?.name || ''
          } vs ${data.teams?.away?.shortName || data.teams?.away?.name || ''}`,
          score: `${formatScore(
            data.score?.home?.runs,
            data.score?.home?.wickets,
          )} - ${formatScore(
            data.score?.away?.runs,
            data.score?.away?.wickets,
          )}`,
        })
        if (data.status === 'completed' && data.league?.id) {
          getRelatedMatches(data, data.league.id, data.league.season)
            .then(setRelated)
            .catch(() => setRelated([]))
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${match.teams.home?.name} vs ${match.teams.away?.name}`,
          url,
        })
      } catch {
        /* cancelled */
      }
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  const toggleInnings = idx => {
    setExpandedInnings(prev => ({...prev, [idx]: !prev[idx]}))
  }

  if (loading) {
    return (
      <div className="match-detail-page page-container">
        <div className="match-detail-skeleton">
          <Skeleton height="200px" borderRadius="var(--radius-lg)" />
          <Skeleton height="60px" borderRadius="var(--radius-lg)" />
          <Skeleton height="300px" borderRadius="var(--radius-lg)" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="match-detail-page page-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <p className="error-hint">
            This match may not exist or may no longer be available.
          </p>
          <div className="error-actions">
            <button
              type="button"
              onClick={() => history.goBack()}
              className="btn btn-secondary"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={loadMatch}
              className="btn btn-primary"
            >
              Try Again
            </button>
            <Link
              to="/matches"
              className="btn btn-primary"
              style={{textDecoration: 'none'}}
            >
              Browse Matches
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!match) return null

  const {teams, score, result, status, manOfMatch, insights} = match
  const isCompleted = status === 'completed'
  const story = insights?.story
  const keyMoments = insights?.keyMoments
  const highlights = insights?.highlights || []
  const summaryLines = isCompleted ? summarizeForThirtySeconds(match) : null

  return (
    <div className="match-detail-page page-container">
      <div className="match-detail-header">
        <button
          type="button"
          onClick={() => history.goBack()}
          className="back-btn"
        >
          ← Back
        </button>
        <button type="button" onClick={handleShare} className="share-btn">
          Share
        </button>
      </div>

      <div className="match-hero">
        {/* 30s summary card */}
        {summaryLines && summaryLines.length > 0 && (
          <div
            className="thirty-sec-summary"
            onClick={() => trackEvent('30s_summary_click')}
          >
            <span className="thirty-sec-badge">30s Summary</span>
            {summaryLines.map((line, i) => (
              <p key={i} className="thirty-sec-line">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="match-meta">
          <span className="match-league">
            {match.league?.name || '—'}
            {match.round && ` · ${match.round}`}
          </span>
          <span className={`match-status status-${status}`}>
            {status === 'live' && <span className="live-dot" />}
            {status.toUpperCase()}
          </span>
        </div>

        <div className="match-teams">
          <div className="match-team">
            {teams.home?.logo && (
              <img
                src={teams.home.logo}
                alt={teams.home.name}
                className="team-logo-large"
              />
            )}
            <h2 className="team-name-large">{teams.home?.name || '—'}</h2>
            <div className="team-score-large">
              {formatScore(
                score.home?.runs,
                score.home?.wickets,
                score.home?.overs,
              )}
            </div>
          </div>
          <div className="match-vs">VS</div>
          <div className="match-team">
            {teams.away?.logo && (
              <img
                src={teams.away.logo}
                alt={teams.away.name}
                className="team-logo-large"
              />
            )}
            <h2 className="team-name-large">{teams.away?.name || '—'}</h2>
            <div className="team-score-large">
              {formatScore(
                score.away?.runs,
                score.away?.wickets,
                score.away?.overs,
              )}
            </div>
          </div>
        </div>

        {result?.margin && (
          <div className="match-result-banner">{result.margin}</div>
        )}

        {manOfMatch?.name && (
          <div className="match-mom-badge">
            Player of the Match: <strong>{manOfMatch.name}</strong>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="match-hero-chips">
            {highlights.map((c, i) => (
              <span key={i} className="highlight-chip">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {isCompleted && story && <MatchStoryBar story={story} />}

      {isCompleted && match.balls && match.balls.length > 0 && (
        <MomentumSparkline balls={match.balls} />
      )}

      {isCompleted && (
        <div className="detail-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="detail-tab-content">
        {(activeTab === 'summary' || !isCompleted) && (
          <SummaryTab match={match} />
        )}

        {activeTab === 'scorecard' && isCompleted && (
          <ScorecardTab
            match={match}
            expandedInnings={expandedInnings}
            toggleInnings={toggleInnings}
          />
        )}

        {activeTab === 'moments' && isCompleted && (
          <KeyMomentsTab keyMoments={keyMoments} match={match} />
        )}

        {activeTab === 'h2h' && isCompleted && <HeadToHeadTab match={match} />}
      </div>

      {related.length > 0 && (
        <section className="related-section">
          <h3 className="section-title">Related Matches</h3>
          <div className="related-grid">
            {related.map(m => (
              <MatchCard key={m.id} match={m} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Summary Tab ─────────────────────────────────────────────────────

function SummaryTab({match}) {
  const {date, venue, result} = match
  return (
    <div className="match-info-cards">
      <div className="info-card">
        <h3 className="info-card-title">Match Info</h3>
        <div className="info-row">
          <span className="info-label">Date</span>
          <span className="info-value">{formatDate(date) || '—'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Venue</span>
          <span className="info-value">
            {venue?.name
              ? `${venue.name}${venue.city ? `, ${venue.city}` : ''}`
              : '—'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Toss</span>
          <span className="info-value">
            {match.tossWinner && match.tossDecision
              ? `${match.tossWinner} won the toss and chose to ${match.tossDecision}`
              : '—'}
          </span>
        </div>
        {result?.method && (
          <div className="info-row">
            <span className="info-label">Method</span>
            <span className="info-value">{result.method}</span>
          </div>
        )}
      </div>

      {(match.umpire1 || match.umpire2) && (
        <div className="info-card">
          <h3 className="info-card-title">Match Officials</h3>
          {match.umpire1 && (
            <div className="info-row">
              <span className="info-label">Umpire 1</span>
              <span className="info-value">{match.umpire1}</span>
            </div>
          )}
          {match.umpire2 && (
            <div className="info-row">
              <span className="info-label">Umpire 2</span>
              <span className="info-value">{match.umpire2}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Scorecard Tab ───────────────────────────────────────────────────

function ScorecardTab({match, expandedInnings, toggleInnings}) {
  const {teams, score, batting, bowling} = match
  const overRefs = useRef({})

  const topBatter = innings => {
    if (!innings?.length) return null
    return innings.reduce(
      (best, b) => (b.runs > (best?.runs || 0) ? b : best),
      null,
    )
  }

  const topBowler = innings => {
    if (!innings?.length) return null
    return innings.reduce(
      (best, b) => (b.wickets > (best?.wickets || 0) ? b : best),
      null,
    )
  }

  const inningsLabels = [
    `${teams.home?.shortName || teams.home?.name || ''} Innings`,
    `${teams.away?.shortName || teams.away?.name || ''} Innings`,
  ]

  const fowData = computeFallOfWickets(match.balls)

  const scrollToOver = overNum => {
    const el = overRefs.current[overNum]
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'center'})
      el.classList.add('over-card--highlight')
      setTimeout(() => el.classList.remove('over-card--highlight'), 2000)
    }
  }

  return (
    <div className="scorecard-tab">
      <div className="innings-summary">
        <div className="innings-card">
          <div className="innings-header">
            {teams.home?.logo && (
              <img src={teams.home.logo} alt="" className="innings-logo" />
            )}
            <span className="innings-team">{teams.home?.name || '—'}</span>
          </div>
          <div className="innings-score">
            {formatScore(
              score.home?.runs,
              score.home?.wickets,
              score.home?.overs,
            )}
          </div>
        </div>
        <div className="innings-card">
          <div className="innings-header">
            {teams.away?.logo && (
              <img src={teams.away.logo} alt="" className="innings-logo" />
            )}
            <span className="innings-team">{teams.away?.name || '—'}</span>
          </div>
          <div className="innings-score">
            {formatScore(
              score.away?.runs,
              score.away?.wickets,
              score.away?.overs,
            )}
          </div>
        </div>
      </div>

      {/* Fall of Wickets Timeline */}
      {fowData.length > 0 && (
        <div className="fow-timeline">
          <h4 className="fow-title">Fall of Wickets</h4>
          <div className="fow-track">
            {fowData.map(w => {
              const position = Math.min((w.over / 20) * 100, 100)
              return (
                <button
                  key={w.wicketNum}
                  type="button"
                  className="fow-marker"
                  style={{left: `${position}%`}}
                  title={`${w.wicketNum}/${w.runs} (${w.over}.${w.ball}) ${w.batsmanName}`}
                  onClick={() => scrollToOver(w.over)}
                  aria-label={`Wicket ${w.wicketNum} at over ${w.over}`}
                >
                  <span className="fow-num">{w.wicketNum}</span>
                </button>
              )
            })}
          </div>
          <div className="fow-labels">
            <span>Over 0</span>
            <span>Over 20</span>
          </div>
        </div>
      )}

      {/* Batting */}
      {batting && batting.length > 0 ? (
        batting.map((innings, idx) => {
          const isExpanded = expandedInnings[idx] !== false
          const best = topBatter(innings)
          return (
            <div key={idx} className="innings-table">
              <button
                type="button"
                className="innings-toggle"
                onClick={() => toggleInnings(idx)}
              >
                <h4 className="innings-label">
                  {inningsLabels[idx] || `Innings ${idx + 1}`}
                </h4>
                <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="table-scroll">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th className="col-player">Batsman</th>
                        <th className="col-dismissal">Dismissal</th>
                        <th className="col-num">R</th>
                        <th className="col-num">B</th>
                        <th className="col-num">4s</th>
                        <th className="col-num">6s</th>
                        <th className="col-num">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {innings.map((b, i) => (
                        <tr
                          key={i}
                          className={`${!b.out ? 'not-out' : ''} ${
                            best && b.playerId === best.playerId
                              ? 'top-performer'
                              : ''
                          }`}
                        >
                          <td className="col-player">
                            <span className="player-name">{b.playerName}</span>
                            {!b.out && <span className="not-out-badge">*</span>}
                            {best && b.playerId === best.playerId && (
                              <span className="top-badge">TOP</span>
                            )}
                          </td>
                          <td className="col-dismissal dimmed">
                            {b.howOut || (b.out ? '' : 'not out')}
                          </td>
                          <td className="col-num bold">{b.runs}</td>
                          <td className="col-num">{b.balls}</td>
                          <td className="col-num">{b.fours}</td>
                          <td className="col-num">{b.sixes}</td>
                          <td
                            className={`col-num ${
                              Number(b.strikeRate) >= 150 ? 'highlight-sr' : ''
                            }`}
                          >
                            {b.strikeRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      ) : (
        <p className="empty-section-message">
          Batting data not available for this match.
        </p>
      )}

      {/* Bowling */}
      {bowling && bowling.length > 0 ? (
        bowling.map((innings, idx) => {
          const isExpanded = expandedInnings[`bowl-${idx}`] !== false
          const best = topBowler(innings)
          const bowlLabel =
            idx === 0
              ? `${teams.away?.shortName || teams.away?.name || ''} Bowling`
              : `${teams.home?.shortName || teams.home?.name || ''} Bowling`
          return (
            <div key={`bowl-${idx}`} className="innings-table">
              <button
                type="button"
                className="innings-toggle"
                onClick={() => toggleInnings(`bowl-${idx}`)}
              >
                <h4 className="innings-label">{bowlLabel}</h4>
                <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="table-scroll">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th className="col-player">Bowler</th>
                        <th className="col-num">O</th>
                        <th className="col-num">M</th>
                        <th className="col-num">R</th>
                        <th className="col-num">W</th>
                        <th className="col-num">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {innings.map((b, i) => (
                        <tr
                          key={i}
                          className={`${
                            b.wickets >= 3 ? 'highlight-wickets' : ''
                          } ${
                            best && b.playerId === best.playerId
                              ? 'top-performer'
                              : ''
                          }`}
                        >
                          <td className="col-player">
                            <span className="player-name">{b.playerName}</span>
                            {best && b.playerId === best.playerId && (
                              <span className="top-badge">TOP</span>
                            )}
                          </td>
                          <td className="col-num">{b.overs}</td>
                          <td className="col-num">{b.maidens}</td>
                          <td className="col-num">{b.runs}</td>
                          <td className="col-num bold">{b.wickets}</td>
                          <td
                            className={`col-num ${
                              Number(b.economy) <= 6 ? 'highlight-econ' : ''
                            }`}
                          >
                            {b.economy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      ) : (
        <p className="empty-section-message">
          Bowling data not available for this match.
        </p>
      )}

      {/* Ball-by-ball */}
      {match.balls && match.balls.length > 0 && (
        <div className="ball-by-ball-section">
          <h3 className="section-title">Ball-by-Ball</h3>
          <div className="ball-by-ball-over-list">
            {(() => {
              const byOver = {}
              match.balls.forEach(b => {
                const overNum = b.over ?? 0
                if (!byOver[overNum]) byOver[overNum] = []
                byOver[overNum].push(b)
              })
              return Object.keys(byOver)
                .sort((a, b) => Number(a) - Number(b))
                .map(overNum => {
                  const overBalls = byOver[overNum]
                  const overRuns = overBalls.reduce(
                    (s, b) => s + (Number(b.runs) || 0),
                    0,
                  )
                  const overWickets = overBalls.reduce(
                    (s, b) => s + (Number(b.wickets) || 0),
                    0,
                  )
                  return (
                    <div
                      key={overNum}
                      className="over-card"
                      ref={el => {
                        overRefs.current[Number(overNum)] = el
                      }}
                    >
                      <div className="over-header">
                        <span className="over-number">
                          Over {Number(overNum)}
                        </span>
                        <span className="over-summary">
                          {overRuns} run{overRuns !== 1 ? 's' : ''}
                          {overWickets > 0 &&
                            `, ${overWickets} wkt${overWickets > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="over-balls-visual">
                        {overBalls.map((ball, i) => (
                          <span
                            key={i}
                            className={`ball-chip ${
                              ball.wickets
                                ? 'chip-wicket'
                                : ball.runs >= 4
                                ? 'chip-boundary'
                                : ball.runs === 0
                                ? 'chip-dot'
                                : 'chip-run'
                            }`}
                            title={`${ball.bowlerName} to ${ball.batsmanName}`}
                          >
                            {ball.wickets
                              ? 'W'
                              : ball.runs === 0
                              ? '·'
                              : ball.runs}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Key Moments Tab ─────────────────────────────────────────────────

function KeyMomentsTab({keyMoments, match}) {
  const [tpExpanded, setTpExpanded] = useState(false)

  if (!keyMoments) {
    return (
      <p className="empty-section-message">
        Key moments data not available for this match.
      </p>
    )
  }

  const turningPoint = keyMoments.turningPoint
  const tpBalls =
    turningPoint && match?.balls
      ? match.balls.filter(b => (b.over ?? -1) === turningPoint.over)
      : []

  return (
    <div className="key-moments-tab">
      {keyMoments.powerplay && (
        <div className="moment-card">
          <div className="moment-icon">⚡</div>
          <div className="moment-content">
            <h4>Powerplay</h4>
            <p>
              {keyMoments.powerplay.runs}/{keyMoments.powerplay.wickets} in{' '}
              {keyMoments.powerplay.overs} overs
            </p>
          </div>
        </div>
      )}

      {keyMoments.wicketClusters?.length > 0 &&
        keyMoments.wicketClusters.map((cluster, i) => (
          <div key={i} className="moment-card moment-card--danger">
            <div className="moment-icon">🔴</div>
            <div className="moment-content">
              <h4>Wicket Cluster</h4>
              <p>{cluster.description}</p>
            </div>
          </div>
        ))}

      {keyMoments.biggestPartnership && (
        <div className="moment-card moment-card--success">
          <div className="moment-icon">🤝</div>
          <div className="moment-content">
            <h4>Biggest Partnership</h4>
            <p>
              {keyMoments.biggestPartnership.runs} runs —{' '}
              {keyMoments.biggestPartnership.player1} &{' '}
              {keyMoments.biggestPartnership.player2}
            </p>
          </div>
        </div>
      )}

      {keyMoments.deathOvers && (
        <div className="moment-card">
          <div className="moment-icon">🎯</div>
          <div className="moment-content">
            <h4>Death Overs ({keyMoments.deathOvers.overs})</h4>
            <p>
              {keyMoments.deathOvers.runs} runs, {keyMoments.deathOvers.wickets}{' '}
              wickets
            </p>
          </div>
        </div>
      )}

      {turningPoint && (
        <div className="moment-card moment-card--accent">
          <div className="moment-icon">🔄</div>
          <div className="moment-content">
            <h4>Turning Point</h4>
            <p>{turningPoint.description}</p>
            {tpBalls.length > 0 && (
              <button
                type="button"
                className="tp-expand-btn"
                onClick={() => {
                  setTpExpanded(!tpExpanded)
                  trackEvent('momentum_inspect')
                }}
              >
                {tpExpanded ? 'Hide ball details ▲' : 'Show ball details ▼'}
              </button>
            )}
            {tpExpanded && tpBalls.length > 0 && (
              <div className="tp-balls">
                {tpBalls.map((ball, i) => (
                  <div key={i} className="tp-ball-row">
                    <span
                      className={`ball-chip ${
                        ball.wickets
                          ? 'chip-wicket'
                          : ball.runs >= 4
                          ? 'chip-boundary'
                          : ball.runs === 0
                          ? 'chip-dot'
                          : 'chip-run'
                      }`}
                    >
                      {ball.wickets ? 'W' : ball.runs === 0 ? '·' : ball.runs}
                    </span>
                    <span className="tp-ball-detail">
                      {ball.bowlerName} to {ball.batsmanName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!keyMoments.powerplay &&
        !keyMoments.turningPoint &&
        !keyMoments.biggestPartnership && (
          <p className="empty-section-message">
            Not enough ball-by-ball data to generate key moments.
          </p>
        )}
    </div>
  )
}

// ── Head-to-Head Tab ────────────────────────────────────────────────

function HeadToHeadTab({match}) {
  const [h2h, setH2h] = useState(null)
  const [h2hLoading, setH2hLoading] = useState(true)

  useEffect(() => {
    loadH2H()
  }, [match.id])

  const loadH2H = async () => {
    setH2hLoading(true)
    try {
      const {getHeadToHead} = await import('../api')
      const data = await getHeadToHead(
        match.teams?.home?.id,
        match.teams?.away?.id,
        match.league?.id,
        match.league?.season,
      )
      setH2h(data)
    } catch {
      setH2h(null)
    } finally {
      setH2hLoading(false)
    }
  }

  if (h2hLoading)
    return <Skeleton height="200px" borderRadius="var(--radius-lg)" />

  if (!h2h || h2h.total === 0) {
    return (
      <p className="empty-section-message">
        No head-to-head data available for these teams in this season.
      </p>
    )
  }

  const homeTeam =
    match.teams?.home?.shortName || match.teams?.home?.name || 'Team A'
  const awayTeam =
    match.teams?.away?.shortName || match.teams?.away?.name || 'Team B'

  return (
    <div className="h2h-tab">
      <div className="h2h-summary">
        <div className="h2h-stat">
          <span className="h2h-stat-value">{h2h.total}</span>
          <span className="h2h-stat-label">Matches</span>
        </div>
        <div className="h2h-stat h2h-stat--home">
          <span className="h2h-stat-value">{h2h.aWins}</span>
          <span className="h2h-stat-label">{homeTeam} Wins</span>
        </div>
        <div className="h2h-stat h2h-stat--away">
          <span className="h2h-stat-value">{h2h.bWins}</span>
          <span className="h2h-stat-label">{awayTeam} Wins</span>
        </div>
        <div className="h2h-stat">
          <span className="h2h-stat-value">{h2h.avgScoreA}</span>
          <span className="h2h-stat-label">{homeTeam} Avg</span>
        </div>
        <div className="h2h-stat">
          <span className="h2h-stat-value">{h2h.avgScoreB}</span>
          <span className="h2h-stat-label">{awayTeam} Avg</span>
        </div>
      </div>

      {h2h.recent5?.length > 0 && (
        <div className="h2h-recent">
          <h4>Recent Meetings</h4>
          <div className="h2h-recent-list">
            {h2h.recent5.map(m => (
              <MatchCard key={m.id} match={m} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchDetailPage
