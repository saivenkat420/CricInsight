# CricInsight – Scores & Stats

An immersive cricket dashboard for live scores, rich match details, and league standings across T20 competitions. Uses the Sportmonks Cricket API (free tier) for BBL, T20I, and CSA T20 leagues.

---

## Features

- **Live Scores** - Real-time match updates with auto-refresh
- **Match Center** - Browse live, upcoming, and completed matches
- **Match Detail** - Full scorecard, ball-by-ball, venue, MoM, umpires
- **League Standings** - Points table per league and season
- **Team Profiles** - Squad, recent matches, form guide
- **Search** - Find matches by team or venue
- **Dark/Light Theme** - Toggle with persistence
- **Responsive** - Mobile and desktop

---

## Data Source

**Sportmonks Cricket API** (free tier)

- Leagues: BBL (5), T20I (3), CSA T20 Challenge (10)
- 180 API calls/hour
- Live scores, fixtures, standings, teams, ball-by-ball

See [SPORTMONKS.md](SPORTMONKS.md) for setup details.

---

## Deploy to Vercel

1. Push your code to GitHub and import the project in [Vercel](https://vercel.com)
2. Add environment variable: `SPORTMONKS_API_TOKEN` (from [my.sportmonks.com](https://my.sportmonks.com/register))
3. Deploy - Vercel will build the React app and deploy the `api/` serverless functions

---

## Local Development

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Add API token** - Create `.env` in project root:
   ```
   SPORTMONKS_API_TOKEN=your_token_here
   ```

3. **Run with Vercel CLI** (recommended - runs both app and API):
   ```sh
   npm run dev
   ```
   Or install Vercel CLI first: `npm i -g vercel`

4. **Or run React only** (API calls will fail without `vercel dev`):
   ```sh
   npm start
   ```

---

## Project Structure

```
├── api/                    # Vercel serverless functions (proxies Sportmonks)
│   ├── live.js
│   ├── fixtures.js
│   ├── fixtures/[id].js
│   ├── standings/[seasonId].js
│   ├── teams/[id].js
│   ├── leagues.js
│   ├── seasons/[leagueId].js
│   └── upcoming.js
├── src/
│   ├── api/                # Frontend API client
│   ├── components/
│   ├── pages/
│   ├── context/
│   ├── utils/
│   └── styles/
├── docs/                   # Requirements, specification, features
└── SPORTMONKS.md
```

---

## Tech Stack

- React 17, React Router
- CSS Variables (theming)
- Vercel Serverless Functions
- Sportmonks Cricket API v2.0
