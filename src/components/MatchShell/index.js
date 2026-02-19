import {formatScore} from '../../utils/formatters'
import './index.css'

function MatchShell({match, children, actions}) {
  if (!match) return null

  const {teams, score, result, status, venue, manOfMatch, insights} = match
  const highlights = insights?.highlights || []

  return (
    <div className="match-shell">
      <div className="shell-hero">
        <div className="shell-meta">
          <span className="shell-league">
            {match.league?.name || '—'}
            {match.round && ` · ${match.round}`}
          </span>
          <span className={`shell-status shell-status--${status}`}>
            {status === 'live' && <span className="live-dot" />}
            {status.toUpperCase()}
          </span>
        </div>

        <div className="shell-teams">
          <div className="shell-team">
            {teams.home?.logo && (
              <img
                src={teams.home.logo}
                alt={teams.home.name}
                className="shell-team-logo"
              />
            )}
            <h2 className="shell-team-name">
              {teams.home?.shortName || teams.home?.name || '—'}
            </h2>
            <div className="shell-team-score">
              {formatScore(
                score.home?.runs,
                score.home?.wickets,
                score.home?.overs,
              )}
            </div>
          </div>
          <div className="shell-vs">VS</div>
          <div className="shell-team">
            {teams.away?.logo && (
              <img
                src={teams.away.logo}
                alt={teams.away.name}
                className="shell-team-logo"
              />
            )}
            <h2 className="shell-team-name">
              {teams.away?.shortName || teams.away?.name || '—'}
            </h2>
            <div className="shell-team-score">
              {formatScore(
                score.away?.runs,
                score.away?.wickets,
                score.away?.overs,
              )}
            </div>
          </div>
        </div>

        {result?.margin && <div className="shell-result">{result.margin}</div>}

        {manOfMatch?.name && (
          <div className="shell-mom">
            Player of the Match: <strong>{manOfMatch.name}</strong>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="shell-chips">
            {highlights.map((c, i) => (
              <span key={i} className="highlight-chip">
                {c}
              </span>
            ))}
          </div>
        )}

        {actions && <div className="shell-actions">{actions}</div>}
      </div>

      {children}
    </div>
  )
}

export default MatchShell
