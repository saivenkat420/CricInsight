import {useState, useEffect, useRef, useCallback} from 'react'
import {useHistory} from 'react-router-dom'
import {useTheme} from '../../context/ThemeContext'
import {trackEvent} from '../../utils/analytics'
import './index.css'

const QUICK_ACTIONS = [
  {id: 'home', label: 'Go to Home', path: '/'},
  {id: 'results', label: 'Browse Results', path: '/matches?status=completed'},
  {id: 'live', label: 'Live Matches', path: '/live'},
  {id: 'leagues', label: 'View Leagues', path: '/leagues'},
  {id: 'standings', label: 'View Standings', path: '/standings'},
]

function CommandPalette({teams = [], recentMatches = []}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const history = useHistory()
  const {toggleTheme, theme} = useTheme()

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelectedIdx(0)
    trackEvent('command_palette_open')
  }, [])

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          setOpen(false)
        } else {
          handleOpen()
        }
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleOpen])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const lowerQ = query.toLowerCase().trim()

  const results = []

  if (
    lowerQ === 'toggle theme' ||
    lowerQ === 'theme' ||
    lowerQ === 'dark' ||
    lowerQ === 'light'
  ) {
    results.push({
      type: 'action',
      label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
      action: () => {
        toggleTheme()
        setOpen(false)
      },
    })
  }

  const matchIdMatch = lowerQ.match(/^(?:sm-)?(\d+)$/)
  if (matchIdMatch) {
    const id = `sm-${matchIdMatch[1]}`
    results.push({
      type: 'match',
      label: `Go to match ${id}`,
      action: () => {
        history.push(`/matches/${id}`)
        setOpen(false)
      },
    })
  }

  if (lowerQ) {
    const matchingTeams = teams
      .filter(
        t =>
          t.name?.toLowerCase().includes(lowerQ) ||
          t.shortName?.toLowerCase().includes(lowerQ),
      )
      .slice(0, 5)

    matchingTeams.forEach(t => {
      results.push({
        type: 'team',
        label: t.name,
        subtitle: t.shortName || '',
        action: () => {
          history.push(`/teams/${t.id}`)
          setOpen(false)
        },
      })
    })

    const matchingRecent = recentMatches
      .filter(m => m.title?.toLowerCase().includes(lowerQ))
      .slice(0, 5)

    matchingRecent.forEach(m => {
      results.push({
        type: 'match',
        label: m.title,
        subtitle: m.score || '',
        action: () => {
          history.push(`/matches/${m.id}`)
          setOpen(false)
        },
      })
    })
  }

  const filteredActions = QUICK_ACTIONS.filter(a =>
    a.label.toLowerCase().includes(lowerQ),
  )
  filteredActions.forEach(a => {
    results.push({
      type: 'action',
      label: a.label,
      action: () => {
        history.push(a.path)
        setOpen(false)
      },
    })
  })

  if (lowerQ && lowerQ.length >= 2) {
    results.push({
      type: 'search',
      label: `Search for "${query}"`,
      action: () => {
        history.push(`/search?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
      },
    })
  }

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      results[selectedIdx].action()
    }
  }

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  if (!open) return null

  return (
    <div className="command-palette-overlay" onClick={() => setOpen(false)}>
      <div
        className="command-palette"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="cp-input-wrapper">
          <span className="cp-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            className="cp-input"
            placeholder="Type a command, team, or match ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Command palette search"
          />
          <kbd className="cp-shortcut">ESC</kbd>
        </div>

        {results.length > 0 && (
          <ul className="cp-results" role="listbox">
            {results.map((r, i) => (
              <li
                key={i}
                className={`cp-result ${i === selectedIdx ? 'selected' : ''}`}
                onClick={r.action}
                role="option"
                aria-selected={i === selectedIdx}
              >
                <span className="cp-result-type">{r.type}</span>
                <span className="cp-result-label">{r.label}</span>
                {r.subtitle && (
                  <span className="cp-result-subtitle">{r.subtitle}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {results.length === 0 && query && (
          <div className="cp-empty">No results found</div>
        )}
      </div>
    </div>
  )
}

export default CommandPalette
