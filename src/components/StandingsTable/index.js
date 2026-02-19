import {useState, useMemo, useCallback} from 'react'
import {formatNetRunRate, formatDate} from '../../utils/formatters'
import './index.css'

/* ── Main Component ── */
function StandingsTable({standings, onTeamSelect}) {
  const [sortBy, setSortBy] = useState('position')
  const [sortDir, setSortDir] = useState('asc')
  const [expandedTeamId, setExpandedTeamId] = useState(null)

  const totalTeams = standings.length
  const maxPlayed = useMemo(
    () => Math.max(...standings.map(s => s.played), 0),
    [standings],
  )

  const sortedStandings = useMemo(() => {
    if (sortBy === 'position' && sortDir === 'asc') return standings
    const copy = [...standings]
    copy.sort((a, b) => {
      let aVal
      let bVal
      if (sortBy === 'teamName') {
        aVal = a.team?.name || ''
        bVal = b.team?.name || ''
      } else if (sortBy === 'matchesLeft') {
        aVal = maxPlayed - (a.played ?? 0)
        bVal = maxPlayed - (b.played ?? 0)
      } else {
        aVal = a[sortBy] ?? 0
        bVal = b[sortBy] ?? 0
      }
      if (typeof aVal === 'string' || typeof bVal === 'string') {
        const cmp = String(aVal).localeCompare(String(bVal))
        return sortDir === 'asc' ? cmp : -cmp
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return copy
  }, [standings, sortBy, sortDir, maxPlayed])

  const nrrDeltas = useMemo(() => {
    const deltas = {}
    for (let i = 0; i < standings.length; i++) {
      const row = standings[i]
      const above = i > 0 ? standings[i - 1] : null
      const below = i < standings.length - 1 ? standings[i + 1] : null
      deltas[row.team?.id] = {
        aboveDelta: above ? (row.nrr - above.nrr).toFixed(3) : null,
        aboveName: above?.team?.name || null,
        belowDelta: below ? (row.nrr - below.nrr).toFixed(3) : null,
        belowName: below?.team?.name || null,
        tiedWith: standings
          .filter(s => s.team?.id !== row.team?.id && s.points === row.points)
          .map(s => s.team?.name)
          .filter(Boolean),
      }
    }
    return deltas
  }, [standings])

  const handleSort = useCallback(
    col => {
      if (sortBy === col) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(col)
        setSortDir(col === 'position' || col === 'teamName' ? 'asc' : 'desc')
      }
    },
    [sortBy],
  )

  const handleRowClick = useCallback(
    (row, e) => {
      if (e.target.closest('.expand-btn')) return
      if (onTeamSelect) onTeamSelect(row.team)
    },
    [onTeamSelect],
  )

  const handleRowKeyDown = useCallback(
    (row, e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (onTeamSelect) onTeamSelect(row.team)
      }
    },
    [onTeamSelect],
  )

  const toggleExpand = useCallback((teamId, e) => {
    e.stopPropagation()
    setExpandedTeamId(prev => (prev === teamId ? null : teamId))
  }, [])

  if (!standings || standings.length === 0) {
    return (
      <div className="st-empty">
        <div className="st-empty-icon">📊</div>
        <p>No standings data available</p>
      </div>
    )
  }

  const interactive = !!onTeamSelect

  return (
    <div className="st-container">
      {/* Header */}
      <div className="st-header" role="row">
        <HeaderCell
          col="teamName"
          label="Team"
          className="st-cell-team"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="played"
          label="P"
          className="st-cell-num"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="matchesLeft"
          label="Left"
          className="st-cell-num st-cell-left"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="won"
          label="Win"
          shortLabel="W"
          className="st-cell-num"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="lost"
          label="Lose"
          shortLabel="L"
          className="st-cell-num"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="noResult"
          label="NR"
          className="st-cell-num st-cell-nr"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="points"
          label="Pts"
          className="st-cell-num st-cell-pts-h"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <HeaderCell
          col="nrr"
          label="NRR"
          className="st-cell-nrr"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <div className="st-cell-form st-hcell" role="columnheader">
          Form
        </div>
      </div>

      {/* Body */}
      <div className="st-body" role="rowgroup">
        {sortedStandings.map((row, index) => {
          const teamId = row.team?.id
          const isExpanded = expandedTeamId === teamId
          const zone = getZone(row.position, totalTeams)
          const matchesLeft = maxPlayed > 0 ? maxPlayed - row.played : 0
          const delta = nrrDeltas[teamId]
          const nrrTip = buildNrrTooltip(row, delta)
          const ptsTip = buildPtsTooltip(row, delta)
          const winPct =
            row.played > 0 ? Math.round((row.won / row.played) * 100) : 0

          return (
            <div
              key={teamId || index}
              className={`st-row-wrap st-zone-${zone}${
                isExpanded ? ' st-expanded' : ''
              }`}
              style={{'--i': index}}
            >
              <div
                className={`st-row${interactive ? ' st-clickable' : ''}`}
                role="row"
                onClick={e => handleRowClick(row, e)}
                onKeyDown={e => handleRowKeyDown(row, e)}
                tabIndex={interactive ? 0 : undefined}
              >
                {/* Team */}
                <div className="st-cell-team" role="cell">
                  <div className="st-team">
                    {row.team?.logo && (
                      <img
                        src={row.team.logo}
                        alt=""
                        className="st-logo"
                        loading="lazy"
                        onError={e => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                    <div className="st-team-info">
                      <span className="st-team-name">{row.team?.name}</span>
                      <div className="st-winbar" title={`Win rate: ${winPct}%`}>
                        <div
                          className="st-winbar-fill"
                          style={{width: `${winPct}%`}}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="expand-btn"
                    onClick={e => toggleExpand(teamId, e)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <span className={`st-chevron${isExpanded ? ' open' : ''}`}>
                      ›
                    </span>
                  </button>
                </div>

                {/* Stats */}
                <div className="st-cell-num" role="cell">
                  {row.played}
                </div>
                <div className="st-cell-num st-cell-left" role="cell">
                  <span
                    className={`st-left-pill${
                      matchesLeft <= 2 ? ' urgent' : ''
                    }`}
                  >
                    {matchesLeft}
                  </span>
                </div>
                <div className="st-cell-num st-win" role="cell">
                  {row.won}
                </div>
                <div className="st-cell-num st-loss" role="cell">
                  {row.lost}
                </div>
                <div className="st-cell-num st-cell-nr" role="cell">
                  {row.noResult || 0}
                </div>
                <div className="st-cell-num st-pts" role="cell">
                  <span className="st-pts-val" data-tooltip={ptsTip}>
                    {row.points}
                  </span>
                </div>
                <div className="st-cell-nrr" role="cell">
                  <span
                    className={`st-nrr-val${row.nrr >= 0 ? ' pos' : ' neg'}`}
                    data-tooltip={nrrTip}
                  >
                    {formatNetRunRate(row.nrr)}
                  </span>
                </div>
                <div className="st-cell-form" role="cell">
                  <FormDots results={row.recentForm} />
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="st-detail">
                  <DetailPanel row={row} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Header Cell ── */
function HeaderCell({
  col,
  label,
  shortLabel,
  className,
  sortBy,
  sortDir,
  onSort,
}) {
  const active = sortBy === col
  return (
    <div
      className={`${className} st-hcell${active ? ' st-sort-active' : ''}`}
      role="columnheader"
      aria-sort={
        active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      tabIndex={0}
      onClick={() => onSort(col)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort(col)
        }
      }}
    >
      <span className="st-hcell-content">
        <span className="st-label-full">{label}</span>
        {shortLabel && <span className="st-label-short">{shortLabel}</span>}
        {active && (
          <span className="st-sort-arrow" aria-hidden="true">
            {sortDir === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </span>
    </div>
  )
}

/* ── Form Dots ── */
function FormDots({results}) {
  if (!results || results.length === 0) {
    return <span className="st-form-empty">—</span>
  }
  return (
    <div className="st-form-dots">
      {results.map((r, i) => (
        <span
          key={i}
          className={`st-dot ${r === 'W' ? 'w' : r === 'L' ? 'l' : 'nr'}`}
          title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'No Result'}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

/* ── Detail Panel ── */
function DetailPanel({row}) {
  const winRate =
    row.played > 0 ? ((row.won / row.played) * 100).toFixed(1) : '0.0'
  const lastMatch = row.lastMatch

  return (
    <div className="st-detail-inner">
      <div className="st-detail-stats">
        <StatCard label="Win Rate" value={`${winRate}%`} accent />
        <StatCard label="Drawn" value={row.drawn || 0} />
        <StatCard label="No Result" value={row.noResult || 0} />
        {row.recentForm?.length > 0 && (
          <StatCard label="Streak" value={getStreak(row.recentForm)} />
        )}
      </div>
      {lastMatch && (
        <div className="st-detail-match">
          <span className="st-detail-label">Last Match</span>
          <span className="st-detail-match-teams">
            {lastMatch.teams?.home?.name} vs {lastMatch.teams?.away?.name}
            {lastMatch.result?.margin && ` — ${lastMatch.result.margin}`}
          </span>
          {lastMatch.date && (
            <span className="st-detail-date">{formatDate(lastMatch.date)}</span>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({label, value, accent}) {
  return (
    <div className={`st-stat-card${accent ? ' st-stat-accent' : ''}`}>
      <span className="st-stat-label">{label}</span>
      <span className="st-stat-value">{value}</span>
    </div>
  )
}

/* ── Helpers ── */
function getStreak(form) {
  if (!form || form.length === 0) return '—'
  const first = form[0]
  let count = 0
  for (const r of form) {
    if (r === first) count++
    else break
  }
  return `${count}${first}`
}

function getZone(position, totalTeams) {
  if (position <= 4) return 'qualify'
  if (totalTeams > 4 && position > totalTeams - 2) return 'danger'
  return 'mid'
}

function buildNrrTooltip(row, delta) {
  const lines = ['Net Run Rate']
  if (delta?.aboveName && delta.aboveDelta !== null) {
    const sign = Number(delta.aboveDelta) >= 0 ? '+' : ''
    lines.push(`${sign}${delta.aboveDelta} vs ${delta.aboveName} (above)`)
  }
  if (delta?.belowName && delta.belowDelta !== null) {
    const sign = Number(delta.belowDelta) >= 0 ? '+' : ''
    lines.push(`${sign}${delta.belowDelta} vs ${delta.belowName} (below)`)
  }
  return lines.join('\n')
}

function buildPtsTooltip(row, delta) {
  if (delta?.tiedWith?.length > 0) {
    return `Tied on ${row.points} pts with ${delta.tiedWith.join(', ')}`
  }
  return `${row.points} points`
}

export default StandingsTable
