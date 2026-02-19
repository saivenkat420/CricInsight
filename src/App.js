import {Switch, Route} from 'react-router-dom'
import {ThemeProvider} from './context/ThemeContext'
import {FavoritesProvider} from './context/FavoritesContext'
import './App.css'

import Header from './components/Header'
import CommandPalette from './components/CommandPalette'
import HomePage from './pages/HomePage'
import LivePage from './pages/LivePage'
import MatchesPage from './pages/MatchesPage'
import MatchDetailPage from './pages/MatchDetailPage'
import LeaguesPage from './pages/LeaguesPage'
import LeaguePage from './pages/LeaguePage'
import TeamPage from './pages/TeamPage'
import StandingsPage from './pages/StandingsPage'
import SearchPage from './pages/SearchPage'
import PreferencesPage from './pages/PreferencesPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <div className="app">
          <Header />
          <CommandPalette />
          <main className="main-content">
            <Switch>
              <Route exact path="/" component={HomePage} />
              <Route exact path="/live" component={LivePage} />
              <Route exact path="/matches" component={MatchesPage} />
              <Route
                exact
                path="/matches/:matchId"
                component={MatchDetailPage}
              />
              <Route exact path="/leagues" component={LeaguesPage} />
              <Route exact path="/leagues/:leagueId" component={LeaguePage} />
              <Route exact path="/teams/:teamId" component={TeamPage} />
              <Route exact path="/standings" component={StandingsPage} />
              <Route exact path="/search" component={SearchPage} />
              <Route exact path="/preferences" component={PreferencesPage} />
              <Route component={NotFoundPage} />
            </Switch>
          </main>
        </div>
      </FavoritesProvider>
    </ThemeProvider>
  )
}

export default App
