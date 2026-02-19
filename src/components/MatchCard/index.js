import {Link} from 'react-router-dom'
import {formatDate, formatScore} from '../../utils/formatters'
import './index.css'

function MatchCard({
  match,
  showLeague = true,
  compact = false,
  mode = 'comfortable',
}) {
  const {
    id,
    status,
    date,
    teams,
    score,
    result,
    league,
    manOfMatch,
    round,
    insights,
  } = match

  const getStatusClass = () => {
    if (status === 'live') return 'status-live'
    if (status === 'upcoming') return 'status-upcoming'
    return 'status-completed'
  }

  const getStatusText = () => {
    if (status === 'live') return 'LIVE'
    if (status === 'upcoming') return formatDate(date)
    return 'Completed'
  }

  const isWinner = teamId => result?.winner && result.winner === teamId

  const highlights = insights?.highlights || []
  const isCompact = compact || mode === 'compact'
  const isStory = mode === 'story'

  const modeClass =
    mode === 'compact'
      ? 'match-card--compact'
      : mode === 'story'
      ? 'match-card--story'
      : ''

  return (
    <Link
      to={`/matches/${id}`}
      className={`match-card ${
        isCompact && !isStory ? 'match-card--compact' : ''
      } ${modeClass}`}
    >
      <div className="match-card-header">
        <div className="match-card-meta">
          {showLeague && league?.name && mode !== 'compact' && (
            <span className="match-league">{league.name}</span>
          )}
          {round && mode !== 'compact' && (
            <span className="match-round">{round}</span>
          )}
          {mode === 'compact' && (
            <span className="match-date-compact">{formatDate(date)}</span>
          )}
        </div>
        <span className={`match-status ${getStatusClass()}`}>
          {status === 'live' && <span className="live-dot" />}
          {getStatusText()}
        </span>
      </div>

      <div className="match-card-body">
        <div className={`team-row ${isWinner(teams.home?.id) ? 'winner' : ''}`}>
          <div className="team-info">
            {mode !== 'compact' && teams.home?.logo && (
              <img
                src={teams.home.logo}
                alt={teams.home.name}
                className="team-logo"
                loading="lazy"
              />
            )}
            <span className="team-name">
              {mode === 'compact'
                ? teams.home?.shortName || teams.home?.name
                : teams.home?.name || teams.home?.shortName}
            </span>
          </div>
          <span className="team-score">
            {status !== 'upcoming' &&
              formatScore(
                score.home?.runs,
                score.home?.wickets,
                score.home?.overs,
              )}
          </span>
        </div>

        <div className={`team-row ${isWinner(teams.away?.id) ? 'winner' : ''}`}>
          <div className="team-info">
            {mode !== 'compact' && teams.away?.logo && (
              <img
                src={teams.away.logo}
                alt={teams.away.name}
                className="team-logo"
                loading="lazy"
              />
            )}
            <span className="team-name">
              {mode === 'compact'
                ? teams.away?.shortName || teams.away?.name
                : teams.away?.name || teams.away?.shortName}
            </span>
          </div>
          <span className="team-score">
            {status !== 'upcoming' &&
              formatScore(
                score.away?.runs,
                score.away?.wickets,
                score.away?.overs,
              )}
          </span>
        </div>
      </div>

      <div className="match-card-footer">
        {result?.margin && (
          <span className="match-result">{result.margin}</span>
        )}
        {manOfMatch?.name && mode !== 'compact' && (
          <span className="match-mom" title="Player of the Match">
            MoM: {manOfMatch.name}
          </span>
        )}
      </div>

      {highlights.length > 0 && mode !== 'compact' && (
        <div className="match-card-chips">
          {highlights.slice(0, isStory ? 3 : 2).map((chip, i) => (
            <span key={i} className="highlight-chip">
              {chip}
            </span>
          ))}
        </div>
      )}

      {isStory && insights?.story && (
        <div className="match-card-story-preview">
          <span className="story-preview-text">
            {insights.story.turningPoint}
          </span>
        </div>
      )}
    </Link>
  )
}

export default MatchCard
