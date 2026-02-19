import {useState, useEffect, useCallback} from 'react'
import {useHistory} from 'react-router-dom'
import {
  getEnrichedStandings,
  getAvailableLeagues,
  getSeasonsByLeague,
} from '../api'
import StandingsTable from '../components/StandingsTable'
import CustomSelect from '../components/CustomSelect'
import {SkeletonTable} from '../components/Skeleton'
import './StandingsPage.css'

const FILTER_OPTIONS = [
  {value: 'all', label: 'All Teams'},
  {value: 'top4', label: 'Top 4'},
  {value: 'mid', label: 'Mid Table'},
  {value: 'bottom', label: 'Bottom'},
]

function StandingsPage() {
  const history = useHistory()
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('5')
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadLeagues()
  }, [])

  useEffect(() => {
    loadSeasons()
  }, [selectedLeague])

  useEffect(() => {
    if (selectedSeasonId) loadStandings()
  }, [selectedLeague, selectedSeasonId])

  const loadLeagues = async () => {
    try {
      const data = await getAvailableLeagues()
      setLeagues(data)
    } catch (err) {
      console.warn('Failed to load leagues:', err)
    }
  }

  const loadSeasons = async () => {
    try {
      const data = await getSeasonsByLeague(selectedLeague)
      setSeasons(data)
      if (data.length > 0) {
        const latestSeason = data[data.length - 1]
        setSelectedSeasonId(latestSeason.id?.toString())
      } else {
        setSelectedSeasonId(null)
      }
    } catch (err) {
      console.warn('Failed to load seasons:', err)
      setSeasons([])
    }
  }

  const loadStandings = async () => {
    if (!selectedSeasonId) return
    setLoading(true)
    try {
      const data = await getEnrichedStandings(selectedLeague, selectedSeasonId)
      setStandings(data)
    } catch (err) {
      console.error('Failed to load standings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTeamSelect = useCallback(
    team => {
      if (team?.id) {
        history.push(`/teams/sm-${team.id}`)
      }
    },
    [history],
  )

  const filteredStandings = standings.filter(row => {
    if (filter === 'all') return true
    const total = standings.length
    if (filter === 'top4') return row.position <= 4
    if (filter === 'mid') return row.position > 4 && row.position <= total - 2
    if (filter === 'bottom') return row.position > total - 2
    return true
  })

  return (
    <div className="standings-page page-container">
      <h1 className="page-title">League Standings</h1>

      <div className="standings-filters">
        <CustomSelect
          id="league-select"
          label="League"
          value={selectedLeague}
          options={leagues.map(league => ({
            value: league.id?.toString() || '',
            label: league.name,
          }))}
          onChange={val => setSelectedLeague(val)}
        />

        {seasons.length > 0 && (
          <CustomSelect
            id="season-select"
            label="Season"
            value={selectedSeasonId?.toString() || ''}
            options={seasons.map(s => ({
              value: s.id?.toString() || '',
              label: s.name || `Season ${s.id}`,
            }))}
            onChange={val => setSelectedSeasonId(val)}
          />
        )}

        <div className="standings-quick-filters">
          {FILTER_OPTIONS.map(opt => (
            <button
              type="button"
              key={opt.value}
              className={`filter-chip${filter === opt.value ? ' active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="standings-content">
        {loading ? (
          <SkeletonTable rows={10} />
        ) : filteredStandings.length > 0 ? (
          <>
            <div className="standings-legend">
              <span className="legend-item">
                <span className="legend-marker qualify" />
                Qualified for playoffs
              </span>
              <span className="legend-item">
                <span className="legend-marker mid" />
                In the hunt
              </span>
              <span className="legend-item">
                <span className="legend-marker bottom" />
                Eliminated
              </span>
            </div>
            <StandingsTable
              standings={filteredStandings}
              onTeamSelect={handleTeamSelect}
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h2 className="empty-state-title">No Standings Available</h2>
            <p className="empty-state-message">
              Standings data is not available for this selection.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StandingsPage
