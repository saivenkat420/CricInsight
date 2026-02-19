import {useState, useEffect} from 'react'
import {useParams, Link} from 'react-router-dom'
import {
  getMatchesByLeague,
  getStandingsByLeague,
  getTeamsByLeague,
  getSeasonsByLeague,
  FREE_LEAGUES,
} from '../api'
import MatchCard from '../components/MatchCard'
import StandingsTable from '../components/StandingsTable'
import {SkeletonMatchCard, SkeletonTable} from '../components/Skeleton'
import './LeaguePage.css'

function LeaguePage() {
  const {leagueId} = useParams()
  const [activeTab, setActiveTab] = useState('matches')
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState([])
  const [seasonId, setSeasonId] = useState(null)

  const leagueInfo = FREE_LEAGUES.find(l => l.id.toString() === leagueId) || {
    id: leagueId,
    name: 'League',
  }

  useEffect(() => {
    loadSeasons()
  }, [leagueId])

  useEffect(() => {
    loadData()
  }, [leagueId, seasonId])

  const loadSeasons = async () => {
    try {
      const data = await getSeasonsByLeague(leagueId)
      setSeasons(data)
      setSeasonId(data.length > 0 ? data[0].id?.toString() : null)
    } catch (err) {
      console.error('Failed to load seasons:', err)
      setSeasons([])
      setSeasonId(null)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [matchesData, standingsData, teamsData] = await Promise.all([
        getMatchesByLeague(leagueId, seasonId ? {seasonId} : {}),
        seasonId
          ? getStandingsByLeague(leagueId, seasonId)
          : Promise.resolve([]),
        getTeamsByLeague(leagueId, seasonId),
      ])
      setMatches(matchesData)
      setStandings(standingsData)
      setTeams(teamsData)
    } catch (err) {
      console.error('Failed to load league data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="league-page page-container">
      <div className="league-header">
        <div className="league-header-content">
          <Link to="/leagues" className="back-link">
            ← All Leagues
          </Link>
          <h1 className="page-title">{leagueInfo.name}</h1>
        </div>
        {seasons.length > 0 && (
          <div className="season-selector">
            <label htmlFor="season">Season:</label>
            <select
              id="season"
              value={seasonId || ''}
              onChange={e => setSeasonId(e.target.value)}
              className="season-select"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="league-tabs">
        <button
          className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Matches ({matches.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
          onClick={() => setActiveTab('standings')}
        >
          Standings
        </button>
        <button
          className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams ({teams.length})
        </button>
      </div>

      <div className="league-content">
        {activeTab === 'matches' && (
          <>
            {loading ? (
              <div className="matches-grid">
                {[...Array(6)].map((_, i) => (
                  <SkeletonMatchCard key={i} />
                ))}
              </div>
            ) : matches.length > 0 ? (
              <div className="matches-grid">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} showLeague={false} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No matches found for this season</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'standings' && (
          <>
            {loading ? (
              <SkeletonTable rows={8} />
            ) : standings.length > 0 ? (
              <StandingsTable standings={standings} />
            ) : (
              <div className="empty-state">
                <p>Standings data not available</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'teams' && (
          <>
            {loading ? (
              <div className="teams-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="team-card-skeleton">
                    <div className="skeleton" style={{width: 60, height: 60}} />
                    <div
                      className="skeleton"
                      style={{width: 100, height: 20}}
                    />
                  </div>
                ))}
              </div>
            ) : teams.length > 0 ? (
              <div className="teams-grid">
                {teams.map(team => (
                  <Link
                    key={team.id}
                    to={{pathname: `/teams/${team.id}`, state: {leagueId}}}
                    className="team-card"
                  >
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="team-card-logo"
                      />
                    ) : (
                      <div className="team-card-placeholder">
                        {team.shortName || team.name?.charAt(0)}
                      </div>
                    )}
                    <span className="team-card-name">{team.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No teams data available</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LeaguePage
