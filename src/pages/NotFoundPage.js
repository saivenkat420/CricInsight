import {Link} from 'react-router-dom'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <div className="not-found-page page-container">
      <div className="not-found-content">
        <div className="not-found-icon">🏏</div>
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-message">
          Oops! Looks like this page got bowled out. The page you're looking for
          doesn't exist or has been moved.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Go to Home
          </Link>
          <Link to="/matches" className="btn btn-secondary">
            Browse Matches
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
