
function Home() {
  return (
    <div className="home-page">
      <h1>Welcome to Travel Planner</h1>
      <p>
        Plan and organize your trips in one place.
      </p>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Travel plans</h3>
          <p>Create detailed plans, add destinations, schedule activities, and set a budget.</p>
        </div>
        <div className="feature-card">
          <h3>Budget tracking</h3>
          <p>Record expenses and see how much of your budget is still available.</p>
        </div>
        <div className="feature-card">
          <h3>Checklists</h3>
          <p>Build lists of things to do before and during your trip.</p>
        </div>
        <div className="feature-card">
          <h3>Sharing</h3>
          <p>Share a travel plan with friends and family.</p>
        </div>
      </div>

    </div>
  )
}

export default Home
