import {useState, useEffect} from 'react'
import {Link} from 'react-router-dom'
import {useFavorites} from '../context/FavoritesContext'
import {
  trackPageView,
  trackEvent,
  exportAnalyticsData,
} from '../utils/analytics'
import './PreferencesPage.css'

function PreferencesPage() {
  const {
    favorites,
    notificationPrefs,
    updateNotificationPref,
    toggleTeamFavorite,
    togglePlayerFavorite,
  } = useFavorites()

  const [exportMsg, setExportMsg] = useState('')

  useEffect(() => {
    trackPageView('preferences')
  }, [])

  const handleExport = () => {
    const data = exportAnalyticsData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cricket-analytics-export.json'
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('Data exported successfully!')
    setTimeout(() => setExportMsg(''), 3000)
  }

  const handleClearData = () => {
    localStorage.removeItem('cricket-app-analytics')
    localStorage.removeItem('cricket-app-session')
    sessionStorage.removeItem('cricket-app-session')
    setExportMsg('Analytics data cleared.')
    setTimeout(() => setExportMsg(''), 3000)
  }

  return (
    <div className="preferences-page page-container">
      <h1 className="page-title">Preferences</h1>
      <p className="page-subtitle">
        Manage your notification preferences, favorites, and data.
      </p>

      {/* Notification Preferences */}
      <section className="pref-section">
        <h2 className="pref-section-title">Notification Preferences</h2>
        <div className="pref-card">
          <label htmlFor="pref-team-results" className="pref-toggle-row">
            <div className="pref-toggle-info">
              <span className="pref-toggle-label">Team Results</span>
              <span className="pref-toggle-desc">
                Get notified when your favorite teams finish a match
              </span>
            </div>
            <input
              id="pref-team-results"
              type="checkbox"
              checked={notificationPrefs.teamResults}
              onChange={e => {
                updateNotificationPref('teamResults', e.target.checked)
                trackEvent('pref_change', {
                  key: 'teamResults',
                  value: e.target.checked,
                })
              }}
              className="pref-checkbox"
            />
          </label>

          <label htmlFor="pref-weekly-digest" className="pref-toggle-row">
            <div className="pref-toggle-info">
              <span className="pref-toggle-label">Weekly Digest</span>
              <span className="pref-toggle-desc">
                Receive a weekly summary of top 5 matches you missed
              </span>
            </div>
            <input
              id="pref-weekly-digest"
              type="checkbox"
              checked={notificationPrefs.weeklyDigest}
              onChange={e => {
                updateNotificationPref('weeklyDigest', e.target.checked)
                trackEvent('pref_change', {
                  key: 'weeklyDigest',
                  value: e.target.checked,
                })
              }}
              className="pref-checkbox"
            />
          </label>

          <label htmlFor="pref-thriller-alerts" className="pref-toggle-row">
            <div className="pref-toggle-info">
              <span className="pref-toggle-label">Thriller Alerts</span>
              <span className="pref-toggle-desc">
                Get notified about close finishes and super overs
              </span>
            </div>
            <input
              id="pref-thriller-alerts"
              type="checkbox"
              checked={notificationPrefs.thrillerAlerts}
              onChange={e => {
                updateNotificationPref('thrillerAlerts', e.target.checked)
                trackEvent('pref_change', {
                  key: 'thrillerAlerts',
                  value: e.target.checked,
                })
              }}
              className="pref-checkbox"
            />
          </label>
        </div>
      </section>

      {/* Favorite Teams */}
      <section className="pref-section">
        <h2 className="pref-section-title">Favorite Teams</h2>
        {favorites.teams.length > 0 ? (
          <div className="pref-card">
            <div className="favorites-list">
              {favorites.teams.map(id => (
                <div key={id} className="favorite-item">
                  <span className="favorite-id">{id}</span>
                  <button
                    type="button"
                    className="favorite-remove"
                    onClick={() => toggleTeamFavorite(id)}
                    aria-label={`Remove team ${id}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="pref-card pref-card--empty">
            <p>No favorite teams yet.</p>
            <Link to="/matches?status=completed" className="btn btn-secondary">
              Browse teams in Results Hub
            </Link>
          </div>
        )}
      </section>

      {/* Favorite Players */}
      <section className="pref-section">
        <h2 className="pref-section-title">Favorite Players</h2>
        {favorites.players.length > 0 ? (
          <div className="pref-card">
            <div className="favorites-list">
              {favorites.players.map(id => (
                <div key={id} className="favorite-item">
                  <span className="favorite-id">{id}</span>
                  <button
                    type="button"
                    className="favorite-remove"
                    onClick={() => togglePlayerFavorite(id)}
                    aria-label={`Remove player ${id}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="pref-card pref-card--empty">
            <p>No favorite players yet.</p>
          </div>
        )}
      </section>

      {/* Data Management */}
      <section className="pref-section">
        <h2 className="pref-section-title">Data & Privacy</h2>
        <div className="pref-card">
          <div className="data-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
            >
              Export Analytics Data
            </button>
            <button
              type="button"
              className="btn btn-ghost data-clear-btn"
              onClick={handleClearData}
            >
              Clear All Analytics Data
            </button>
          </div>
          {exportMsg && <p className="export-msg">{exportMsg}</p>}
        </div>
      </section>
    </div>
  )
}

export default PreferencesPage
