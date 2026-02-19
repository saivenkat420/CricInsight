import {useState, useEffect, useCallback} from 'react'
import {Link} from 'react-router-dom'
import {getLiveMatches} from '../api'
import MatchShell from '../components/MatchShell'
import MatchCard from '../components/MatchCard'
import LiveScoreboard from '../components/LiveScoreboard'
import {SkeletonMatchCard} from '../components/Skeleton'
import './LivePage.css'

const REFRESH_INTERVAL = 30000

function MiniWinProbBar({match}) {
  const {score} = match
  const homeRuns = score?.home?.runs || 0
  const awayRuns = score?.away?.runs || 0
  const homeOvers = score?.home?.overs || 0
  const awayOvers = score?.away?.overs || 0

  const total = homeRuns + awayRuns || 1
  const homePercent = Math.round((homeRuns / total) * 100)
  const awayPercent = 100 - homePercent

  const isStale = homeOvers === 0 && awayOvers === 0

  return (
    <div className="win-prob-bar" aria-label="Win probability estimate">
      <div className="win-prob-labels">
        <span>
          {match.teams?.home?.shortName || 'Home'} {homePercent}%
        </span>
        <span>
          {match.teams?.away?.shortName || 'Away'} {awayPercent}%
        </span>
      </div>
      <div className="win-prob-track">
        <div
          className="win-prob-fill win-prob-fill--home"
          style={{width: `${homePercent}%`}}
        />
        <div
          className="win-prob-fill win-prob-fill--away"
          style={{width: `${awayPercent}%`}}
        />
      </div>
      {isStale && (
        <span className="win-prob-stale">Estimate based on limited data</span>
      )}
    </div>
  )
}

function OverMomentumBar({match}) {
  const {score} = match
  const homeRR =
    score?.home?.overs > 0
      ? (score.home.runs / score.home.overs).toFixed(1)
      : '0.0'
  const awayRR =
    score?.away?.overs > 0
      ? (score.away.runs / score.away.overs).toFixed(1)
      : '0.0'

  return (
    <div className="over-momentum-bar">
      <div className="momentum-stat">
        <span className="momentum-label">CRR</span>
        <span className="momentum-value">
          {Math.max(Number(homeRR), Number(awayRR))}
        </span>
      </div>
      {score?.home?.runs > 0 && score?.away?.runs > 0 && (
        <div className="momentum-stat">
          <span className="momentum-label">Target</span>
          <span className="momentum-value">
            {Math.max(score.home.runs, score.away.runs) + 1}
          </span>
        </div>
      )}
    </div>
  )
}

function LivePage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshRate, setRefreshRate] = useState(REFRESH_INTERVAL)

  const loadMatches = useCallback(async () => {
    try {
      const data = await getLiveMatches()
      setMatches(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const interval = setInterval(loadMatches, refreshRate)
    return () => clearInterval(interval)
  }, [autoRefresh, loadMatches, refreshRate])

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && selectedMatch) setSelectedMatch(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMatch])

  return (
    <div className="live-page page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            <span className="live-indicator">
              <span className="live-dot" />
              Live Matches
            </span>
          </h1>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="page-header-right">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            <span className="toggle-label">Auto-refresh</span>
          </label>
          <select
            className="refresh-rate-select"
            value={refreshRate}
            onChange={e => setRefreshRate(Number(e.target.value))}
            aria-label="Refresh interval"
          >
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
          <button
            type="button"
            onClick={loadMatches}
            className="btn btn-secondary refresh-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button type="button" onClick={loadMatches} className="btn btn-ghost">
            Retry
          </button>
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div className="matches-grid">
          {[...Array(4)].map((_, i) => (
            <SkeletonMatchCard key={i} />
          ))}
        </div>
      ) : matches.length > 0 ? (
        <>
          <p className="match-count">
            {matches.length} match{matches.length !== 1 && 'es'} in progress
          </p>
          <div className="live-matches-list">
            {matches.map(match => (
              <div key={match.id} className="live-match-shell-wrapper">
                <MatchShell
                  match={match}
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectedMatch(match)}
                      >
                        Focus Mode
                      </button>
                      <Link
                        to={`/matches/${match.id}`}
                        className="btn btn-primary"
                        style={{textDecoration: 'none'}}
                      >
                        Full Detail →
                      </Link>
                    </>
                  }
                >
                  <div className="live-overlays">
                    <OverMomentumBar match={match} />
                    <MiniWinProbBar match={match} />
                  </div>
                </MatchShell>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🏏</div>
          <h2 className="empty-state-title">No Live Matches</h2>
          <p className="empty-state-message">
            There are no live matches at the moment. Browse completed results or
            upcoming matches.
          </p>
          <div className="empty-state-actions">
            <Link to="/matches?status=completed" className="btn btn-primary">
              Browse Results
            </Link>
            <Link to="/matches?status=upcoming" className="btn btn-secondary">
              Upcoming Matches
            </Link>
          </div>
        </div>
      )}

      {selectedMatch && (
        <LiveScoreboard
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  )
}

export default LivePage
