import './index.css'

function ApiSetupBanner() {
  return (
    <div className="api-setup-banner" role="alert">
      <div className="api-setup-content">
        <h3 className="api-setup-title">API Setup Required</h3>
        <p className="api-setup-message">
          Add <code>SPORTMONKS_API_TOKEN</code> to your Vercel project
          environment variables to enable live scores and match data.
        </p>
        <a
          href="https://my.sportmonks.com/register"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary api-setup-link"
        >
          Register for Free at Sportmonks
        </a>
      </div>
    </div>
  )
}

export default ApiSetupBanner
