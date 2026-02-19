import {useState, useEffect, useMemo, useCallback} from 'react'
import {useLocation, useHistory} from 'react-router-dom'
import {
  getMatchesByLeague,
  getAvailableLeagues,
  getSeasonsByLeague,
  getTeamsByLeague,
} from '../api'
import {
  SORT_MODES,
  filterByTags,
  filterByDateRange,
  filterByTeam,
} from '../utils/matchInsights'
import {trackPageView, trackFilterChange, trackEvent} from '../utils/analytics'
import MatchCard from '../components/MatchCard'
import CustomSelect from '../components/CustomSelect'
import {SkeletonMatchCard} from '../components/Skeleton'
import './MatchesPage.css'

const TAG_OPTIONS = [
  {value: 'close', label: 'Close Matches'},
  {value: 'high-scoring', label: 'High Scoring'},
  {value: 'low-scoring', label: 'Low Scoring'},
  {value: 'upset', label: 'Upsets'},
  {value: 'chase', label: 'Successful Chases'},
  {value: 'super-over', label: 'Super Over'},
]

const SORT_OPTIONS = [
  {value: 'newest', label: 'Newest First'},
  {value: 'closest', label: 'Closest Finish'},
  {value: 'biggestWin', label: 'Biggest Win'},
  {value: 'mostWickets', label: 'Most Wickets'},
  {value: 'highestChase', label: 'Highest Chase'},
]

const DENSITY_MODES = [
  {value: 'compact', label: 'Compact'},
  {value: 'comfortable', label: 'Comfortable'},
  {value: 'story', label: 'Story'},
]

const SAVED_VIEWS_KEY = 'cricket-app-saved-views'

function getSavedViews() {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistSavedViews(views) {
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views))
  } catch {
    /* storage full */
  }
}

function MatchesPage() {
  const location = useLocation()
  const history = useHistory()
  const params = new URLSearchParams(location.search)

  const [allMatches, setAllMatches] = useState([])
  const [leagues, setLeagues] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    league: params.get('league') || '5',
    status: params.get('status') || 'all',
    seasonId: params.get('season') || '',
    teamId: params.get('team') || '',
    dateFrom: params.get('from') || '',
    dateTo: params.get('to') || '',
    sort: params.get('sort') || 'newest',
    tags: params.get('tags') ? params.get('tags').split(',') : [],
  })
  const [seasons, setSeasons] = useState([])
  const [density, setDensity] = useState(
    () =>
      params.get('view') ||
      localStorage.getItem('cricket-density') ||
      'comfortable',
  )
  const [savedViews, setSavedViews] = useState(getSavedViews)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [viewName, setViewName] = useState('')

  useEffect(() => {
    loadLeagues()
    trackPageView('results_hub')
  }, [])

  useEffect(() => {
    loadSeasons()
  }, [filters.league])

  useEffect(() => {
    loadTeams()
  }, [filters.league, filters.seasonId])

  useEffect(() => {
    loadMatches()
    syncUrl()
  }, [filters.league, filters.status, filters.seasonId])

  useEffect(() => {
    localStorage.setItem('cricket-density', density)
  }, [density])

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
      const data = await getSeasonsByLeague(filters.league)
      setSeasons(data)
      setFilters(prev => {
        const latestSeasonId =
          data.length > 0 ? data[data.length - 1].id?.toString() || '' : ''
        const validSeason = data.some(s => s.id?.toString() === prev.seasonId)
        return {
          ...prev,
          seasonId: validSeason ? prev.seasonId : latestSeasonId,
        }
      })
    } catch {
      setSeasons([])
    }
  }

  const loadTeams = async () => {
    try {
      const data = await getTeamsByLeague(filters.league, filters.seasonId)
      setTeams(data)
    } catch {
      setTeams([])
    }
  }

  const loadMatches = async () => {
    setLoading(true)
    setError(null)
    try {
      const statusParam = filters.status === 'all' ? undefined : filters.status
      const data = await getMatchesByLeague(filters.league, {
        status: statusParam,
        seasonId: filters.seasonId || undefined,
        per_page: 50,
      })
      setAllMatches(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (filters.league) p.set('league', filters.league)
    if (filters.status !== 'all') p.set('status', filters.status)
    if (filters.seasonId) p.set('season', filters.seasonId)
    if (filters.teamId) p.set('team', filters.teamId)
    if (filters.dateFrom) p.set('from', filters.dateFrom)
    if (filters.dateTo) p.set('to', filters.dateTo)
    if (filters.sort !== 'newest') p.set('sort', filters.sort)
    if (filters.tags.length) p.set('tags', filters.tags.join(','))
    if (density !== 'comfortable') p.set('view', density)
    history.replace({search: p.toString()})
  }, [filters, density, history])

  useEffect(() => {
    syncUrl()
  }, [
    filters.teamId,
    filters.dateFrom,
    filters.dateTo,
    filters.sort,
    filters.tags,
    density,
  ])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({...prev, [key]: value}))
    trackFilterChange(key, value)
  }

  const toggleTag = tag => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const removeTag = tag => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }))
  }

  const handleDensityChange = mode => {
    setDensity(mode)
    trackEvent('density_toggle', {mode})
  }

  const saveCurrentView = () => {
    if (!viewName.trim()) return
    const view = {
      id: Date.now().toString(36),
      name: viewName.trim(),
      filters: {...filters},
      density,
      createdAt: new Date().toISOString(),
    }
    const updated = [...savedViews, view]
    setSavedViews(updated)
    persistSavedViews(updated)
    setViewName('')
    setShowSaveModal(false)
    trackEvent('saved_view_create', {name: view.name})
  }

  const loadSavedView = view => {
    setFilters(view.filters)
    if (view.density) setDensity(view.density)
  }

  const deleteSavedView = viewId => {
    const updated = savedViews.filter(v => v.id !== viewId)
    setSavedViews(updated)
    persistSavedViews(updated)
    trackEvent('saved_view_delete', {viewId})
  }

  const displayMatches = useMemo(() => {
    let result = [...allMatches]
    result = filterByTeam(result, filters.teamId)
    result = filterByDateRange(result, filters.dateFrom, filters.dateTo)
    result = filterByTags(result, filters.tags)
    const sorter = SORT_MODES[filters.sort] || SORT_MODES.newest
    result.sort(sorter)
    return result
  }, [
    allMatches,
    filters.teamId,
    filters.dateFrom,
    filters.dateTo,
    filters.tags,
    filters.sort,
  ])

  const thrillers = useMemo(
    () =>
      allMatches.filter(m => m.insights?.tags?.includes('close')).slice(0, 4),
    [allMatches],
  )

  const upsets = useMemo(
    () =>
      allMatches.filter(m => m.insights?.tags?.includes('upset')).slice(0, 4),
    [allMatches],
  )

  const emptyAlternatives = useMemo(() => {
    if (displayMatches.length > 0 || loading) return []
    const alts = []
    if (filters.teamId) {
      alts.push({
        label: 'Remove team filter',
        action: () => handleFilterChange('teamId', ''),
      })
    }
    if (filters.dateFrom || filters.dateTo) {
      alts.push({
        label: 'Clear date range',
        action: () => {
          setFilters(prev => ({...prev, dateFrom: '', dateTo: ''}))
        },
      })
    }
    if (filters.tags.length > 0) {
      alts.push({
        label: 'Remove all tag filters',
        action: () => setFilters(prev => ({...prev, tags: []})),
      })
    }
    if (leagues.length > 1) {
      const otherLeague = leagues.find(l => l.id !== filters.league)
      if (otherLeague) {
        alts.push({
          label: `Try ${otherLeague.name}`,
          action: () => handleFilterChange('league', otherLeague.id),
        })
      }
    }
    return alts
  }, [displayMatches.length, loading, filters, leagues])

  const hasActiveFilters =
    filters.teamId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.tags.length > 0 ||
    filters.sort !== 'newest'

  const gridClass =
    density === 'compact'
      ? 'matches-grid matches-grid--compact'
      : density === 'story'
      ? 'matches-grid matches-grid--story'
      : 'matches-grid'

  return (
    <div className="matches-page page-container">
      <div className="results-hub-header">
        <div>
          <h1 className="page-title">Results Hub</h1>
          <p className="page-subtitle">
            Discover matches like browsing Netflix
          </p>
        </div>
        <div
          className="density-toggle"
          role="radiogroup"
          aria-label="Card density"
        >
          {DENSITY_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              className={`density-btn ${density === m.value ? 'active' : ''}`}
              onClick={() => handleDensityChange(m.value)}
              aria-pressed={density === m.value}
              title={`${m.label} view`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {savedViews.length > 0 && (
        <div className="saved-views-bar">
          <span className="saved-views-label">Saved Views:</span>
          {savedViews.map(v => (
            <span key={v.id} className="saved-view-chip">
              <button
                type="button"
                className="saved-view-name"
                onClick={() => loadSavedView(v)}
              >
                {v.name}
              </button>
              <button
                type="button"
                className="saved-view-delete"
                onClick={() => deleteSavedView(v.id)}
                aria-label={`Delete saved view ${v.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="filters-bar">
        <div className="filters-row">
          <CustomSelect
            id="league-filter"
            label="League"
            value={filters.league}
            options={leagues.map(l => ({value: l.id, label: l.name}))}
            onChange={val => handleFilterChange('league', val)}
          />

          <CustomSelect
            id="status-filter"
            label="Status"
            value={filters.status}
            options={[
              {value: 'all', label: 'All Matches'},
              {value: 'live', label: 'Live'},
              {value: 'upcoming', label: 'Upcoming'},
              {value: 'completed', label: 'Completed'},
            ]}
            onChange={val => handleFilterChange('status', val)}
          />

          {seasons.length > 0 && (
            <CustomSelect
              id="season-filter"
              label="Season"
              value={filters.seasonId}
              options={seasons.map(s => ({
                value: s.id?.toString() || '',
                label: s.name || s.league_id ? `Season ${s.id}` : String(s.id),
              }))}
              onChange={val => handleFilterChange('seasonId', val)}
            />
          )}

          {teams.length > 0 && (
            <CustomSelect
              id="team-filter"
              label="Team"
              value={filters.teamId}
              options={[
                {value: '', label: 'All Teams'},
                ...teams.map(t => ({value: t.id, label: t.name})),
              ]}
              onChange={val => handleFilterChange('teamId', val)}
            />
          )}

          <CustomSelect
            id="sort-select"
            label="Sort By"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={val => handleFilterChange('sort', val)}
          />
        </div>

        <div className="filters-row">
          <div className="filter-group filter-group--date">
            <label htmlFor="date-from" className="filter-date-label">
              Date Range
            </label>
            <div className="date-range-inputs">
              <input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                className="filter-input"
              />
              <span className="date-sep">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
        </div>

        <div className="tag-filters">
          {TAG_OPTIONS.map(tag => (
            <button
              key={tag.value}
              type="button"
              className={`tag-btn ${
                filters.tags.includes(tag.value) ? 'active' : ''
              }`}
              onClick={() => toggleTag(tag.value)}
              aria-pressed={filters.tags.includes(tag.value)}
              aria-label={`Filter by ${tag.label}`}
            >
              {tag.label}
              {filters.tags.includes(tag.value) && (
                <span
                  className="tag-remove"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${tag.label} filter`}
                  onClick={e => {
                    e.stopPropagation()
                    removeTag(tag.value)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      removeTag(tag.value)
                    }
                  }}
                >
                  &times;
                </span>
              )}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-ghost save-view-btn"
              onClick={() => setShowSaveModal(true)}
            >
              Save View
            </button>
            <button
              type="button"
              className="btn btn-ghost clear-filters-btn"
              onClick={() =>
                setFilters(prev => ({
                  ...prev,
                  teamId: '',
                  dateFrom: '',
                  dateTo: '',
                  tags: [],
                  sort: 'newest',
                }))
              }
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div
          className="save-view-modal-overlay"
          onClick={() => setShowSaveModal(false)}
        >
          <div className="save-view-modal" onClick={e => e.stopPropagation()}>
            <h3>Save Current View</h3>
            <p>
              Give this filter combination a name to quickly access it later.
            </p>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. Close BBL Matches"
              value={viewName}
              onChange={e => setViewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveCurrentView()}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveCurrentView}
                disabled={!viewName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button type="button" onClick={loadMatches} className="btn btn-ghost">
            Retry
          </button>
        </div>
      )}

      {!loading && thrillers.length > 0 && filters.tags.length === 0 && (
        <section className="discovery-strip">
          <h2 className="strip-title">Thrillers</h2>
          <div className="strip-scroll">
            {thrillers.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                mode="compact"
                showLeague={false}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && upsets.length > 0 && filters.tags.length === 0 && (
        <section className="discovery-strip">
          <h2 className="strip-title">Upsets</h2>
          <div className="strip-scroll">
            {upsets.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                mode="compact"
                showLeague={false}
              />
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="matches-grid">
          {[...Array(6)].map((_, i) => (
            <SkeletonMatchCard key={i} />
          ))}
        </div>
      ) : displayMatches.length > 0 ? (
        <>
          <p className="results-count">
            {displayMatches.length} match{displayMatches.length !== 1 && 'es'}{' '}
            found
          </p>
          <div className={gridClass}>
            {displayMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                mode={density}
                showLeague={false}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🏏</div>
          <h2 className="empty-state-title">No Matches Found</h2>
          <p className="empty-state-message">
            Try adjusting your filters to find matches.
          </p>
          {emptyAlternatives.length > 0 && (
            <div className="empty-state-alternatives">
              <p className="empty-alt-label">Try these instead:</p>
              {emptyAlternatives.map((alt, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn btn-secondary empty-alt-btn"
                  onClick={alt.action}
                >
                  {alt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MatchesPage
