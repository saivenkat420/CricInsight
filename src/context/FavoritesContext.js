import {createContext, useContext, useState, useEffect} from 'react'

const FavoritesContext = createContext()

const FAVORITES_KEY = 'cricket-app-favorites'
const PREFS_KEY = 'cricket-app-notification-prefs'

export function FavoritesProvider({children}) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY)
      const parsed = saved ? JSON.parse(saved) : {}
      return {
        teams: parsed.teams || [],
        leagues: parsed.leagues || [],
        players: parsed.players || [],
      }
    } catch {
      return {teams: [], leagues: [], players: []}
    }
  })

  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY)
      return saved
        ? JSON.parse(saved)
        : {
            teamResults: true,
            weeklyDigest: true,
            thrillerAlerts: true,
          }
    } catch {
      return {teamResults: true, weeklyDigest: true, thrillerAlerts: true}
    }
  })

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(notificationPrefs))
  }, [notificationPrefs])

  const toggleTeamFavorite = teamId => {
    setFavorites(prev => {
      const teams = prev.teams.includes(teamId)
        ? prev.teams.filter(id => id !== teamId)
        : [...prev.teams, teamId]
      return {...prev, teams}
    })
  }

  const toggleLeagueFavorite = leagueId => {
    setFavorites(prev => {
      const leagues = prev.leagues.includes(leagueId)
        ? prev.leagues.filter(id => id !== leagueId)
        : [...prev.leagues, leagueId]
      return {...prev, leagues}
    })
  }

  const togglePlayerFavorite = playerId => {
    setFavorites(prev => {
      const players = prev.players.includes(playerId)
        ? prev.players.filter(id => id !== playerId)
        : [...prev.players, playerId]
      return {...prev, players}
    })
  }

  const isTeamFavorite = teamId => favorites.teams.includes(teamId)
  const isLeagueFavorite = leagueId => favorites.leagues.includes(leagueId)
  const isPlayerFavorite = playerId => favorites.players.includes(playerId)

  const updateNotificationPref = (key, value) => {
    setNotificationPrefs(prev => ({...prev, [key]: value}))
  }

  const hasFavorites =
    favorites.teams.length > 0 ||
    favorites.leagues.length > 0 ||
    favorites.players.length > 0

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        notificationPrefs,
        toggleTeamFavorite,
        toggleLeagueFavorite,
        togglePlayerFavorite,
        isTeamFavorite,
        isLeagueFavorite,
        isPlayerFavorite,
        updateNotificationPref,
        hasFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
