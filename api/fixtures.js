export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  const {
    leagueId,
    status,
    page = 1,
    seasonId,
    per_page = 20,
    dateFrom,
    dateTo,
  } = req.query

  // Validate and limit per_page to prevent API issues
  const perPageNum = Math.min(Math.max(parseInt(per_page, 10) || 20, 1), 50)
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const params = new URLSearchParams({
    api_token: token,
    include: 'localteam,visitorteam,venue,runs',
    page: String(pageNum),
    per_page: String(perPageNum),
  })

  if (leagueId) params.append('filter[league_id]', leagueId)
  if (seasonId) params.append('filter[season_id]', seasonId)
  if (dateFrom)
    params.append(
      'filter[starts_between]',
      `${dateFrom},${dateTo || '2099-12-31'}`,
    )
  if (status === 'live') {
    params.append('filter[status]', '1st Innings,2nd Innings,Innings Break')
  } else if (status === 'upcoming') {
    params.append('filter[status]', 'NS')
  } else if (status === 'completed') {
    params.append('filter[status]', 'Finished')
  }

  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/fixtures?${params}`
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      const msg =
        data?.message?.message ||
        data?.message ||
        data?.error ||
        'Failed to fetch fixtures'
      return res
        .status(response.status)
        .json({error: typeof msg === 'string' ? msg : JSON.stringify(msg)})
    }

    const cacheMaxAge = status === 'live' ? 30 : 300
    res.setHeader(
      'Cache-Control',
      `s-maxage=${cacheMaxAge}, stale-while-revalidate`,
    )
    return res.status(200).json(data)
  } catch (err) {
    console.error('Fixtures fetch error:', err)
    return res
      .status(500)
      .json({error: err.message || 'Failed to fetch fixtures'})
  }
}
