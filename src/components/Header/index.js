import {useState, useEffect} from 'react'
import {Link, useLocation, useHistory} from 'react-router-dom'
import {useTheme} from '../../context/ThemeContext'
import './index.css'

function Header() {
  const {theme, toggleTheme} = useTheme()
  const location = useLocation()
  const history = useHistory()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleSearch = e => {
    e.preventDefault()
    if (searchQuery.trim()) {
      history.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const isActive = path => location.pathname === path

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="logo-icon">🏏</span>
          <span className="logo-text">CricInsight</span>
        </Link>

        <nav className={`header-nav ${isMenuOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
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
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === 'dark' ? 'light' : 'dark'
            } theme`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
