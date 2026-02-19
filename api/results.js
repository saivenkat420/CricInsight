const FREE_LEAGUE_IDS = [3, 5, 10]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  const {
    leagueId,
    seasonId,
    page = 1,
    per_page = 30,
    dateFrom,
    dateTo,
  } = req.query

  // Validate and limit per_page to prevent API issues
  const perPageNum = Math.min(Math.max(parseInt(per_page, 10) || 30, 1), 50)
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)

  const leagueIds = leagueId ? [leagueId] : FREE_LEAGUE_IDS

  const allFixtures = []
  for (const lid of leagueIds) {
    const params = new URLSearchParams({
      api_token: token,
      include: 'localteam,visitorteam,venue,runs,manofmatch',
      'filter[status]': 'Finished',
      'filter[league_id]': String(lid),
      page: String(pageNum),
      per_page: String(perPageNum),
    })
    if (seasonId) params.append('filter[season_id]', seasonId)
    if (dateFrom)
      params.append(
        'filter[starts_between]',
        `${dateFrom},${dateTo || '2099-12-31'}`,
      )

    try {
      const url = `https://cricket.sportmonks.com/api/v2.0/fixtures?${params}`
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok && data.data?.length) {
        allFixtures.push(...data.data)
      }
    } catch (err) {
      console.error(`Results fetch error for league ${lid}:`, err.message)
    }
  }

  allFixtures.sort((a, b) => new Date(b.starting_at) - new Date(a.starting_at))

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
  return res.status(200).json({data: allFixtures})
}
