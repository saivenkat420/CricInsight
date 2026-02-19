const FREE_LEAGUE_IDS = [3, 5, 10]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  try {
    const params = new URLSearchParams({
      api_token: token,
      include: 'localteam,visitorteam,venue,runs',
      'filter[status]': 'NS',
    })

    const allFixtures = []
    for (const leagueId of FREE_LEAGUE_IDS) {
      try {
        const url = `https://cricket.sportmonks.com/api/v2.0/fixtures?${params}&filter[league_id]=${leagueId}&per_page=10`
        const response = await fetch(url)
        const data = await response.json()
        if (response.ok && data.data?.length) {
          allFixtures.push(...data.data)
        }
      } catch (err) {
        console.error(
          `Upcoming fetch error for league ${leagueId}:`,
          err.message,
        )
        // Continue with other leagues
      }
    }

    allFixtures.sort(
      (a, b) => new Date(a.starting_at) - new Date(b.starting_at),
    )

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json({data: allFixtures.slice(0, 20)})
  } catch (err) {
    console.error('Upcoming fetch error:', err)
    return res
      .status(500)
      .json({error: err.message || 'Failed to fetch upcoming fixtures'})
  }
}
