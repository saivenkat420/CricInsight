import {useState, useEffect} from 'react'
import {useLocation, useHistory, Link} from 'react-router-dom'
import {searchMatches, getAvailableLeagues, getTeamsByLeague} from '../api'
import MatchCard from '../components/MatchCard'
import {SkeletonMatchCard} from '../components/Skeleton'
import {trackPageView, trackSearch} from '../utils/analytics'
import './SearchPage.css'

const INTENT_CHIPS = [
  {value: 'match', label: 'Matches'},
  {value: 'team', label: 'Teams'},
  {value: 'player', label: 'Players'},
  {value: 'season', label: 'Seasons'},
]

function extractPlayersFromMatches(matches, query) {
  const lowerQ = query.toLowerCase()
  const playerMap = new Map()

  for (const m of matches) {
    const allBatting = (m.batting || []).flat()
    const allBowling = (m.bowling || []).flat()
    const allPlayers = [...allBatting, ...allBowling]

    for (const p of allPlayers) {
      if (!p.playerName) continue
      if (p.playerName.toLowerCase().includes(lowerQ)) {
        const key = p.playerId || p.playerName
        if (!playerMap.has(key)) {
          playerMap.set(key, {
            id: p.playerId,
            name: p.playerName,
            matches: [],
            totalRuns: 0,
            totalWickets: 0,
          })
        }
        const entry = playerMap.get(key)
        if (!entry.matches.find(em => em.id === m.id)) {
          entry.matches.push(m)
        }
      }
    }

    for (const p of allBatting) {
      if (!p.playerName) continue
      const key = p.playerId || p.playerName
      if (playerMap.has(key)) {
        playerMap.get(key).totalRuns += p.runs || 0
      }
    }
    for (const p of allBowling) {
      if (!p.playerName) continue
      const key = p.playerId || p.playerName
      if (playerMap.has(key)) {
        playerMap.get(key).totalWickets += p.wickets || 0
      }
    }
  }

  return Array.from(playerMap.values()).slice(0, 10)
}

function SearchPage() {
  const location = useLocation()
  const history = useHistory()
  const params = new URLSearchParams(location.search)
  const initialQuery = params.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [matchResults, setMatchResults] = useState([])
  const [teamResults, setTeamResults] = useState([])
  const [seasonResults, setSeasonResults] = useState([])
  const [playerResults, setPlayerResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [activeIntent, setActiveIntent] = useState('match')

  useEffect(() => {
    trackPageView('search')
    if (initialQuery) performSearch(initialQuery)
  }, [])

  const performSearch = async searchQuery => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const [matches, leagues] = await Promise.all([
        searchMatches(searchQuery.trim()),
        getAvailableLeagues(),
      ])
      setMatchResults(matches)
      trackSearch(searchQuery.trim(), matches.length)

      const players = extractPlayersFromMatches(matches, searchQuery.trim())
      setPlayerResults(players)

      const lowerQ = searchQuery.trim().toLowerCase()
      const allTeams = []
      for (const league of leagues) {
        try {
          const teams = await getTeamsByLeague(league.id)
          allTeams.push(...teams)
        } catch {
          /* skip */
        }
      }
      setTeamResults(
        allTeams.filter(t => t.name?.toLowerCase().includes(lowerQ)),
      )

      setSeasonResults(
        leagues.filter(l => l.name?.toLowerCase().includes(lowerQ)),
      )
    } catch (err) {
      console.error('Search failed:', err)
      setMatchResults([])
      setTeamResults([])
      setSeasonResults([])
      setPlayerResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (query.trim()) {
      history.replace(`/search?q=${encodeURIComponent(query.trim())}`)
      performSearch(query)
    }
  }

  const totalResults =
    matchResults.length +
    teamResults.length +
    seasonResults.length +
    playerResults.length

  return (
    <div className="search-page page-container">
      <h1 className="page-title">Search</h1>

      <form className="search-form-large" onSubmit={handleSubmit}>
        <input
          type="search"
          className="search-input-large"
          placeholder="Search matches, teams, players, venues, leagues..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary search-submit">
          Search
        </button>
      </form>

      {searched && !loading && (
        <div className="intent-chips">
          {INTENT_CHIPS.map(chip => {
            let count = 0
            if (chip.value === 'match') count = matchResults.length
            else if (chip.value === 'team') count = teamResults.length
            else if (chip.value === 'player') count = playerResults.length
            else count = seasonResults.length
            return (
              <button
                key={chip.value}
                type="button"
                className={`intent-chip ${
                  activeIntent === chip.value ? 'active' : ''
                }`}
                onClick={() => setActiveIntent(chip.value)}
              >
                {chip.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="search-results">
          <h2 className="results-title">Searching...</h2>
          <div className="results-grid">
            {[...Array(4)].map((_, i) => (
              <SkeletonMatchCard key={i} />
            ))}
          </div>
        </div>
      ) : searched ? (
        <div className="search-results">
          {totalResults === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h2 className="empty-state-title">No results found</h2>
              <p className="empty-state-message">
                No results for &ldquo;{query}&rdquo;. Try a different search
                term.
              </p>
            </div>
          ) : (
            <>
              {activeIntent === 'match' &&
                (matchResults.length > 0 ? (
                  <>
                    <h2 className="results-title">
                      {matchResults.length} Match
                      {matchResults.length !== 1 ? 'es' : ''}
                    </h2>
                    <div className="results-grid">
                      {matchResults.map(match => (
                        <MatchCard key={match.id} match={match} compact />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="empty-section-message">
                    No matches found for &ldquo;{query}&rdquo;.
                  </p>
                ))}

              {activeIntent === 'team' &&
                (teamResults.length > 0 ? (
                  <>
                    <h2 className="results-title">
                      {teamResults.length} Team
                      {teamResults.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="team-results-grid">
                      {teamResults.map(t => (
                        <Link
                          key={t.id}
                          to={`/teams/${t.id}`}
                          className="team-result-card"
                        >
                          {t.logo && (
                            <img
                              src={t.logo}
                              alt={t.name}
                              className="team-result-logo"
                            />
                          )}
                          <div>
                            <span className="team-result-name">{t.name}</span>
                            {t.shortName && (
                              <span className="team-result-code">
                                {t.shortName}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="empty-section-message">
                    No teams found for &ldquo;{query}&rdquo;.
                  </p>
                ))}

              {activeIntent === 'player' &&
                (playerResults.length > 0 ? (
                  <>
                    <h2 className="results-title">
                      {playerResults.length} Player
                      {playerResults.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="player-results-grid">
                      {playerResults.map((p, i) => (
                        <div key={p.id || i} className="player-result-card">
                          <div className="player-result-avatar">
                            {p.name?.charAt(0)}
                          </div>
                          <div className="player-result-info">
                            <span className="player-result-name">{p.name}</span>
                            <span className="player-result-stats">
                              {p.totalRuns > 0 && `${p.totalRuns} runs`}
                              {p.totalRuns > 0 && p.totalWickets > 0 && ' · '}
                              {p.totalWickets > 0 && `${p.totalWickets} wkts`}
                              {' · '}
                              {p.matches.length} match
                              {p.matches.length !== 1 ? 'es' : ''}
                            </span>
                          </div>
                          {p.matches.length > 0 && (
                            <Link
                              to={`/matches/${p.matches[0].id}`}
                              className="player-result-link"
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="empty-section-message">
                    No players found for &ldquo;{query}&rdquo;.
                  </p>
                ))}

              {activeIntent === 'season' &&
                (seasonResults.length > 0 ? (
                  <>
                    <h2 className="results-title">
                      {seasonResults.length} League
                      {seasonResults.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="team-results-grid">
                      {seasonResults.map(l => (
                        <Link
                          key={l.id}
                          to={`/leagues/${l.id}`}
                          className="team-result-card"
                        >
                          <span className="team-result-name">{l.name}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="empty-section-message">
                    No leagues found for &ldquo;{query}&rdquo;.
                  </p>
                ))}
            </>
          )}
        </div>
      ) : (
        <div className="search-tips">
          <h3>Search Tips</h3>
          <ul>
            <li>
              Search by team name (e.g., &ldquo;Sydney Sixers&rdquo;,
              &ldquo;Australia&rdquo;)
            </li>
            <li>
              Search by player name (e.g., &ldquo;Warner&rdquo;,
              &ldquo;Smith&rdquo;)
            </li>
            <li>
              Search by venue (e.g., &ldquo;MCG&rdquo;, &ldquo;SCG&rdquo;)
            </li>
            <li>
              Search by city (e.g., &ldquo;Melbourne&rdquo;,
              &ldquo;Sydney&rdquo;)
            </li>
            <li>
              Search by league (e.g., &ldquo;BBL&rdquo;, &ldquo;T20&rdquo;)
            </li>
          </ul>
          <p className="search-shortcut-hint">
            Tip: Press <kbd>Ctrl+K</kbd> / <kbd>⌘K</kbd> anywhere to open the
            command palette.
          </p>
        </div>
      )}
    </div>
  )
}

export default SearchPage
