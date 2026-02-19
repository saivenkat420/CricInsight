import './index.css'

export function Skeleton({width, height, borderRadius, className = ''}) {
  const style = {
    width: width || '100%',
    height: height || '1rem',
    borderRadius: borderRadius || 'var(--radius-sm)',
  }

  return <div className={`skeleton ${className}`} style={style} />
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <Skeleton width="60px" height="60px" borderRadius="50%" />
        <div className="skeleton-card-info">
          <Skeleton width="80%" height="1rem" />
          <Skeleton width="60%" height="0.875rem" />
        </div>
        <Skeleton width="60px" height="60px" borderRadius="50%" />
      </div>
      <div className="skeleton-card-body">
        <Skeleton width="100%" height="2rem" />
        <Skeleton width="70%" height="1rem" />
      </div>
    </div>
  )
}

export function SkeletonMatchCard() {
  return (
    <div className="skeleton-match-card">
      <div className="skeleton-match-header">
        <Skeleton width="80px" height="0.75rem" />
        <Skeleton width="60px" height="0.75rem" />
      </div>
      <div className="skeleton-match-teams">
        <div className="skeleton-team">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <Skeleton width="100px" height="1rem" />
          <Skeleton width="50px" height="1.25rem" />
        </div>
        <Skeleton width="30px" height="1.5rem" />
        <div className="skeleton-team">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <Skeleton width="100px" height="1rem" />
          <Skeleton width="50px" height="1.25rem" />
        </div>
      </div>
      <Skeleton width="100%" height="0.875rem" />
    </div>
  )
}

export function SkeletonTable({rows = 5}) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '120px' : '40px'} height="1rem" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <div className="skeleton-team-cell">
            <Skeleton width="30px" height="30px" borderRadius="50%" />
            <Skeleton width="120px" height="1rem" />
          </div>
          <Skeleton width="30px" height="1rem" />
          <Skeleton width="30px" height="1rem" />
          <Skeleton width="30px" height="1rem" />
          <Skeleton width="30px" height="1rem" />
          <Skeleton width="30px" height="1rem" />
          <Skeleton width="30px" height="1rem" />
          <Skeleton width="50px" height="1rem" />
          <Skeleton width="80px" height="1rem" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
