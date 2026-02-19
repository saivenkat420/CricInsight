import {useState, useEffect} from 'react'
import {Link} from 'react-router-dom'
import {getAvailableLeagues} from '../api'
import {Skeleton} from '../components/Skeleton'
import ApiSetupBanner from '../components/ApiSetupBanner'
import './LeaguesPage.css'

function LeaguesPage() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    loadLeagues()
  }, [])

  const loadLeagues = async () => {
    setLoading(true)
    setApiError(null)
    try {
      const data = await getAvailableLeagues()
      setLeagues(data)
    } catch (err) {
      setApiError(err.message)
      setLeagues([
        {id: 5, name: 'BBL', code: 'BBL', country: 'Australia'},
        {id: 3, name: 'T20I', code: 'T20I', country: 'International'},
        {id: 10, name: 'CSA', code: 'CSA', country: 'South Africa'},
      ])
    } finally {
      setLoading(false)
    }
  }

  const getLeagueIcon = code => {
    const icons = {BBL: '🇦🇺', T20I: '🌍', CSA: '🇿🇦'}
    return icons[code] || '🏆'
  }

  return (
    <div className="leagues-page page-container">
      {apiError && apiError.toLowerCase().includes('not configured') && (
        <ApiSetupBanner />
      )}
      <h1 className="page-title">Cricket Leagues</h1>
      <p className="page-subtitle">
        Browse cricket leagues and competitions from around the world
      </p>

      {loading ? (
        <div className="leagues-grid-large">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="league-card-skeleton">
              <Skeleton height="60px" width="60px" borderRadius="50%" />
              <Skeleton height="1.5rem" width="150px" />
              <Skeleton height="1rem" width="100px" />
            </div>
          ))}
        </div>
      ) : (
        <div className="leagues-grid-large">
          {leagues.map(league => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="league-card-large"
            >
              <div className="league-card-icon">
                {getLeagueIcon(league.code)}
              </div>
              <h2 className="league-card-name">{league.name}</h2>
              <span className="league-card-country">{league.country}</span>
              <div className="league-card-meta">
                <span className="league-badge live">Live Data</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="leagues-info">
        <h2>About Our Data</h2>
        <div className="info-grid">
          <div className="info-item">
            <h3>Live Data</h3>
            <p>
              BBL, T20I, and CSA T20 leagues with live scores, standings, and
              match details via Sportmonks API. Add SPORTMONKS_API_TOKEN to
              Vercel env to enable.
            </p>
          </div>
          <div className="info-item">
            <h3>Setup</h3>
            <p>
              <a
                href="https://my.sportmonks.com/register"
                target="_blank"
                rel="noopener noreferrer"
              >
                Register for free
              </a>{' '}
              at Sportmonks, get your API token, and add it to your Vercel
              project environment variables.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LeaguesPage
