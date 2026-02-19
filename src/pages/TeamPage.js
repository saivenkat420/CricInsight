import {useState, useEffect, useMemo} from 'react'
import {useParams, useHistory, useLocation, Link} from 'react-router-dom'
import {
  getTeamById,
  getMatchesForTeam,
  getTeamArchiveStats,
  getHeadToHead,
  getTeamsByLeague,
  getSeasonsByLeague,
} from '../api'
import MatchCard from '../components/MatchCard'
import {Skeleton} from '../components/Skeleton'
import {useFavorites} from '../context/FavoritesContext'
import {recordTeamView} from '../utils/browsingHistory'
import {trackPageView, trackFavoriteAction} from '../utils/analytics'
import './TeamPage.css'

function computeTopPerformers(matches, teamId) {
  const batters = {}
  const bowlers = {}

  for (const m of matches) {
    const isHome = m.teams?.home?.id === teamId
    const battingIdx = isHome ? 0 : 1
    const bowlingIdx = isHome ? 1 : 0

    if (m.batting && m.batting[battingIdx]) {
      for (const b of m.batting[battingIdx]) {
        const key = b.playerId || b.playerName
        if (!key) continue
        if (!batters[key])
          batters[key] = {name: b.playerName, runs: 0, innings: 0}
        batters[key].runs += b.runs || 0
        batters[key].innings++
      }
    }

    if (m.bowling && m.bowling[bowlingIdx]) {
      for (const b of m.bowling[bowlingIdx]) {
        const key = b.playerId || b.playerName
        if (!key) continue
        if (!bowlers[key])
          bowlers[key] = {name: b.playerName, wickets: 0, innings: 0}
        bowlers[key].wickets += b.wickets || 0
        bowlers[key].innings++
      }
    }
  }

  const topBatters = Object.values(batters)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5)
  const topBowlers = Object.values(bowlers)
    .sort((a, b) => b.wickets - a.wickets)
    .slice(0, 5)

  return {topBatters, topBowlers}
}

function TeamPage() {
  const {teamId} = useParams()
  const history = useHistory()
  const location = useLocation()
  const {isTeamFavorite, toggleTeamFavorite} = useFavorites()
  const [team, setTeam] = useState(null)
  const [matches, setMatches] = useState([])
  const [archiveStats, setArchiveStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [rivals, setRivals] = useState([])
  const [selectedRival, setSelectedRival] = useState(null)
  const [h2hData, setH2hData] = useState(null)
  const [h2hLoading, setH2hLoading] = useState(false)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [leagueId, setLeagueId] = useState('')

  useEffect(() => {
    loadTeam()
    trackPageView('team')
  }, [teamId])

  const loadTeam = async () => {
    setLoading(true)
    try {
      const teamData = await getTeamById(teamId)
      setTeam(teamData)
      if (teamData) {
        recordTeamView({
          id: teamData.id,
          name: teamData.name,
          logo: teamData.logo,
        })
      }

      if (teamData?.id) {
        const lid = location.state?.leagueId || teamData.league || '5'
        setLeagueId(lid)

        const seasonData = await getSeasonsByLeague(lid)
        setSeasons(seasonData)
        const firstSeason =
          seasonData.length > 0 ? seasonData[0].id?.toString() || '' : ''
        setSelectedSeason(firstSeason)

        await loadTeamData(teamData, lid, firstSeason)
      }
    } catch (err) {
      console.error('Failed to load team:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamData = async (teamData, lid, seasonId) => {
    const tid = teamData?.id || team?.id
    if (!tid) return

    let teamMatches = await getMatchesForTeam(tid, lid, seasonId)
    if (teamMatches.length === 0 && !teamData?.league) {
      teamMatches = await getMatchesForTeam(tid, '5')
      if (teamMatches.length === 0)
        teamMatches = await getMatchesForTeam(tid, '3')
      if (teamMatches.length === 0)
        teamMatches = await getMatchesForTeam(tid, '10')
    }
    setMatches(teamMatches)

    const stats = await getTeamArchiveStats(tid, lid, seasonId)
    setArchiveStats(stats)

    try {
      const allTeams = await getTeamsByLeague(lid, seasonId)
      setRivals(allTeams.filter(t => t.id !== tid))
    } catch {
      setRivals([])
    }
  }

  const handleSeasonChange = async newSeason => {
    setSelectedSeason(newSeason)
    setLoading(true)
    try {
      await loadTeamData(team, leagueId, newSeason)
    } finally {
      setLoading(false)
    }
  }

  const loadH2H = async rivalId => {
    setSelectedRival(rivalId)
    setH2hLoading(true)
    try {
      const data = await getHeadToHead(
        teamId,
        rivalId,
        leagueId,
        selectedSeason,
      )
      setH2hData(data)
    } catch {
      setH2hData(null)
    } finally {
      setH2hLoading(false)
    }
  }

  const topPerformers = useMemo(() => computeTopPerformers(matches, teamId), [
    matches,
    teamId,
  ])

  const isFavorite = isTeamFavorite(teamId)

  if (loading) {
    return (
      <div className="team-page page-container">
        <Skeleton height="200px" borderRadius="var(--radius-lg)" />
        <div style={{marginTop: 'var(--space-lg)'}}>
          <Skeleton height="300px" borderRadius="var(--radius-lg)" />
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="team-page page-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">Team not found</p>
          <button
            type="button"
            onClick={() => history.goBack()}
            className="btn btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const formLine =
    archiveStats?.formLine ||
    matches.slice(0, 10).map(m => (m.result?.winner === teamId ? 'W' : 'L'))

  return (
    <div className="team-page page-container">
      <button
        type="button"
        onClick={() => history.goBack()}
        className="back-btn"
      >
        ← Back
      </button>

      {/* Hero */}
      <div className="team-hero">
        {team.logo ? (
          <img src={team.logo} alt={team.name} className="team-hero-logo" />
        ) : (
          <div className="team-hero-placeholder">
            {team.shortName || team.name?.charAt(0)}
          </div>
        )}
        <div className="team-hero-info">
          <h1 className="team-hero-name">{team.name}</h1>
          {team.shortName && (
            <span className="team-hero-code">{team.shortName}</span>
          )}
          <div className="team-hero-actions">
            <button
              type="button"
              className={`favorite-btn ${isFavorite ? 'active' : ''}`}
              onClick={() => {
                toggleTeamFavorite(teamId)
                trackFavoriteAction(
                  'team',
                  teamId,
                  isFavorite ? 'remove' : 'add',
                )
              }}
            >
              {isFavorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
            </button>
          </div>
        </div>
        {formLine.length > 0 && (
          <div className="team-form">
            <span className="form-label">Last {formLine.length} Results</span>
            <div className="form-guide">
              {formLine.map((r, i) => (
                <span
                  key={i}
                  className={`form-badge ${r === 'W' ? 'win' : 'loss'}`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky season selector */}
      {seasons.length > 0 && (
        <div className="season-selector-bar">
          <label htmlFor="team-season-select">Season</label>
          <select
            id="team-season-select"
            value={selectedSeason}
            onChange={e => handleSeasonChange(e.target.value)}
            className="filter-select"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Archive stats strip */}
      {archiveStats && (
        <div className="archive-stats-strip">
          <div className="archive-stat">
            <span className="archive-stat-value">
              {archiveStats.totalPlayed}
            </span>
            <span className="archive-stat-label">Played</span>
          </div>
          <div className="archive-stat archive-stat--win">
            <span className="archive-stat-value">{archiveStats.wins}</span>
            <span className="archive-stat-label">Won</span>
          </div>
          <div className="archive-stat archive-stat--loss">
            <span className="archive-stat-value">{archiveStats.losses}</span>
            <span className="archive-stat-label">Lost</span>
          </div>
          <div className="archive-stat">
            <span className="archive-stat-value">
              {archiveStats.totalPlayed > 0
                ? `${Math.round(
                    (archiveStats.wins / archiveStats.totalPlayed) * 100,
                  )}%`
                : '—'}
            </span>
            <span className="archive-stat-label">Win Rate</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="team-tabs">
        {['overview', 'matches', 'rivalry', 'squad'].map(tab => (
          <button
            key={tab}
            type="button"
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="team-content">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Top Performers */}
            {(topPerformers.topBatters.length > 0 ||
              topPerformers.topBowlers.length > 0) && (
              <div className="top-performers-section">
                {topPerformers.topBatters.length > 0 && (
                  <div className="performers-panel">
                    <h3 className="archive-section-title">Top Run Scorers</h3>
                    <div className="performers-list">
                      {topPerformers.topBatters.map((p, i) => (
                        <div key={i} className="performer-row">
                          <div className="performer-avatar">
                            {p.name?.charAt(0)}
                          </div>
                          <div className="performer-info">
                            <span className="performer-name">{p.name}</span>
                            <span className="performer-stat">
                              {p.runs} runs in {p.innings} inn
                            </span>
                          </div>
                          <span className="performer-badge">{p.runs}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {topPerformers.topBowlers.length > 0 && (
                  <div className="performers-panel">
                    <h3 className="archive-section-title">Top Wicket Takers</h3>
                    <div className="performers-list">
                      {topPerformers.topBowlers.map((p, i) => (
                        <div key={i} className="performer-row">
                          <div className="performer-avatar performer-avatar--bowler">
                            {p.name?.charAt(0)}
                          </div>
                          <div className="performer-info">
                            <span className="performer-name">{p.name}</span>
                            <span className="performer-stat">
                              {p.wickets} wkts in {p.innings} inn
                            </span>
                          </div>
                          <span className="performer-badge performer-badge--bowler">
                            {p.wickets}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {archiveStats?.highestTotals?.length > 0 && (
              <div className="archive-section">
                <h3 className="archive-section-title">Highest Totals</h3>
                <div className="archive-match-list">
                  {archiveStats.highestTotals.map(m => (
                    <MatchCard key={m.id} match={m} compact />
                  ))}
                </div>
              </div>
            )}

            {archiveStats?.bestChases?.length > 0 && (
              <div className="archive-section">
                <h3 className="archive-section-title">Best Chases</h3>
                <div className="archive-match-list">
                  {archiveStats.bestChases.map(m => (
                    <MatchCard key={m.id} match={m} compact />
                  ))}
                </div>
              </div>
            )}

            {archiveStats?.biggestCollapses?.length > 0 && (
              <div className="archive-section">
                <h3 className="archive-section-title">Biggest Defeats</h3>
                <div className="archive-match-list">
                  {archiveStats.biggestCollapses.map(m => (
                    <MatchCard key={m.id} match={m} compact />
                  ))}
                </div>
              </div>
            )}

            {!archiveStats && (
              <div className="empty-state">
                <p>No archive data available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Matches tab */}
        {activeTab === 'matches' && (
          <>
            {matches.length > 0 ? (
              <div className="matches-list">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No matches found for this team</p>
              </div>
            )}
          </>
        )}

        {/* Rivalry tab */}
        {activeTab === 'rivalry' && (
          <div className="rivalry-tab">
            <div className="rivalry-selector">
              <label htmlFor="rival-select">Select opponent:</label>
              <select
                id="rival-select"
                value={selectedRival || ''}
                onChange={e => loadH2H(e.target.value)}
                className="filter-select"
              >
                <option value="">Choose a team...</option>
                {rivals.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {h2hLoading && (
              <Skeleton height="200px" borderRadius="var(--radius-lg)" />
            )}

            {h2hData && !h2hLoading && (
              <div className="h2h-panel">
                {h2hData.total === 0 ? (
                  <p className="empty-section-message">
                    No meetings found between these teams in this season.
                  </p>
                ) : (
                  <>
                    <div className="rivalry-comparison-card">
                      <div className="rivalry-side rivalry-side--home">
                        <span className="rivalry-team-name">
                          {team.shortName || team.name}
                        </span>
                        <span className="rivalry-big-num">{h2hData.aWins}</span>
                        <span className="rivalry-label">Wins</span>
                        <span className="rivalry-avg">
                          Avg: {h2hData.avgScoreA}
                        </span>
                      </div>
                      <div className="rivalry-center">
                        <span className="rivalry-total">{h2hData.total}</span>
                        <span className="rivalry-total-label">Matches</span>
                      </div>
                      <div className="rivalry-side rivalry-side--away">
                        <span className="rivalry-team-name">Opponent</span>
                        <span className="rivalry-big-num">{h2hData.bWins}</span>
                        <span className="rivalry-label">Wins</span>
                        <span className="rivalry-avg">
                          Avg: {h2hData.avgScoreB}
                        </span>
                      </div>
                    </div>

                    {h2hData.recent5?.length > 0 && (
                      <div className="archive-section">
                        <h3 className="archive-section-title">
                          Recent Meetings
                        </h3>
                        <div className="archive-match-list">
                          {h2hData.recent5.map(m => (
                            <div key={m.id} className="rivalry-match-wrapper">
                              <MatchCard match={m} compact />
                              <Link
                                to={`/matches/${m.id}`}
                                className="rivalry-match-cta"
                              >
                                View Full Story →
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!selectedRival && !h2hLoading && (
              <p className="empty-section-message">
                Select an opponent to view head-to-head history.
              </p>
            )}
          </div>
        )}

        {/* Squad tab */}
        {activeTab === 'squad' && (
          <>
            {team.squad && team.squad.length > 0 ? (
              <div className="squad-grid">
                {team.squad.map(player => (
                  <div key={player.id} className="player-card">
                    <div className="player-avatar">
                      {player.name?.charAt(0)}
                    </div>
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <span className="player-role">{player.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Squad information not available</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TeamPage
