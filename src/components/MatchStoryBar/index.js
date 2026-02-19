import './index.css'

function MatchStoryBar({story}) {
  if (!story) return null

  return (
    <div className="story-bar">
      <div className="story-step">
        <div className="story-step-marker">1</div>
        <div className="story-step-content">
          <span className="story-step-label">First Innings</span>
          <span className="story-step-text">{story.firstInnings}</span>
        </div>
      </div>
      <div className="story-connector" />
      <div className="story-step story-step--turning">
        <div className="story-step-marker">2</div>
        <div className="story-step-content">
          <span className="story-step-label">Turning Point</span>
          <span className="story-step-text">{story.turningPoint}</span>
        </div>
      </div>
      <div className="story-connector" />
      <div className="story-step story-step--finish">
        <div className="story-step-marker">3</div>
        <div className="story-step-content">
          <span className="story-step-label">Result</span>
          <span className="story-step-text">{story.finish}</span>
        </div>
      </div>
    </div>
  )
}

export default MatchStoryBar
