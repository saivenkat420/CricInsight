import {useState, useEffect} from 'react'
import {Link} from 'react-router-dom'
import {
  getLiveMatches,
  getUpcomingMatches,
  getRecentMatches,
  getAvailableLeagues,
} from '../api'
import {getRecentMatchViews, getRecentTeamViews} from '../utils/browsingHistory'
import {trackPageView, trackEvent} from '../utils/analytics'
import {useFavorites} from '../context/FavoritesContext'
import MatchCard from '../components/MatchCard'
import {SkeletonMatchCard} from '../components/Skeleton'
import ApiSetupBanner from '../components/ApiSetupBanner'
import './HomePage.css'

function HomePage() {
  const [liveMatches, setLiveMatches] = useState([])
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [recentMatches, setRecentMatches] = useState([])
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const {
    favorites,
    hasFavorites,
    isTeamFavorite,
    toggleTeamFavorite,
  } = useFavorites()

  const recentViews = getRecentMatchViews(4)
  const recentTeams = getRecentTeamViews(4)

  useEffect(() => {
    loadData()
    trackPageView('home')
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [live, upcoming, recent, availableLeagues] = await Promise.all([
        getLiveMatches(),
        getUpcomingMatches(6),
        getRecentMatches(6),
        getAvailableLeagues(),
      ])
      setLiveMatches(live)
      setUpcomingMatches(upcoming)
      setRecentMatches(recent)
      setLeagues(availableLeagues)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const digestMatches = recentMatches
    .filter(
      m =>
        m.insights?.tags?.includes('close') ||
        m.insights?.tags?.includes('upset'),
    )
    .slice(0, 5)

  const followSuggestions = recentTeams
    .filter(t => !isTeamFavorite(t.id))
    .slice(0, 3)

  return (
    <div className="home-page">
      {error && error.toLowerCase().includes('not configured') && (
        <ApiSetupBanner />
      )}

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Cricket <span className="highlight">Archive</span> & Live Scores
          </h1>
          <p className="hero-subtitle">
            Relive classic matches, discover thrillers, and follow your favorite
            teams with detailed scorecards, key moments, and match stories.
          </p>
          <div className="hero-actions">
            <Link
              to="/matches?status=completed"
              className="btn btn-primary hero-btn"
            >
              Browse Results
            </Link>
            <Link to="/live" className="btn btn-secondary hero-btn">
              <span className="live-dot" />
              Watch Live
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-number">{leagues.length}</span>
            <span className="stat-label">Leagues</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{liveMatches.length}</span>
            <span className="stat-label">Live Now</span>
          </div>
        </div>
      </section>

      {/* Continue where you left off */}
      {(recentViews.length > 0 || recentTeams.length > 0) && (
        <section className="section continue-section">
          <div className="section-header">
            <h2 className="section-title">Continue Where You Left Off</h2>
          </div>
          {recentViews.length > 0 && (
            <div className="continue-row">
              <h3 className="continue-subtitle">Recent Matches</h3>
              <div className="continue-cards">
                {recentViews.map(view => (
                  <Link
                    key={view.id}
                    to={`/matches/${view.id}`}
                    className="continue-card"
                  >
                    <span className="continue-card-teams">{view.title}</span>
                    <span className="continue-card-score">{view.score}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {recentTeams.length > 0 && (
            <div className="continue-row">
              <h3 className="continue-subtitle">Recent Teams</h3>
              <div className="continue-cards">
                {recentTeams.map(team => (
                  <Link
                    key={team.id}
                    to={`/teams/${team.id}`}
                    className="continue-card"
                  >
                    {team.logo && (
                      <img
                        src={team.logo}
                        alt=""
                        className="continue-card-logo"
                      />
                    )}
                    <span className="continue-card-teams">{team.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Follow suggestions */}
      {followSuggestions.length > 0 && (
        <section className="section follow-suggestions-section">
          <div className="section-header">
            <h2 className="section-title">Teams You Might Like</h2>
          </div>
          <div className="follow-suggestions">
            {followSuggestions.map(t => (
              <div key={t.id} className="follow-suggestion-card">
                {t.logo && (
                  <img src={t.logo} alt="" className="follow-suggestion-logo" />
                )}
                <span className="follow-suggestion-name">{t.name}</span>
                <button
                  type="button"
                  className="btn btn-secondary follow-suggestion-btn"
                  onClick={() => {
                    toggleTeamFavorite(t.id)
                    trackEvent('follow_suggest_followed', {teamId: t.id})
                  }}
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Digest preview */}
      {digestMatches.length > 0 && (
        <section className="section digest-section">
          <div className="section-header">
            <h2 className="section-title">Weekly Digest Preview</h2>
            <span className="section-subtitle">
              Top matches you might have missed
            </span>
          </div>
          <div className="digest-cards">
            {digestMatches.map(match => (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className="digest-card"
                onClick={() =>
                  trackEvent('digest_preview_click', {matchId: match.id})
                }
              >
                <span className="digest-card-teams">
                  {match.teams?.home?.shortName || match.teams?.home?.name} vs{' '}
                  {match.teams?.away?.shortName || match.teams?.away?.name}
                </span>
                <span className="digest-card-result">
                  {match.result?.margin}
                </span>
                {match.insights?.highlights?.[0] && (
                  <span className="highlight-chip">
                    {match.insights.highlights[0]}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Personalized feed for users with favorites */}
      {hasFavorites &&
        recentMatches.length > 0 &&
        (() => {
          const favoriteMatches = recentMatches.filter(
            m =>
              favorites.teams.includes(m.teams?.home?.id) ||
              favorites.teams.includes(m.teams?.away?.id),
          )
          if (favoriteMatches.length === 0) return null
          return (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">For You</h2>
                <span className="section-subtitle">
                  Based on your favorite teams
                </span>
              </div>
              <div className="matches-grid">
                {favoriteMatches.slice(0, 4).map(match => (
                  <MatchCard key={match.id} match={match} compact />
                ))}
              </div>
            </section>
          )
        })()}

      {liveMatches.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="live-indicator">
                <span className="live-dot" />
                Live Matches
              </span>
            </h2>
            <Link to="/live" className="section-link">
              View All →
            </Link>
          </div>
          <div className="matches-grid">
            {liveMatches.slice(0, 3).map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Recent Results</h2>
          <Link to="/matches?status=completed" className="section-link">
            Browse All →
          </Link>
        </div>
        {loading ? (
          <div className="matches-grid">
            {[...Array(3)].map((_, i) => (
              <SkeletonMatchCard key={i} />
            ))}
          </div>
        ) : recentMatches.length > 0 ? (
          <div className="matches-grid">
            {recentMatches.slice(0, 6).map(match => (
              <MatchCard key={match.id} match={match} compact />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent matches available</p>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Upcoming Matches</h2>
          <Link to="/matches?status=upcoming" className="section-link">
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="matches-grid">
            {[...Array(3)].map((_, i) => (
              <SkeletonMatchCard key={i} />
            ))}
          </div>
        ) : upcomingMatches.length > 0 ? (
          <div className="matches-grid">
            {upcomingMatches.slice(0, 3).map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No upcoming matches scheduled</p>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Available Leagues</h2>
          <Link to="/leagues" className="section-link">
            View All →
          </Link>
        </div>
        <div className="leagues-grid">
          {leagues.map(league => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="league-card"
            >
              <div className="league-icon">🏆</div>
              <h3 className="league-name">{league.name}</h3>
              <span className="league-country">{league.country}</span>
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button type="button" onClick={loadData} className="error-retry-btn">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

export default HomePage
