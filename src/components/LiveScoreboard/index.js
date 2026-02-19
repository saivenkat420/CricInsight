import {formatScore, formatRunRate} from '../../utils/formatters'
import './index.css'

function LiveScoreboard({match, onClose}) {
  const {teams, score, status, venue} = match

  const battingTeam =
    score.home?.overs > score.away?.overs ? teams.home : teams.away
  const battingScore =
    score.home?.overs > score.away?.overs ? score.home : score.away

  const currentRunRate =
    battingScore.overs > 0
      ? (battingScore.runs / battingScore.overs).toFixed(2)
      : '0.00'

  return (
    <div className="live-scoreboard-overlay" onClick={onClose}>
      <div
        className="live-scoreboard"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Live match scoreboard"
      >
        <button
          className="scoreboard-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="scoreboard-status">
          <span className="live-indicator">
            <span className="live-dot" />
            LIVE
          </span>
        </div>

        <div className="scoreboard-matchup">
          <span className="matchup-team">
            {teams.home?.shortName || teams.home?.name}
          </span>
          <span className="matchup-vs">vs</span>
          <span className="matchup-team">
            {teams.away?.shortName || teams.away?.name}
          </span>
        </div>

        <div className="scoreboard-main">
          <div className="batting-team">
            {battingTeam?.logo && (
              <img
                src={battingTeam.logo}
                alt={battingTeam.name}
                className="batting-logo"
              />
            )}
            <span className="batting-name">{battingTeam?.name}</span>
          </div>

          <div className="main-score">
            <span className="score-runs">{battingScore.runs || 0}</span>
            <span className="score-wickets">/{battingScore.wickets || 0}</span>
          </div>

          <div className="score-overs">({battingScore.overs || 0} overs)</div>
        </div>

        <div className="scoreboard-stats">
          <div className="stat-item">
            <span className="stat-label">CRR</span>
            <span className="stat-value">{currentRunRate}</span>
          </div>
          {score.home?.runs > 0 && score.away?.runs > 0 && (
            <div className="stat-item">
              <span className="stat-label">Target</span>
              <span className="stat-value">
                {Math.max(score.home?.runs, score.away?.runs) + 1}
              </span>
            </div>
          )}
        </div>

        {venue?.name && (
          <div className="scoreboard-venue">
            📍 {venue.name}
            {venue.city && `, ${venue.city}`}
          </div>
        )}

        <div className="scoreboard-scores">
          <div className="score-row">
            <div className="score-team">
              {teams.home?.logo && (
                <img src={teams.home.logo} alt="" className="score-team-logo" />
              )}
              <span>{teams.home?.shortName || teams.home?.name}</span>
            </div>
            <span className="score-value">
              {formatScore(
                score.home?.runs,
                score.home?.wickets,
                score.home?.overs,
              )}
            </span>
          </div>
          <div className="score-row">
            <div className="score-team">
              {teams.away?.logo && (
                <img src={teams.away.logo} alt="" className="score-team-logo" />
              )}
              <span>{teams.away?.shortName || teams.away?.name}</span>
            </div>
            <span className="score-value">
              {formatScore(
                score.away?.runs,
                score.away?.wickets,
                score.away?.overs,
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveScoreboard
