import {useMemo} from 'react'
import {computeMomentumData} from '../../utils/matchInsights'
import './index.css'

const PHASE_COLORS = {
  powerplay: 'var(--color-secondary)',
  middle: 'var(--color-primary)',
  death: 'var(--color-accent)',
}

function MomentumSparkline({balls}) {
  const data = useMemo(() => computeMomentumData(balls), [balls])

  if (!data.length) return null

  const maxRuns = Math.max(...data.map(d => d.runs), 1)
  const barWidth = Math.max(100 / data.length, 2)

  return (
    <div
      className="momentum-sparkline"
      aria-label="Over-by-over momentum chart"
    >
      <div className="sparkline-legend">
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{background: PHASE_COLORS.powerplay}}
          />
          Powerplay
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{background: PHASE_COLORS.middle}}
          />
          Middle
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{background: PHASE_COLORS.death}}
          />
          Death
        </span>
      </div>
      <div className="sparkline-chart">
        {data.map(d => {
          const height = Math.max((d.runs / maxRuns) * 100, 4)
          return (
            <div
              key={d.over}
              className={`sparkline-bar ${d.wickets > 0 ? 'has-wicket' : ''}`}
              style={{
                height: `${height}%`,
                width: `${barWidth}%`,
                background: PHASE_COLORS[d.phase],
              }}
              title={`Over ${d.over}: ${d.runs} runs${
                d.wickets ? `, ${d.wickets} wkt` : ''
              }`}
            >
              {d.wickets > 0 && <span className="wicket-marker">W</span>}
            </div>
          )
        })}
      </div>
      <div className="sparkline-axis">
        {data.length > 0 && (
          <>
            <span>Over {data[0].over}</span>
            <span>Over {data[data.length - 1].over}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default MomentumSparkline
