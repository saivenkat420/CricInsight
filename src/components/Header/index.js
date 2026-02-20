import {useState, useEffect} from 'react'
import {Link, useLocation, useHistory} from 'react-router-dom'
import {useTheme} from '../../context/ThemeContext'
import './index.css'

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function LiveIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.49" />
      <path d="M7.76 16.24a6 6 0 010-8.49" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M4.93 19.07a10 10 0 010-14.14" />
    </svg>
  )
}

function ResultsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 21h8M12 17v4M7 4v4a5 5 0 0010 0V4" />
      <path d="M5 4h14" />
    </svg>
  )
}

function StandingsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="5" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="19" cy="5" r="1" />
      <circle cx="5" cy="19" r="1" />
      <circle cx="12" cy="19" r="1" />
      <circle cx="19" cy="19" r="1" />
    </svg>
  )
}

const BOTTOM_NAV_ITEMS = [
  {path: '/', label: 'Home', icon: <HomeIcon />},
  {path: '/live', label: 'Live', icon: <LiveIcon />, hasLiveDot: true},
  {path: '/matches', label: 'Results', icon: <ResultsIcon />},
  {path: '/standings', label: 'Standings', icon: <StandingsIcon />},
  {path: '/more', label: 'More', icon: <MoreIcon />, isMore: true},
]

function Header() {
  const {theme, toggleTheme} = useTheme()
  const location = useLocation()
  const history = useHistory()
  const [searchQuery, setSearchQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  const handleSearch = e => {
    e.preventDefault()
    if (searchQuery.trim()) {
      history.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const isActive = path => {
    if (path === '/matches') return location.pathname === '/matches'
    return location.pathname === path
  }

  const isMoreActive = ['/leagues', '/search', '/preferences'].some(p =>
    location.pathname.startsWith(p),
  )

  return (
    <>
      <header className="header">
        <div className="header-container">
          <Link to="/" className="header-logo">
            <span className="logo-icon">🏏</span>
            <span className="logo-text">CricInsight</span>
          </Link>

          <nav className="header-nav">
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/live"
              className={`nav-link ${isActive('/live') ? 'active' : ''}`}
            >
              <span className="live-dot-nav" />
              Live
            </Link>
            <Link
              to="/matches?status=completed"
              className={`nav-link ${isActive('/matches') ? 'active' : ''}`}
            >
              Results
            </Link>
            <Link
              to="/leagues"
              className={`nav-link ${isActive('/leagues') ? 'active' : ''}`}
            >
              Leagues
            </Link>
            <Link
              to="/standings"
              className={`nav-link ${isActive('/standings') ? 'active' : ''}`}
            >
              Standings
            </Link>
          </nav>

          <div className="header-actions">
            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="search"
                className="search-input"
                placeholder="Search... (⌘K)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search"
              />
              <button type="submit" className="search-btn" aria-label="Search">
                🔍
              </button>
            </form>

            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${
                theme === 'dark' ? 'light' : 'dark'
              } theme`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Main navigation">
        {BOTTOM_NAV_ITEMS.map(item => {
          if (item.isMore) {
            return (
              <div key="more" className="bottom-nav-more-wrapper">
                <button
                  type="button"
                  className={`bottom-nav-item ${
                    isMoreActive || moreOpen ? 'active' : ''
                  }`}
                  onClick={() => setMoreOpen(prev => !prev)}
                  aria-expanded={moreOpen}
                >
                  <span className="bottom-nav-icon">{item.icon}</span>
                  <span className="bottom-nav-label">{item.label}</span>
                </button>
                {moreOpen && (
                  <div className="bottom-nav-more-menu">
                    <Link
                      to="/leagues"
                      className="more-menu-item"
                      onClick={() => setMoreOpen(false)}
                    >
                      Leagues
                    </Link>
                    <Link
                      to="/search"
                      className="more-menu-item"
                      onClick={() => setMoreOpen(false)}
                    >
                      Search
                    </Link>
                    <Link
                      to="/preferences"
                      className="more-menu-item"
                      onClick={() => setMoreOpen(false)}
                    >
                      Preferences
                    </Link>
                    <button
                      type="button"
                      className="more-menu-item more-menu-theme"
                      onClick={() => {
                        toggleTheme()
                        setMoreOpen(false)
                      }}
                    >
                      {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                  </div>
                )}
              </div>
            )
          }
          const to =
            item.path === '/matches' ? '/matches?status=completed' : item.path
          return (
            <Link
              key={item.path}
              to={to}
              className={`bottom-nav-item ${
                isActive(item.path) ? 'active' : ''
              }`}
            >
              <span className="bottom-nav-icon">
                {item.hasLiveDot && <span className="bottom-nav-live-dot" />}
                {item.icon}
              </span>
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {moreOpen && (
        <div
          className="bottom-nav-backdrop"
          onClick={() => setMoreOpen(false)}
        />
      )}
    </>
  )
}

export default Header
